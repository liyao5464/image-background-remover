"use client";

import { ChangeEvent, DragEvent, useEffect, useMemo, useState } from "react";

type ApiError = { error?: string; detail?: string };
type Status = "idle" | "uploading" | "success" | "error";
type AuthState = "loading" | "ready" | "disabled";
type SessionUser = {
  id: string;
  name: string;
  email: string;
  image?: string;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          renderButton: (element: HTMLElement, options: Record<string, unknown>) => void;
          prompt: () => void;
        };
      };
    };
  }
}

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const GOOGLE_SCRIPT = "https://accounts.google.com/gsi/client";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = useState("");
  const [resultUrl, setResultUrl] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [googleClientId, setGoogleClientId] = useState("");
  const [authBusy, setAuthBusy] = useState(false);

  useEffect(() => {
    return () => {
      if (originalUrl) URL.revokeObjectURL(originalUrl);
      if (resultUrl) URL.revokeObjectURL(resultUrl);
    };
  }, [originalUrl, resultUrl]);

  useEffect(() => {
    void fetchSession();
  }, []);

  useEffect(() => {
    if (authState !== "ready" || !googleClientId || user) return;

    let cancelled = false;
    const initGoogle = () => {
      if (cancelled || !window.google) return;
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: ({ credential }) => {
          void signInWithGoogle(credential);
        },
        cancel_on_tap_outside: true,
      });
      const button = document.getElementById("google-signin-button");
      if (button) {
        button.innerHTML = "";
        window.google.accounts.id.renderButton(button, {
          theme: "outline",
          size: "large",
          shape: "pill",
          text: "signin_with",
          width: 260,
        });
      }
    };

    if (window.google) {
      initGoogle();
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>('script[data-google-gsi="1"]');
    if (existing) {
      existing.addEventListener("load", initGoogle, { once: true });
      return () => {
        cancelled = true;
      };
    }

    const script = document.createElement("script");
    script.src = GOOGLE_SCRIPT;
    script.async = true;
    script.defer = true;
    script.dataset.googleGsi = "1";
    script.onload = initGoogle;
    document.head.appendChild(script);

    return () => {
      cancelled = true;
    };
  }, [authState, googleClientId, user]);

  const canUpload = useMemo(() => Boolean(user), [user]);

  const fetchSession = async () => {
    try {
      const response = await fetch("/api/auth/session", { cache: "no-store" });
      const payload = (await response.json()) as {
        user: SessionUser | null;
        googleClientId: string;
        enabled: boolean;
      };
      setUser(payload.user);
      setGoogleClientId(payload.googleClientId);
      setAuthState(payload.enabled ? "ready" : "disabled");
    } catch {
      setAuthState("disabled");
    }
  };

  const signInWithGoogle = async (credential: string) => {
    setAuthBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential }),
      });
      const payload = (await response.json()) as { user?: SessionUser; error?: string };
      if (!response.ok || !payload.user) {
        throw new Error(payload.error || "Google 登录失败");
      }
      setUser(payload.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google 登录失败");
    } finally {
      setAuthBusy(false);
    }
  };

  const logout = async () => {
    setAuthBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      setResultUrl("");
      setFile(null);
    } finally {
      setAuthBusy(false);
    }
  };

  const validateFile = (nextFile: File) => {
    if (!canUpload) {
      return "请先使用 Google 登录后再上传图片。";
    }
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

        <section className="auth-panel">
          <div>
            <div className="auth-title">Google 登录</div>
            <div className="auth-subtitle">
              {authState === "disabled"
                ? "还没配置 Google 登录环境变量。先补 NEXT_PUBLIC_GOOGLE_CLIENT_ID 和 AUTH_SECRET。"
                : user
                  ? `已登录：${user.name}（${user.email}）`
                  : "登录后可开始上传图片并使用你的个人额度。"}
            </div>
          </div>

          {user ? (
            <div className="auth-user-box">
              {user.image ? <img src={user.image} alt={user.name} className="auth-avatar" /> : <div className="auth-avatar auth-avatar-fallback">{user.name.slice(0, 1)}</div>}
              <button className="secondary-btn" type="button" onClick={logout} disabled={authBusy}>
                退出登录
              </button>
            </div>
          ) : (
            <div id="google-signin-button" className="google-signin-slot">
              {authState === "loading" && <span className="status-info">正在加载登录能力…</span>}
              {authState === "disabled" && <span className="status-info">Google 登录暂未启用</span>}
            </div>
          )}
        </section>

        <section className="upload-section">
          <label
            className={`upload-box ${dragging ? "upload-box-active" : ""} ${!canUpload ? "upload-box-disabled" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              if (canUpload) setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
          >
            <div className="upload-box-inner">
              <div className="upload-icon">☁</div>
              <h2>{canUpload ? "拖拽图片到这里，或点击上传" : "请先登录后再上传"}</h2>
              <p>支持 JPG / PNG / WEBP，最大 10MB</p>
              <span className="upload-button">{canUpload ? "上传图片" : "先登录"}</span>
            </div>
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={onInputChange} disabled={!canUpload} />
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
