import { NextResponse } from "next/server";
import { getGoogleClientId, readSession } from "../../../lib/auth";

export async function GET() {
  const user = await readSession();
  return NextResponse.json({
    user,
    googleClientId: getGoogleClientId(),
    enabled: Boolean(getGoogleClientId() && process.env.AUTH_SECRET),
  });
}
