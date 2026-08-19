import { NextResponse } from "next/server";
import { verifyAuthenticationAndIssueTicket } from "@/lib/auth/passkeys";
import type { AuthenticationResponseJSON } from "@simplewebauthn/types";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    response?: AuthenticationResponseJSON;
  };

  if (!body.response) {
    return NextResponse.json({ error: "Missing response" }, { status: 400 });
  }

  const result = await verifyAuthenticationAndIssueTicket(body.response);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ticket: result.ticket });
}
