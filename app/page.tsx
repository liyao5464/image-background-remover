"use client";

import { ChangeEvent, DragEvent, useEffect, useState } from "react";

type ApiError = { error?: string; detail?: string };
type Status = "idle" | "uploading" | "success" | "error";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = useState("");
  const [resultUrl, setResultUrl] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    return () => {
      if (originalUrl) URL.revokeObjectURL(originalUrl);
      if (resultUrl) URL.revokeObjectURL(resultUrl);
    };
  }, [originalUrl, resultUrl]);

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

    if (originalUrl) URL.revokeObjectURL(originalUrl);
    if (resultUrl) URL.revokeObjectURL(resultUrl);

    const nextOriginalUrl = URL.createObjectURL(nextFile);
    setOriginalUrl(nextOriginalUrl);
    setFile(nextFile);
    setResultUrl("");
    setError("");
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
      const nextResultUrl = URL.createObjectURL(blob);
      setResultUrl(nextResultUrl);
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

  const resetAll = () => {
    if (originalUrl) URL.revokeObjectURL(originalUrl);
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setFile(null);
    setOriginalUrl("");
    setResultUrl("");
    setError("");
    setStatus("idle");
  };

  const downloadName = file ? `${file.name.replace(/\.[^.]+$/, "")}-no-bg.png` : "image-no-bg.png";

  return (
    <main className="tool-page">
      <div className="tool-container">
        <header className="hero">
          <div className="hero-badge">AI Background Remover</div>
          <h1>AI 一键去除图片背景</h1>
          <p>
            3 秒抠图，无需 Photoshop，不保存图片。上传后直接生成透明背景 PNG，适合商品图、人像和设计素材。
          </p>
        </header>

        <section className="upload-section">
          <label
            className={`upload-box ${dragging ? "upload-box-active" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
          >
            <div className="upload-box-inner">
              <div className="upload-icon">☁</div>
              <h2>拖拽图片到这里，或点击上传</h2>
              <p>支持 JPG / PNG / WEBP，最大 10MB</p>
              <span className="upload-button">上传图片</span>
            </div>
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={onInputChange} />
          </label>

          {status === "uploading" && <div className="status-info">正在去除背景，请稍等几秒…</div>}
          {status === "error" && error && <div className="status-error">{error}</div>}

          {(originalUrl || resultUrl) && (
            <div className="preview-grid">
              <PreviewCard title="原图" imageUrl={originalUrl} alt="original preview" />
              <PreviewCard title="去背景结果" imageUrl={resultUrl} alt="result preview" />
            </div>
          )}

          <div className="action-row">
            {resultUrl && (
              <a className="primary-btn" href={resultUrl} download={downloadName}>
                下载透明 PNG
              </a>
            )}
            <button className="secondary-btn" type="button" onClick={resetAll}>
              重新上传
            </button>
          </div>
        </section>

        <section className="feature-strip">
          <article className="feature-item">
            <div className="feature-icon">🛍️</div>
            <h3>电商产品图</h3>
            <p>快速生成透明底图或白底主图，适合商品上架和素材整理。</p>
          </article>
          <article className="feature-item">
            <div className="feature-icon">🎨</div>
            <h3>设计素材</h3>
            <p>人物、Logo、海报元素一键抠图，提升设计和排版效率。</p>
          </article>
          <article className="feature-item">
            <div className="feature-icon">📱</div>
            <h3>社交头像</h3>
            <p>适合头像、封面和内容素材处理，拿到结果后即可继续二次编辑。</p>
          </article>
        </section>
      </div>
    </main>
  );
}

function PreviewCard({ title, imageUrl, alt }: { title: string; imageUrl: string; alt: string }) {
  return (
    <div className="preview-card">
      <div className="preview-head">{title}</div>
      <div className="preview-body">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={alt} className="preview-image" />
        ) : (
          <span className="preview-empty">等待图片…</span>
        )}
      </div>
    </div>
  );
}
