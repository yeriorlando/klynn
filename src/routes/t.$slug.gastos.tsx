import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { PageHeader } from "@/components/klynn/PageHeader";
import { ExportAndPrintButtons } from "@/components/klynn/ExportAndPrintButtons";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getGastos, saveGasto, deleteGasto, formatRD, formatDateRD, uid, CATEGORIAS_GASTOS, type Gasto } from "@/lib/storage";
import { toast } from "sonner";
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

export const Route = createFileRoute("/t/$slug/gastos")({ component: GastosPage });

function GastosPage() {
  const user = useRequireAuth();
  const [show, setShow] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState(true);

  const tenant = user?.tenant;
  const tenantId = tenant?.id || '';

  useEffect(() => {
    async function load() {
      if (!tenantId || tenantId === '__loading__') return;
      setLoading(true);
      const list = await getGastos(tenantId);
      setGastos(list.sort((a, b) => +new Date(b.fecha) - +new Date(a.fecha)));
      setLoading(false);
    }
    load();
  }, [tenantId, refresh]);

  if (!user || user.tenant.id === '__loading__') return null;

  const total = gastos.reduce((s, g) => s + g.monto, 0);
  const porCategoria = gastos.reduce((m, g) => { m[g.categoria] = (m[g.categoria] || 0) + g.monto; return m; }, {} as Record<string, number>);

  return (
    <div>
      <PageHeader title="Gastos" description={`${gastos.length} gastos · ${formatRD(total)}`}>
        <ExportAndPrintButtons 
          filename="Gastos" 
          tenant={user.tenant}
          columns={["Fecha", "Categoría", "Descripción", "Proveedor", "Método de Pago", "Monto"]}
          data={gastos.map(g => [
            formatDateRD(g.fecha),
            g.categoria,
            g.descripcion,
            g.proveedor || "—",
            g.metodo_pago,
            formatRD(g.monto)
          ])}
        />
        <Button onClick={() => setShow(true)} className="bg-gradient-primary text-white"><Plus className="mr-1.5 h-4 w-4" /> Nuevo gasto</Button>
      </PageHeader>

      <div className="mb-4 grid gap-3 md:grid-cols-3">
        {Object.entries(porCategoria).slice(0, 3).map(([k, v]) => (
          <Card key={k} className="p-4"><div className="text-xs uppercase text-muted-foreground">{k}</div><div className="font-display text-xl">{formatRD(v)}</div></Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-surface-elevated text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Fecha</th>
                <th className="px-4 py-3 text-left">Categoría</th>
                <th className="px-4 py-3 text-left">Descripción</th>
                <th className="px-4 py-3 text-left">Proveedor</th>
                <th className="px-4 py-3 text-left">Pago</th>
                <th className="px-4 py-3 text-right">Monto</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {gastos.map((g) => (
                <tr key={g.id} className="border-b border-border/50">
                  <td className="px-4 py-2.5 text-xs">{formatDateRD(g.fecha)}</td>
                  <td className="px-4 py-2.5">{g.categoria}</td>
                  <td className="px-4 py-2.5">{g.descripcion}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{g.proveedor || "—"}</td>
                  <td className="px-4 py-2.5 text-xs">{g.metodo_pago}</td>
                  <td className="px-4 py-2.5 text-right font-medium text-destructive">{formatRD(g.monto)}</td>
                  <td className="px-4 py-2.5">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="rounded-2xl border-none shadow-card">
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Eliminar gasto?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción eliminará permanentemente el registro de este gasto ({g.descripcion}).
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={async () => { 
                              try {
                                await deleteGasto(g.id); 
                                setRefresh((r) => r + 1); 
                                toast.success("Gasto eliminado 🗑️"); 
                              } catch (err) {
                                toast.error("Error al eliminar");
                              }
                            }} 
                            className="bg-destructive text-white rounded-xl"
                          >
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </td>
                </tr>
              ))}
              {gastos.length === 0 && <tr><td colSpan={7} className="py-12 text-center text-muted-foreground">Sin gastos</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <NewGasto open={show} onOpenChange={setShow} tenantId={user.tenant.id} empleadoId={user.empleado.id} onDone={() => { setRefresh((r) => r + 1); setShow(false); }} />
    </div>
  );
}

function NewGasto({ open, onOpenChange, tenantId, empleadoId, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; tenantId: string; empleadoId: string; onDone: () => void }) {
  const [f, setF] = useState({ categoria: CATEGORIAS_GASTOS[0], descripcion: "", monto: 0, metodo_pago: "Efectivo", proveedor: "" });
  async function submit() {
    if (!f.descripcion.trim() || f.monto <= 0) { toast.error("Datos inválidos"); return; }
    try {
      await saveGasto({ id: uid("gas"), tenant_id: tenantId, empleado_id: empleadoId, ...f, proveedor: f.proveedor || undefined, fecha: new Date().toISOString(), aprobado: true });
      toast.success("Gasto registrado"); onDone();
      setF({ categoria: CATEGORIAS_GASTOS[0], descripcion: "", monto: 0, metodo_pago: "Efectivo", proveedor: "" });
    } catch (err: any) {
      toast.error("Error al registrar gasto");
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Nuevo gasto</DialogTitle></DialogHeader>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2"><Label>Categoría</Label>
            <Select value={f.categoria} onValueChange={(v) => setF({ ...f, categoria: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIAS_GASTOS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2"><Label>Descripción</Label><Input value={f.descripcion} onChange={(e) => setF({ ...f, descripcion: e.target.value })} /></div>
          <div><Label>Monto (RD$)</Label><Input type="number" value={f.monto || ""} onChange={(e) => setF({ ...f, monto: Number(e.target.value) || 0 })} /></div>
          <div><Label>Método</Label>
            <Select value={f.metodo_pago} onValueChange={(v) => setF({ ...f, metodo_pago: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Efectivo">Efectivo</SelectItem>
                <SelectItem value="Transferencia">Transferencia</SelectItem>
                <SelectItem value="Cheque">Cheque</SelectItem>
                <SelectItem value="Tarjeta">Tarjeta</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2"><Label>Proveedor</Label><Input value={f.proveedor} onChange={(e) => setF({ ...f, proveedor: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} className="bg-gradient-primary text-white">Registrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
