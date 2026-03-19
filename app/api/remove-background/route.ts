import { NextRequest, NextResponse } from "next/server";

type RateRecord = { count: number; resetAt: number };
type RemoveBgError = { errors?: Array<{ title?: string; code?: string }> };

const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX ?? 5);
const RATE_LIMIT_WINDOW = Number(process.env.RATE_LIMIT_WINDOW ?? 60 * 60 * 24);
const REMOVE_BG_API_URL = "https://api.remove.bg/v1.0/removebg";

const globalStore = globalThis as typeof globalThis & {
  __rateLimitStore?: Map<string, RateRecord>;
};

const rateLimitStore = globalStore.__rateLimitStore ?? new Map<string, RateRecord>();
globalStore.__rateLimitStore = rateLimitStore;

export async function POST(request: NextRequest) {
  const apiKey = process.env.REMOVE_BG_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Server misconfigured: missing REMOVE_BG_API_KEY." }, { status: 500 });
  }

  const ip = getClientIp(request);
  const rateLimited = enforceRateLimit(ip);
  if (rateLimited) {
    return NextResponse.json(
      { error: "Daily limit reached. Please try again later." },
      { status: 429, headers: { "Retry-After": String(RATE_LIMIT_WINDOW) } },
    );
  }

  const formData = await request.formData();
  const imageFile = formData.get("image_file");

  if (!(imageFile instanceof File)) {
    return NextResponse.json({ error: "No image file received." }, { status: 400 });
  }

  if (!ACCEPTED_TYPES.has(imageFile.type)) {
    return NextResponse.json({ error: "Unsupported file type. Use JPG, PNG, or WEBP." }, { status: 400 });
  }

  if (imageFile.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File too large. Max size is 10MB." }, { status: 400 });
  }

  const upstreamBody = new FormData();
  upstreamBody.append("image_file", imageFile, imageFile.name);
  upstreamBody.append("size", "auto");

  try {
    const upstreamResponse = await fetch(REMOVE_BG_API_URL, {
      method: "POST",
      headers: {
        "X-Api-Key": apiKey,
      },
      body: upstreamBody,
      cache: "no-store",
    });

    if (!upstreamResponse.ok) {
      const rawText = await upstreamResponse.text();
      const parsed = safeParseRemoveBgError(rawText);
      const normalized = normalizeRemoveBgError(parsed, upstreamResponse.status);

      return NextResponse.json(normalized, { status: upstreamResponse.status });
    }

    const buffer = await upstreamResponse.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="${imageFile.name.replace(/\.[^.]+$/, "")}-no-bg.png"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to reach Remove.bg right now. Please try again in a moment." },
      { status: 502 },
    );
  }
}

function getClientIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}

function enforceRateLimit(ip: string) {
  const now = Date.now();
  const existing = rateLimitStore.get(ip);

  if (!existing || existing.resetAt < now) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW * 1000 });
    return false;
  }

  if (existing.count >= RATE_LIMIT_MAX) {
    return true;
  }

  existing.count += 1;
  rateLimitStore.set(ip, existing);
  return false;
}

function safeParseRemoveBgError(rawText: string): RemoveBgError | null {
  try {
    return JSON.parse(rawText) as RemoveBgError;
  } catch {
    return null;
  }
}

function normalizeRemoveBgError(parsed: RemoveBgError | null, status: number) {
  const first = parsed?.errors?.[0];
  const code = first?.code ?? "unknown_error";
  const detail = first?.title ?? "Remove.bg returned an unexpected error.";

  if (code === "unknown_foreground") {
    return {
      error: "未识别到清晰主体，请换一张前景更明显的图片试试。",
      detail,
      code,
    };
  }

  if (status === 402) {
    return {
      error: "Remove.bg 额度不足，请稍后补充额度后再试。",
      detail,
      code,
    };
  }

  if (status === 429) {
    return {
      error: "Remove.bg 当前请求过多，请稍后重试。",
      detail,
      code,
    };
  }

  return {
    error: detail,
    detail,
    code,
  };
}
