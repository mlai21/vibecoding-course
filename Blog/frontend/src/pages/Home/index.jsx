import React from 'react';

function Home() {
  return (
    <>
      <section className="relative px-6 md:px-12 pt-4 md:pt-8 pb-20 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-on-primary-fixed-variant/10 blur-[120px] rounded-full -z-10" />

        <div className="max-w-7xl mx-auto flex flex-col items-start gap-8">
          <div className="flex items-center gap-4">
            <span className="text-secondary font-headline text-[10px] tracking-widest uppercase border-l-2 border-secondary pl-2">
              System Status: Active
            </span>
            <span className="text-outline text-[10px] font-headline">001_PRIME_COMMAND</span>
          </div>

          <h1 className="font-headline font-black text-6xl md:text-9xl tracking-tighter leading-none glow-text">
            <span className="block text-on-surface">HI HERE IS</span>
            <span className="block bg-gradient-to-r from-primary-container to-tertiary bg-clip-text text-transparent uppercase">ALVIN</span>
          </h1>

          <div className="flex flex-col md:flex-row gap-12 mt-4 items-start md:items-end w-full">
            <div className="max-w-xl">
              <p className="text-on-surface-variant text-lg leading-relaxed font-light">
                Tactical interface designer and systems architect. Crafting high-precision digital experiences where technical excellence meets cinematic aesthetics. Specializing in data-dense environments and high-performance front-ends.
              </p>
            </div>

            <div className="flex gap-8 font-headline text-xs tracking-[0.3em] uppercase">
              <a className="group flex items-center gap-2 text-on-surface hover:text-secondary transition-all" href="#">
                <span className="w-2 h-2 bg-primary-container group-hover:bg-secondary rotate-45 transition-colors" />
                View Projects
              </a>
              <a className="group flex items-center gap-2 text-on-surface hover:text-secondary transition-all" href="#">
                <span className="w-2 h-2 bg-primary-container group-hover:bg-secondary rotate-45 transition-colors" />
                Contact Me
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 md:px-12 py-24 bg-surface-container-low/50 relative">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-8 bg-surface-container p-8 relative chamfer-sm border-l-4 border-secondary group hover:bg-surface-container-highest transition-colors">
            <div className="flex justify-between items-start mb-12">
              <span className="text-secondary font-headline text-[10px] tracking-widest">[ PROJECT_LOG ]</span>
              <span className="material-symbols-outlined text-outline" aria-hidden="true">
                settings_input_component
              </span>
            </div>
            <h3 className="text-4xl font-headline font-bold mb-4">TACTICAL COMMANDER OS</h3>
            <p className="text-on-surface-variant max-w-lg mb-8">
              A conceptual operating system interface built for extreme data visibility and mission-critical decision making.
            </p>
            <div className="flex gap-4">
              <span className="px-3 py-1 bg-surface-container-highest text-[10px] font-headline uppercase tracking-wider text-secondary">React</span>
              <span className="px-3 py-1 bg-surface-container-highest text-[10px] font-headline uppercase tracking-wider text-secondary">WebGL</span>
            </div>
          </div>

          <div className="md:col-span-4 bg-surface-container-highest p-8 relative flex flex-col justify-between border-b border-outline-variant/20">
            <div className="font-headline">
              <span className="text-primary-container text-[10px] tracking-widest block mb-2">SYSTEM_STATS</span>
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-outline-variant/10 pb-2">
                  <span className="text-on-surface-variant text-xs">COGNITION</span>
                  <span className="text-secondary text-xs">98.2%</span>
                </div>
                <div className="flex justify-between items-center border-b border-outline-variant/10 pb-2">
                  <span className="text-on-surface-variant text-xs">EFFICIENCY</span>
                  <span className="text-secondary text-xs">A-RANK</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-on-surface-variant text-xs">UPTIME</span>
                  <span className="text-secondary text-xs">24/7/365</span>
                </div>
              </div>
            </div>
            <div className="mt-8">
              <div className="h-1 w-full bg-outline-variant/20 rounded-full overflow-hidden">
                <div className="h-full w-2/3 bg-gradient-to-r from-primary-container to-tertiary" />
              </div>
              <span className="text-[10px] text-outline mt-2 block font-headline">DEPLOYMENT_PROGRESS</span>
            </div>
          </div>

          <div className="md:col-span-4 bg-surface-variant/40 backdrop-blur-md p-8 chamfer-sm border border-outline-variant/10">
            <span className="material-symbols-outlined text-primary-container mb-6 block" aria-hidden="true">
              bolt
            </span>
            <h4 className="text-xl font-headline font-bold mb-2">RAPID DEPLOY</h4>
            <p className="text-on-surface-variant text-sm">Automated pipeline systems for high-frequency updates and tactical refinements.</p>
          </div>

          <div className="md:col-span-8 bg-surface-container p-8 flex flex-col md:flex-row gap-8 items-center border-t-2 border-primary-container/20">
            <div className="w-full md:w-1/2">
              <h4 className="text-2xl font-headline font-bold mb-4">INTERFACE PRECISION</h4>
              <p className="text-on-surface-variant text-sm leading-relaxed">
                Leveraging the latest in geometric design principles to create interfaces that are not just seen, but experienced as professional tools of the trade.
              </p>
            </div>
            <div className="w-full md:w-1/2 grid grid-cols-2 gap-2">
              <div className="h-20 bg-surface-container-highest chamfer-sm flex items-center justify-center text-outline-variant text-[10px] font-headline">MODULE_01</div>
              <div className="h-20 bg-surface-container-highest chamfer-sm flex items-center justify-center text-outline-variant text-[10px] font-headline">MODULE_02</div>
              <div className="h-20 bg-surface-container-highest chamfer-sm flex items-center justify-center text-outline-variant text-[10px] font-headline">MODULE_03</div>
              <div className="h-20 bg-surface-container-highest chamfer-sm flex items-center justify-center text-outline-variant text-[10px] font-headline">MODULE_04</div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export default Home;
