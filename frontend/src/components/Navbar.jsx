import React, { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { LuMenu, LuX } from "react-icons/lu";
import { SparkMark } from "./layout/AppShell";

// the public site
const LINKS = [
  { to: "/", name: "Home", end: true },
  { to: "/tournaments", name: "Tournaments" },
  { to: "/results", name: "Results" },
  { to: "/teams", name: "Teams" },
  { to: "/rankings", name: "Rankings" },
  { to: "/awards", name: "Awards" },
];

const link = ({ isActive }) => `rounded-md px-3 py-2 text-sm font-medium transition-colors ${isActive ? "bg-white/10 text-white" : "text-ink-200 hover:bg-white/5 hover:text-white"}`;

const Navbar = () => {
  const [open, setOpen] = useState(false);

  return (
    <header className="bg-ink-950 text-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-3" aria-label="Spark home">
          <SparkMark size={34} />
          <span className="text-[17px] font-bold tracking-tight">Spark</span>
        </Link>

        <nav className="ml-6 hidden items-center gap-1 md:flex" aria-label="Main">
          {LINKS.map((l) => (
            <NavLink key={l.name} to={l.to} end={l.end} className={link}>
              {l.name}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link to="/sign-in" className="hidden rounded-md px-3 py-2 text-sm font-medium text-ink-200 hover:bg-white/5 hover:text-white sm:inline-block">
            Log in
          </Link>
          <Link to="/sign-up" className="rounded-md bg-white px-3.5 py-2 text-sm font-semibold text-ink-900 hover:bg-ink-100">
            Register a team
          </Link>
          <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={open ? "Close menu" : "Open menu"} className="rounded-md p-2 text-ink-200 hover:bg-white/10 md:hidden">
            {open ? <LuX className="h-5 w-5" /> : <LuMenu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-white/10 px-4 pb-4 pt-2 md:hidden" aria-label="Menu">
          {LINKS.map((l) => (
            <NavLink key={l.name} to={l.to} end={l.end} onClick={() => setOpen(false)} className={(s) => `block ${link(s)} !text-base`}>
              {l.name}
            </NavLink>
          ))}
          <Link to="/sign-in" onClick={() => setOpen(false)} className="block rounded-md px-3 py-2 text-base font-medium text-ink-200 hover:bg-white/5 hover:text-white">
            Log in
          </Link>
        </nav>
      )}
    </header>
  );
};

export default Navbar;
