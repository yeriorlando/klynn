import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { UserPlus, Trash2, Shield, Eye, EyeOff, Loader2 } from "lucide-react";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { PageHeader } from "@/components/klynn/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  getEmpleados, saveEmpleado, deleteEmpleado, getOrdenes, formatRD, uid,
  PERMISOS_SISTEMA, getPermisosPorRol, can,
  type Empleado, type RolEmpleado, type Orden, type Caja
} from "@/lib/storage";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { checkPlanLimits } from "@/lib/storage";
import { PlanLimitModal } from "@/components/klynn/PlanLimitModal";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/t/$slug/personal")({ component: PersonalPage });

function PersonalPage() {
  const user = useRequireAuth();
  const [refresh, setRefresh] = useState(0);
  const [edit, setEdit] = useState<Empleado | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [emps, setEmps] = useState<Empleado[]>([]);
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [limits, setLimits] = useState<any>({ employeesReached: false, employeeLimit: 0 });
  const [loading, setLoading] = useState(true);

  const tenant = user?.tenant;
  const tenantId = tenant?.id || '';

  useEffect(() => {
    async function load() {
      if (!tenantId || tenantId === '__loading__') return;
      setLoading(true);
      const [eList, oList, lim] = await Promise.all([
        getEmpleados(tenantId),
        getOrdenes(tenantId),
        checkPlanLimits(tenantId)
      ]);
      setEmps(eList);
      setOrdenes(oList);
      setLimits(lim);
      setLoading(false);
    }
    load();
  }, [tenantId, refresh]);

  if (!user || user.tenant.id === '__loading__') return null;

  if (!can(user.empleado, "personal")) {
    return <NoAccess />;
  }



  function handleAdd() {
    if (limits.employeesReached) {
      setShowLimitModal(true);
    } else {
      setShowNew(true);
    }
  }

  const staffCount = emps.filter(e => e.rol !== "ADMIN").length;

  return (
    <div>
      <PageHeader title="Personal" description={`${staffCount} empleados (excluyendo administradores)`}>
        <Button onClick={handleAdd} className="bg-gradient-primary text-white"><UserPlus className="mr-1.5 h-4 w-4" /> Nuevo empleado</Button>
      </PageHeader>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {emps.map((e) => {
          const stats = ordenes.filter((o) => o.empleado_id === e.id && o.estado !== "ANULADA");
          const total = stats.reduce((s, o) => s + o.total, 0);
          return (
            <Card key={e.id} className="cursor-pointer p-5 hover:shadow-elegant" onClick={() => setEdit(e)}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-display text-lg">{e.nombre} {e.apellido || ""}</div>
                  <div className="text-xs text-muted-foreground">{e.email}</div>
                </div>
                <Badge variant={e.activo ? "default" : "outline"} className={e.activo ? "bg-success" : ""}>{e.rol}</Badge>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3 text-xs">
                <div><div className="text-muted-foreground">Órdenes</div><div className="font-display text-base">{stats.length}</div></div>
                <div><div className="text-muted-foreground">Ventas</div><div className="font-display text-base">{formatRD(total)}</div></div>
              </div>
            </Card>
          );
        })}
      </div>
      <EmpleadoDialog open={showNew || !!edit} onOpenChange={(o) => { if (!o) { setShowNew(false); setEdit(null); } }} empleado={edit} tenantId={user.tenant.id} onDone={() => { setRefresh((r) => r + 1); setShowNew(false); setEdit(null); }} />
      
      <PlanLimitModal 
        open={showLimitModal} 
        onOpenChange={setShowLimitModal} 
        type="employees" 
        limit={limits.employeeLimit} 
        tenant={user.tenant} 
      />
    </div>
  );
}

