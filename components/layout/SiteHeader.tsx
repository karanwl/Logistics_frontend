"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

export interface NavLink {
  href: string;
  label: string;
  blocked?: boolean;
  onClick?: () => void;
}

export default function SiteHeader({
  title,
  subtitle,
  links,
  currentPath
}: {
  title: string;
  subtitle: string;
  links: NavLink[];
  currentPath?: string;
}) {
  const navId = useId();
  const headerRef = useRef<HTMLElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [currentPath]);

  useEffect(() => {
    if (!menuOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    const handlePointerDown = (event: MouseEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("keydown", handleEscape);
    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [menuOpen]);

  const isActiveLink = (href: string) => {
    if (!currentPath) return false;
    if (href === "/api-proxy/logout") return false;
    if (href === "/") return currentPath === "/";
    return currentPath === href || currentPath.startsWith(`${href}/`);
  };

  return (
    <header className="site-header" ref={headerRef}>
      <div className="site-header-top">
        <div className="brand">
          <div className="brand-mark">LP</div>
          <div>
            <div className="brand-title">{title}</div>
            <div className="brand-subtitle">{subtitle}</div>
          </div>
        </div>
        {links.length > 0 ? (
          <button
            type="button"
            className="site-nav-toggle"
            aria-expanded={menuOpen}
            aria-controls={navId}
            aria-label="Toggle navigation menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? "Close" : "Menu"}
          </button>
        ) : null}
      </div>
      {links.length > 0 ? (
        <nav id={navId} className={`site-nav${menuOpen ? " is-open" : ""}`} aria-label="Primary navigation">
          {links.map((link) => {
            const isLogout = link.href === "/api-proxy/logout";
            const active = isActiveLink(link.href);
            const className = `site-nav-link${active ? " is-active" : ""}${isLogout ? " is-logout" : ""}`;
            if (link.blocked) {
              return (
                <button
                  key={link.href}
                  type="button"
                  className={`${className} site-nav-blocked`}
                  aria-disabled="true"
                  aria-current={active ? "page" : undefined}
                  onClick={() => {
                    link.onClick?.();
                    setMenuOpen(false);
                  }}
                >
                  {link.label}
                </button>
              );
            }
            if (link.onClick && !isLogout) {
              return (
                <button
                  key={link.href}
                  type="button"
                  aria-current={active ? "page" : undefined}
                  onClick={() => {
                    link.onClick?.();
                    setMenuOpen(false);
                  }}
                  className={className}
                >
                  {link.label}
                </button>
              );
            }
            if (isLogout) {
              return (
                <button
                  key={link.href}
                  type="button"
                  className={className}
                  aria-current={active ? "page" : undefined}
                  onClick={() => {
                    (link.onClick || (() => (window.location.href = "/auth/login")))();
                    setMenuOpen(false);
                  }}
                >
                  {link.label}
                </button>
              );
            }
            return (
              <Link
                key={link.href}
                href={link.href}
                className={className}
                aria-current={active ? "page" : undefined}
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      ) : null}
    </header>
  );
}
