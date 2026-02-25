import { NavLink } from 'react-router-dom'
import { quickStats } from '../data/pokedex'

export function HomePage() {
  return (
    <section className="page home-page">
      <div className="hero-card">
        <p className="eyebrow">Pokemon Sleep Toolkit</p>
        <h1>更轻松地管理睡眠队伍与资源收益</h1>
        <p className="hero-text">
          这是一个针对 Pokemon Sleep 的轻量攻略站，后续会加入食谱、树果收益、技能收益等计算器。
          当前先提供结构化页面和占位内容，便于你继续扩展真实数据。
        </p>
        <div className="hero-actions">
          <NavLink to="/dex" className="button primary">
            查看图鉴
          </NavLink>
          <NavLink to="/about" className="button ghost">
            关于本站
          </NavLink>
        </div>
      </div>

      <div className="stats-grid">
        {quickStats.map((item) => (
          <article key={item.label} className="stat-card">
            <p>{item.label}</p>
            <strong>{item.value}</strong>
          </article>
        ))}
      </div>
    </section>
  )
}
