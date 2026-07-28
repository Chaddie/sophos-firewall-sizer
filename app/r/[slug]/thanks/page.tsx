import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function ThanksPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await params;

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle2 className="text-primary size-6" />
          </div>
          <CardTitle>Thank you</CardTitle>
          <CardDescription>
            Your firewall sizing questionnaire has been submitted successfully.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm">
            Your account team will review your requirements and follow up with a
            recommended Sophos firewall model. You do not need to take any
            further action.
          </p>
          <Link href="/">
            <Button variant="outline">Done</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
