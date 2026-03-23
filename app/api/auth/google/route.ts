import { NextResponse } from "next/server";
import {
  createSessionToken,
  getSessionCookieName,
  getSessionMaxAge,
  verifyGoogleCredential,
} from "../../../lib/auth";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { credential?: string };
    if (!body.credential) {
      return NextResponse.json({ error: "Missing Google credential." }, { status: 400 });
    }

    const user = await verifyGoogleCredential(body.credential);
    const token = await createSessionToken(user);

    const response = NextResponse.json({ ok: true, user });
    response.cookies.set({
      name: getSessionCookieName(),
      value: token,
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: getSessionMaxAge(),
    });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Google sign-in failed.";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
