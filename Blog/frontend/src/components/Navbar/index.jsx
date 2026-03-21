import React from 'react';
import { Link, NavLink } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Home', end: true },
  { to: '/about', label: 'About Me' },
  { to: '/blog', label: 'Blog Articles' },
  { to: '/works', label: 'Works' },
];

const navLinkClassName = ({ isActive }) =>
  [
    "font-['Space_Grotesk'] uppercase tracking-[0.2em] text-sm transition-all duration-300",
    isActive
      ? 'text-[#ffb0ca] border-b-2 border-[#c1121f] pb-1'
      : 'text-[#e5bdb9] hover:text-[#e9c349] hover:skew-x-2',
  ].join(' ');

function Navbar() {
  return (
    <header className="fixed top-0 w-full z-50 bg-[#131315]/40 backdrop-blur-xl border-b border-[#5c403d]/20 shadow-[0_0_40px_rgba(147,0,10,0.05)]">
      <nav className="flex justify-between items-center px-6 md:px-12 py-6 max-w-full">
        <Link className="text-3xl font-black bg-gradient-to-r from-[#c1121f] to-[#ffb0ca] bg-clip-text text-transparent hover:animate-pulse font-headline" to="/">
          A
        </Link>

        <div className="hidden md:flex items-center gap-10">
          {navItems.map((item) => (
            <NavLink key={item.to} className={navLinkClassName} end={item.end} to={item.to}>
              {item.label}
            </NavLink>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <button className="material-symbols-outlined hidden md:inline-flex text-[#e5bdb9] scale-95 active:bg-[#c1121f]/10 transition-transform" aria-label="Open terminal">
            terminal
          </button>

          <button className="material-symbols-outlined text-secondary md:hidden" aria-label="Open menu">
            menu
          </button>
        </div>
      </nav>
    </header>
  );
}

export default Navbar;
