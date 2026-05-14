import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { PageHeader } from "@/components/klynn/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Play, CheckCircle2, XCircle, AlertCircle, Loader2, FileText, 
  ChevronRight, ArrowLeft, ShieldCheck, Zap
} from "lucide-react";
import { 
  getECFConfig, getECFSequences, saveECFConfig,
  type ECFConfig, type ECFSequence, type Tenant
} from "@/lib/storage";
import { authenticateDGII, generateECFXml, signXML, sendToDGII } from "@/lib/fiscal";

export const Route = createFileRoute("/t/$slug/fiscal-homologacion")({ component: HomologacionPage });

interface CasoPrueba {
  id: string;
  nombre: string;
  descripcion: string;
  tipo_ecf: string;
  status: 'pending' | 'success' | 'error' | 'running';
  trackId?: string;
  error?: string;
}

const CASOS_INICIALES: CasoPrueba[] = [
  { id: '1', nombre: 'E31 - Crédito Fiscal Estándar', descripcion: 'Emisión exitosa de factura de crédito fiscal.', tipo_ecf: 'E31', status: 'pending' },
  { id: '2', nombre: 'E32 - Consumo Estándar', descripcion: 'Emisión exitosa de factura de consumo final.', tipo_ecf: 'E32', status: 'pending' },
  { id: '3', nombre: 'E34 - Nota de Crédito (E31)', descripcion: 'Emisión de nota de crédito que afecta una E31 previa.', tipo_ecf: 'E34', status: 'pending' },
  { id: '4', nombre: 'E32 - Con Descuento', descripcion: 'Factura de consumo con descuento a nivel de ítem.', tipo_ecf: 'E32', status: 'pending' },
  { id: '5', nombre: 'E31 - Con ITBIS 0%', descripcion: 'Factura de crédito fiscal con productos exentos.', tipo_ecf: 'E31', status: 'pending' },
  // ... añadir más según necesidad de certificación
];

function HomologacionPage() {
  const auth = useRequireAuth();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [config, setConfig] = useState<ECFConfig | null>(null);
  const [casos, setCasos] = useState<CasoPrueba[]>(CASOS_INICIALES);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (auth?.tenant && auth.tenant.id !== '__loading__') {
      setTenant(auth.tenant);
      getECFConfig(auth.tenant.id).then(setConfig);
    }
  }, [auth]);

  async function ejecutarCaso(casoId: string) {
    if (!config || !tenant) return;
    
    setCasos(prev => prev.map(c => c.id === casoId ? { ...c, status: 'running', error: undefined } : c));
    
    try {
      const caso = casos.find(c => c.id === casoId)!;
      
      // 1. Generar XML Mock para el caso
      const doc = {
        tipo_ecf: caso.tipo_ecf,
        encf: 'E' + caso.tipo_ecf.slice(1) + '0000000001', // Mock NCF
        fecha_emision: new Date().toISOString(),
        monto_total: 1000,
        monto_itbis: 180
      };
      
      const xml = generateECFXml(doc as any, tenant);
      
      // 2. Firmar
      const signedXml = await signXML(xml, config);
      
      // 3. Enviar a DGII
      const trackId = await sendToDGII(signedXml, config);
      
      setCasos(prev => prev.map(c => c.id === casoId ? { 
        ...c, 
        status: 'success', 
        trackId 
      } : c));
      
      toast.success(`Caso ${caso.id} completado con éxito`);
    } catch (err: any) {
      setCasos(prev => prev.map(c => c.id === casoId ? { 
        ...c, 
        status: 'error', 
        error: err.message 
      } : c));
      toast.error(`Error en caso ${casoId}: ` + err.message);
    }
  }

  if (!auth || !tenant) return null;

  return (
    <div className="max-w-5xl mx-auto pb-20">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" asChild className="rounded-full">
          <Link to={`/t/${tenant.slug}/configuracion`}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <PageHeader 
          title="Homologación DGII" 
          description="Ejecuta los casos de prueba obligatorios para obtener tu certificación e-CF." 
        />
      </div>

      {!config?.is_active && (
        <Card className="p-12 text-center border-dashed border-primary/30 bg-primary/5 mb-8 rounded-[2rem]">
          <AlertCircle className="h-12 w-12 text-primary mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-display mb-2">Configuración Requerida</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
            Debes configurar tu certificado digital y activar el modo e-CF antes de iniciar las pruebas.
          </p>
          <Button asChild>
            <Link to={`/t/${tenant.slug}/configuracion`}>Ir a Configuración</Link>
          </Button>
        </Card>
      )}

      <div className="grid gap-6">
        {/* Resumen de Progreso */}
        <Card className="p-6 rounded-3xl border-none shadow-card bg-gradient-to-br from-slate-900 to-slate-800 text-white">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Estado de Certificación</div>
              <div className="text-3xl font-display flex items-center gap-3">
                {Math.round((casos.filter(c => c.status === 'success').length / casos.length) * 100)}% 
                <span className="text-sm font-normal text-slate-400">Completado</span>
              </div>
            </div>
            <div className="h-14 w-14 rounded-2xl bg-white/10 flex items-center justify-center">
              <ShieldCheck className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-1000" 
              style={{ width: `${(casos.filter(c => c.status === 'success').length / casos.length) * 100}%` }}
            />
          </div>
        </Card>

        {/* Lista de Casos */}
        <div className="grid gap-3">
          {casos.map((caso) => (
            <Card key={caso.id} className="p-4 rounded-2xl border-none shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
              <div className="flex items-center gap-4">
                <div className={`h-12 w-12 rounded-xl flex items-center justify-center transition-colors ${
                  caso.status === 'success' ? 'bg-emerald-100 text-emerald-600' :
                  caso.status === 'error' ? 'bg-red-100 text-red-600' :
                  caso.status === 'running' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'
                }`}>
                  {caso.status === 'success' ? <CheckCircle2 className="h-6 w-6" /> :
                   caso.status === 'error' ? <XCircle className="h-6 w-6" /> :
                   caso.status === 'running' ? <Loader2 className="h-6 w-6 animate-spin" /> :
                   <FileText className="h-6 w-6" />}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm truncate">{caso.nombre}</h4>
                    <Badge variant="outline" className="text-[9px] h-4">{caso.tipo_ecf}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{caso.descripcion}</p>
                </div>

                <div className="flex items-center gap-3">
                  {caso.trackId && (
                    <div className="hidden md:block text-right">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">TrackID</div>
                      <div className="text-[10px] font-mono text-emerald-600">{caso.trackId}</div>
                    </div>
                  )}
                  <Button 
                    size="sm" 
                    variant={caso.status === 'success' ? 'ghost' : 'default'}
                    onClick={() => ejecutarCaso(caso.id)}
                    disabled={caso.status === 'running' || !config?.is_active}
                    className="rounded-xl h-9 px-4 font-bold"
                  >
                    {caso.status === 'success' ? 'Re-ejecutar' : 'Ejecutar'}
                    <Zap className="ml-2 h-3 w-3" />
                  </Button>
                </div>
              </div>

              {caso.error && (
                <div className="mt-3 p-3 bg-red-50 rounded-xl border border-red-100 text-[10px] text-red-600 font-mono">
                  Error: {caso.error}
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
