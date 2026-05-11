import { Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { 
  MapPin, Clock, MessageCircle, Shield, Lock, Sparkles, ArrowRight, Menu, X,
  LayoutGrid, CreditCard, HelpCircle, Droplets, Users
} from "lucide-react";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

const NAV_ITEMS = [
  { label: "Funciones", href: "/#features", icon: Sparkles },
  { label: "Para quién", href: "/#sectores", icon: Users },
  { label: "Planes", href: "/#planes", icon: CreditCard },
  { label: "FAQ", href: "/#faq", icon: MessageCircle },
];

export function LandingNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <>
      {/* TOPBAR */}
      <div className="hidden border-b border-border/60 bg-primary text-primary-foreground md:block">
        <div className="mx-auto flex h-9 max-w-7xl items-center justify-between px-6 text-xs">
          <div className="flex items-center gap-5">
            <span className="flex items-center gap-1.5"><MapPin className="h-3 w-3" /> Santo Domingo, RD 🇩🇴</span>
            <span className="flex items-center gap-1.5"><Clock className="h-3 w-3" /> Lun–Sáb 8:00am – 8:00pm</span>
          </div>
          <div className="flex items-center gap-5">
            <a href="https://wa.link/vxstq4" className="flex items-center gap-1.5 transition hover:text-gold">
              <MessageCircle className="h-3 w-3" /> +1 (829) 941-6546
            </a>
            <span className="flex items-center gap-1.5"><Shield className="h-3 w-3" /> ITBIS · NCF · DGII</span>
          </div>
        </div>
      </div>

      {/* NAV */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 md:h-18 md:gap-6 md:px-6 md:py-3">
          <Logo />
          <nav className="absolute left-1/2 -translate-x-1/2 hidden items-center gap-1 rounded-full border border-border bg-surface/70 p-1 text-sm font-medium text-muted-foreground shadow-card backdrop-blur lg:flex">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="group flex items-center gap-1.5 rounded-full px-3.5 py-1.5 transition hover:bg-accent hover:text-foreground"
              >
                <item.icon className="h-3.5 w-3.5 text-primary transition group-hover:scale-110" />
                {item.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <a
              href="https://wa.link/vxstq4"
              className="hidden h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-success transition hover:bg-accent md:inline-flex"
              aria-label="WhatsApp"
            >
              <MessageCircle className="h-4 w-4" />
            </a>
            <Link to="/login" className="hidden sm:block">
              <Button variant="ghost" size="sm" className="gap-1.5">
                <Lock className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Iniciar sesión</span>
              </Button>
            </Link>
            <Link to="/registro" className="hidden sm:block">
              <Button className="h-9 px-5 gap-1.5 bg-primary shadow-elegant hover:opacity-95 font-bold">
                <Sparkles className="h-3.5 w-3.5" />
                Probar gratis
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden h-10 w-10 place-items-center rounded-xl border border-border bg-surface shadow-card transition hover:bg-accent"
              onClick={() => setMobileOpen(true)}
              aria-label="Menú"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* MOBILE NAV (Drawer Style) */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-[100] lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="absolute inset-y-0 right-0 flex w-[88%] max-w-sm flex-col overflow-hidden bg-background shadow-elegant"
            >
              <div className="relative overflow-hidden border-b border-border/60 bg-gradient-primary p-5 text-primary-foreground">
                <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
                <div className="relative flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-xl bg-white/15 shadow-card backdrop-blur">
                      <Droplets className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-display text-lg leading-tight">Klynn</div>
                      <div className="text-xs text-white/80">Hecho en RD 🇩🇴</div>
                    </div>
                  </div>
                  <button
                    onClick={() => setMobileOpen(false)}
                    className="grid h-9 w-9 place-items-center rounded-lg bg-white/10 transition hover:bg-white/20"
                    aria-label="Cerrar"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 space-y-7 overflow-y-auto px-6 py-8">
                <nav className="space-y-1.5">
                  <div className="mb-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                    Menú principal
                  </div>
                  {NAV_ITEMS.map((item) => (
                    <a
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className="group flex items-center gap-4 rounded-2xl p-4 transition hover:bg-accent"
                    >
                      <div className="grid h-11 w-11 place-items-center rounded-xl bg-surface shadow-sm border border-border/50 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        <item.icon className="h-5 w-5" />
                      </div>
                      <span className="text-lg font-bold tracking-tight text-foreground">
                        {item.label}
                      </span>
                    </a>
                  ))}
                </nav>

                <div className="space-y-4">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                    Cuenta
                  </div>
                  <div className="grid gap-3">
                    <Link to="/login" onClick={() => setMobileOpen(false)}>
                      <Button variant="outline" className="h-14 w-full rounded-2xl text-lg font-bold">
                        <Lock className="mr-2 h-5 w-5" /> Iniciar sesión
                      </Button>
                    </Link>
                    <Link to="/registro" onClick={() => setMobileOpen(false)}>
                      <Button className="h-14 w-full rounded-2xl bg-gradient-primary text-lg font-bold shadow-elegant">
                        <Sparkles className="mr-2 h-5 w-5" /> Probar gratis
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
              
              <div className="border-t border-border/60 bg-surface p-6">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <a href="https://wa.link/vxstq4" className="flex items-center gap-2 hover:text-primary">
                    <MessageCircle className="h-4 w-4" /> Soporte WhatsApp
                  </a>
                </div>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
