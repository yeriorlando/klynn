import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import {
  ArrowRight,
  Sparkles,
  Receipt,
  Wallet,
  Users,
  Truck,
  BarChart3,
  Shield,
  Printer,
  Check,
  Zap,
  MapPin,
  Phone,
  Clock,
  TrendingUp,
  Smartphone,
  CreditCard,
  FileText,
  Star,
  Building2,
  Headphones,
  Cloud,
  Lock,
  Globe,
  Calculator,
  MessageCircle,
  Package,
  Scissors,
  Banknote,
  Menu,
  X,
  Droplets,
} from "lucide-react";
import { Logo } from "@/components/klynn/Logo";
import { SeedBootstrap } from "@/components/klynn/SeedBootstrap";
import { Button } from "@/components/ui/button";
import { PLANS, formatRD } from "@/lib/storage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Klynn — Software #1 para lavanderías en República Dominicana | POS, ITBIS y NCF" },
      {
        name: "description",
        content:
          "Software de gestión para lavanderías en RD: facturación con ITBIS 18% y NCF, tickets térmicos 57/80mm, caja, clientes, entregas y reportes DGII. Prueba gratis 14 días. Santo Domingo, Santiago y todo el país.",
      },
      {
        name: "keywords",
        content:
          "software para lavanderías República Dominicana, sistema POS lavandería RD, facturación ITBIS NCF, software lavandería Santo Domingo, programa lavandería Santiago, gestión lavandería dominicana, ticket térmico 80mm RD, software DGII lavandería",
      },
      { property: "og:title", content: "Klynn — Software para lavanderías en República Dominicana" },
      { property: "og:description", content: "Gestiona órdenes, caja, ITBIS, NCF, clientes y entregas desde una sola pantalla. Hecho en RD 🇩🇴. Prueba gratis 14 días." },
      { property: "og:locale", content: "es_DO" },
    ],
  }),
  component: LandingPage,
});

const features = [
  { icon: Receipt, title: "Órdenes y facturas con NCF", desc: "Flujo guiado de nueva orden con prendas, peso y cobro mixto. ITBIS 18% y secuencias NCF (B01, B02, B14, B15) configurables por sucursal." },
  { icon: Printer, title: "Tickets térmicos 57/80mm", desc: "Impresión ESC/POS compatible con Epson, Xprinter, Bixolon y Star. Logo, RNC y pie de página personalizados." },
  { icon: Wallet, title: "Caja y cuadre diario", desc: "Apertura, movimientos en vivo, gastos de caja chica, cobros por efectivo, tarjeta y transferencia. Cierre con firma del cajero." },
  { icon: Users, title: "CRM dominicano", desc: "Historial por cliente, deudas, abonos, clientes VIP y crédito autorizado. Cumpleaños y avisos automáticos por WhatsApp." },
  { icon: Truck, title: "Entregas a domicilio", desc: "Asigna repartidores, rutas por sector (Naco, Piantini, Bella Vista, Los Jardines…) y notifica al cliente al salir y al llegar." },
  { icon: BarChart3, title: "Reportes para la DGII", desc: "606, 607 y resumen de ITBIS exportable en CSV y XLSX. Llega listo a tu contador cada mes." },
  { icon: Scissors, title: "Módulo de sastrería", desc: "Ajustes, ruedos, cierres y composturas con medidas, fotos y entrega coordinada con el lavado." },
  { icon: Package, title: "Lavado por libra y prendas", desc: "Cobra por peso (lb/kg) o por prenda. Combina ambos en la misma orden con cargos de planchado, suavizante o rapidez." },
  { icon: Smartphone, title: "WhatsApp integrado", desc: "Envía recibos, recordatorios de retiro y promociones desde el sistema. Tu cliente recibe el ticket en su celular." },
];

