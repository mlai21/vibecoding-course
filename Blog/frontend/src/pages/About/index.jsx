import React from 'react';

const competencies = [
  {
    title: 'SYSTEMS_ENGINEERING',
    level: 'LEVEL: 98%',
    copy: (
      <>
        Mastery in React, Next.js, and TypeScript. Building component libraries that function as precision-tooled machinery. Deep expertise in{' '}
        <span className="text-tertiary font-bold">Tailwind CSS</span> for rapid, pixel-perfect deployment.
      </>
    ),
  },
  {
    title: 'DATA_VISUALIZATION',
    level: 'LEVEL: 85%',
    copy: (
      <>
        Transforming raw telemetry into actionable insights using D3.js and Three.js. Focus on <span className="text-tertiary font-bold">real-time HUD interfaces</span> and complex dashboard orchestration.
      </>
    ),
  },
  {
    title: 'CREATIVE_COMMAND',
    level: 'LEVEL: 92%',
    copy: (
      <>
        Art direction with a focus on dark-aesthetic cinematic UI. Implementing <span className="text-tertiary font-bold">Glassmorphism</span>, sophisticated motion curves, and atmospheric lighting within the digital canvas.
      </>
    ),
  },
];

const stackRows = [
  ['FRAMEWORK', 'NEXT.JS 14'],
  ['LANGUAGE', 'TYPESCRIPT'],
  ['STYLING', 'TAILWIND_CSS'],
  ['BACKEND', 'NODE/SUPABASE'],
  ['ANIMATION', 'FRAMER_MOTION'],
  ['DATABASE', 'POSTGRESQL'],
];

function About() {
  return (
    <div className="px-6 md:px-12 pb-24 tech-grid">
      <div className="max-w-7xl mx-auto">
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start mb-32">
          <div className="lg:col-span-7">
            <div className="inline-block border-l-4 border-secondary pl-4 mb-6">
              <span className="font-label text-secondary tracking-widest text-sm uppercase">Subject Profile // 001</span>
            </div>
            <h1 className="font-headline text-6xl md:text-8xl font-black leading-tight tracking-tighter mb-8">
              <span className="block bg-gradient-to-r from-primary-container to-tertiary bg-clip-text text-transparent">ALVIN</span>
              <span className="block text-on-surface">COMMANDER_OS</span>
            </h1>
            <p className="text-xl md:text-2xl text-on-surface-variant font-light leading-relaxed max-w-2xl">
              Architecting high-precision digital interfaces where <span className="text-tertiary font-bold">Tactical Logic</span> meets{' '}
              <span className="text-secondary font-bold">Cinematic Aesthetics</span>. Specializing in systems that demand absolute technical clarity.
            </p>
          </div>

          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <div className="relative w-72 h-72 border border-outline-variant/30 chamfered p-8 bg-surface-container-low/50 backdrop-blur-sm">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-full h-full opacity-20 bg-[repeating-linear-gradient(45deg,#c1121f_0,#c1121f_1px,transparent_0,transparent_10px)]" />
              </div>
              <div className="relative w-full h-full flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <span className="text-[8px] text-secondary font-mono">RX-78-2 // SYSTEM_BOOT</span>
                  <div className="w-4 h-4 border-t-2 border-r-2 border-primary" />
                </div>
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-[12rem] font-headline font-black leading-none text-primary-container/20 select-none">A</div>
                  <div className="absolute w-48 h-1 bg-gradient-to-r from-transparent via-tertiary to-transparent -rotate-45" />
                  <div className="absolute w-48 h-1 bg-gradient-to-r from-transparent via-primary to-transparent rotate-45" />
                </div>
                <div className="flex justify-between items-end">
                  <div className="w-4 h-4 border-b-2 border-l-2 border-secondary" />
                  <span className="text-[8px] text-primary font-mono">ENCRYPTED_ID: 1109-ALVIN</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-32">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-outline-variant/20">
            <div className="p-8 border-r border-b md:border-b-0 border-outline-variant/20 bg-surface-container-lowest">
              <span className="font-label text-secondary text-xs tracking-[0.3em] mb-4 block uppercase">Strategic Focus</span>
              <h3 className="font-headline text-2xl font-bold mb-4 text-on-surface">UI ARCHITECTURE</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">Developing deterministic design systems that eliminate ambiguity and maximize operational efficiency.</p>
            </div>
            <div className="p-8 border-r border-b md:border-b-0 border-outline-variant/20 bg-surface-container-low">
              <span className="font-label text-secondary text-xs tracking-[0.3em] mb-4 block uppercase">Tactical Range</span>
              <h3 className="font-headline text-2xl font-bold mb-4 text-on-surface">FULL STACK DEV</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">Seamlessly integrating complex front-end interactions with robust, scalable back-end infrastructure.</p>
            </div>
            <div className="p-8 bg-surface-container-lowest">
              <span className="font-label text-secondary text-xs tracking-[0.3em] mb-4 block uppercase">Mission Protocol</span>
              <h3 className="font-headline text-2xl font-bold mb-4 text-on-surface">USER EXPERIENCE</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">Prioritizing cognitive load reduction through high-contrast hierarchies and data-driven navigation.</p>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          <div className="lg:col-span-8">
            <h2 className="font-headline text-4xl font-bold mb-12 flex items-center gap-4">
              <span className="w-12 h-[2px] bg-primary" />
              CORE_COMPETENCIES
            </h2>

            <div className="space-y-12">
              {competencies.map((item) => (
                <div className="group" key={item.title}>
                  <div className="flex justify-between items-end mb-4">
                    <h4 className="font-headline text-xl font-bold text-tertiary">{item.title}</h4>
                    <span className="text-secondary font-mono text-xs">{item.level}</span>
                  </div>
                  <p className="text-on-surface-variant mb-6 border-l border-outline-variant pl-6">{item.copy}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-4 lg:mt-24">
            <div className="bg-surface-container p-8 chamfered border-l-2 border-tertiary">
              <h3 className="font-headline text-xs tracking-widest text-secondary mb-8 flex justify-between items-center">
                HARDWARE_SOFTWARE_STACK
                <span className="material-symbols-outlined text-[10px]" aria-hidden="true">
                  settings_input_component
                </span>
              </h3>

              <ul className="space-y-4 font-mono text-[11px]">
                {stackRows.map(([label, value], index) => (
                  <li
                    className={`flex justify-between items-center ${index === stackRows.length - 1 ? '' : 'border-b border-outline-variant/10 pb-2'}`}
                    key={label}
                  >
                    <span className="text-on-surface-variant data-bracket">{label}</span>
                    <span className="text-on-surface">{value}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8 pt-8 border-t border-outline-variant/20">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-[10px] text-primary-fixed uppercase tracking-tighter">Status: Open for Strategic Collaborations</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default About;
