import React from 'react';
import { useLocation } from 'react-router-dom';

const links = [
  { label: 'Contact', href: '#' },
  { label: 'Github', href: '#' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/qianye-tang-3a545b168/' },
  { label: 'Source', href: '#' },
];

function FooterLinks() {
  return (
    <div className="flex gap-8 md:gap-12">
      {links.map((item) => (
        <a
          key={item.label}
          href={item.href}
          rel={item.href.startsWith('http') ? 'noreferrer' : undefined}
          target={item.href.startsWith('http') ? '_blank' : undefined}
          className="font-['Space_Grotesk'] text-[10px] tracking-widest uppercase text-[#e5bdb9]/60 hover:text-[#e9c349] transition-colors cursor-crosshair"
        >
          {item.label}
        </a>
      ))}
    </div>
  );
}

function Footer() {
  const { pathname } = useLocation();

  if (pathname === '/about') {
    return (
      <footer className="w-full border-t border-[#5c403d]/20 py-12 bg-[#0e0e10]">
        <div className="flex flex-col md:flex-row justify-between items-center px-6 md:px-12 gap-8 max-w-7xl mx-auto">
          <div className="text-[#c1121f] font-bold font-headline tracking-widest">© ALVIN // TACTICAL_COMMANDER_OS</div>
          <FooterLinks />
          <div className="text-[#e9c349] font-headline text-[10px] tracking-widest uppercase opacity-40">SYSTEM_STABLE: 100%</div>
        </div>
      </footer>
    );
  }

  if (pathname === '/blog') {
    return (
      <footer className="w-full border-t border-[#5c403d]/20 py-12 bg-[#0e0e10]">
        <div className="flex flex-col md:flex-row justify-between items-center px-6 md:px-12 gap-8">
          <div className="text-[#c1121f] font-bold font-headline uppercase tracking-widest">© ALVIN // TACTICAL_COMMANDER_OS</div>
          <FooterLinks />
          <div className="text-[#e9c349] font-label text-[10px] flex items-center gap-2 uppercase tracking-widest">
            <span className="w-2 h-2 rounded-full bg-primary-container animate-pulse" />
            SYSTEM_STABLE
          </div>
        </div>
      </footer>
    );
  }

  if (pathname === '/works') {
    return (
      <footer className="w-full border-t border-[#5c403d]/20 py-12 bg-[#0e0e10]">
        <div className="flex flex-col md:flex-row justify-between items-center px-6 md:px-12 gap-8">
          <div className="text-[#c1121f] font-bold font-headline tracking-widest">ALVIN // TACTICAL_COMMANDER_OS</div>
          <FooterLinks />
          <div className="font-['Space_Grotesk'] text-[10px] tracking-widest uppercase text-[#e5bdb9]/40">© 2024 ALL_RIGHTS_RESERVED</div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="w-full border-t border-[#5c403d]/20 py-12 bg-[#0e0e10]">
      <div className="flex flex-col md:flex-row justify-between items-center px-6 md:px-12 gap-8">
        <div className="flex flex-col gap-2">
          <span className="text-[#c1121f] font-bold font-headline tracking-tighter text-xl">ALVIN</span>
          <p className="font-['Space_Grotesk'] text-[10px] tracking-widest uppercase text-[#e5bdb9]/60">© ALVIN // TACTICAL_COMMANDER_OS</p>
        </div>
        <FooterLinks />
        <div className="flex items-center gap-4">
          <span className="material-symbols-outlined text-primary-container text-sm" aria-hidden="true">
            verified
          </span>
          <span className="text-outline text-[10px] font-headline uppercase tracking-widest">Auth: 77-Commander</span>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
