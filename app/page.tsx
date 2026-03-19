"use client";

import { ChangeEvent, DragEvent, useMemo, useState } from "react";

type ApiError = { error?: string; detail?: string };

type Status = "idle" | "uploading" | "success" | "error";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string>("");
  const [resultUrl, setResultUrl] = useState<string>("");
  const [dragging, setDragging] = useState(false);

  const originalUrl = useMemo(() => {
    if (!file) return "";
    return URL.createObjectURL(file);
  }, [file]);

  const validateFile = (nextFile: File) => {
    if (!ACCEPTED_TYPES.includes(nextFile.type)) {
      return "Only JPG, PNG, and WEBP files are supported.";
    }
    if (nextFile.size > MAX_FILE_SIZE) {
      return "File too large. Please upload an image smaller than 10MB.";
    }
    return "";
  };

  const handleFile = async (nextFile: File) => {
    const validationError = validateFile(nextFile);
    if (validationError) {
      setError(validationError);
      setStatus("error");
      return;
    }

    setFile(nextFile);
    setError("");
    setResultUrl("");
    setStatus("uploading");

    try {
      const formData = new FormData();
      formData.append("image_file", nextFile);

      const response = await fetch("/api/remove-background", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as ApiError;
        throw new Error(payload.error || "Failed to remove background. Please try again.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setResultUrl(url);
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Unexpected error.");
    }
  };

  const onInputChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0];
    if (!nextFile) return;
    await handleFile(nextFile);
  };

  const onDrop = async (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(false);
    const nextFile = event.dataTransfer.files?.[0];
    if (!nextFile) return;
    await handleFile(nextFile);
  };

  const downloadName = file ? `${file.name.replace(/\.[^.]+$/, "")}-no-bg.png` : "image-no-bg.png";

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#eff6ff,_#ffffff_45%)] text-slate-900">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-12 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <div className="space-y-8">
            <div className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-4 py-1 text-sm font-medium text-sky-700">
              Image Background Remover MVP
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl font-bold tracking-tight text-slate-950 sm:text-6xl">
                Remove background from image online.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-600">
                Upload one image and get a transparent PNG in seconds. No signup. No storage. Built for fast MVP validation with Remove.bg.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {[
                ["No signup", "Users can try the tool instantly without creating an account."],
                ["No storage", "Images are forwarded in memory and not saved on disk."],
                ["Fast output", "Optimized for quick upload → remove → download flow."],
              ].map(([title, desc]) => (
                <div key={title} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h2 className="font-semibold text-slate-900">{title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{desc}</p>
                </div>
              ))}
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">How it works</h2>
              <ol className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
                <li>1. Upload a JPG, PNG, or WEBP image up to 10MB.</li>
                <li>2. The server validates the file and sends it to Remove.bg.</li>
                <li>3. We return a transparent PNG directly to your browser for download.</li>
              </ol>
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50">
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-semibold text-slate-950">Try the tool</h2>
                <p className="mt-2 text-sm text-slate-500">Supported formats: JPG, PNG, WEBP · Max 10MB</p>
              </div>

              <label
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                className={`flex min-h-52 cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed px-6 py-10 text-center transition ${
                  dragging ? "border-sky-500 bg-sky-50" : "border-slate-300 bg-slate-50/80 hover:border-sky-400 hover:bg-sky-50/60"
                }`}
              >
                <div className="space-y-2">
                  <p className="text-base font-medium text-slate-800">Drop your image here</p>
                  <p className="text-sm text-slate-500">or click to browse from your device</p>
                </div>
                <input className="hidden" type="file" accept="image/png,image/jpeg,image/webp" onChange={onInputChange} />
              </label>

              {status === "uploading" && (
                <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700">
                  Removing background... this usually takes a few seconds.
                </div>
              )}

              {status === "error" && error && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
              )}

              {file && (
                <div className="grid gap-4 md:grid-cols-2">
                  <PreviewCard title="Original" imageUrl={originalUrl} alt="Original upload preview" />
                  <PreviewCard title="Result" imageUrl={resultUrl} alt="Background removed preview" />
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                {resultUrl && (
                  <a
                    href={resultUrl}
                    download={downloadName}
                    className="inline-flex items-center rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
                  >
                    Download PNG
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setResultUrl("");
                    setError("");
                    setStatus("idle");
                  }}
                  className="inline-flex items-center rounded-full border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        </div>

        <section className="mt-16 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-slate-950">Why this MVP exists</h2>
            <div className="mt-4 space-y-4 text-sm leading-7 text-slate-600">
              <p>
                This product is intentionally narrow: one upload, one background removal flow, one transparent PNG output. The goal is to validate demand for the keyword <strong>image background remover</strong> with the lightest possible architecture.
              </p>
              <p>
                The current stack uses Next.js and Tailwind CSS for the frontend experience, plus a server route that forwards the upload to Remove.bg without storing files on disk. That keeps the product simple, privacy-friendly, and inexpensive to launch.
              </p>
              <p>
                After validation, the roadmap can expand toward ecommerce white backgrounds, profile photo cleanup, and additional long-tail landing pages.
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-slate-950">FAQ</h2>
            <div className="mt-4 space-y-4 text-sm leading-7 text-slate-600">
              <div>
                <h3 className="font-semibold text-slate-900">Do you store my images?</h3>
                <p>No. This MVP is designed to process images in memory and return the result immediately.</p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">What file types are supported?</h3>
                <p>JPG, PNG, and WEBP, up to 10MB per upload.</p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Why might I hit a limit?</h3>
                <p>The MVP includes basic IP-based rate limiting to control Remove.bg costs and block abuse.</p>
              </div>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}

function PreviewCard({ title, imageUrl, alt }: { title: string; imageUrl: string; alt: string }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
      <div className="border-b border-slate-200 px-4 py-3 text-sm font-medium text-slate-700">{title}</div>
      <div className="flex min-h-64 items-center justify-center bg-[linear-gradient(45deg,#e2e8f0_25%,transparent_25%),linear-gradient(-45deg,#e2e8f0_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#e2e8f0_75%),linear-gradient(-45deg,transparent_75%,#e2e8f0_75%)] bg-[length:24px_24px] bg-[position:0_0,0_12px,12px_-12px,-12px_0px] p-4">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={alt} className="max-h-72 w-auto max-w-full rounded-2xl object-contain shadow-sm" />
        ) : (
          <span className="text-sm text-slate-400">Waiting for image...</span>
        )}
      </div>
    </div>
  );
}
