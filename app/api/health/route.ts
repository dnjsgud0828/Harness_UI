import { NextResponse } from "next/server";
import fs from "node:fs";
import { TRIAGE_SCRIPT, GUARD_SCRIPT } from "@/lib/paths";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    triage_script_present: fs.existsSync(TRIAGE_SCRIPT),
    guard_script_present: fs.existsSync(GUARD_SCRIPT),
    node: process.version,
    closed_network_mode: process.env.HARNESS_CLOSED_NETWORK === "1",
  });
}
