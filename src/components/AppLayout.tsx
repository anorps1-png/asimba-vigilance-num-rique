import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Bell,
  FileText,
  Sparkles,
  ShieldAlert,
  Map as MapIcon,
  BarChart3,
  CheckCircle2,
  BookOpen,
  Users,
  Building2,
  BellRing,
  Settings2,
  ScrollText,
  Settings,
  Search,
  ChevronsLeft,
  ChevronsRight,
  HelpCircle,
  LogOut,
  Menu,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useCurrentUser, useSignOut, initialsFrom } from "@/lib/auth";
import { useUnreadNotifications, useMarkNotificationRead, useIsAdmin, useIsStaff } from "@/lib/queries/staff";

type NavItem = {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
};

const primaryNav: { section: string; items: NavItem[] }[] = [
  {
    section: "Opérations",
    items: [
      { label: "Tableau de bord", to: "/", icon: LayoutDashboard },
      { label: "Alertes", to: "/alertes", icon: Bell, badge: "23" },
      { label: "Signalements", to: "/signalements", icon: FileText },
      { label: "Analyse IA", to: "/analyse-ia", icon: Sparkles },
      { label: "Incidents", to: "/incidents", icon: ShieldAlert },
    ],
  },
  {
    section: "Renseignement",
    items: [
      { label: "Carte des risques", to: "/carte", icon: MapIcon },
      { label: "Statistiques", to: "/statistiques", icon: BarChart3 },
      { label: "Fact-checking", to: "/fact-checking", icon: CheckCircle2 },
      { label: "Base documentaire", to: "/connaissances", icon: BookOpen },
    ],
  },
  {
    section: "Administration",
    items: [
      { label: "Utilisateurs", to: "/utilisateurs", icon: Users },
      { label: "Institutions", to: "/institutions", icon: Building2 },
      { label: "Notifications", to: "/notifications", icon: BellRing },
      { label: "Administration", to: "/administration", icon: Settings2 },
      { label: "Journal d'audit", to: "/audit", icon: ScrollText },
      { label: "Paramètres", to: "/parametres", icon: Settings },
    ],
  },
];

function BrandMark({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5 px-2 group">
      <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-info shadow-elev-2">
        <span className="text-[13px] font-bold tracking-tight text-primary-foreground">A</span>
        <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-success ring-2 ring-sidebar" />
      </div>
      {!collapsed && (
        <div className="flex flex-col leading-tight">
          <span className="text-[15px] font-semibold tracking-tight text-sidebar-foreground">
            ASIMBA
          </span>
          <span className="text-[10.5px] font-medium tracking-wider text-sidebar-muted uppercase">
            Risk Intelligence
          </span>
        </div>
      )}
    </Link>
  );
}

