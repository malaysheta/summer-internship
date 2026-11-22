"use client";

import { Link } from "@/i18n/routing";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface SidebarItem {
  name: string;
  href: string;
  hash?: string;
  description: string;
}

const navigationItems: SidebarItem[] = [
  {
    name: "Profile",
    href: "/settings",
    hash: "#profile",
    description: "Manage your personal details and email",
  },
  {
    name: "Preferences",
    href: "/settings",
    hash: "#preferences",
    description: "Change language settings and notifications",
  },
  {
    name: "Security",
    href: "/settings",
    hash: "#sessions",
    description: "Track active sessions and manage danger zone",
  },
];

const adminNavigationItems = [
  {
    name: "Admin Dashboard",
    href: "/admin",
    description: "High-level metrics and usage statistics",
  },
  {
    name: "Audit Logs",
    href: "/admin/audit",
    description: "Trace chronological LLM usage logs",
  },
];

export function SettingsSidebar() {
  const [activeHash, setActiveHash] = useState("#profile");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Set initial active section from hash or default to profile
    if (window.location.hash) {
      setActiveHash(window.location.hash);
    }

    const handleHashChange = () => {
      setActiveHash(window.location.hash || "#profile");
    };

    window.addEventListener("hashchange", handleHashChange);

    // Fetch user profile to check if user is admin
    fetch("/api/users/me")
      .then((res) => {
        if (res.ok) return res.json();
        return null;
      })
      .then((user) => {
        if (user && user.role === "admin") {
          setIsAdmin(true);
        }
      })
      .catch((err) => console.error("Error fetching user in settings sidebar:", err));

    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const itemClass = (active: boolean) =>
    cn(
      "group grid grid-cols-[32px_1fr] gap-x-2 border-l-[3px] py-3.5 pr-3 pl-4 transition-colors duration-[180ms] outline-none focus-visible:bg-muted",
      active ? "border-brand bg-accent" : "border-transparent hover:bg-muted"
    );

  return (
    <nav aria-label="Settings navigation" className="w-full shrink-0 md:w-72">
      {/* Mobile: tab strip */}
      <div className="-mx-5 mb-2 flex gap-6 overflow-x-auto border-b border-border px-5 md:hidden">
        {[...navigationItems, ...(isAdmin ? adminNavigationItems : [])].map((item) => {
          const hash = (item as { hash?: string }).hash;
          const isActive = !!hash && activeHash === hash;
          return (
            <Link
              key={item.name}
              href={`${item.href}${hash ?? ""}`}
              onClick={() => hash && setActiveHash(hash)}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "label-caps shrink-0 border-b-2 py-3",
                isActive ? "border-brand text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {item.name}
            </Link>
          );
        })}
      </div>

      {/* Desktop: numbered list */}
      <div className="hidden border-t border-border md:block">
        {navigationItems.map((item, i) => {
          const isActive = activeHash === item.hash;
          return (
            <Link
              key={item.hash}
              href={`${item.href}${item.hash}`}
              onClick={() => setActiveHash(item.hash || "")}
              aria-current={isActive ? "page" : undefined}
              className={cn(itemClass(isActive), "border-b border-b-hairline-soft")}
            >
              <span className="label-caps row-span-2 pt-1.5 text-[10px] text-brand-soft">{String(i + 1).padStart(2, "0")}</span>
              <span className={cn("font-serif text-[19px] leading-tight", isActive ? "text-foreground" : "text-foreground/80 group-hover:text-foreground")}>
                {item.name}
              </span>
              <span className="mt-0.5 line-clamp-1 text-[12px] text-subtle-foreground">{item.description}</span>
            </Link>
          );
        })}

        {isAdmin && (
          <div className="mt-8">
            <p className="bracket-label mb-2 px-4">Administration</p>
            <div className="border-t border-border">
              {adminNavigationItems.map((item) => (
                <Link key={item.href} href={item.href} className={cn(itemClass(false), "border-b border-b-hairline-soft")}>
                  <span className="row-span-2 pt-1 text-brand-soft">→</span>
                  <span className="font-serif text-[19px] leading-tight text-foreground/80 group-hover:text-foreground">{item.name}</span>
                  <span className="mt-0.5 line-clamp-1 text-[12px] text-subtle-foreground">{item.description}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
