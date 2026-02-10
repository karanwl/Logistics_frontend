import Link from "next/link";

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
  const isActiveLink = (href: string) => {
    if (!currentPath) return false;
    if (href === "/api-proxy/logout") return false;
    if (href === "/") return currentPath === "/";
    return currentPath === href || currentPath.startsWith(`${href}/`);
  };

  return (
    <header className="site-header">
      <div className="brand">
        <div className="brand-mark">LP</div>
        <div>
          <div className="brand-title">{title}</div>
          <div className="brand-subtitle">{subtitle}</div>
        </div>
      </div>
      <nav className="site-nav">
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
                onClick={link.onClick}
              >
                {link.label}
              </button>
            );
          }
          if (link.onClick && !isLogout) {
            return (
              <button key={link.href} type="button" onClick={link.onClick} className={className}>
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
                onClick={link.onClick || (() => (window.location.href = "/auth/login"))}
              >
                {link.label}
              </button>
            );
          }
          return (
            <Link key={link.href} href={link.href} className={className}>
              {link.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
