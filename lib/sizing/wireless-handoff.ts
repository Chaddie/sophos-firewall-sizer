import type { WirelessSiteAnswers } from "./types";
import { WIRELESS_DESIGN_GOAL_LABELS } from "@/lib/validations";

const WIRELESS_PRESALES_EMAIL = "presalesdesk-wireless@sophos.com";

function line(label: string, value: string | number | undefined) {
  if (value === undefined || value === "") return null;
  return `${label}: ${value}`;
}

export function buildWirelessSummary(
  siteName: string,
  answers: WirelessSiteAnswers,
  companyLabel?: string,
): string {
  const fileNames = (answers.sitePlanFiles ?? []).map((f) => f.name);

  const lines = [
    "Sophos Wireless Sizing Intake",
    companyLabel ? `Customer: ${companyLabel}` : null,
    `Site: ${siteName}`,
    "",
    "SFDC opportunity URL: [Account manager to complete]",
    "Expected timeframe for complete survey plan: [Account manager to complete]",
    "",
    "Mandatory fields",
    line("Type of facility", answers.facilityType),
    line("Ceiling height", answers.ceilingHeight),
    line("Internal wall material", answers.internalWallMaterial),
    line("External wall material", answers.externalWallMaterial),
    line("Floor plan / approx area", answers.floorPlanNotes),
    line("Total users", answers.totalUsers),
    line("Users per AP", answers.usersPerAp),
    line(
      "Design goal",
      WIRELESS_DESIGN_GOAL_LABELS[answers.designGoal],
    ),
    "",
    "Optional fields",
    line("Low signal acceptable areas", answers.lowSignalAcceptableAreas),
    line("High bandwidth areas", answers.highBandwidthAreas),
    line("Devices per user", answers.devicesPerUser),
    line("Suggested AP models", answers.suggestedApModels),
    line("Unavailable/saturated channels", answers.unavailableChannels),
    line("Restricted channels/frequencies", answers.restrictedChannels),
    "",
    fileNames.length > 0
      ? `Site plan files uploaded by customer (download from the sizing dashboard and attach to this email): ${fileNames.join(", ")}`
      : "No site plan files were uploaded by the customer — request one before sending to presales.",
  ].filter(Boolean) as string[];

  return lines.join("\n");
}

export function buildWirelessMailtoUrl(
  siteName: string,
  answers: WirelessSiteAnswers,
  companyLabel?: string,
): string {
  const subject = encodeURIComponent(
    `Wireless sizing — ${companyLabel ?? "Customer"} — ${siteName}`,
  );
  const body = encodeURIComponent(
    buildWirelessSummary(siteName, answers, companyLabel),
  );
  return `mailto:${WIRELESS_PRESALES_EMAIL}?subject=${subject}&body=${body}`;
}

export function buildWirelessHandoff(
  siteName: string,
  answers: WirelessSiteAnswers,
  companyLabel?: string,
) {
  const summaryText = buildWirelessSummary(siteName, answers, companyLabel);
  const mailtoUrl = buildWirelessMailtoUrl(siteName, answers, companyLabel);
  return {
    siteName,
    answers,
    summaryText,
    mailtoUrl,
  };
}

export { WIRELESS_PRESALES_EMAIL };
