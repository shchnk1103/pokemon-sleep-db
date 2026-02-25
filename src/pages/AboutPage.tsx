export function AboutPage() {
  return (
    <section className="page about-page">
      <header className="section-header">
        <p className="eyebrow">About</p>
        <h2>关于我</h2>
      </header>

      <div className="about-card">
        <p>
          你好，我是这个 Pokemon Sleep 工具站的维护者。这个站点会专注于实用型内容：
          简明攻略、队伍思路、食材和树果收益计算。
        </p>
        <p>
          目前是第一版结构页面，后续计划加入更多模块，如食谱成本计算、睡眠评分参考和阶段化养成建议。
        </p>
      </div>
    </section>
  )
}
