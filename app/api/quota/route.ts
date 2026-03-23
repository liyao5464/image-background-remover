import { NextResponse } from "next/server";
import { readSession } from "../../lib/auth";
import { getQuotaState } from "../../lib/quota";

export async function GET() {
  const user = await readSession();
  if (!user) {
    return NextResponse.json({ user: null, quota: null }, { status: 200 });
  }

  return NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email },
    quota: getQuotaState(user.id),
  });
}
