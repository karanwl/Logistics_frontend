import Link from "next/link";

const links = [
  { href: "/planner", label: "Planner" },
  { href: "/schedule", label: "Schedule" },
  { href: "/planner/manual", label: "Manual Runs" },
  { href: "/planner/published", label: "Published" },
  { href: "/admin", label: "Admin" }
];

export default function Header() {
  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-steel-100 bg-white/90 backdrop-blur">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-ink-900 text-white grid place-items-center text-sm font-semibold">
          LP
        </div>
        <div>
          <div className="text-sm font-semibold">Logistics Planner</div>
          <div className="text-xs text-steel-500">Operations Console</div>
        </div>
      </div>
      <nav className="flex items-center gap-6 text-sm text-steel-600">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="hover:text-ink-900">
            {link.label}
          </Link>
        ))}
        <Link href="/auth/login" className="text-ink-900 font-semibold">Sign In</Link>
      </nav>
    </header>
  );
}

