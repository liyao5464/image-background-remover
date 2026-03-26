import Link from "next/link";

export default function DashboardPage() {
  return (
    <main className="dashboard-page">
      <div className="dashboard-container">
        <header className="dashboard-hero">
          <div>
            <p className="section-kicker">Dashboard</p>
            <h1>个人中心</h1>
            <p>查看你的账户、套餐状态、剩余额度和最近使用记录。</p>
          </div>
          <Link href="/" className="secondary-btn">返回首页</Link>
        </header>

        <section className="dashboard-grid">
          <article className="dashboard-card user-card">
            <h2>账户信息</h2>
            <div className="user-row">
              <div className="avatar-circle">L</div>
              <div>
                <strong>leo</strong>
                <p>liyao5464@gmail.com</p>
              </div>
            </div>
            <ul className="meta-list">
              <li>登录方式：Google</li>
              <li>账户状态：正常</li>
              <li>注册时间：2026-03-21</li>
            </ul>
          </article>

          <article className="dashboard-card plan-card-dashboard">
            <h2>我的套餐与额度</h2>
            <div className="plan-status">当前套餐：<strong>免费体验</strong></div>
            <div className="quota-box">
              <span>剩余额度</span>
              <strong>2 / 3 次</strong>
            </div>
            <p className="muted">适合先体验效果，如需继续使用可购买积分包或月卡。</p>
            <div className="action-row">
              <button className="primary-btn">购买积分包</button>
              <button className="secondary-btn">开通月卡</button>
            </div>
          </article>
        </section>

        <section className="dashboard-card">
          <h2>推荐套餐</h2>
          <div className="mini-plan-grid">
            <article className="mini-plan">
              <h3>积分包</h3>
              <p className="mini-price">¥9.9 起</p>
              <p>适合偶尔使用，按需购买更灵活。</p>
            </article>
            <article className="mini-plan featured-mini">
              <h3>Pro 月卡</h3>
              <p className="mini-price">¥29 / 月</p>
              <p>每月 150 次，更适合高频使用。</p>
            </article>
            <article className="mini-plan">
              <h3>Pro Plus</h3>
              <p className="mini-price">¥49 / 月</p>
              <p>每月 400 次，适合批量处理。</p>
            </article>
          </div>
        </section>

        <section className="dashboard-card">
          <h2>最近使用记录</h2>
          <div className="usage-list">
            <div className="usage-item"><span>2026-03-26 22:11</span><strong>去除背景成功</strong><em>1 次额度</em></div>
            <div className="usage-item"><span>2026-03-26 22:04</span><strong>去除背景成功</strong><em>1 次额度</em></div>
            <div className="usage-item"><span>2026-03-26 21:57</span><strong>去除背景成功</strong><em>1 次额度</em></div>
          </div>
        </section>
      </div>
    </main>
  );
}
