import { Link } from "@tanstack/react-router";
import { Compass, Home, MessageSquare, Plus, User } from "lucide-react";

const ITEMS = [
  { to: "/", label: "Home", icon: Home, exact: true },
  { to: "/explore", label: "Explore", icon: Compass, exact: false },
  { to: "/post", label: "Post", icon: Plus, exact: false, primary: true },
  { to: "/messages", label: "Messages", icon: MessageSquare, exact: false },
  { to: "/profile", label: "Profile", icon: User, exact: false },
] as const;

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-md md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-5 px-2 py-1.5">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          if ("primary" in item && item.primary) {
            return (
              <Link key={item.to} to={item.to} className="flex flex-col items-center gap-1 py-1.5">
                <span className="grid size-9 place-items-center rounded-full bg-accent text-accent-foreground">
                  <Icon className="size-5" />
                </span>
                <span className="text-[10px] font-semibold">{item.label}</span>
              </Link>
            );
          }
          return (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.exact }}
              className="flex flex-col items-center gap-1 py-2 text-muted-foreground data-[status=active]:text-primary"
            >
              <Icon className="size-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
