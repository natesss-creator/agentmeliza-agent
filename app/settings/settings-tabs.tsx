import Link from "next/link";

const TABS = [
  { href: "/settings/connections", label: "Connections" },
  { href: "/settings/api-keys", label: "API keys" },
] as const;

export function SettingsTabs({ active }: { readonly active: (typeof TABS)[number]["href"] }) {
  return (
    <nav aria-label="Settings" className="mx-auto flex max-w-2xl gap-1 border-b px-5 pt-6 sm:px-7">
      {TABS.map((tab) => (
        <Link
          aria-current={tab.href === active ? "page" : undefined}
          className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
            tab.href === active ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          href={tab.href}
          key={tab.href}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
