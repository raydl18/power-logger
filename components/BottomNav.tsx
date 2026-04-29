"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function ProgramIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor"
      strokeWidth={active ? "1.75" : "1.5"} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="7" height="7" rx="1.5" />
      <rect x="11" y="2" width="7" height="7" rx="1.5" />
      <rect x="2" y="11" width="7" height="7" rx="1.5" />
      <rect x="11" y="11" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function LogIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor"
      strokeWidth={active ? "1.75" : "1.5"} strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2.5H5a1.5 1.5 0 0 0-1.5 1.5v12A1.5 1.5 0 0 0 5 17.5h10a1.5 1.5 0 0 0 1.5-1.5V7L13 2.5z" />
      <path d="M13 2.5V7h4.5" />
      <path d="M7 11h6M7 14h4" />
    </svg>
  );
}

function CalendarIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor"
      strokeWidth={active ? "1.75" : "1.5"} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2.5" y="4" width="15" height="13.5" rx="2" />
      <path d="M2.5 8.5h15" />
      <path d="M6.5 2.5v3M13.5 2.5v3" />
      <circle cx="7" cy="12.5" r="0.75" fill="currentColor" stroke="none" />
      <circle cx="10" cy="12.5" r="0.75" fill="currentColor" stroke="none" />
      <circle cx="13" cy="12.5" r="0.75" fill="currentColor" stroke="none" />
    </svg>
  );
}

function ProgressIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor"
      strokeWidth={active ? "1.75" : "1.5"} strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 15.5h15" />
      <rect x="3.5" y="9.5" width="3" height="6" rx="0.5" />
      <rect x="8.5" y="5.5" width="3" height="10" rx="0.5" />
      <rect x="13.5" y="2.5" width="3" height="13" rx="0.5" />
    </svg>
  );
}

function ProfileIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor"
      strokeWidth={active ? "1.75" : "1.5"} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="7" r="3" />
      <path d="M3.5 17.5c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5" />
    </svg>
  );
}

const NAV = [
  { href: "/program",  label: "Program",  Icon: ProgramIcon  },
  { href: "/log",      label: "Log",      Icon: LogIcon      },
  { href: "/calendar", label: "Calendar", Icon: CalendarIcon },
  { href: "/progress", label: "Progress", Icon: ProgressIcon },
  { href: "/profile",  label: "Profile",  Icon: ProfileIcon  },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-950/95 backdrop-blur-sm border-t border-zinc-800/80 pb-safe">
      <div className="flex items-stretch">
        {NAV.map(({ href, label, Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center justify-center min-h-[56px] py-2 gap-1 transition-colors
                ${active ? "text-white" : "text-zinc-500 hover:text-zinc-300"}`}
            >
              <Icon active={active} />
              <span className={`text-[9px] font-semibold tracking-widest uppercase transition-colors
                ${active ? "text-white" : "text-zinc-600"}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
