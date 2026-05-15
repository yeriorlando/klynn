import { useQuery } from "@tanstack/react-query";
import { 
  getClientes, getOrdenes, getCatalogo, getServicios, 
  getCajaAbierta, getGastos, getEmpleados, getMovimientos,
  getECFConfig, getCajas, getECFDocuments, getPlans, 
  getGlobalConfig, getECFSequences 
} from "@/lib/storage";

export function useClientes(tenantId: string) {
  return useQuery({
    queryKey: ['clientes', tenantId],
    queryFn: () => getClientes(tenantId),
    enabled: !!tenantId && tenantId !== '__loading__',
  });
}

export function useOrdenes(tenantId: string) {
  return useQuery({
    queryKey: ['ordenes', tenantId],
    queryFn: () => getOrdenes(tenantId),
    enabled: !!tenantId && tenantId !== '__loading__',
  });
}

export function useCatalogo(tenantId: string) {
  return useQuery({
    queryKey: ['catalogo', tenantId],
    queryFn: () => getCatalogo(tenantId),
    enabled: !!tenantId && tenantId !== '__loading__',
  });
}

export function useServicios(tenantId: string) {
  return useQuery({
    queryKey: ['servicios', tenantId],
    queryFn: () => getServicios(tenantId),
    enabled: !!tenantId && tenantId !== '__loading__',
  });
}

export function useCajaAbierta(tenantId: string) {
  return useQuery({
    queryKey: ['caja-abierta', tenantId],
    queryFn: () => getCajaAbierta(tenantId),
    enabled: !!tenantId && tenantId !== '__loading__',
  });
}

export function useGastos(tenantId: string) {
  return useQuery({
    queryKey: ['gastos', tenantId],
    queryFn: () => getGastos(tenantId),
    enabled: !!tenantId && tenantId !== '__loading__',
  });
}

export function useEmpleados(tenantId: string) {
  return useQuery({
    queryKey: ['empleados', tenantId],
    queryFn: () => getEmpleados(tenantId),
    enabled: !!tenantId && tenantId !== '__loading__',
  });
}

export function useMovimientos(tenantId: string, cajaId?: string) {
  return useQuery({
    queryKey: ['movimientos', tenantId, cajaId],
    queryFn: () => getMovimientos(tenantId, cajaId!),
    enabled: !!tenantId && tenantId !== '__loading__' && !!cajaId,
  });
}

export function useECFConfig(tenantId: string) {
  return useQuery({
    queryKey: ['ecf-config', tenantId],
    queryFn: () => getECFConfig(tenantId),
    enabled: !!tenantId && tenantId !== '__loading__',
  });
}

export function useCajas(tenantId: string) {
  return useQuery({
    queryKey: ['cajas', tenantId],
    queryFn: () => getCajas(tenantId),
    enabled: !!tenantId && tenantId !== '__loading__',
  });
}

export function useECFDocuments(tenantId: string) {
  return useQuery({
    queryKey: ['ecf-documents', tenantId],
    queryFn: () => getECFDocuments(tenantId),
    enabled: !!tenantId && tenantId !== '__loading__',
  });
}

export function usePlans() {
  return useQuery({
    queryKey: ['plans'],
    queryFn: () => getPlans(),
  });
}

export function useGlobalConfig() {
  return useQuery({
    queryKey: ['global-config'],
    queryFn: () => getGlobalConfig(),
  });
}

export function useECFSequences(tenantId: string) {
  return useQuery({
    queryKey: ['ecf-sequences', tenantId],
    queryFn: () => getECFSequences(tenantId),
    enabled: !!tenantId && tenantId !== '__loading__',
  });
}