function EmpleadoDialog({ open, onOpenChange, empleado, tenantId, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; empleado: Empleado | null; tenantId: string; onDone: () => void }) {
  const empty = { nombre: "", apellido: "", email: "", password: "", pin: "", rol: "VENDEDOR" as RolEmpleado, activo: true, permisos: getPermisosPorRol("VENDEDOR") };
  const [f, setF] = useState(empleado ? { ...empty, ...empleado, permisos: empleado.permisos || getPermisosPorRol(empleado.rol) } : empty);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  useEffect(() => { 
    if (empleado) {
      setF({ ...empty, ...empleado, permisos: empleado.permisos || getPermisosPorRol(empleado.rol), password: "" }); // Limpiamos password al editar
    } else {
      setF(empty);
    }
  }, [empleado, open]);

  const togglePermiso = (id: string) => {
    const next = f.permisos.includes(id) 
      ? f.permisos.filter(p => p !== id)
      : [...f.permisos, id];
    setF({ ...f, permisos: next });
  };

  async function submit() {
    if (!f.nombre.trim() || !f.apellido.trim() || !f.email.includes("@")) { 
      toast.error("Nombre, apellido y email válidos requeridos"); 
      return; 
    }
    if (!empleado && f.password.length < 8) { 
      toast.error("La contraseña inicial debe tener al menos 8 caracteres"); 
      return; 
    }
    
    setLoading(true);
    try {
      const e: Empleado = {
        id: empleado?.id || uid("emp"), 
        tenant_id: tenantId, 
        nombre: f.nombre, 
        apellido: f.apellido || undefined, 
        email: f.email,
        password: f.password || (empleado ? '***' : ""), // Si estamos editando y no hay pass, mandamos '***' para no cambiarla
        pin: f.pin || undefined,
        rol: f.rol, 
        activo: f.activo, 
        permisos: f.permisos, 
        creado_en: empleado?.creado_en || new Date().toISOString(),
      };
      await saveEmpleado(e); 
      toast.success("Empleado guardado correctamente"); 
      onDone();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Error al guardar empleado");
    } finally {
      setLoading(false);
    }
  }

  async function remove() { 
    if (empleado) { 
      setLoading(true);
      try {
        await deleteEmpleado(empleado.id); 
        toast.success("Empleado eliminado"); 
        onDone(); 
      } catch (err) {
        toast.error("Error al eliminar");
      } finally {
        setLoading(false);
      }
    } 
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl max-w-4xl p-0 overflow-hidden border-none shadow-2xl">
        <div className="flex flex-col md:flex-row h-full max-h-[90vh]">
          {/* LEFT: FORM DATA */}
          <div className="flex-1 p-8 bg-surface">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-2xl font-display">
                {empleado ? "Editar empleado" : "Nuevo empleado"}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">Define los datos básicos de acceso.</p>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nombre</Label>
                  <Input value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} placeholder="Ej. Juan" className="h-11 rounded-xl bg-background border-border/50" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Apellido</Label>
                  <Input value={f.apellido} onChange={(e) => setF({ ...f, apellido: e.target.value })} placeholder="Ej. Pérez" className="h-11 rounded-xl bg-background border-border/50" />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Correo Electrónico</Label>
                <Input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="empleado@klynn.do" className="h-11 rounded-xl bg-background border-border/50" />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {empleado ? "Cambiar contraseña" : "Contraseña"}
                  </Label>
                  <div className="relative">
                    <Input 
                      type={showPassword ? "text" : "password"} 
                      value={f.password} 
                      onChange={(e) => setF({ ...f, password: e.target.value })} 
                      placeholder={empleado ? "••••••••" : "Mínimo 8 caracteres"} 
                      className="h-11 rounded-xl bg-background border-border/50 pr-10" 
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">PIN Acceso Rápido</Label>
                  <Input value={f.pin} onChange={(e) => setF({ ...f, pin: e.target.value.slice(0, 4) })} placeholder="4 dígitos" className="h-11 rounded-xl bg-background border-border/50" />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 items-end">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Rol en el negocio</Label>
                  <Select 
                    value={f.rol} 
                    onValueChange={(v) => {
                      const rol = v as RolEmpleado;
                      setF({ ...f, rol, permisos: getPermisosPorRol(rol) });
                    }}
                  >
                    <SelectTrigger className="h-11 rounded-xl bg-background border-border/50"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(["ADMIN", "SUPERVISOR", "VENDEDOR", "RECEPCIONISTA", "REPARTIDOR"] as RolEmpleado[]).map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-3 h-11 px-4 rounded-xl border border-border/50 bg-background/50">
                  <Checkbox id="activo" checked={f.activo} onCheckedChange={(v) => setF({ ...f, activo: !!v })} />
                  <Label htmlFor="activo" className="text-sm font-medium cursor-pointer">Empleado Activo</Label>
                </div>
              </div>

              <div className="pt-2">
                <PasswordStrengthIndicator password={f.password} />
              </div>
            </div>

            <div className="mt-8 flex items-center justify-between border-t border-border/50 pt-6">
              {empleado ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" className="text-destructive hover:bg-destructive/10 rounded-xl px-4 transition-colors">
                      <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="rounded-[2rem] border-none shadow-2xl">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-xl">¿Eliminar a {empleado.nombre}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta acción es irreversible. Se eliminará el acceso y todo el registro vinculado.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2">
                      <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={remove} className="bg-destructive text-white rounded-xl hover:bg-destructive/90">Confirmar eliminación</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : <div />}
              
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl h-11 px-6 border-slate-200">Cancelar</Button>
                <Button 
                  onClick={submit} 
                  disabled={loading}
                  className="bg-primary text-white rounded-xl h-11 px-10 font-bold shadow-glow hover:opacity-95 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar Empleado"}
                </Button>
              </div>
            </div>
          </div>

          {/* RIGHT: PERMISSIONS */}
          <div className="w-full md:w-80 bg-slate-50/50 border-l border-border/50 p-8">
            <div className="mb-6">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary mb-3">
                <Shield className="h-5 w-5" />
              </div>
              <h3 className="font-display text-lg">Permisos de Acceso</h3>
              <p className="text-[11px] text-muted-foreground leading-relaxed">Personaliza qué secciones puede ver este empleado.</p>
            </div>

            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-3">
                {PERMISOS_SISTEMA.map((p) => (
                  <div 
                    key={p.id} 
                    className={`flex items-start gap-3 p-3 rounded-2xl border transition-all ${
                      f.permisos.includes(p.id) 
                        ? "bg-white border-primary/20 shadow-sm" 
                        : "bg-transparent border-transparent opacity-60"
                    }`}
                  >
                    <Checkbox 
                      id={p.id} 
                      checked={f.permisos.includes(p.id)} 
                      onCheckedChange={() => togglePermiso(p.id)}
                      disabled={f.rol === "ADMIN"}
                      className="mt-0.5"
                    />
                    <div className="grid gap-1">
                      <Label htmlFor={p.id} className="text-xs font-bold leading-none cursor-pointer">
                        {p.nombre}
                      </Label>
                      <p className="text-[9px] text-muted-foreground leading-tight">{p.descripcion}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {f.rol === "ADMIN" && (
              <div className="mt-4 p-3 rounded-xl bg-primary/5 border border-primary/10">
                <p className="text-[10px] text-primary font-medium text-center italic">
                  Los administradores tienen acceso total por defecto.
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PasswordStrengthIndicator({ password }: { password: string }) {
  const getStrength = (p: string) => {
    let score = 0;
    if (!p) return 0;
    if (p.length >= 6) score++;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    return score;
  };

  const strength = Math.min(4, getStrength(password));
  const colors = ["bg-slate-200", "bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-success"];
  const labels = ["", "Muy débil", "Débil", "Media", "Fuerte"];

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-500 ${
              i <= strength ? colors[strength] : "bg-slate-100"
            }`}
          />
        ))}
      </div>
      {password && (
        <div className="flex items-center justify-between">
          <p className={`text-[10px] font-bold uppercase tracking-wider ${strength <= 2 ? "text-orange-500" : "text-success"}`}>
            Seguridad: {labels[strength]}
          </p>
        </div>
      )}
    </div>
  );
}

function NoAccess() {
  return (
    <Card className="p-12 text-center">
      <Shield className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
      <h3 className="font-display text-2xl">Acceso restringido</h3>
      <p className="text-sm text-muted-foreground">Solo administradores pueden ver esta página.</p>
    </Card>
  );
}
