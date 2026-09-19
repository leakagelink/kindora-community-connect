import { Link } from "@tanstack/react-router";
import { Compass, Home, MessageSquare, Plus, User } from "lucide-react";

const LEFT = [
  { to: "/", label: "Home", icon: Home, exact: true },
  { to: "/explore", label: "Explore", icon: Compass, exact: false },
] as const;

const RIGHT = [
  { to: "/messages", label: "Chats", icon: MessageSquare, exact: false },
  { to: "/profile", label: "You", icon: User, exact: false },
] as const;

function NavItem({
  to,
  label,
  icon: Icon,
  exact,
}: {
  to: string;
  label: string;
  icon: typeof Home;
  exact: boolean;
}) {
  return (
    <Link
      to={to}
      activeOptions={{ exact }}
      aria-label={label}
      className="group press relative flex flex-1 flex-col items-center gap-1 rounded-2xl py-2 text-muted-foreground transition-colors data-[status=active]:text-primary"
    >
      <span
        aria-hidden="true"
        className="absolute inset-x-2 top-1 h-9 scale-90 rounded-2xl bg-primary/10 opacity-0 transition-all duration-300 group-data-[status=active]:scale-100 group-data-[status=active]:opacity-100"
      />
      <Icon className="relative size-5 transition-transform duration-300 group-data-[status=active]:-translate-y-0.5" />
      <span className="relative text-[10px] font-bold tracking-tight">{label}</span>
      <span
        aria-hidden="true"
        className="absolute -bottom-0.5 h-1 w-1 scale-0 rounded-full bg-primary transition-transform duration-300 group-data-[status=active]:scale-100"
      />
    </Link>
  );
}

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden">
      <div className="relative mx-auto max-w-md">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -inset-x-6 -bottom-6 top-2 rounded-[2.5rem] bg-primary/10 blur-2xl"
        />
        <div className="relative flex items-center gap-1 rounded-[2rem] border border-border bg-card/85 px-2.5 py-1.5 shadow-[var(--shadow-lift)] backdrop-blur-xl">
          {LEFT.map((item) => (
            <NavItem key={item.to} to={item.to} label={item.label} icon={item.icon} exact={item.exact} />
          ))}

          {/* Raised create action */}
          <Link
            to="/post"
            aria-label="Post"
            className="group press relative -mt-8 flex w-16 shrink-0 flex-col items-center"
          >
            <span
              aria-hidden="true"
              className="absolute top-1 size-12 rounded-full bg-rose/35 blur-xl transition-opacity duration-300 group-hover:opacity-80"
            />
            <span className="relative grid size-14 place-items-center rounded-full border-4 border-background bg-rose text-rose-foreground shadow-[var(--shadow-rose)] transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:rotate-90">
              <Plus className="size-6" />
            </span>
            <span className="relative mt-0.5 text-[10px] font-bold tracking-tight text-foreground">Post</span>
          </Link>

          {RIGHT.map((item) => (
            <NavItem key={item.to} to={item.to} label={item.label} icon={item.icon} exact={item.exact} />
          ))}
        </div>
      </div>
    </nav>
  );
}
