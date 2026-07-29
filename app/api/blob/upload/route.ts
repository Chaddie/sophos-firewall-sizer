import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

const ALLOWED_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/acad",
  "image/vnd.dwg",
  "application/octet-stream",
];

const MAX_SITE_PLAN_BYTES = 20 * 1024 * 1024;

/**
 * Authorizes client-side Vercel Blob uploads for wireless site plan files.
 * This route is intentionally unauthenticated at the request level — anyone
 * with a live sizing link URL can attach a site plan while filling out the
 * public questionnaire, same as any other field on that form.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ALLOWED_CONTENT_TYPES,
        maximumSizeInBytes: MAX_SITE_PLAN_BYTES,
        addRandomSuffix: true,
      }),
      onUploadCompleted: async () => {
        // No server-side bookkeeping needed — the client stores the
        // returned blob URL directly in the wireless site answers.
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 },
    );
  }
}
