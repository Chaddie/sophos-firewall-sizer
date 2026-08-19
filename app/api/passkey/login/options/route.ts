import { NextResponse } from "next/server";
import { createAuthenticationOptions } from "@/lib/auth/passkeys";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { email?: string };
  const options = await createAuthenticationOptions(body.email);
  return NextResponse.json(options);
}
