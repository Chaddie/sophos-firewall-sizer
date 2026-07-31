import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { AppHeader } from "@/components/brand/app-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getSubmittedProductSummary,
  type SubmittedProductSummary,
} from "@/lib/actions";

function joinWithAnd(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function describeRecommendedProducts(
  summary: SubmittedProductSummary | null,
): string {
  const items: string[] = [];
  if (!summary || summary.firewall) items.push("Sophos Firewall");
  if (summary?.switches) items.push("Sophos Switch(es)");
  if (summary?.wireless) items.push("Sophos Access Points");

  return items.length > 0 ? joinWithAnd(items) : "a recommended solution";
}

export default async function ThanksPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const productSummary = await getSubmittedProductSummary(slug);
  const recommendedProducts = describeRecommendedProducts(productSummary);

  return (
    <>
      <AppHeader />
      <div className="flex flex-1 items-center justify-center bg-[var(--sophos-grey-1)] px-4 py-16">
        <Card className="w-full max-w-md border-[var(--sophos-grey-2)] text-center shadow-sm">
          <CardHeader>
            <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-[var(--sophos-blue)]/10">
              <CheckCircle2 className="size-6 text-[var(--sophos-blue)]" />
            </div>
            <CardTitle className="font-heading text-2xl font-light">
              Thank you
            </CardTitle>
            <CardDescription>
              Your firewall sizing questionnaire has been submitted successfully.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-[var(--sophos-gray)]">
              Your Sophos Account Manager will review your requirements and
              follow up with recommended {recommendedProducts}. You do not
              need to take any further action.
            </p>
            <Link href="/">
              <Button variant="outline">Done</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
