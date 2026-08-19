"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { hasSePrivileges } from "@/lib/auth-utils";
import { getDb } from "@/lib/db";
import { demoStore, isDemoMode } from "@/lib/db/demo-store";
import { sizingRequests, submissions } from "@/lib/db/schema";
import { rebuildFirewallBomForTier } from "@/lib/sizing/engine";
import { recomputeConsolidatedBom, prefixBom } from "@/lib/sizing/submission-engine";
import { rebuildSwitchBomForTier } from "@/lib/sizing/switch-engine";
import {
  isV2Answers,
  isV2Recommendation,
  type SizingTier,
  type StoredRecommendation,
} from "@/lib/sizing/types";

type TierProduct = "firewall" | "switches";

/**
 * Lets an AM (on their own requests) or SE (on any request) override which
 * tier — minimum / recommended / optimal — actually drives the quoted BOM
 * for a given site + product, and persists that choice on the submission.
 */
export async function setQuotedTierAction(
  requestId: string,
  siteName: string | null,
  product: TierProduct,
  tier: SizingTier,
): Promise<{ success: true } | { error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const canViewAll = hasSePrivileges(session.user.role);

  if (isDemoMode()) {
    const request = await demoStore.sizingRequests.findById(requestId);
    if (!request) return { error: "Request not found" };
    if (!canViewAll && request.createdById !== session.user.id) {
      return { error: "Unauthorized" };
    }
    const submission = await demoStore.submissions.findByRequestId(requestId);
    if (!submission) return { error: "No submission yet" };

    const result = await applyTierOverride(
      submission.answers,
      submission.recommendation,
      siteName,
      product,
      tier,
    );
    if ("error" in result) return result;

    await demoStore.submissions.updateRecommendation(requestId, result.recommendation);
    revalidatePath(`/dashboard/${requestId}`);
    return { success: true as const };
  }

  const [request] = await getDb()
    .select()
    .from(sizingRequests)
    .where(eq(sizingRequests.id, requestId))
    .limit(1);
  if (!request) return { error: "Request not found" };
  if (!canViewAll && request.createdById !== session.user.id) {
    return { error: "Unauthorized" };
  }

  const [submission] = await getDb()
    .select()
    .from(submissions)
    .where(eq(submissions.requestId, requestId))
    .limit(1);
  if (!submission) return { error: "No submission yet" };

  const result = await applyTierOverride(
    submission.answers,
    submission.recommendation,
    siteName,
    product,
    tier,
  );
  if ("error" in result) return result;

  await getDb()
    .update(submissions)
    .set({ recommendation: result.recommendation })
    .where(eq(submissions.requestId, requestId));

  revalidatePath(`/dashboard/${requestId}`);
  return { success: true as const };
}

async function applyTierOverride(
  answers: import("@/lib/sizing/types").StoredAnswers,
  recommendation: StoredRecommendation,
  siteName: string | null,
  product: TierProduct,
  tier: SizingTier,
): Promise<{ recommendation: StoredRecommendation } | { error: string }> {
  // --- Legacy v1 single-site submissions (firewall only) ---
  if (!isV2Recommendation(recommendation)) {
    if (product !== "firewall" || isV2Answers(answers)) {
      return { error: "This submission does not support that override" };
    }
    const option = recommendation.modelOptions?.find((o) => o.tier === tier);
    if (!option) return { error: "That tier is not available" };

    const rebuilt = await rebuildFirewallBomForTier(answers, option.modelId);
    if (!rebuilt) return { error: "Model not found in catalog" };

    return {
      recommendation: {
        ...recommendation,
        modelId: rebuilt.modelId,
        modelName: rebuilt.modelName,
        bom: rebuilt.bom,
        licenseSku: rebuilt.licenseSku,
        instanceRecommendation: rebuilt.instanceRecommendation,
        quotedTier: tier,
      },
    };
  }

  // --- v2 multi-site submissions ---
  if (!isV2Answers(answers) || siteName === null) {
    return { error: "Site name is required for multi-site submissions" };
  }

  const siteIndex = recommendation.sites.findIndex(
    (s) => s.siteName === siteName,
  );
  if (siteIndex === -1) return { error: "Site not found" };
  const siteAnswers = answers.sites.find((s) => s.siteName === siteName);
  if (!siteAnswers) return { error: "Site not found in answers" };

  const sites = [...recommendation.sites];
  const site = { ...sites[siteIndex] };

  if (product === "firewall") {
    if (!site.firewall || !siteAnswers.products.firewall) {
      return { error: "This site has no firewall to re-quote" };
    }
    const option = site.firewall.modelOptions?.find((o) => o.tier === tier);
    if (!option) return { error: "That tier is not available" };

    const rebuilt = await rebuildFirewallBomForTier(
      siteAnswers.products.firewall,
      option.modelId,
    );
    if (!rebuilt) return { error: "Model not found in catalog" };

    site.firewall = {
      ...site.firewall,
      modelId: rebuilt.modelId,
      modelName: rebuilt.modelName,
      bom: prefixBom(rebuilt.bom, siteName, "firewall"),
      licenseSku: rebuilt.licenseSku,
      instanceRecommendation: rebuilt.instanceRecommendation,
      quotedTier: tier,
    };
  } else {
    if (!site.switches || !siteAnswers.products.switches) {
      return { error: "This site has no switch to re-quote" };
    }
    const option = site.switches.modelOptions?.find((o) => o.tier === tier);
    if (!option) return { error: "That tier is not available" };

    const rebuilt = await rebuildSwitchBomForTier(option.modelId);
    if (!rebuilt) return { error: "Model not found in catalog" };

    site.switches = {
      ...site.switches,
      modelId: rebuilt.modelId,
      modelName: rebuilt.modelName,
      bom: prefixBom(rebuilt.bom, siteName, "switch"),
      quotedTier: tier,
    };
  }

  sites[siteIndex] = site;

  return {
    recommendation: {
      ...recommendation,
      sites,
      bom: recomputeConsolidatedBom(sites),
    },
  };
}
