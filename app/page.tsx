"use client";

import Link from "next/link";
import { ChangeEvent, DragEvent, useEffect, useMemo, useState } from "react";

type ApiError = { error?: string; detail?: string };
type Status = "idle" | "uploading" | "success" | "error";
type AuthState = "loading" | "ready" | "disabled";
type SessionUser = { id: string; name: string; email: string; image?: string };
type QuotaState = { used: number; remaining: number; resetAt: number; limit: number };

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

const plans = [
  { name: "免费体验", price: "¥0", desc: "Google 登录后赠送 3 次免费额度", items: ["注册即送 3 次", "基础处理速度", "适合首次体验", "用完后可升级"], cta: "立即免费开始", featured: false },
  { name: "积分包", price: "¥9.9 起", desc: "按需购买，适合低频使用", items: ["30 / 80 / 200 次可选", "一次购买按次消耗", "不想订阅也能用", "更适合偶尔处理图片"], cta: "购买积分包", featured: false },
  { name: "Pro 月卡", price: "¥29 / 月", desc: "适合个人创作者与高频用户", items: ["每月 150 次", "比单买积分更划算", "更适合持续使用", "优先处理"], cta: "开通 Pro 月卡", featured: true },
  { name: "Pro Plus", price: "¥49 / 月", desc: "适合更高频、更重度的使用需求", items: ["每月 400 次", "更高额度", "优先处理", "适合批量素材处理"], cta: "开通 Pro Plus", featured: false },
];

const packs = [
  { name: "入门包", price: "¥9.9", count: "30 次", desc: "适合先试试，偶尔处理少量图片" },
  { name: "标准包", price: "¥19.9", count: "80 次", desc: "适合不想订阅、但会反复使用的人" },
  { name: "进阶包", price: "¥39.9", count: "200 次", desc: "适合短时间内集中处理大量素材" },
];

