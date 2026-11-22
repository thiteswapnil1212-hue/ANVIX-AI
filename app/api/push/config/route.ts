import { NextResponse } from "next/server";
import { getVapidPublicKey, isPushConfigured } from "@/lib/notify/web-push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/push/config — what the Settings UI needs to decide whether
 * push is even offerable: VAPID keys configured, and the public key to
 * subscribe with. No auth needed — the public key is public by design.
 */
export async function GET() {
  if (!isPushConfigured()) {
    return NextResponse.json({ configured: false, publicKey: null });
  }
  return NextResponse.json({
    configured: true,
    publicKey: getVapidPublicKey(),
  });
}
