export const dynamic = "force-dynamic";

/**
 * Legacy storage upload API.
 * The signed upload flow at /api/uploads/sign + /api/uploads/finalize replaces this raw data URL surface.
 */
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const replacement = new URL("/api/uploads/sign", request.url).toString();
  return NextResponse.json(
    {
      error: "Deprecated upload API. Use the signed upload flow instead.",
      replacement
    },
    { status: 410 }
  );
}
