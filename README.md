# Image Background Remover

A minimal MVP for removing image backgrounds online with **Next.js + Tailwind CSS + Remove.bg**.

## Stack
- Next.js (App Router)
- Tailwind CSS
- Route handler API (`/api/remove-background`)
- Remove.bg API

## Features
- Upload JPG / PNG / WEBP
- Max file size: 10MB
- Remove background with Remove.bg
- Download transparent PNG
- No image persistence on disk
- Basic in-memory IP rate limiting

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000

## Environment variables

```bash
REMOVE_BG_API_KEY=your_remove_bg_api_key
RATE_LIMIT_MAX=5
RATE_LIMIT_WINDOW=86400
```

## Notes
- Current rate limit is in-memory only. For production on Cloudflare/serverless, switch to a durable shared store (for example KV, Upstash, or Durable Objects).
- Files are forwarded directly to Remove.bg and not saved by the app.
