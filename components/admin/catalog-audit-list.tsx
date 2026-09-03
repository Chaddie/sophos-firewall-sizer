import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type AuditRow = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  summary: string | null;
  createdAt: Date;
};

export function CatalogAuditList({ entries }: { entries: AuditRow[] }) {
  return (
    <Card className="border-[var(--sophos-grey-2)] shadow-sm">
      <CardHeader>
        <CardTitle className="font-heading text-xl font-light">
          Catalog audit trail
        </CardTitle>
        <CardDescription>
          Recent create / update / delete actions and BOM recomputes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-muted-foreground text-sm">No catalog changes yet.</p>
        ) : (
          <ul className="space-y-2">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="rounded-md border border-[var(--sophos-grey-2)] bg-[var(--sophos-grey-1)] px-3 py-2 text-sm"
              >
                <p className="font-medium text-[var(--sophos-navy)]">
                  {entry.summary ?? `${entry.action} ${entry.entityType}`}
                </p>
                <p className="text-muted-foreground text-xs">
                  {entry.entityType}/{entry.entityId} · {entry.action} ·{" "}
                  {new Date(entry.createdAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
