import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  LayoutDashboard, FilePlus2, Receipt, Wallet, Users, UserCog, Truck, FileBarChart,
  Settings, LogOut, Bell, Menu, X, Shield, Droplets, ChevronDown, Banknote, BookOpen, Check, PlusCircle
} from "lucide-react";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { BrandStyle } from "@/components/klynn/BrandStyle";
import { Logo } from "@/components/klynn/Logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { logout, getCajaAbierta, formatRD, can, getTenantsForUser, setActiveTenant, switchSession } from "@/lib/storage";
import { Toaster } from "@/components/ui/sonner";
import { useEffect } from "react";
import { motion } from "framer-motion";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  permission?: string;
  exact?: boolean;
  highlight?: boolean;
}

const NAV: (slug: string) => NavItem[] = (slug) => [
  { to: `/t/${slug}`, label: "Dashboard", icon: LayoutDashboard, exact: true, permission: "dashboard" },
  { to: `/t/${slug}/nueva-orden`, label: "Nueva orden", icon: FilePlus2, highlight: true, permission: "nueva-orden" },
  { to: `/t/${slug}/ordenes`, label: "Órdenes", icon: Receipt, permission: "ordenes" },
  { to: `/t/${slug}/caja`, label: "Caja", icon: Wallet, permission: "caja" },
  { to: `/t/${slug}/clientes`, label: "Clientes", icon: Users, permission: "clientes" },
  { to: `/t/${slug}/catalogo`, label: "Catálogo", icon: BookOpen, permission: "catalogo" },
  { to: `/t/${slug}/personal`, label: "Personal", icon: UserCog, permission: "personal" },
  { to: `/t/${slug}/entregas`, label: "Entregas", icon: Truck, permission: "entregas" },
  { to: `/t/${slug}/gastos`, label: "Gastos", icon: Banknote, permission: "gastos" },
  { to: `/t/${slug}/reportes`, label: "Reportes", icon: FileBarChart, permission: "reportes" },
  { to: `/t/${slug}/configuracion`, label: "Configuración", icon: Settings, permission: "configuracion" },
];

