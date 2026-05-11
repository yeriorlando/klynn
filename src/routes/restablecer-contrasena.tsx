import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Lock, ShieldCheck, CheckCircle2, Eye, EyeOff, AlertCircle } from "lucide-react";
import { Logo } from "@/components/klynn/Logo";
import { SeedBootstrap } from "@/components/klynn/SeedBootstrap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/restablecer-contrasena")({
  head: () => ({
    meta: [
      { title: "Restablecer contraseña — Klynn" },
      { name: "description", content: "Crea una nueva contraseña para tu cuenta de Klynn." },
    ],
  }),
  component: RestablecerContrasenaPage,
});

function RestablecerContrasenaPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Verificar si hay una sesión activa (Supabase pone el hash en la URL y lo maneja)
  useEffect(() => {
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        console.log("Password recovery mode active");
      }
    });
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password) return;
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }
    
    setLoading(true);
    setError("");

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        throw error;
      }

      setSuccess(true);
      setTimeout(() => {
        navigate({ to: "/login" });
      }, 3000);
    } catch (err: any) {
      console.error("Error al restablecer contraseña:", err);
      setError(err.message || "No se pudo restablecer la contraseña. El enlace puede haber expirado.");
    } finally {
      setLoading(false);
    }
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
            <h2 className="text-4xl font-black tracking-tighter">Nueva contraseña</h2>
            <p className="max-w-sm mx-auto text-white/80 text-lg">
              Crea una contraseña segura para proteger el acceso a tu lavandería.
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
            {!success ? (
              <motion.div
                key="form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <h1 className="text-4xl font-black tracking-tighter text-slate-900">Establecer contraseña</h1>
                <p className="mt-3 text-base text-muted-foreground">
                  Ingresa tu nueva contraseña a continuación.
                </p>

                <form onSubmit={onSubmit} className="mt-8 space-y-6">
                  <div className="space-y-4">
                    <div>
                      <Label className="mb-2 block text-sm font-bold text-slate-700">Nueva contraseña</Label>
                      <div className="relative group">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                        <Input 
                          required
                          value={password} 
                          onChange={e => setPassword(e.target.value)} 
                          type={showPassword ? "text" : "password"} 
                          placeholder="••••••••" 
                          className="pl-11 pr-11 h-12 border-slate-200 focus:border-primary transition-all rounded-xl" 
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors"
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <Label className="mb-2 block text-sm font-bold text-slate-700">Confirmar contraseña</Label>
                      <div className="relative group">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                        <Input 
                          required
                          value={confirmPassword} 
                          onChange={e => setConfirmPassword(e.target.value)} 
                          type={showPassword ? "text" : "password"} 
                          placeholder="••••••••" 
                          className="pl-11 pr-11 h-12 border-slate-200 focus:border-primary transition-all rounded-xl" 
                        />
                      </div>
                    </div>
                  </div>

                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive"
                    >
                      <AlertCircle className="h-4 w-4 shrink-0" /> {error}
                    </motion.div>
                  )}

                  <Button
                    type="submit"
                    size="sm"
                    disabled={loading}
                    className="w-full h-12 text-base text-white bg-primary hover:opacity-90 shadow-glow transition-all active:scale-[0.98] font-bold rounded-xl"
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Guardando...
                      </div>
                    ) : "Cambiar contraseña"}
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
                  <h2 className="text-2xl font-black tracking-tighter">¡Contraseña actualizada!</h2>
                  <p className="text-base text-muted-foreground px-4">
                    Tu contraseña ha sido cambiada exitosamente. Redirigiéndote al inicio de sesión...
                  </p>
                </div>
                <Button 
                  onClick={() => navigate({ to: "/login" })}
                  className="w-full h-12 rounded-xl font-bold bg-white text-slate-900 border border-slate-200 hover:bg-slate-50 transition-all shadow-sm"
                >
                  Ir al Inicio de Sesión ahora
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            ¿Necesitas ayuda?{' '}
            <a href="mailto:soporte@klynn.com.do" className="font-bold text-primary hover:underline">
              Contactar soporte
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
