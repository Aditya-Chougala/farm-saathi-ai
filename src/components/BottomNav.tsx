import { Link } from "@tanstack/react-router";
import { Home, Sprout, ScanLine, Store, User } from "lucide-react";
import { Bi } from "@/i18n/LanguageContext";
import type { TKey } from "@/i18n/translations";

const items: Array<{ to: string; icon: typeof Home; k: TKey }> = [
  { to: "/", icon: Home, k: "home" },
  { to: "/crop", icon: Sprout, k: "crop" },
  { to: "/disease", icon: ScanLine, k: "disease" },
  { to: "/market", icon: Store, k: "market" },
  { to: "/profile", icon: User, k: "profile" },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 glass-card border-t rounded-none">
      <ul className="grid grid-cols-5 max-w-md mx-auto">
        {items.map(({ to, icon: Icon, k }) => (
          <li key={to}>
            <Link
              to={to}
              activeOptions={{ exact: to === "/" }}
              className="flex flex-col items-center justify-center gap-0.5 py-2 px-1 min-touch text-muted-foreground data-[status=active]:text-primary"
            >
              {({ isActive }) => (
                <>
                  <div
                    className={`p-1.5 rounded-xl transition ${
                      isActive ? "gradient-primary text-primary-foreground shadow-md" : ""
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <Bi k={k} className="text-[11px] items-center text-center" />
                </>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
