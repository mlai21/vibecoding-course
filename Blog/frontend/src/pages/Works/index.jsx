import React from 'react';
import PostCard from '../../components/PostCard';

const projects = [
  {
    icon: 'rocket_launch',
    title: 'AEGIS_SYSTEM',
    description:
      'High-performance reactive interceptor architecture designed for sub-millisecond data processing in contested network environments.',
    tags: ['RUST', 'WEBRTC', 'WASM'],
    techSpec: 'v.2.4.0',
  },
  {
    icon: 'memory',
    title: 'NEURAL_VOID',
    description:
      'Deep learning model focused on generative landscape synthesis without procedural dependencies. Zero-point noise resolution.',
    tags: ['PYTORCH', 'CUDA'],
    techSpec: 'v.0.1.beta',
  },
  {
    icon: 'grid_view',
    title: 'HEX_CORE_UI',
    description:
      'A comprehensive design system framework for tactical interfaces, featuring real-time telemetry visualizers and glass-surface components.',
    tags: ['TAILWIND', 'TYPESCRIPT', 'FRAMER'],
    techSpec: 'v.5.0.1',
  },
  {
    icon: 'security',
    title: 'OBSIDIAN_GATE',
    description: 'Zero-trust authentication layer with multi-vector verification and biometric heartbeat integration.',
    tags: ['GO', 'GRPC'],
    techSpec: 'v.1.1.2',
  },
  {
    icon: 'database',
    title: 'KINETIC_DB',
    description: 'A time-series database optimized for high-velocity sensory input from edge computing clusters.',
    tags: ['C++', 'REDIS'],
    techSpec: 'v.3.9.0',
  },
  {
    icon: 'share',
    title: 'VECTOR_PULSE',
    description:
      'Distributed computing mesh for rendering complex geometric fractals across decentralized node networks.',
    tags: ['ELIXIR', 'PHOENIX'],
    techSpec: 'v.0.4.4',
  },
];

function Works() {
  return (
    <div className="pt-0 pb-20 px-6 md:px-12 max-w-7xl mx-auto">
      <div className="mb-20 flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="w-full md:max-w-4xl lg:max-w-5xl">
          <span className="text-secondary font-label text-xs tracking-[0.3em] uppercase mb-4 block">Archive_Access // Primary_Portfolio</span>
          <h1 className="safe-title text-5xl md:text-7xl lg:text-8xl font-black font-headline tracking-tighter bg-gradient-to-br from-[#c1121f] to-[#ffb0ca] bg-clip-text text-transparent uppercase leading-[1.02] [overflow-wrap:anywhere]">
            PROJECT_DATABASE
          </h1>
        </div>

        <div className="text-right border-l border-outline-variant/30 pl-6 hidden md:block">
          <p className="font-label text-secondary text-[10px] uppercase tracking-widest leading-relaxed">
            System_Status: Optimal
            <br />
            Entries_Found: 06
            <br />
            Last_Update: 2024.Q3
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {projects.map((project, idx) => (
          <PostCard key={project.title} index={idx + 1} project={project} />
        ))}
      </div>
    </div>
  );
}

export default Works;
