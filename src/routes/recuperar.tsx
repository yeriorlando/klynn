import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Mail, ShieldCheck, CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/klynn/Logo";
import { SeedBootstrap } from "@/components/klynn/SeedBootstrap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/recuperar")({
  head: () => ({
    meta: [
      { title: "Recuperar contraseña — Klynn" },
      { name: "description", content: "Restablece el acceso a tu cuenta de Klynn." },
    ],
  }),
  component: RecuperarPage,
});

function RecuperarPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    
    setLoading(true);
    // Simular envío de email
    setTimeout(() => {
      setLoading(false);
      setSent(true);
    }, 1500);
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2 font-sans">
      <SeedBootstrap />

      {/* Panel informativo lateral */}
      <div className="relative hidden overflow-hidden p-10 lg:flex lg:flex-col lg:justify-center bg-primary">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/15 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-white/10 blur-3xl" />

        <div className="absolute top-10 left-10">
          <Link to="/" className="relative z-10">
            <Logo size="lg" iconColor="white" className="[&>span]:text-white" />
          </Link>
        </div>

        <div className="relative text-white text-center mt-[-10%]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="mx-auto w-20 h-20 rounded-3xl bg-white/10 flex items-center justify-center backdrop-blur-xl border border-white/20 shadow-xl">
               <ShieldCheck size={40} className="text-white" />
            </div>
            <h2 className="text-4xl font-black tracking-tighter">Seguridad ante todo</h2>
            <p className="max-w-sm mx-auto text-white/80 text-lg">
              Protegemos el acceso a tu cuenta. Sigue los pasos para restablecer tu contraseña de forma segura.
            </p>
          </motion.div>
        </div>

        <div className="absolute bottom-10 left-10 text-xs text-white/60">© {new Date().getFullYear()} <span className="font-bold">Klynn</span></div>
      </div>

      {/* Formulario */}
      <div className="flex items-center justify-center bg-background p-6 lg:p-12">
        <div className="w-full max-w-md">
          <div className="mb-10">
            <Button 
              variant="ghost" 
              onClick={() => navigate({ to: "/login" })}
              className="group -ml-4 text-muted-foreground hover:text-foreground hover:bg-transparent font-bold"
            >
              <ArrowLeft size={16} className="mr-2 transition-transform group-hover:-translate-x-1" /> Volver al login
            </Button>
          </div>

          <AnimatePresence mode="wait">
            {!sent ? (
              <motion.div
                key="form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <h1 className="text-4xl font-black tracking-tighter text-slate-900">Recuperar contraseña</h1>
                <p className="mt-3 text-base text-muted-foreground">
                  Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
                </p>

                <form onSubmit={onSubmit} className="mt-8 space-y-6">
                  <div>
                    <Label className="mb-2 block text-sm font-bold text-slate-700">Email de tu cuenta</Label>
                    <div className="relative group">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                      <Input 
                        required
                        value={email} 
                        onChange={e => setEmail(e.target.value)} 
                        type="email" 
                        placeholder="admin@klynn.com" 
                        className="pl-11 h-12 border-slate-200 focus:border-primary transition-all rounded-xl" 
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    size="sm"
                    disabled={loading}
                    className="w-full h-12 text-base text-white bg-primary hover:opacity-90 shadow-glow transition-all active:scale-[0.98] font-bold rounded-xl"
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Enviando...
                      </div>
                    ) : "Enviar instrucciones"}
                  </Button>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-8"
              >
                <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-inner border border-emerald-100/50">
                   <CheckCircle2 size={32} />
                </div>
                <div className="space-y-3">
                  <h2 className="text-2xl font-black tracking-tighter">¡Correo enviado!</h2>
                  <p className="text-base text-muted-foreground px-4">
                    Hemos enviado instrucciones a <strong className="text-slate-900">{email}</strong>. Si la cuenta existe, recibirás un enlace en unos minutos.
                  </p>
                </div>
                <Button 
                  onClick={() => navigate({ to: "/login" })}
                  className="w-full h-12 rounded-xl font-bold bg-white text-slate-900 border border-slate-200 hover:bg-slate-50 transition-all shadow-sm"
                >
                  Volver a Iniciar Sesión
                </Button>
                <p className="text-sm text-slate-400 font-medium">
                  ¿No recibiste nada? <button onClick={() => setSent(false)} className="text-primary font-bold hover:underline">Intentar de nuevo</button>
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            ¿Necesitas ayuda?{' '}
            <a href="mailto:soporte@klynn.com" className="font-bold text-primary hover:underline">
              Contactar soporte
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