const faqs = [
  { q: "免费可以用多少次？", a: "Google 登录后可获得 3 次免费抠图额度，用于体验核心功能。" },
  { q: "为什么不是永久免费？", a: "图片处理会产生真实 API 成本。为了保证服务稳定和长期可用，我们采用低门槛试用 + 按需购买的方式。" },
  { q: "积分包和月卡有什么区别？", a: "积分包适合偶尔使用，按次消耗；月卡适合高频用户，每月获得固定额度。" },
  { q: "积分会过期吗？", a: "积分包购买后可长期使用，不按月清零。" },
  { q: "月卡额度用完怎么办？", a: "可以等待下个周期重置，也可以额外购买积分包继续使用。" },
  { q: "后续会支持 PayPal 吗？", a: "会。后续我们会逐步支持更多支付方式。" },
];

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = useState("");
  const [resultUrl, setResultUrl] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [quota, setQuota] = useState<QuotaState | null>(null);
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
        callback: ({ credential }) => void signInWithGoogle(credential),
        cancel_on_tap_outside: true,
      });
      const button = document.getElementById("google-signin-button");
      if (button) {
        button.innerHTML = "";
        window.google.accounts.id.renderButton(button, { theme: "outline", size: "large", shape: "pill", text: "signin_with", width: 260 });
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
      const payload = (await response.json()) as { user: SessionUser | null; googleClientId: string; enabled: boolean };
      setUser(payload.user);
      setGoogleClientId(payload.googleClientId);
      setAuthState(payload.enabled ? "ready" : "disabled");
      if (payload.user) await fetchQuota();
      else setQuota(null);
    } catch {
      setAuthState("disabled");
    }
  };

  const fetchQuota = async () => {
    try {
      const response = await fetch("/api/quota", { cache: "no-store" });
      const payload = (await response.json()) as { quota: QuotaState | null };
      setQuota(payload.quota);
    } catch {
      setQuota(null);
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
      if (!response.ok || !payload.user) throw new Error(payload.error || "Google 登录失败");
      setUser(payload.user);
      await fetchQuota();
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
      setQuota(null);
      setResultUrl("");
      setFile(null);
    } finally {
      setAuthBusy(false);
    }
  };

  const validateFile = (nextFile: File) => {
    if (!canUpload) return "请先使用 Google 登录后再上传图片。";
    if (!ACCEPTED_TYPES.includes(nextFile.type)) return "Only JPG, PNG, and WEBP files are supported.";
    if (nextFile.size > MAX_FILE_SIZE) return "File too large. Please upload an image smaller than 10MB.";
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
      const response = await fetch("/api/remove-background", { method: "POST", body: formData });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as ApiError;
        throw new Error(payload.error || "Failed to remove background. Please try again.");
      }
      const blob = await response.blob();
      const nextResultUrl = URL.createObjectURL(blob);
      setResultUrl(nextResultUrl);
      setStatus("success");
      await fetchQuota();
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
          <nav className="top-nav">
            <a href="#pricing">套餐</a>
            <a href="#faq">FAQ</a>
            <Link href="/dashboard">个人中心</Link>
          </nav>
          <h1>AI 一键去除图片背景</h1>
          <p>注册即可获得 <strong>3 次免费额度</strong>。偶尔使用可购买积分包，经常使用可开通月卡，按需选择，更灵活也更划算。</p>
          <div className="hero-actions">
            <a className="primary-btn" href="#upload">立即免费开始</a>
            <a className="secondary-btn" href="#pricing">查看套餐</a>
          </div>
          <div className="hero-meta">支持 PNG / JPG / WEBP · 适合商品图、人像、封面和设计素材</div>
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
            {user && quota && <div className="quota-pill">今日已用 {quota.used}/{quota.limit} · 剩余 {quota.remaining} 次</div>}
          </div>

          {user ? (
            <div className="auth-user-box">
              {user.image ? <img src={user.image} alt={user.name} className="auth-avatar" /> : <div className="auth-avatar auth-avatar-fallback">{user.name.slice(0, 1)}</div>}
              <button className="secondary-btn" type="button" onClick={logout} disabled={authBusy}>退出登录</button>
            </div>
          ) : (
            <div id="google-signin-button" className="google-signin-slot">
              {authState === "loading" && <span className="status-info">正在加载登录能力…</span>}
              {authState === "disabled" && <span className="status-info">Google 登录暂未启用</span>}
            </div>
          )}
        </section>

        <section className="upload-section" id="upload">
          <label className={`upload-box ${dragging ? "upload-box-active" : ""} ${!canUpload ? "upload-box-disabled" : ""}`} onDragOver={(e) => { e.preventDefault(); if (canUpload) setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={onDrop}>
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
            {resultUrl && <a className="primary-btn" href={resultUrl} download={downloadName}>下载透明 PNG</a>}
            <button className="secondary-btn" type="button" onClick={resetAll}>重新上传</button>
          </div>
        </section>

        <section className="feature-strip">
          <article className="feature-item"><div className="feature-icon">🛍️</div><h3>电商产品图</h3><p>快速生成透明底图或白底主图，适合商品上架和素材整理。</p></article>
          <article className="feature-item"><div className="feature-icon">🎨</div><h3>设计素材</h3><p>人物、Logo、海报元素一键抠图，提升设计和排版效率。</p></article>
          <article className="feature-item"><div className="feature-icon">📱</div><h3>社交头像</h3><p>适合头像、封面和内容素材处理，拿到结果后即可继续二次编辑。</p></article>
        </section>

        <section className="pricing-section" id="pricing">
          <div className="section-head">
            <span className="section-kicker">Pricing</span>
            <h2>选择适合你的抠图方案</h2>
            <p>免费体验、积分包、月卡订阅，按你的使用频率灵活选择。</p>
          </div>
          <div className="pricing-grid">
            {plans.map((plan) => (
              <article key={plan.name} className={`plan-card ${plan.featured ? "plan-card-featured" : ""}`}>
                {plan.featured && <div className="plan-badge">推荐</div>}
                <h3>{plan.name}</h3>
                <div className="plan-price">{plan.price}</div>
                <p className="plan-desc">{plan.desc}</p>
                <ul className="plan-list">{plan.items.map((item) => <li key={item}>{item}</li>)}</ul>
                <button className={plan.featured ? "primary-btn" : "secondary-btn"}>{plan.cta}</button>
              </article>
            ))}
          </div>
        </section>

        <section className="pack-section">
          <div className="section-head">
            <span className="section-kicker">Credits</span>
            <h2>不想订阅？也可以按次购买</h2>
            <p>如果你只是偶尔处理几张图片，积分包会更灵活。</p>
          </div>
          <div className="pack-grid">
            {packs.map((pack) => (
              <article key={pack.name} className="pack-card">
                <h3>{pack.name}</h3>
                <div className="plan-price">{pack.price}</div>
                <div className="pack-count">{pack.count}</div>
                <p>{pack.desc}</p>
                <button className="secondary-btn">选择{pack.name}</button>
              </article>
            ))}
          </div>
        </section>

        <section className="choose-section">
          <div className="section-head left"><span className="section-kicker">How to choose</span><h2>不知道选哪个？按你的使用习惯来选</h2></div>
          <div className="choose-grid">
            <article className="choose-card"><h3>免费体验</h3><p>如果你只是第一次使用，先体验效果，免费额度就够了。</p></article>
            <article className="choose-card"><h3>积分包</h3><p>如果你只是偶尔抠几张图，不想按月付费，积分包更适合你。</p></article>
            <article className="choose-card"><h3>Pro 月卡</h3><p>如果你会经常做封面、人物图、商品图或社交媒体素材，月卡更划算。</p></article>
            <article className="choose-card"><h3>Pro Plus</h3><p>如果你处理图片频率更高，或者你本身就在做电商、自媒体和批量素材工作，Pro Plus 更适合。</p></article>
          </div>
        </section>

        <section className="compare-section">
          <div className="section-head left"><span className="section-kicker">Compare</span><h2>功能与额度对比</h2></div>
          <div className="table-wrap">
            <table className="compare-table">
              <thead><tr><th>方案</th><th>免费体验</th><th>积分包</th><th>Pro 月卡</th><th>Pro Plus</th></tr></thead>
              <tbody>
                <tr><td>获得方式</td><td>注册赠送</td><td>一次性购买</td><td>月订阅</td><td>月订阅</td></tr>
                <tr><td>可用额度</td><td>3 次</td><td>按购买次数</td><td>150 次 / 月</td><td>400 次 / 月</td></tr>
                <tr><td>适合人群</td><td>首次体验</td><td>低频用户</td><td>高频个人用户</td><td>重度用户</td></tr>
                <tr><td>优先处理</td><td>否</td><td>否</td><td>是</td><td>是</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="faq-section" id="faq">
          <div className="section-head left"><span className="section-kicker">FAQ</span><h2>常见问题</h2></div>
          <div className="faq-list">{faqs.map((faq) => <article key={faq.q} className="faq-item"><h3>{faq.q}</h3><p>{faq.a}</p></article>)}</div>
        </section>

        <section className="final-cta">
          <h2>先免费体验，再按需升级</h2>
          <p>注册即可获得 3 次免费额度。如果你只是偶尔处理图片，积分包就够；如果你经常使用，月卡会更划算。</p>
          <div className="hero-actions">
            <a className="primary-btn" href="#upload">立即免费开始</a>
            <button className="secondary-btn">购买积分包</button>
            <button className="secondary-btn">开通 Pro 月卡</button>
          </div>
        </section>
      </div>
    </main>
  );
}

function PreviewCard({ title, imageUrl, alt }: { title: string; imageUrl: string; alt: string }) {
  return (
    <div className="preview-card">
      <div className="preview-head">{title}</div>
      <div className="preview-body">{imageUrl ? <img src={imageUrl} alt={alt} className="preview-image" /> : <span className="preview-empty">等待图片…</span>}</div>
    </div>
  );
}