const testimonios = [
  {
    nombre: "Yessica Rodríguez",
    negocio: "Lavandería La Burbuja, Santo Domingo Este",
    texto: "Antes anotaba todo en libreta y se me perdían órdenes. Con Klynn cuadro la caja en 2 minutos y los clientes reciben el ticket por WhatsApp. Subí 30% las ventas en 3 meses.",
  },
  {
    nombre: "Manuel Tavárez",
    negocio: "Express Wash, Santiago de los Caballeros",
    texto: "Lo mejor es que está en español dominicano y el soporte responde rápido por WhatsApp. Los reportes para la DGII son los que más tiempo me ahorran cada mes.",
  },
  {
    nombre: "Carolina Méndez",
    negocio: "Cleanette, Punta Cana",
    texto: "Manejo 3 sucursales desde el celular. Veo en vivo cuánto vendió cada una y el inventario de bolsas y suavizante. Una maravilla, la verdad.",
  },
];

const faqs = [
  {
    q: "¿Klynn cumple con la normativa de la DGII en República Dominicana?",
    a: "Sí. Manejamos secuencias NCF (B01 consumidor final, B02 consumo, B14 régimen especial, B15 gubernamental), ITBIS 18% configurable y exportación de los formatos 606 y 607 en CSV y XLSX listos para tu contador o para subir al portal de la DGII.",
  },
  {
    q: "¿Necesito internet siempre para usarlo?",
    a: "Recomendamos conexión estable, pero el sistema sigue tomando órdenes en modo offline y sincroniza cuando vuelve la conexión. Ideal para apagones o problemas con Claro, Altice o Viva.",
  },
  {
    q: "¿Funciona con mi impresora térmica?",
    a: "Sí. Soportamos impresoras térmicas ESC/POS de 57mm y 80mm: Epson TM-T20, Xprinter XP-58, Bixolon SRP, Star Micronics y compatibles que se venden en CCN, PriceSmart, Plaza Lama y tiendas de tecnología en todo el país.",
  },
  {
    q: "¿Puedo usarlo desde el celular?",
    a: "Sí. Klynn es 100% web y responsive. Funciona en computadoras, tablets, iPhone y Android sin instalar nada. Ideal para que el dueño revise ventas desde la casa o la playa.",
  },
  {
    q: "¿Cuánto cuesta y en qué moneda?",
    a: "Todos los planes están en pesos dominicanos (RD$) sin sorpresas de tasa de cambio. Empiezas con 14 días gratis sin tarjeta de crédito. Después eliges el plan que se ajuste a tu lavandería.",
  },
  {
    q: "¿Puedo manejar varias sucursales?",
    a: "Sí. Desde el plan Pro puedes administrar múltiples sucursales con caja independiente, empleados por sucursal y reportes consolidados. Perfecto para cadenas en Santo Domingo, Santiago, La Vega o la zona Este.",
  },
  {
    q: "¿Mis datos están seguros?",
    a: "Sí. Tus datos viven cifrados en la nube con copias de seguridad diarias. Cada empleado tiene su usuario y permisos por rol (cajero, admin, repartidor) para que nadie vea más de lo que debe.",
  },
  {
    q: "¿Ofrecen soporte en español?",
    a: "Por supuesto. Equipo dominicano que responde por WhatsApp, correo y videollamada en horario laboral RD. Te ayudamos a configurar tu primera lavandería sin costo.",
  },
];

const ciudades = [
  "Santo Domingo", "Santiago", "La Vega", "San Pedro de Macorís", "San Cristóbal",
  "Puerto Plata", "La Romana", "Higüey", "Punta Cana", "Bávaro", "Bonao", "Moca",
  "San Francisco de Macorís", "Baní", "Azua", "Barahona", "Mao", "Nagua",
];

const NAV_ITEMS = [
  { href: "#features", label: "Funciones", icon: Sparkles, desc: "POS, NCF, ITBIS, tickets" },
  { href: "#sectores", label: "Para quién", icon: Users, desc: "Lavanderías, sastrerías, hoteles" },
  { href: "#planes", label: "Planes", icon: CreditCard, desc: "Desde RD$ 1,500/mes" },
  { href: "#faq", label: "FAQ", icon: MessageCircle, desc: "Preguntas frecuentes" },
  { href: "#demo", label: "Demo", icon: Zap, desc: "Prueba la plataforma" },
];