function SidebarNav({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isStaff = useIsStaff();

  const nav = primaryNav.filter((section) =>
    section.section !== "Administration" || isStaff
  );

  return (
    <nav className="flex flex-1 flex-col gap-6 overflow-y-auto scrollbar-thin py-2">
      {nav.map((section) => (
        <div key={section.section} className="flex flex-col gap-0.5">
          {!collapsed && (
            <div className="px-3 pb-1.5 text-[10.5px] font-semibold tracking-[0.14em] text-sidebar-muted uppercase">
              {section.section}
            </div>
          )}
          {section.items.map((item) => {
            const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={onNavigate}
                className={cn(
                  "group relative flex items-center gap-3 rounded-md px-3 py-2 text-[13px] font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-foreground"
                    : "text-sidebar-muted hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                  collapsed && "justify-center px-2",
                )}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />
                )}
                <Icon className={cn("h-4 w-4 shrink-0", active && "text-primary")} />
                {!collapsed && (
                  <>
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.badge && (
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                          active
                            ? "bg-primary text-primary-foreground"
                            : "bg-sidebar-accent text-sidebar-foreground",
                        )}
                      >
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

function SidebarFooter({ collapsed }: { collapsed: boolean }) {
  const { name, email } = useCurrentUser();
  const signOut = useSignOut();
  const initials = initialsFrom(name ?? email);

  if (collapsed) {
    return (
      <div className="flex items-center justify-center px-2 py-3 border-t border-sidebar-border">
        <Avatar className="h-8 w-8 ring-2 ring-sidebar-accent">
          <AvatarFallback className="bg-primary text-primary-foreground text-xs">
            {initials}
          </AvatarFallback>
        </Avatar>
      </div>
    );
  }
  return (
    <div className="border-t border-sidebar-border p-3">
      <div className="flex items-center gap-2.5 rounded-lg bg-sidebar-accent/50 p-2.5">
        <Avatar className="h-9 w-9">
          <AvatarFallback className="bg-primary text-primary-foreground text-xs">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-medium text-sidebar-foreground">
            {name ?? "Non connecté"}
          </div>
          <div className="truncate text-[11px] text-sidebar-muted">{email ?? "—"}</div>
        </div>
        <button
          onClick={signOut}
          className="rounded-md p-1.5 text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground"
          aria-label="Se déconnecter"
        >
          <LogOut className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function SidebarInner({
  collapsed,
  onToggle,
  onNavigate,
}: {
  collapsed: boolean;
  onToggle?: () => void;
  onNavigate?: () => void;
}) {
  return (
    <aside
      className={cn(
        "flex h-full flex-col bg-sidebar text-sidebar-foreground transition-[width] duration-200",
        collapsed ? "w-[68px]" : "w-[248px]",
      )}
    >
      <div className="flex items-center justify-between h-14 px-3 border-b border-sidebar-border">
        <BrandMark collapsed={collapsed} />
        {onToggle && (
          <button
            onClick={onToggle}
            className="hidden lg:flex h-7 w-7 items-center justify-center rounded-md text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground"
            aria-label="Réduire la barre latérale"
          >
            {collapsed ? (
              <ChevronsRight className="h-4 w-4" />
            ) : (
              <ChevronsLeft className="h-4 w-4" />
            )}
          </button>
        )}
      </div>
      <div className="flex-1 flex flex-col px-2 min-h-0">
        <SidebarNav collapsed={collapsed} onNavigate={onNavigate} />
      </div>
      <SidebarFooter collapsed={collapsed} />
    </aside>
  );
}

function NotificationsMenu() {
  const { data: unreadData } = useUnreadNotifications();
  const { mutate: markRead } = useMarkNotificationRead();
  const unread = unreadData?.length ?? 0;

  const formatTime = (createdAt: string) => {
    const now = new Date();
    const then = new Date(createdAt);
    const diff = now.getTime() - then.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return "À l'instant";
    if (hours < 24) return `Il y a ${hours}h`;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    return `Il y a ${days}j`;
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="relative flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
              {unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="text-sm font-semibold">Notifications</div>
          {unread > 0 && (
            <button className="text-xs text-primary hover:underline">
              Tout marquer comme lu
            </button>
          )}
        </div>
        <div className="max-h-[380px] overflow-y-auto">
          {unreadData && unreadData.length > 0 ? (
            unreadData.map((n) => (
              <button
                key={n.id}
                onClick={() => markRead(n.id)}
                className={cn(
                  "w-full text-left flex gap-3 border-b border-border px-4 py-3 text-sm hover:bg-accent/60 transition-colors",
                  !n.lu && "bg-accent/30",
                )}
              >
                <div
                  className={cn(
                    "mt-1 h-2 w-2 shrink-0 rounded-full",
                    n.type === "alerte" ? "bg-destructive" : "bg-primary",
                  )}
                />
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{n.titre}</div>
                  <div className="text-xs text-muted-foreground truncate">{n.corps}</div>
                  <div className="mt-1 text-[10.5px] text-muted-foreground/80">
                    {n.created_at ? formatTime(n.created_at) : "—"}
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              Aucune notification
            </div>
          )}
        </div>
        <div className="border-t border-border px-4 py-2 text-center">
          <Link to="/notifications" className="text-xs font-medium text-primary hover:underline">
            Voir toutes les notifications
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function Topbar({
  title,
  subtitle,
  actions,
}: {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  const { name, email } = useCurrentUser();
  const signOut = useSignOut();
  const initials = initialsFrom(name ?? email);
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-card/80 backdrop-blur px-4 lg:px-6">
      <MobileNavTrigger />
      <div className="hidden md:flex flex-col leading-tight min-w-0">
        {title && (
          <div className="text-[13.5px] font-semibold text-foreground truncate">{title}</div>
        )}
        {subtitle && <div className="text-[11.5px] text-muted-foreground truncate">{subtitle}</div>}
      </div>
      <div className="flex-1" />
      <div className="relative hidden md:block w-72">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Rechercher alertes, signalements, utilisateurs…"
          className="h-9 pl-8 text-[12.5px] bg-background/60"
        />
        <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
          ⌘K
        </kbd>
      </div>
      <div className="flex items-center gap-2">
        {actions}
        <Button size="sm" variant="outline" className="hidden lg:inline-flex h-9 gap-1.5">
          <HelpCircle className="h-3.5 w-3.5" />
          <span className="text-[12px]">Aide</span>
        </Button>
        <NotificationsMenu />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-md border border-border bg-card px-1.5 py-1 hover:bg-accent">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-primary text-primary-foreground text-[11px]">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:flex flex-col text-left leading-tight pr-1">
                <span className="text-[12px] font-medium">{name ?? "Non connecté"}</span>
                <span className="text-[10px] text-muted-foreground max-w-[140px] truncate">
                  {email ?? "—"}
                </span>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Mon compte</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/parametres">Profil</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/parametres">Préférences</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onSelect={() => signOut()}>
              Se déconnecter
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

function MobileNavTrigger() {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          className="lg:hidden flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:text-foreground"
          aria-label="Ouvrir le menu"
        >
          <Menu className="h-4 w-4" />
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[260px] p-0 bg-sidebar border-sidebar-border">
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <SidebarInner collapsed={false} onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}

export function AppLayout({
  children,
  title,
  subtitle,
  actions,
}: {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden lg:flex sticky top-0 h-screen">
        <SidebarInner collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar title={title} subtitle={subtitle} actions={actions} />
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-border pb-5 md:flex-row md:items-end md:justify-between">
      <div className="flex flex-col gap-1.5 min-w-0">
        {eyebrow && (
          <div className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.14em] text-primary uppercase">
            <span className="h-1 w-1 rounded-full bg-primary" />
            {eyebrow}
          </div>
        )}
        <h1 className="text-[22px] font-semibold tracking-tight text-foreground">{title}</h1>
        {description && (
          <p className="text-[13px] text-muted-foreground max-w-2xl">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

type SeverityLevel = "critique" | "eleve" | "elevee" | "moyen" | "moyenne" | "faible" | "info";

export function SeverityBadge({ level }: { level: SeverityLevel }) {
  const map: Record<SeverityLevel, string> = {
    critique: "bg-destructive/10 text-destructive ring-destructive/20",
    eleve: "bg-warning/15 text-[color:oklch(0.45_0.15_60)] ring-warning/30",
    elevee: "bg-warning/15 text-[color:oklch(0.45_0.15_60)] ring-warning/30",
    moyen: "bg-info/10 text-info ring-info/20",
    moyenne: "bg-info/10 text-info ring-info/20",
    faible: "bg-muted text-muted-foreground ring-border",
    info: "bg-muted text-muted-foreground ring-border",
  };
  const labels: Record<SeverityLevel, string> = {
    critique: "Critique",
    eleve: "Élevé",
    elevee: "Élevée",
    moyen: "Moyen",
    moyenne: "Moyenne",
    faible: "Faible",
    info: "Info",
  };
  const label = labels[level];
  return (
    <Badge
      className={cn("rounded-md ring-1 font-medium tracking-tight", map[level])}
      variant="outline"
    >
      {label}
    </Badge>
  );
}

export function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    nouveau: "bg-primary/10 text-primary ring-primary/20",
    en_cours: "bg-warning/15 text-[color:oklch(0.45_0.15_60)] ring-warning/30",
    assigne: "bg-info/10 text-info ring-info/20",
    resolu: "bg-success/10 text-success ring-success/25",
    clos: "bg-muted text-muted-foreground ring-border",
  };
  const labels: Record<string, string> = {
    nouveau: "Nouveau",
    en_cours: "En cours",
    assigne: "Assigné",
    resolu: "Résolu",
    clos: "Clos",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium ring-1",
        map[status] ?? "bg-muted text-muted-foreground ring-border",
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {labels[status] ?? status}
    </span>
  );
}
