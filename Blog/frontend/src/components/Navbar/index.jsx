import React from 'react';
import { useLocation } from 'react-router-dom';
import PillNav from '../PillNav';

const navItems = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About Me' },
  { href: '/blog', label: 'Blog Articles' },
  { href: '/works', label: 'Works' },
];

const logoSvg = `data:image/svg+xml;utf8,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#c1121f"/>
        <stop offset="1" stop-color="#ffb0ca"/>
      </linearGradient>
    </defs>
    <rect width="64" height="64" rx="32" fill="#0f0d12"/>
    <text x="32" y="42" text-anchor="middle" font-size="38" font-family="Space Grotesk, sans-serif" font-weight="800" fill="url(#g)">A</text>
  </svg>
`)}`;

const getActiveHref = (pathname) => {
  const found = navItems.find((item) => pathname === item.href || (item.href !== '/' && pathname.startsWith(`${item.href}/`)));
  return found?.href ?? '/';
};

function Navbar() {
  const { pathname } = useLocation();

  return (
    <header className="fixed top-0 w-full z-50 bg-[#131315]/40 backdrop-blur-xl border-b border-[#5c403d]/20 shadow-[0_0_40px_rgba(147,0,10,0.05)]">
      <div className="max-w-7xl mx-auto px-3 md:px-6 py-3">
        <PillNav
          logo={logoSvg}
          logoAlt="Alvin"
          items={navItems}
          activeHref={getActiveHref(pathname)}
          className="mx-auto"
          baseColor="#0f0d12"
          pillColor="#17121b"
          pillTextColor="#e8d9d5"
          hoveredPillTextColor="#0f0d12"
          initialLoadAnimation={false}
        />
      </div>
    </header>
  );
}

export default Navbar;
