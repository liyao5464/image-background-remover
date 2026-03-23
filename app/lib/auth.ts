import { cookies } from "next/headers";
import { createRemoteJWKSet, jwtVerify, SignJWT } from "jose";

const GOOGLE_ISSUERS = new Set(["https://accounts.google.com", "accounts.google.com"]);
const GOOGLE_JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
const SESSION_COOKIE = "bg_auth_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  image?: string;
};

type GoogleClaims = {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  iss?: string;
  aud?: string | string[];
};

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("Missing AUTH_SECRET");
  return new TextEncoder().encode(secret);
}

export function getGoogleClientId() {
  return process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
}

export async function verifyGoogleCredential(credential: string): Promise<SessionUser> {
  const audience = getGoogleClientId();
  if (!audience) throw new Error("Missing NEXT_PUBLIC_GOOGLE_CLIENT_ID");

  const { payload } = await jwtVerify(credential, GOOGLE_JWKS, { audience });
  const claims = payload as unknown as GoogleClaims;

  if (!claims.sub || !claims.email) {
    throw new Error("Google credential missing required claims");
  }
  if (!claims.email_verified) {
    throw new Error("Google email is not verified");
  }
  if (!claims.iss || !GOOGLE_ISSUERS.has(claims.iss)) {
    throw new Error("Invalid Google issuer");
  }

  return {
    id: claims.sub,
    email: claims.email,
    name: claims.name || claims.email,
    image: claims.picture,
  };
}

export async function createSessionToken(user: SessionUser) {
  return new SignJWT({ user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getAuthSecret());
}

export async function readSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getAuthSecret());
    const user = (payload as { user?: SessionUser }).user;
    if (!user?.id || !user?.email) return null;
    return user;
  } catch {
    return null;
  }
}

export function getSessionCookieName() {
  return SESSION_COOKIE;
}

export function getSessionMaxAge() {
  return SESSION_MAX_AGE;
}
