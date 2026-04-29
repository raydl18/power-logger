"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/program",  label: "Program",  icon: "⊞" },
  { href: "/log",      label: "Log",      icon: "✎"  },
  { href: "/calendar", label: "Calendar", icon: "◫"  },
  { href: "/progress", label: "Progress", icon: "↗"  },
  { href: "/profile",  label: "Profile",  icon: "◉"  },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-950 border-t border-zinc-800 pb-safe">
      <div className="flex items-stretch">
        {NAV.map(({ href, label, icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center justify-center min-h-[56px] py-2 gap-0.5 transition-colors
                ${active ? "text-white" : "text-zinc-500 hover:text-zinc-300"}`}
            >
              <span className="text-base leading-none">{icon}</span>
              <span className="text-[10px] font-medium tracking-wide">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
