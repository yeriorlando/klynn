import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { 
  ArrowRight, Sparkles, Receipt, Wallet, Users, Truck, 
  BarChart3, Printer, Check, Smartphone, MapPin, Star 
} from "lucide-react";
import { LandingNavbar } from "@/components/klynn/LandingNavbar";
import { Logo } from "@/components/klynn/Logo";
import { Button } from "@/components/ui/button";
import { formatRD } from "@/lib/storage";

interface CityLandingProps {
  city: string;
  fullName: string;
  sectors: string[];
  description: string;
}

export function CityLanding({ city, fullName, sectors, description }: CityLandingProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingNavbar />

      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-hero pt-16 pb-20">
        <div className="mx-auto max-w-7xl px-6 text-center lg:text-left grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-card">
              <MapPin className="h-3.5 w-3.5 text-primary" />
              Solución líder en {fullName} 🇩🇴
            </div>
            <h1 className="text-4xl md:text-6xl font-display leading-tight mb-6">
              El mejor software para lavanderías en <span className="text-primary">{fullName}</span>.
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto lg:mx-0">
              {description} Gestiona tus sucursales en {sectors.slice(0, 3).join(", ")} y más, con ITBIS, NCF y soporte local por WhatsApp.
            </p>
            <div className="flex flex-wrap justify-center lg:justify-start gap-4">
              <Link to="/registro">
                <Button className="h-12 px-8 text-base bg-primary shadow-glow font-bold">
                  Probar gratis en {city} <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95, rotate: 2 }}
            animate={{ opacity: 1, scale: 1, rotate: 1.5 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="hidden lg:flex relative items-center justify-center"
          >
            <div className="absolute -inset-10 -z-10 bg-gradient-primary opacity-25 blur-3xl" />
            <div className="w-[360px] rounded-[2.5rem] border border-border bg-surface p-8 font-mono text-[12px] leading-relaxed text-foreground shadow-2xl relative">
              <div className="flex flex-col items-center border-b border-dashed border-border pb-4">
                <Logo size="sm" showWordmark={false} />
                <div className="mt-3 font-display text-xl">Lavandería Elite {city}</div>
                <div className="text-muted-foreground">RNC: 131-XXXXX-X</div>
                <div className="text-muted-foreground">Tel: 809-555-0100</div>
                <div className="text-muted-foreground text-[10px] uppercase tracking-wider">{fullName}, RD</div>
              </div>

              <div className="border-b border-dashed border-border py-4 space-y-0.5">
                <div className="flex justify-between"><span>ORDEN:</span><span className="font-bold">{city.toUpperCase()}-2026-042</span></div>
                <div className="flex justify-between"><span>NCF:</span><span className="font-bold">B0200000123</span></div>
                <div className="flex justify-between"><span>FECHA:</span><span>02/05/2026 10:30 AM</span></div>
                <div className="flex justify-between"><span>CLIENTE:</span><span className="font-bold text-primary">VIP {city}</span></div>
              </div>

              <div className="border-b border-dashed border-border py-4 space-y-2">
                <div className="flex justify-between">
                  <div className="flex flex-col">
                    <span className="font-bold">Camisa M/L x3</span>
                    <span className="text-[10px] text-muted-foreground">Lavado y Planchado</span>
                  </div>
                  <span>RD$450</span>
                </div>
                <div className="flex justify-between">
                  <div className="flex flex-col">
                    <span className="font-bold">Pantalón vestir x2</span>
                    <span className="text-[10px] text-muted-foreground">Express</span>
                  </div>
                  <span>RD$400</span>
                </div>
                <div className="flex justify-between">
                  <div className="flex flex-col">
                    <span className="font-bold">Lavado/lb (Gris)</span>
                    <span className="text-[10px] text-muted-foreground">5.5 lbs @ RD$80</span>
                  </div>
                  <span>RD$440</span>
                </div>
              </div>

              <div className="space-y-1.5 py-4">
                <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>RD$ 1,290.00</span></div>
                <div className="flex justify-between text-muted-foreground"><span>ITBIS (18%)</span><span>RD$ 232.20</span></div>
                <div className="flex justify-between border-t border-border pt-2 font-display text-2xl text-primary">
                  <span>TOTAL</span><span>{formatRD(1522.2)}</span>
                </div>
              </div>

              <div className="border-t border-dashed border-border pt-4 text-center text-muted-foreground text-[11px]">
                ¡Gracias por confiar en {city}! 🧺<br/>
                Digitalizado por Klynn.com.do
              </div>

              {/* Badge de tamaño de papel */}
              <div className="absolute -bottom-4 -right-2 rounded-full bg-primary px-4 py-1.5 text-[10px] font-bold text-white shadow-lg border-2 border-white uppercase tracking-widest">
                80mm / Digital
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* SECTORES COBERTURA */}
      <section className="bg-surface-elevated py-16 border-y border-border">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <h2 className="text-2xl md:text-3xl font-display mb-8">Cobertura total en {fullName}</h2>
          <div className="flex flex-wrap justify-center gap-3">
            {sectors.map((s) => (
              <span key={s} className="rounded-full border border-border bg-surface px-5 py-2 text-sm text-muted-foreground shadow-sm">
                {s}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES MINI */}
      <section className="py-24 mx-auto max-w-7xl px-6">
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { icon: Receipt, t: "Facturación Local", d: "NCF y ITBIS listos para el mercado de " + city + "." },
            { icon: Truck, t: "Logística en " + city, d: "Gestiona tus rutas de delivery por todo " + fullName + "." },
            { icon: Smartphone, t: "WhatsApp Directo", d: "Notifica a tus clientes de " + city + " al instante." },
          ].map((f) => (
            <div key={f.t} className="p-6 rounded-2xl border border-border bg-surface shadow-card">
              <f.icon className="h-8 w-8 text-primary mb-4" />
              <h3 className="text-xl font-display mb-2">{f.t}</h3>
              <p className="text-sm text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary text-white py-20 px-6 text-center">
        <h2 className="text-3xl md:text-5xl font-display mb-6">¿Listo para modernizar tu lavandería en {fullName}?</h2>
        <p className="text-lg opacity-90 mb-10 max-w-2xl mx-auto">
          Únete a las lavanderías más exitosas de {city} que ya usan Klynn para controlar su negocio.
        </p>
        <Link to="/registro">
          <Button variant="secondary" className="h-14 px-10 text-lg font-bold">
            Empezar prueba de 14 días gratis
          </Button>
        </Link>
      </section>
    </div>
  );
}
