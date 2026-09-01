import { redirect } from "next/navigation";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSessionRole } from "@/lib/actions";
import { canAccessCatalogAdmin, hasSePrivileges } from "@/lib/auth-utils";

function Formula({ children }: { children: React.ReactNode }) {
  return (
    <pre className="overflow-x-auto rounded-lg bg-[var(--sophos-navy)] px-4 py-3 font-mono text-xs leading-relaxed text-white whitespace-pre-wrap">
      {children}
    </pre>
  );
}

function Step({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h3 className="font-heading text-lg font-light text-[var(--sophos-navy)]">
        <span className="mr-2 text-[var(--sophos-blue)]">{number}.</span>
        {title}
      </h3>
      <div className="text-muted-foreground space-y-3 text-sm leading-relaxed">
        {children}
      </div>
    </section>
  );
}

export default async function SizingLogicPage() {
  const role = await getSessionRole();
  if (!role) redirect("/login");
  if (!hasSePrivileges(role)) redirect("/dashboard");

  return (
    <div className="flex min-h-full flex-col">
      <DashboardNav
        showAdmin
        showCatalogAdmin={canAccessCatalogAdmin(role)}
      />
      <main className="mx-auto w-full max-w-4xl flex-1 space-y-8 bg-[var(--sophos-grey-1)] px-4 py-8">
        <div>
          <h1 className="font-heading text-3xl font-light text-[var(--sophos-navy)]">
            Sizing logic
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            How this app calculates firewall (and switch) recommendations from
            the customer questionnaire. Sales Engineers only.
          </p>
        </div>

        <Card className="border-[var(--sophos-grey-2)] shadow-sm">
          <CardHeader>
            <CardTitle className="font-heading text-xl font-light">
              Firewall sizing algorithm
            </CardTitle>
            <CardDescription>
              Implemented in <code>lib/sizing/engine.ts</code>. Specs come from
              the firewall catalog (Catalog admin or bundled JSON fallback).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <Step number={1} title="Filter and sort the catalog">
              <p>
                Keep only models that support the chosen deployment environment
                (physical / virtual / AWS / Azure). Sort remaining models by{" "}
                <strong>Threat Protection Mbps</strong> ascending (smallest →
                largest).
              </p>
            </Step>

            <Step number={2} title="Estimate required concurrent connections">
              <p>Endpoint count used for the estimate, in priority order:</p>
              <ol className="list-decimal space-y-1 pl-5">
                <li>
                  Customer-entered <em>users or endpoints</em>, if provided
                </li>
                <li>
                  Else <em>authenticated users</em>, if firewall auth is enabled
                </li>
                <li>
                  Else a site-role default: <strong>25</strong> for branch,{" "}
                  <strong>50</strong> for all other roles
                </li>
              </ol>
              <Formula>
                {`requiredConnections = endpoints × 75`}
              </Formula>
            </Step>

            <Step number={3} title="Compute required throughput (Mbps)">
              <p>First project average WAN usage with 3-year growth:</p>
              <Formula>
                {`futureAverage = averageWanConsumptionMbps × (1 + wanGrowth3yrPercent / 100)`}
              </Formula>
              <p>
                Peak demand is the highest of several signals (internal traffic
                only counts when enabled):
              </p>
              <Formula>
                {`peakDemand = max(
  futureAverage,
  expectedPeakThroughputMbps,
  totalWanBandwidthMbps × 0.8,
  internalTrafficMbps   // 0 if not enabled
)`}
              </Formula>
              <p>
                VPN demand is the peak VPN throughput when VPN is enabled,
                otherwise 0. Required Mbps applies a fixed{" "}
                <strong>25% headroom</strong> factor:
              </p>
              <Formula>
                {`requiredMbps = max(peakDemand, vpnDemand) × 1.25`}
              </Formula>
            </Step>

            <Step number={4} title="Model usable throughput metric">
              <p>
                Each model exposes two published figures:{" "}
                <strong>Threat Protection Mbps</strong> and{" "}
                <strong>Xstream SSL Mbps</strong>. The metric used for comparison
                depends on protection bundle and TLS inspection scope:
              </p>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[var(--sophos-grey-1)]">
                    <tr>
                      <th className="px-3 py-2 font-medium">Protection</th>
                      <th className="px-3 py-2 font-medium">TLS scope</th>
                      <th className="px-3 py-2 font-medium">Throughput used</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr>
                      <td className="px-3 py-2">Standard</td>
                      <td className="px-3 py-2">Minimal</td>
                      <td className="px-3 py-2">Threat Protection</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2">Standard</td>
                      <td className="px-3 py-2">Selective</td>
                      <td className="px-3 py-2">Threat × 0.95</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2">Standard</td>
                      <td className="px-3 py-2">Full</td>
                      <td className="px-3 py-2">Threat × 0.90</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2">Xstream</td>
                      <td className="px-3 py-2">Full</td>
                      <td className="px-3 py-2">Xstream SSL</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2">Xstream</td>
                      <td className="px-3 py-2">Selective</td>
                      <td className="px-3 py-2">
                        Xstream × 0.85 + Threat × 0.15
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2">Xstream</td>
                      <td className="px-3 py-2">Minimal</td>
                      <td className="px-3 py-2">
                        Xstream × 0.60 + Threat × 0.40
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Step>

            <Step number={5} title="Hard constraints a model must pass">
              <p>A model qualifies only if all of the following hold:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  Usable throughput ≥ <code>requiredMbps</code>
                </li>
                <li>
                  Max concurrent connections ≥ estimated connections
                </li>
                <li>
                  If IPsec (or both): max IPsec tunnels ≥ requested tunnels
                </li>
                <li>
                  If SSL VPN (or both): max SSL VPN tunnels ≥ requested tunnels
                </li>
                <li>
                  If any VPN: model IPsec VPN Mbps ≥ peak VPN throughput
                </li>
                <li>
                  If endpoints/auth users given: model max users ≥ that count
                </li>
              </ul>
            </Step>

            <Step number={6} title="Pick Minimum / Recommended / Optimal">
              <p>
                Find the <strong>smallest</strong> catalog model (by sorted
                order) that passes all constraints — that index is{" "}
                <strong>Minimum</strong>.
              </p>
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  <strong>Recommended</strong> = next model up (Minimum index +
                  1), or the largest model if already at the top
                </li>
                <li>
                  <strong>Optimal</strong> = two steps up (Minimum index + 2), or
                  the largest model if already at the top
                </li>
              </ul>
              <p>
                If <em>no</em> model passes, the app falls back to the largest
                model in that environment and flags that nothing fully met the
                requirement.
              </p>
              <p>
                The <strong>default quoted BOM always uses Recommended</strong>,
                never Minimum. Account Managers / SEs can override the quoted
                tier on the submission detail page.
              </p>
              <Formula>
                {`headroomPercent = round((modelThroughput / requiredMbps − 1) × 100)`}
              </Formula>
            </Step>

            <Step number={7} title="Caveats and sizing notes">
              <p>Soft warnings (do not disqualify a model) include:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  Using &gt;75% of max connections, IPsec tunnels, SSL tunnels,
                  or max users
                </li>
                <li>Throughput headroom under 5%</li>
                <li>
                  HQ / datacenter site role on a Desktop form-factor appliance
                </li>
                <li>
                  Redundant PSU requested but no PSU SKU configured for that
                  model in Catalog admin
                </li>
              </ul>
              <p>
                A “primary sizing driver” note is also attached (throughput,
                VPN peak, internal traffic, endpoint count, or full TLS under
                Xstream).
              </p>
            </Step>

            <Step number={8} title="Bill of materials lines">
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  Physical: appliance SKU × 1, or × 2 if HA is required
                </li>
                <li>
                  Virtual / cloud: license SKU (+ optional AWS/Azure instance
                  placeholders), doubled for HA
                </li>
                <li>
                  Protection subscription (Standard or Xstream) × appliance
                  count — one line per firewall model/site based on the
                  customer’s protection choice
                </li>
                <li>
                  HA: Enhanced Support Plus × <strong>1</strong> (one entitlement
                  for the pair)
                </li>
                <li>WAF license if requested (qty matches appliance count)</li>
                <li>
                  Optional SFP+ SR/LR optics at the customer-entered count
                  (catalog accessory SKUs)
                </li>
                <li>
                  Optional redundant PSU × appliance count when requested and a
                  PSU SKU is configured on the model
                </li>
              </ul>
            </Step>
          </CardContent>
        </Card>

        <Card className="border-[var(--sophos-grey-2)] shadow-sm">
          <CardHeader>
            <CardTitle className="font-heading text-xl font-light">
              Switch sizing (summary)
            </CardTitle>
            <CardDescription>
              Implemented in <code>lib/sizing/switch-engine.ts</code>.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-3 text-sm leading-relaxed">
            <p>
              Models are sorted by port count. A model qualifies if it has
              enough ports, required multi-gig / SFP+ uplink features, and
              (when PoE is needed) enough PoE budget and BT support for 60W
              devices.
            </p>
            <Formula>
              {`requiredPoeWatts = (30W devices × 30) + (60W BT devices × 60)`}
            </Formula>
            <p>
              Minimum / Recommended / Optimal use the same “smallest that fits,
              then +1 / +2” pattern as firewalls. Default quote is Recommended.
              PoE-capable models also show how many Sophos APs they can roughly
              power at 30W (PoE+) or 60W (BT) from the catalog PoE budget.
            </p>
          </CardContent>
        </Card>

        <Card className="border-[var(--sophos-grey-2)] shadow-sm">
          <CardHeader>
            <CardTitle className="font-heading text-xl font-light">
              Wireless
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm leading-relaxed">
            Wireless is <strong>not auto-sized</strong>. The app collects site
            survey answers (including preferred AP6 model and site plans) and
            generates a handoff email / download for the wireless presales
            team.
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
