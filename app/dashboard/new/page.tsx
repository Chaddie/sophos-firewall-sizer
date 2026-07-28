import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { CreateRequestForm } from "@/components/dashboard/create-request-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function NewRequestPage() {
  return (
    <div className="flex min-h-full flex-col">
      <DashboardNav />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Create sizing link</CardTitle>
            <CardDescription>
              Generate a vanity URL to send to your customer. They will complete
              the questionnaire and you will see the recommendation here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CreateRequestForm />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
