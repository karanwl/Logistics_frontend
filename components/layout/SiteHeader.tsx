import Link from "next/link";

export interface NavLink {
  href: string;
  label: string;
}

export default function SiteHeader({
  title,
  subtitle,
  links
}: {
  title: string;
  subtitle: string;
  links: NavLink[];
}) {
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
          if (isLogout) {
            return (
              <a key={link.href} href={link.href} rel="nofollow">
                {link.label}
              </a>
            );
          }
          return (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
