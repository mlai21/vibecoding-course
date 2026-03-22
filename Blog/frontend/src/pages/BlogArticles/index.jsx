import React, { useState } from 'react';
import ElectricBorder from '../../components/ElectricBorder';

const articles = [
  {
    id: '01_LOG_FILE',
    tag: 'Tactical UI',
    date: '2023.11.04',
    title: 'The Neural Interface: Designing for Zero Latency',
    desc: 'Exploring the physiological limits of human-machine interaction within high-stress combat environments. How visual hierarchy saves lives in the cockpit.',
    skew: 'hover:-skew-x-1',
    dotStrong: 'bg-primary-container',
    dotMid: 'bg-primary-container/40',
    dotWeak: 'bg-primary-container/10',
  },
  {
    id: '02_LOG_FILE',
    tag: 'System Architecture',
    date: '2023.10.28',
    title: 'Monolithic vs Mesh: The Tactical Commander OS',
    desc: "A deep dive into the backend infrastructure supporting the current tactical display systems. Stability over aesthetic, always.",
    skew: 'hover:skew-x-1',
    dotStrong: 'bg-secondary',
    dotMid: 'bg-secondary/40',
    dotWeak: 'bg-secondary/10',
  },
  {
    id: '03_LOG_FILE',
    tag: 'Visual Language',
    date: '2023.10.15',
    title: 'Crimson Aesthetics: Why Red Works in the Dark',
    desc: 'Psychological impact of high-energy color palettes on operator focus and fatigue. The science behind the Red Comet aesthetic.',
    skew: 'hover:-skew-x-1',
    dotStrong: 'bg-primary-container',
    dotMid: 'bg-primary-container/40',
    dotWeak: 'bg-primary-container/10',
  },
  {
    id: '04_LOG_FILE',
    tag: 'Field Reports',
    date: '2023.09.22',
    title: 'Optimization Patterns for Real-Time HUDs',
    desc: "Reducing cognitive load through predictive UI elements and sensory data clustering. A developer's perspective on combat interfaces.",
    skew: 'hover:skew-x-1',
    dotStrong: 'bg-secondary',
    dotMid: 'bg-secondary/40',
    dotWeak: 'bg-secondary/10',
  },
];

function BlogArticles() {
  const [activeCardId, setActiveCardId] = useState(null);

  return (
    <div className="px-6 md:px-12 pb-24 max-w-7xl mx-auto min-h-screen">
      <header className="mb-20 flex flex-col md:flex-row md:items-end justify-between gap-6 border-l-4 border-primary-container pl-6">
        <div>
          <p className="font-label text-secondary tracking-[0.3em] uppercase text-xs mb-2">ARCHIVE_ACCESS // SECTOR_7</p>
          <h1 className="text-5xl md:text-7xl font-black font-headline header-gradient safe-title leading-[1.08]">Blog Articles</h1>
        </div>
        <div className="text-right font-label text-[10px] text-on-surface-variant/40 space-y-1">
          <p>STATUS: ONLINE</p>
          <p>SYNC_VERSION: 2.4.0_REV</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {articles.map((article) => (
          <ElectricBorder
            key={article.id}
            active={activeCardId === article.id}
            color="#c1121f"
            speed={0.4}
            chaos={0.045}
            borderRadius={0}
            className={`${article.skew} transition-transform duration-500`}
          >
            <article
              className="group relative bg-surface-container-low p-8 border border-outline-variant/20 transition-all duration-500 hover:border-primary-container/40 hover:shadow-[0_0_50px_rgba(193,18,31,0.1)]"
              onMouseEnter={() => setActiveCardId(article.id)}
              onMouseLeave={() => setActiveCardId((current) => (current === article.id ? null : current))}
            >
              <div className="absolute top-0 right-0 p-4 font-label text-[10px] text-secondary/30">[{article.id}]</div>

              <div className="flex items-center gap-3 mb-6">
                <span className="px-2 py-1 bg-secondary/10 border border-secondary/20 text-secondary font-label text-[10px] tracking-widest uppercase">{article.tag}</span>
                <span className="text-on-surface-variant/40 font-label text-[10px]">{article.date}</span>
              </div>

              <h2 className="text-2xl font-headline font-bold text-on-surface mb-4 group-hover:text-tertiary transition-colors">{article.title}</h2>
              <p className="text-on-surface-variant leading-relaxed mb-8">{article.desc}</p>

              <div className="flex justify-between items-center">
                <button className="font-label text-xs uppercase tracking-widest text-primary hover:text-secondary flex items-center gap-2 transition-colors">
                  Read Entry
                  <span className="material-symbols-outlined text-sm" aria-hidden="true">
                    arrow_forward
                  </span>
                </button>
                <div className="flex gap-1">
                  <div className={`w-1 h-1 ${article.dotStrong}`} />
                  <div className={`w-1 h-1 ${article.dotMid}`} />
                  <div className={`w-1 h-1 ${article.dotWeak}`} />
                </div>
              </div>
            </article>
          </ElectricBorder>
        ))}
      </div>

      <section className="mt-32 p-12 border border-outline-variant/10 bg-surface-container-lowest/50 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary-container to-transparent opacity-30" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-4">
            <h3 className="font-label text-xs text-secondary tracking-widest uppercase">System_Metrics</h3>
            <div className="space-y-2 text-[10px] font-mono text-on-surface-variant/60">
              <div className="flex justify-between border-b border-outline-variant/5 pb-1">
                <span>ENTRIES_TOTAL</span>
                <span>142</span>
              </div>
              <div className="flex justify-between border-b border-outline-variant/5 pb-1">
                <span>ACTIVE_SESSIONS</span>
                <span>12</span>
              </div>
              <div className="flex justify-between border-b border-outline-variant/5 pb-1">
                <span>LAST_POST_HASH</span>
                <span>#C1121F</span>
              </div>
            </div>
          </div>

          <div className="md:col-span-2 flex items-center justify-center">
            <div className="w-full h-12 bg-surface-container-highest/20 border-x border-primary-container/20 flex items-center px-4">
              <div className="w-full bg-surface-container-highest h-[2px] relative">
                <div className="absolute left-1/4 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border border-primary-container bg-surface flex items-center justify-center">
                  <div className="w-1 h-1 bg-primary-container animate-ping" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default BlogArticles;
