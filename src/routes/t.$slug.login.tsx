import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Lock, Mail, Building2, ChevronDown, AlertCircle, Eye, EyeOff, Sparkles } from "lucide-react";
import { Logo } from "@/components/klynn/Logo";
import { SeedBootstrap } from "@/components/klynn/SeedBootstrap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getTenantBySlug, login, setActiveTenant } from "@/lib/storage";

export const Route = createFileRoute("/t/$slug/login")({
  head: ({ params }) => {
    const tenant = getTenantBySlug(params.slug);
    return {
      meta: [
        { title: `Iniciar sesión — ${tenant?.nombre || "Lavandería"}` },
        { name: "description", content: `Accede al panel de ${tenant?.nombre || "tu lavandería"} en LavanderX.` },
      ],
    };
  },
  component: TenantLoginPage,
});

function TenantLoginPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [tenant, setTenant] = useState<Tenant | null>(null);

  useEffect(() => {
    getTenantBySlug(slug).then(setTenant);
  }, [slug]);

  // Inyectar colores del tenant en CSS variables locales
  const brandStyle = useMemo(() => {
    if (!tenant) return undefined;
    return {
      "--brand-primary": tenant.color_primario,
      "--brand-secondary": tenant.color_secundario || tenant.color_primario,
    } as React.CSSProperties;
  }, [tenant]);

  useEffect(() => {
    if (tenant) {
      setActiveTenant(tenant.slug);
    }
  }, [tenant]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      const r = await login(slug, email, password);
      setLoading(false);
      if (!r.ok) setError(r.error);
      else {
        navigate({ to: "/t/$slug", params: { slug } });
      }
    } catch (err: any) {
      setLoading(false);
      setError("Error de conexión: " + (err.message || "Intente de nuevo"));
    }
  }

  if (!tenant) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
        <div className="mb-6 rounded-full bg-destructive/10 p-6 text-destructive">
          <AlertCircle className="h-12 w-12" />
        </div>
        <h1 className="text-2xl font-bold">Lavandería no encontrada</h1>
        <p className="mt-2 text-muted-foreground">El subdominio "{slug}" no está registrado en nuestra plataforma.</p>
        <Link to="/registro" className="mt-6 text-primary font-semibold hover:underline">
          ¿Quieres registrar tu lavandería? Hazlo aquí
        </Link>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2" style={brandStyle}>
      <SeedBootstrap />

      {/* Panel marca tenant - DINÁMICO POR URL */}
      <div
        className="relative hidden overflow-hidden p-10 lg:flex lg:flex-col lg:justify-between"
        style={{ background: tenant.color_primario }}
      >
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/15 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-white/10 blur-3xl" />

        <Link to="/" className="relative z-10">
          <Logo className="[&>span]:text-white" />
        </Link>

        <div className="relative z-10 flex flex-1 flex-col items-center justify-center text-center text-white">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center"
          >
            <div className="mb-8 relative h-32 w-32">
               <div className="absolute inset-0 rounded-full border-[6px] border-white/20 shadow-2xl" />
               <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full border-[4px] border-white bg-white shadow-xl">
                  {tenant.logo_url ? (
                    <img src={tenant.logo_url} alt="Logo" className="h-full w-full object-cover" />
                  ) : (
                    <Building2 className="h-12 w-12 text-primary" />
                  )}
               </div>
            </div>

            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-xs font-medium backdrop-blur-md border border-white/10">
              <Building2 className="h-3.5 w-3.5" /> {tenant.slug}.lavanderx.com
            </div>

            <h2 className="text-balance text-6xl font-bold leading-tight tracking-tight">
              Bienvenido a {tenant.nombre}
            </h2>
            
            <p className="mt-4 max-w-md text-lg text-white/90 font-medium">
              {tenant.direccion}
              {tenant.direccion && tenant.provincia && " · "}
              {tenant.provincia}
            </p>
          </motion.div>
        </div>

        <div className="relative z-10 text-xs text-white/70">© {new Date().getFullYear()} LavanderX</div>
      </div>

      {/* Form de Inicio de Sesión */}
      <div className="flex items-center justify-center bg-background p-6 lg:p-12">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden flex justify-center">
             <div className="h-16 w-16 rounded-full border-2 border-primary/20 p-1">
                <div className="h-full w-full rounded-full overflow-hidden bg-white flex items-center justify-center">
                   {tenant.logo_url ? <img src={tenant.logo_url} className="object-cover h-full w-full" /> : <Building2 className="text-primary h-6 w-6" />}
                </div>
             </div>
          </div>

          <h1 className="text-3xl font-bold">Iniciar sesión</h1>
          <p className="mt-2 text-muted-foreground">Panel administrativo de <span className="font-semibold text-foreground">{tenant.nombre}</span>.</p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <div>
              <Label className="mb-1.5 block text-sm font-medium text-slate-700">Email</Label>
              <div className="relative group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">
                   <Mail className="h-4 w-4" />
                </div>
                <Input 
                   value={email} 
                   onChange={(e) => setEmail(e.target.value)} 
                   type="email" 
                   placeholder="admin@lavanderia.do" 
                   className="pl-10 h-11 border-slate-200 focus:border-primary transition-all rounded-lg" 
                />
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <Label className="text-sm font-medium text-slate-700">Contraseña</Label>
                <button type="button" className="text-xs text-primary hover:underline font-medium">¿Olvidaste tu contraseña?</button>
              </div>
              <div className="relative group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">
                   <Lock className="h-4 w-4" />
                </div>
                <Input 
                   value={password} 
                   onChange={(e) => setPassword(e.target.value)} 
                   type={showPassword ? "text" : "password"} 
                   placeholder="••••••••" 
                   className="pl-10 pr-10 h-11 border-slate-200 focus:border-primary transition-all rounded-lg" 
                />
                <button 
                   type="button" 
                   onClick={() => setShowPassword(!showPassword)} 
                   className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <motion.div 
                 initial={{ opacity: 0, height: 0 }}
                 animate={{ opacity: 1, height: "auto" }}
                 className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive"
              >
                <AlertCircle className="h-4 w-4 shrink-0" /> {error}
              </motion.div>
            )}

            <Button
              type="submit"
              size="lg"
              disabled={loading}
              className="w-full h-11 text-white shadow-lg transition-all hover:scale-[1.01] active:scale-[0.99] rounded-lg"
              style={{ background: tenant.color_primario }}
            >
              {loading ? "Verificando..." : <span className="flex items-center gap-2">Entrar al panel <ArrowRight className="h-4 w-4" /></span>}
            </Button>
          </form>

          <div className="mt-10 border-t border-slate-100 pt-8 text-center">
             <p className="text-sm text-muted-foreground mb-4">¿No eres de esta lavandería?</p>
             <Link to="/login" className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors">
                <Building2 className="h-3 w-3" /> Cambiar de lavandería
             </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