function LandingPage() {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SeedBootstrap />

      {/* JSON-LD: SoftwareApplication + LocalBusiness */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "Klynn",
            applicationCategory: "BusinessApplication",
            operatingSystem: "Web",
            description:
              "Software de gestión para lavanderías en República Dominicana con ITBIS, NCF, tickets térmicos, caja, clientes y reportes DGII.",
            offers: {
              "@type": "Offer",
              price: "1500",
              priceCurrency: "DOP",
            },
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: "4.9",
              ratingCount: "127",
            },
            areaServed: { "@type": "Country", name: "Dominican Republic" },
            inLanguage: "es-DO",
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          }),
        }}
      />

      {/* TOPBAR */}
      <div className="hidden border-b border-border/60 bg-primary text-primary-foreground md:block">
        <div className="mx-auto flex h-9 max-w-7xl items-center justify-between px-6 text-xs">
          <div className="flex items-center gap-5">
            <span className="flex items-center gap-1.5"><MapPin className="h-3 w-3" /> Santo Domingo, RD 🇩🇴</span>
            <span className="flex items-center gap-1.5"><Clock className="h-3 w-3" /> Lun–Sáb 8:00am – 8:00pm</span>
          </div>
          <div className="flex items-center gap-5">
            <a href="https://wa.me/18095550142" className="flex items-center gap-1.5 transition hover:text-gold">
              <MessageCircle className="h-3 w-3" /> +1 (809) 555-0142
            </a>
            <span className="flex items-center gap-1.5"><Shield className="h-3 w-3" /> ITBIS · NCF · DGII</span>
          </div>
        </div>
      </div>

      {/* NAV */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 md:h-18 md:gap-6 md:px-6 md:py-3">
          <Logo />
          <nav className="hidden items-center gap-1 rounded-full border border-border bg-surface/70 p-1 text-sm font-medium text-muted-foreground shadow-card backdrop-blur lg:flex">
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
              href="https://wa.me/18095550142"
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
            {/* Mobile menu button */}
            <button
              onClick={() => setMobileOpen(true)}
              className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-surface shadow-card transition hover:bg-accent lg:hidden"
              aria-label="Abrir menú"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* MOBILE DRAWER */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-[60] lg:hidden">
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
              {/* Drawer header */}
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
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="relative mt-4 flex items-center gap-3 text-[11px] text-white/85">
                  <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> ITBIS · NCF</span>
                  <span className="h-1 w-1 rounded-full bg-white/40" />
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Lun–Sáb 8–8</span>
                </div>
              </div>

              {/* Nav items */}
              <nav className="flex-1 overflow-y-auto p-4">
                <div className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Navegación
                </div>
                <div className="space-y-1.5">
                  {NAV_ITEMS.map((item, i) => (
                    <motion.a
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 + i * 0.04 }}
                      className="group flex items-center gap-3 rounded-xl border border-transparent p-3 transition hover:border-border hover:bg-accent"
                    >
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary transition group-hover:bg-gradient-primary group-hover:text-primary-foreground">
                        <item.icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium leading-tight">{item.label}</div>
                        <div className="truncate text-[11px] text-muted-foreground">{item.desc}</div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
                    </motion.a>
                  ))}
                </div>

                <div className="mt-6 mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Contacto
                </div>
                <a
                  href="https://wa.me/18095550142"
                  className="flex items-center gap-3 rounded-xl border border-success/30 bg-success/5 p-3 transition hover:bg-success/10"
                >
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-success/15 text-success">
                    <MessageCircle className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">WhatsApp</div>
                    <div className="text-[11px] text-muted-foreground">+1 (809) 555-0142</div>
                  </div>
                </a>
              </nav>

              {/* CTAs */}
              <div className="space-y-2 border-t border-border/60 bg-surface/50 p-4">
                <Link to="/registro" onClick={() => setMobileOpen(false)} className="block">
                  <Button className="h-11 w-full gap-1.5 bg-gradient-primary shadow-elegant">
                    <Sparkles className="h-4 w-4" />
                    Probar gratis 14 días
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/login" onClick={() => setMobileOpen(false)} className="block">
                  <Button variant="outline" className="h-11 w-full gap-1.5">
                    <Lock className="h-3.5 w-3.5" />
                    Iniciar sesión
                  </Button>
                </Link>
                <p className="pt-1 text-center text-[10px] text-muted-foreground">
                  Sin tarjeta de crédito · Cancela cuando quieras
                </p>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-hero">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 pt-8 pb-6 md:px-6 md:pt-12 md:pb-10 lg:grid-cols-2 lg:pt-16 lg:pb-14">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col justify-center"
          >
            <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-card">
              <Sparkles className="h-3.5 w-3.5 text-gold" />
              Hecho en República Dominicana 🇩🇴 — ITBIS y NCF listos
            </div>
            <h1 className="text-balance text-4xl leading-[1.05] text-foreground sm:text-5xl md:text-6xl lg:text-7xl">
              El software #1 para <span className="text-primary">lavanderías</span> en República Dominicana.
            </h1>
            <p className="mt-6 max-w-xl text-balance text-lg text-muted-foreground">
              Cobra con ITBIS y NCF, imprime tickets térmicos 57/80mm, controla caja, clientes y entregas
              desde una sola pantalla. Multi-sucursal, en pesos dominicanos y con soporte criollo por WhatsApp.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link to="/registro">
                <Button className="h-12 px-8 text-base bg-primary shadow-glow hover:opacity-95 font-bold">
                  Comenzar prueba de 14 días <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="outline" className="h-12 px-8 text-base border-slate-200 hover:bg-slate-50 font-bold">
                  Ver demo en vivo
                </Button>
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-success" /> Sin tarjeta de crédito</div>
              <div className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-success" /> Soporte en español 🇩🇴</div>
              <div className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-success" /> Cancela cuando quieras</div>
              <div className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-success" /> Datos en la nube</div>
            </div>
          </motion.div>

          {/* MOCK TICKET */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, rotate: 2 }}
            animate={{ opacity: 1, scale: 1, rotate: 1.5 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
            className="relative -mt-8 flex items-center justify-center lg:-mt-16"
          >
            <div className="absolute -inset-10 -z-10 bg-gradient-primary opacity-20 blur-3xl" />
            <div className="w-[300px] rounded-2xl border border-border bg-surface p-6 font-mono text-[11px] leading-relaxed text-foreground shadow-elegant">
              <div className="flex flex-col items-center border-b border-dashed border-border pb-3">
                <Logo size="sm" showWordmark={false} />
                <div className="mt-2 font-display text-base">Lavandería La Burbuja</div>
                <div className="text-muted-foreground">RNC: 131-12345-6</div>
                <div className="text-muted-foreground">Tel: 809-555-0142</div>
              </div>
              <div className="border-b border-dashed border-border py-2">
                <div>ORDEN: LX-202605-0042</div>
                <div>NCF: B0200000123</div>
                <div>Fecha: 02/05/2026 10:30 AM</div>
                <div>Cliente: Juan Pérez</div>
              </div>
              <div className="border-b border-dashed border-border py-2 space-y-1">
                <div className="flex justify-between"><span>Camisa M/L x2</span><span>RD$300</span></div>
                <div className="flex justify-between"><span>Pantalón vestir x1</span><span>RD$200</span></div>
                <div className="flex justify-between"><span>Lavado/lb 3.5lb</span><span>RD$280</span></div>
              </div>
              <div className="space-y-1 py-2">
                <div className="flex justify-between"><span>Subtotal</span><span>RD$ 780.00</span></div>
                <div className="flex justify-between"><span>ITBIS 18%</span><span>RD$ 140.40</span></div>
                <div className="flex justify-between border-t border-border pt-1 font-display text-base">
                  <span>TOTAL</span><span>{formatRD(920.4)}</span>
                </div>
              </div>
              <div className="border-t border-dashed border-border pt-2 text-center text-muted-foreground">
                ¡Gracias por su visita! 🧺
              </div>
            </div>
            <div className="absolute -bottom-4 -right-2 rounded-full bg-gold px-3 py-1.5 text-xs font-semibold text-gold-foreground shadow-elegant">
              57mm / 80mm
            </div>
          </motion.div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section className="border-y border-border bg-surface">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-6 py-10 md:grid-cols-4">
          {[
            { n: "+250", l: "Lavanderías activas en RD" },
            { n: "+1.2M", l: "Órdenes procesadas" },
            { n: "99.9%", l: "Tiempo en línea" },
            { n: "4.9/5", l: "Calificación promedio" },
          ].map((s) => (
            <div key={s.l} className="text-center">
              <div className="font-display text-3xl text-primary md:text-4xl">{s.n}</div>
              <div className="mt-1 text-xs text-muted-foreground md:text-sm">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* PROBLEMA / SOLUCIÓN */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-primary">¿Por qué Klynn?</div>
            <h2 className="text-balance text-4xl md:text-5xl">
              Deja la libreta y el Excel. <span className="text-primary">Tu lavandería merece más.</span>
            </h2>
            <p className="mt-5 text-lg text-muted-foreground">
              En República Dominicana, la mayoría de las lavanderías todavía anota órdenes a mano,
              pierde tickets y cuadra la caja "a ojo". El resultado: prendas perdidas, clientes molestos
              y dinero que se va sin saber por dónde.
            </p>
            <p className="mt-4 text-lg text-muted-foreground">
              Klynn nació en Santo Domingo para resolver exactamente eso. Un sistema diseñado con
              dueños de lavanderías dominicanas, que entiende cómo se cobra aquí, cómo se factura el
              ITBIS y cómo se entrega en sectores como Naco, Bella Vista o Los Cacicazgos.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { icon: Calculator, t: "ITBIS automático", d: "18% calculado en cada factura, sin errores." },
              { icon: FileText, t: "NCF por tipo", d: "B01, B02, B14, B15 con secuencias auto." },
              { icon: Banknote, t: "Pesos dominicanos", d: "Sin conversiones, sin tasas raras." },
              { icon: Cloud, t: "100% en la nube", d: "Entra desde cualquier dispositivo." },
              { icon: Lock, t: "Permisos por rol", d: "Cajero, admin, repartidor. Cada uno ve lo suyo." },
              { icon: Headphones, t: "Soporte criollo", d: "Te respondemos en WhatsApp en minutos." },
            ].map((b) => (
              <div key={b.t} className="rounded-2xl border border-border bg-surface p-5 shadow-card">
                <b.icon className="mb-3 h-5 w-5 text-primary" />
                <div className="font-display text-lg">{b.t}</div>
                <div className="mt-1 text-sm text-muted-foreground">{b.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="border-y border-border bg-surface-elevated">
        <div className="mx-auto max-w-7xl px-6 py-24">
          <div className="mb-14 max-w-2xl">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-primary">Operación completa</div>
            <h2 className="text-balance text-4xl md:text-5xl">Todo lo que necesita una lavandería moderna en RD.</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Diseñado junto a lavanderías de Santo Domingo, Santiago y la zona Este. Cubrimos cada paso desde
              que el cliente entra por la puerta hasta el cierre de caja del día.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                className="group rounded-2xl border border-border bg-surface p-6 shadow-card transition hover:-translate-y-1 hover:shadow-elegant"
              >
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-foreground transition group-hover:bg-gradient-primary group-hover:text-primary-foreground">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mb-2 text-xl">{f.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CÓMO FUNCIONA */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="mb-14 text-center">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-primary">Empieza en 5 minutos</div>
          <h2 className="text-balance text-4xl md:text-5xl">Así de fácil arrancas con tu lavandería.</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-4">
          {[
            { n: "01", t: "Crea tu cuenta", d: "Regístrate gratis en 1 minuto. Sin tarjeta de crédito." },
            { n: "02", t: "Configura tu negocio", d: "Sube tu logo, RNC, sucursales y precios de prendas." },
            { n: "03", t: "Conecta tu impresora", d: "Térmica 57 u 80mm. Plug & play con ESC/POS." },
            { n: "04", t: "Empieza a cobrar", d: "Recibe órdenes, imprime tickets y cuadra caja." },
          ].map((s) => (
            <div key={s.n} className="relative rounded-2xl border border-border bg-surface p-6 shadow-card">
              <div className="font-display text-5xl text-primary/20">{s.n}</div>
              <div className="mt-2 font-display text-xl">{s.t}</div>
              <div className="mt-2 text-sm text-muted-foreground">{s.d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* PARA QUIÉN */}
      <section id="sectores" className="border-y border-border bg-surface-elevated">
        <div className="mx-auto max-w-7xl px-6 py-24">
          <div className="mb-14 max-w-2xl">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-primary">Para quién es</div>
            <h2 className="text-balance text-4xl md:text-5xl">Cualquier lavandería dominicana, sin importar el tamaño.</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { icon: Building2, t: "Lavanderías de barrio", d: "Manejas 30–80 órdenes al día. Necesitas cobrar rápido, imprimir ticket y no perder prendas. Klynn te lo resuelve desde RD$1,500/mes." },
              { icon: TrendingUp, t: "Cadenas multi-sucursal", d: "Tienes 2 o más locales en Santo Domingo, Santiago o la zona Este. Consolida ventas, inventario y empleados en un solo panel." },
              { icon: Star, t: "Lavanderías premium", d: "Tintorería, sastrería, planchado fino y entrega a domicilio. Cobra como hotel 5 estrellas con tickets y WhatsApp de marca." },
            ].map((s) => (
              <div key={s.t} className="rounded-2xl border border-border bg-surface p-7 shadow-card">
                <s.icon className="mb-4 h-7 w-7 text-primary" />
                <div className="font-display text-2xl">{s.t}</div>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIOS */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="mb-14 text-center">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-primary">Lo que dicen los dueños</div>
          <h2 className="text-balance text-4xl md:text-5xl">Lavanderías dominicanas hablando claro.</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {testimonios.map((t) => (
            <div key={t.nombre} className="rounded-2xl border border-border bg-surface p-7 shadow-card">
              <div className="flex gap-0.5 text-gold">
                {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-4 w-4 fill-gold" />)}
              </div>
              <p className="mt-4 text-base leading-relaxed text-foreground">"{t.texto}"</p>
              <div className="mt-5 border-t border-border pt-4">
                <div className="font-display text-base">{t.nombre}</div>
                <div className="text-xs text-muted-foreground">{t.negocio}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* PLANES */}
      <section id="planes" className="border-y border-border bg-surface-elevated">
        <div className="mx-auto max-w-7xl px-6 py-24">
          <div className="mb-14 text-center">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-primary">Planes en RD$</div>
            <h2 className="text-balance text-4xl md:text-5xl">Precios honestos, sin sorpresas.</h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
              14 días de prueba gratis en cualquier plan. Cambia o cancela cuando quieras. Pagos en pesos dominicanos.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {PLANS.map((plan) => (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-2xl border p-7 transition ${
                  plan.destacado
                    ? "border-primary bg-surface shadow-elegant lg:scale-[1.03]"
                    : "border-border bg-surface shadow-card hover:shadow-elegant"
                }`}
              >
                {plan.destacado && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-gold px-3 py-1 text-xs font-semibold text-gold-foreground shadow-elegant">
                    Más popular
                  </div>
                )}
                <div className="font-display text-2xl">{plan.nombre}</div>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="font-display text-5xl">{formatRD(plan.precio_mensual).replace("DOP", "RD$")}</span>
                </div>
                <div className="text-sm text-muted-foreground">por mes</div>

                <ul className="my-6 space-y-2.5 text-sm">
                  <Feature on>{plan.limite_empleados} empleados</Feature>
                  <Feature on>{plan.limite_ordenes_mes ? `${plan.limite_ordenes_mes.toLocaleString("es-DO")} órdenes/mes` : "Órdenes ilimitadas"}</Feature>
                  <Feature on>Caja, clientes, gastos, reportes</Feature>
                  <Feature on={plan.modulos.sastreria}>Módulo de sastrería</Feature>
                  <Feature on={plan.modulos.entregas}>Entregas a domicilio</Feature>
                  <Feature on={plan.modulos.whatsapp}>Notificaciones WhatsApp</Feature>
                  <Feature on={plan.modulos.reportes_avanzados}>Reportes avanzados</Feature>
                  <Feature on={plan.modulos.api}>Acceso API</Feature>
                </ul>

                <Link to="/registro" className="mt-auto">
                  <Button
                    className={`w-full h-11 px-6 font-bold shadow-elegant hover:opacity-95 ${plan.destacado ? "bg-primary text-white" : ""}`}
                    variant={plan.destacado ? "default" : "outline"}
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Empezar con {plan.nombre}
                  </Button>
                </Link>
              </div>
            ))}
          </div>

          <p className="mx-auto mt-10 max-w-2xl text-center text-sm text-muted-foreground">
            ¿Necesitas un plan a la medida o tienes una cadena con +5 sucursales? Escríbenos por WhatsApp y armamos algo
            que te haga sentido. Aceptamos transferencia bancaria, tarjeta y AzulPagos.
          </p>
        </div>
      </section>

      {/* CIUDADES */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="mb-10 text-center">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-primary">
            <MapPin className="mr-1 inline h-3 w-3" /> Cobertura nacional
          </div>
          <h2 className="text-balance text-3xl md:text-4xl">Lavanderías usándonos en todo el país.</h2>
          <p className="mt-3 text-muted-foreground">De la frontera al Este, del Cibao al Sur.</p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {ciudades.map((c) => (
            <span key={c} className="rounded-full border border-border bg-surface px-4 py-1.5 text-sm text-muted-foreground shadow-card">
              {c}
            </span>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-y border-border bg-surface-elevated">
        <div className="mx-auto max-w-4xl px-6 py-24">
          <div className="mb-12 text-center">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-primary">Preguntas frecuentes</div>
            <h2 className="text-balance text-4xl md:text-5xl">Lo que más nos preguntan en RD.</h2>
          </div>
          <div className="space-y-4">
            {faqs.map((f) => (
              <details key={f.q} className="group rounded-2xl border border-border bg-surface p-6 shadow-card">
                <summary className="flex cursor-pointer items-center justify-between gap-4 font-display text-lg">
                  {f.q}
                  <span className="text-primary transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* DEMO CTA */}
      <section id="demo" className="mx-auto max-w-7xl px-6 py-24">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-primary p-10 text-primary-foreground shadow-elegant md:p-16">
          <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-gold/30 blur-3xl" />
          <div className="absolute -bottom-20 -left-10 h-72 w-72 rounded-full bg-primary-glow/40 blur-3xl" />
          <div className="relative max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary-foreground/15 px-3 py-1 text-xs font-medium backdrop-blur">
              <Zap className="h-3.5 w-3.5" /> Demo precargada
            </div>
            <h2 className="text-balance text-4xl text-primary-foreground md:text-5xl">
              Entra como <em className="not-italic text-gold">Lavandería La Burbuja</em> y prueba todo.
            </h2>
            <p className="mt-4 text-lg text-primary-foreground/85">
              Te dejamos un tenant demo listo. Solo entra, no necesitas registrarte.
            </p>
            <div className="mt-6 grid max-w-md gap-2 rounded-xl border border-primary-foreground/20 bg-primary-foreground/10 p-4 text-sm backdrop-blur">
              <div className="flex justify-between"><span className="opacity-70">Lavandería</span><span className="font-mono">laburbuja</span></div>
              <div className="flex justify-between"><span className="opacity-70">Email</span><span className="font-mono">admin@laburbuja.do</span></div>
              <div className="flex justify-between"><span className="opacity-70">Contraseña</span><span className="font-mono">demo1234</span></div>
            </div>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/login">
                <Button size="sm" variant="secondary" className="bg-surface text-foreground hover:bg-surface/90">
                  Entrar al demo <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/registro">
                <Button size="sm" variant="outline" className="border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10">
                  Crear mi lavandería
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CONTACTO */}
      <section className="mx-auto max-w-7xl px-6 pb-24">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { icon: MessageCircle, t: "WhatsApp", d: "+1 (809) 555-0142", s: "Lun–Sáb 8am–8pm" },
            { icon: Phone, t: "Teléfono", d: "+1 (809) 555-0142", s: "Soporte técnico" },
            { icon: Globe, t: "Oficina", d: "Av. 27 de Febrero, Santo Domingo", s: "República Dominicana" },
          ].map((c) => (
            <div key={c.t} className="rounded-2xl border border-border bg-surface p-6 shadow-card">
              <c.icon className="mb-3 h-6 w-6 text-primary" />
              <div className="font-display text-lg">{c.t}</div>
              <div className="mt-1 text-sm text-foreground">{c.d}</div>
              <div className="text-xs text-muted-foreground">{c.s}</div>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border bg-surface">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <Logo size="sm" />
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                Software de gestión hecho en República Dominicana 🇩🇴 para lavanderías que quieren crecer ordenadas, cobrar bien y dormir tranquilas.
              </p>
            </div>
            <div>
              <div className="mb-3 text-sm font-semibold">Producto</div>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground">Funciones</a></li>
                <li><a href="#planes" className="hover:text-foreground">Planes y precios</a></li>
                <li><a href="#demo" className="hover:text-foreground">Demo en vivo</a></li>
                <li><Link to="/registro" className="hover:text-foreground">Crear cuenta</Link></li>
              </ul>
            </div>
            <div>
              <div className="mb-3 text-sm font-semibold">Recursos</div>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li><a href="#faq" className="hover:text-foreground">Preguntas frecuentes</a></li>
                <li><a href="#sectores" className="hover:text-foreground">¿Para quién es?</a></li>
                <li><span>Reportes DGII (606/607)</span></li>
                <li><span>Tickets ESC/POS 57/80mm</span></li>
              </ul>
            </div>
            <div>
              <div className="mb-3 text-sm font-semibold">Contacto</div>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li className="flex items-center gap-1.5"><MessageCircle className="h-3 w-3" /> +1 809-555-0142</li>
                <li className="flex items-center gap-1.5"><Clock className="h-3 w-3" /> Lun–Sáb 8am–8pm</li>
                <li className="flex items-center gap-1.5"><MapPin className="h-3 w-3" /> Santo Domingo, RD</li>
              </ul>
            </div>
          </div>
          <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 md:flex-row">
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} Klynn · Hecho con 🧼 en República Dominicana
            </p>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> Datos seguros</span>
              <span className="flex items-center gap-1"><CreditCard className="h-3 w-3" /> Pagos en RD$</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Feature({ children, on }: { children: React.ReactNode; on: boolean }) {
  return (
    <li className={`flex items-start gap-2 ${on ? "" : "opacity-40 line-through"}`}>
      <Check className={`mt-0.5 h-4 w-4 shrink-0 ${on ? "text-success" : "text-muted-foreground"}`} />
      <span>{children}</span>
    </li>
  );
}