export function TenantShell() {
  const user = useRequireAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);

  const cajaAbierta = useMemo(() => (user ? getCajaAbierta(user.tenant.id) : undefined), [user, pathname]);

  if (!user) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Droplets className="h-12 w-12 text-primary animate-pulse" />
          <div className="font-display text-xl font-medium tracking-tight text-foreground/60 animate-pulse">
            Cargando...
          </div>
        </div>
      </div>
    );
  }

  const { tenant, empleado } = user;
  const trialDays = Math.max(0, Math.ceil((new Date(tenant.trial_hasta).getTime() - Date.now()) / 86400000));

  function onLogout() {
    logout();
    navigate({ to: "/login" });
  }

  // Protección de rutas: si el usuario no tiene permiso para la ruta actual, redirigir
  useEffect(() => {
    if (!user) return;
    const items = NAV(user.tenant.slug);
    const current = items.find(i => {
      if (i.exact) return pathname === i.to;
      return pathname.startsWith(i.to);
    });

    if (current?.permission && !can(user.empleado, current.permission)) {
      // Redirigir a la primera página permitida
      const firstAllowed = items.find(i => can(user.empleado, i.permission!));
      if (firstAllowed) {
        navigate({ to: firstAllowed.to });
      } else {
        // Si no tiene permiso para nada (raro), logout
        onLogout();
      }
    }
  }, [pathname, user, navigate]);

  const isActive = (to: string, exact?: boolean) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");

  return (
    <div className="min-h-screen bg-background print:hidden">
      <BrandStyle tenant={tenant} />

      {/* Sidebar desktop */}
      <aside className="sidebar-desktop fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-border bg-surface lg:flex lg:flex-col transition-all duration-500 ease-in-out">
        <SidebarContent tenant={tenant} empleado={empleado} pathname={pathname} isActive={isActive} />
      </aside>

      {/* Sidebar móvil */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-surface shadow-elegant flex flex-col">
            <SidebarContent tenant={tenant} empleado={empleado} pathname={pathname} isActive={isActive} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="main-content-wrapper lg:pl-64 transition-all duration-500 ease-in-out">
        {/* Header */}
        <header className="main-header sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-border bg-surface/80 px-4 backdrop-blur-xl md:px-6 transition-all duration-500 ease-in-out">
          <button onClick={() => setMobileOpen(true)} className="rounded-md p-2 hover:bg-accent lg:hidden" aria-label="Menú">
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex flex-1 items-center gap-3">
            <Badge
              variant="outline"
              className={`gap-1.5 ${cajaAbierta ? "border-success/40 bg-success/10 text-success" : "border-destructive/40 bg-destructive/10 text-destructive"}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${cajaAbierta ? "bg-success" : "bg-destructive"} animate-pulse`} />
              Caja {cajaAbierta ? "ABIERTA" : "CERRADA"}
            </Badge>
            {tenant.estado === "TRIAL" && (
              <Badge variant="outline" className="hidden border-gold/40 bg-gold/10 text-gold-foreground sm:inline-flex">
                Prueba gratis · {trialDays} días
              </Badge>
            )}
          </div>

          <Link to="/t/$slug/nueva-orden" params={{ slug: tenant.slug }} className="hidden sm:block">
            <Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700 border-0 shadow-sm transition-all">
              <PlusCircle className="mr-1.5 h-4 w-4" /> Nueva orden
            </Button>
          </Link>

          <button className="relative rounded-md p-2 hover:bg-accent" aria-label="Notificaciones">
            <Bell className="h-5 w-5" />
          </button>

          <UserMenu nombre={empleado.nombre} rol={empleado.rol} onLogout={onLogout} />
        </header>

        <main className="min-h-[calc(100vh-4rem)] p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function SidebarContent({
  tenant, empleado, pathname, isActive, onNavigate,
}: {
  tenant: { id: string; nombre: string; slug: string; color_primario: string; color_secundario: string; logo_url?: string };
  empleado: any;
  pathname: string;
  isActive: (to: string, exact?: boolean) => boolean;
  onNavigate?: () => void;
}) {
  const [showSwitcher, setShowSwitcher] = useState(false);
  const myTenants = useMemo(() => getTenantsForUser(empleado.email), [empleado.email]);
  const allowedNav = useMemo(() => {
    return NAV(tenant.slug).filter(item => !item.permission || can(empleado, item.permission));
  }, [tenant.slug, empleado]);

  const switchBranch = (t: any) => {
    if (t.slug === tenant.slug) return;
    const ok = switchSession(t.id, empleado.email);
    if (ok) {
      window.location.href = `/t/${t.slug}`; // Forzamos carga del Dashboard de la nueva sucursal
    }
  };

  return (
    <>
      <div className="relative flex h-24 flex-col items-center justify-center border-b border-border px-5">
        <Logo size="md" />
        <span className="mt-1 text-[10px] font-medium tracking-[0.1em] text-muted-foreground/60 uppercase">
          Your laundry, simplified.
        </span>
        {onNavigate && (
          <button onClick={onNavigate} className="absolute right-4 rounded-md p-1.5 hover:bg-accent lg:hidden">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="relative border-b border-border p-5">
        <div 
          className={`flex items-center gap-3 ${empleado.rol === "ADMIN" && myTenants.length > 1 ? "cursor-pointer rounded-xl p-1 -m-1 transition hover:bg-accent/50" : ""}`}
          onClick={() => empleado.rol === "ADMIN" && myTenants.length > 1 && setShowSwitcher(!showSwitcher)}
        >
          <div className="grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-white text-white shadow-sm border border-border shrink-0" style={{ background: tenant.logo_url ? "white" : `linear-gradient(135deg, ${tenant.color_primario}, ${tenant.color_secundario})` }}>
            {tenant.logo_url ? (
              <img src={tenant.logo_url} alt="logo" className="h-full w-full object-cover" />
            ) : (
              <Droplets className="h-5 w-5" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <div className="truncate font-display text-sm font-semibold" style={{ color: tenant.color_primario }}>{tenant.nombre}</div>
              {empleado.rol === "ADMIN" && myTenants.length > 1 && <ChevronDown className={`h-3 w-3 transition-transform ${showSwitcher ? "rotate-180" : ""}`} />}
            </div>
            <div className="truncate text-xs text-muted-foreground lowercase">{tenant.slug}.klynn.com.do</div>
          </div>
        </div>

        {/* Dropdown de sucursales */}
        {showSwitcher && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowSwitcher(false)} />
            <div className="absolute left-4 right-4 top-[calc(100%-8px)] z-50 mt-1 overflow-hidden rounded-xl border border-border bg-popover shadow-elegant animate-in fade-in zoom-in-95 duration-200">
              <div className="bg-muted/50 p-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Mis Sucursales</div>
              <div className="max-h-[200px] overflow-y-auto p-1">
                {myTenants.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => { switchBranch(t); setShowSwitcher(false); }}
                    className={`flex w-full items-center gap-3 rounded-lg p-2 text-left transition hover:bg-accent ${t.id === tenant.id ? "bg-accent/50 pointer-events-none" : ""}`}
                  >
                    <div className="grid h-8 w-8 place-items-center overflow-hidden rounded-full bg-white border border-border shadow-sm shrink-0" style={{ background: t.logo_url ? "white" : `linear-gradient(135deg, ${t.color_primario}, ${t.color_secundario})` }}>
                      {t.logo_url ? <img src={t.logo_url} className="h-full w-full object-cover" /> : <Droplets className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-semibold">{t.nombre}</div>
                      <div className="truncate text-[10px] text-muted-foreground">{t.slug}.klynn.com.do</div>
                    </div>
                    {t.id === tenant.id && <Check className="h-3 w-3 text-primary" />}
                  </button>
                ))}
                <div className="border-t border-border mt-1 p-1">
                  <Link to="/dashboard-admin" onClick={() => setShowSwitcher(false)} className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition hover:bg-primary/5 text-primary">
                    <div className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 shrink-0">
                      <LayoutDashboard className="h-4 w-4" />
                    </div>
                    <div className="text-xs font-bold uppercase tracking-wider">Ver panel general</div>
                  </Link>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto p-3">
        {allowedNav.map((item) => {
          const active = isActive(item.to, item.exact);
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={`mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-gradient-primary text-white shadow-card"
                  : item.highlight
                    ? "text-primary hover:bg-accent"
                    : "text-foreground/80 hover:bg-accent hover:text-foreground"
              }`}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {empleado.rol === "ADMIN" && (
        <div className="p-4 mt-auto">
          <Link to="/dashboard-admin" onClick={onNavigate}>
            <div className="flex items-center gap-3 px-4 py-3 rounded-full bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all shadow-sm group">
              <Shield className="h-4 w-4 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold tracking-wide uppercase">Panel Administrador</span>
            </div>
          </Link>
        </div>
      )}

    </>
  );
}

function UserMenu({ nombre, rol, onLogout }: { nombre: string; rol: string; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const initials = nombre.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((s) => !s)}
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-accent"
      >
        <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-primary text-xs font-bold text-white">{initials}</div>
        <div className="hidden text-left md:block">
          <div className="text-sm font-medium leading-tight">{nombre.split(" ")[0]}</div>
          <div className="text-[10px] uppercase text-muted-foreground">{rol}</div>
        </div>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-20 mt-1 w-56 overflow-hidden rounded-lg border border-border bg-popover shadow-elegant">
            <div className="border-b border-border p-3">
              <div className="text-sm font-semibold">{nombre}</div>
              <div className="text-xs text-muted-foreground">{rol}</div>
            </div>
            <button onClick={onLogout} className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-destructive hover:bg-accent">
              <LogOut className="h-4 w-4" /> Cerrar sesión
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// Helper: estado badge para reusar
export function EstadoBadge({ estado }: { estado: string }) {
  const map: Record<string, string> = {
    RECIBIDA: "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300",
    EN_PROCESO: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    LISTA: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    ENTREGADA: "border-zinc-500/40 bg-zinc-500/10 text-zinc-700 dark:text-zinc-300",
    PAGADA: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    ANULADA: "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300",
  };
  return <Badge variant="outline" className={map[estado] ?? ""}>{estado.replace("_", " ")}</Badge>;
}

export { formatRD };
