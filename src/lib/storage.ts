import { supabase } from './supabase';

export type PlanId = "basico" | "pro" | "enterprise";

export interface Plan {
  id: PlanId;
  nombre: string;
  precio_mensual: number;
  precio_anual?: number;
  limite_empleados: number;
  limite_ordenes_mes: number | null;
  modulos: {
    whatsapp: boolean;
    facturacion_fiscal: boolean;
  };
  destacado?: boolean;
}

export interface GlobalConfig {
  requirePlanOnRegistration: boolean;
  trialDays: number;
  defaultPlanId: PlanId;
}

export type RolEmpleado = "ADMIN" | "SUPERVISOR" | "VENDEDOR" | "RECEPCIONISTA" | "REPARTIDOR";

export interface Empleado {
  id: string;
  tenant_id: string;
  nombre: string;
  apellido?: string;
  email: string;
  password: string;
  pin?: string;
  rol: RolEmpleado;
  activo: boolean;
  permisos?: string[]; // Array de keys: 'dashboard', 'caja', etc.
  creado_en: string;
}

export interface Tenant {
  id: string;
  nombre: string;
  slug: string;
  rnc?: string;
  telefono: string;
  direccion: string;
  ciudad?: string;
  provincia?: string;
  email: string;
  logo_url?: string;
  color_primario: string;
  color_secundario: string;
  plan_id: PlanId;
  estado: "TRIAL" | "ACTIVO" | "SUSPENDIDO" | "CANCELADO";
  trial_hasta: string;
  creado_en: string;
  config?: TenantConfig;
}

export interface TenantConfig {
  itbis_incluido: boolean;
  itbis_porcentaje: number;
  formato_ticket: "57mm" | "80mm";
  ticket_mostrar_rnc: boolean;
  ticket_mostrar_empleado: boolean;
  ticket_pie: string;
  recargo_urgencia: number; // %
  umbral_diferencia_caja: number;
  monto_max_caja_chica: number;
  ncf_secuencia: string; // p.ej. B02 (default activo)
  ncf_proximo: number;
  ncf_tipos?: string[]; // tipos habilitados: B01, B02, B14, B15, B16
  ncf_facturacion_activa?: boolean;
  usar_color_secundario?: boolean;
  bancarios?: string;
  whatsapp?: WhatsAppConfig;
}

export interface WhatsAppConfig {
  enabled: boolean;
  api_key: string;
  instance: string; // nombre de instancia WapiSender
  base_url?: string; // por defecto https://api.wapisender.com
  notif_orden_creada: boolean;
  notif_orden_lista: boolean;
  notif_orden_entregada: boolean;
  plantilla_creada: string;
  plantilla_lista: string;
  plantilla_entregada: string;
}

export interface Cliente {
  id: string;
  tenant_id: string;
  nombre: string;
  apellido?: string;
  telefono: string;
  email?: string;
  direccion?: string;
  cedula?: string;
  notas?: string;
  tipo: "Consumidor Final" | "Empresa";
  limite_credito: number;
  creado_en: string;
}

export type EstadoOrden = "RECIBIDA" | "EN_PROCESO" | "LISTA" | "ENTREGADA" | "PAGADA" | "ANULADA";
export type MetodoPago = "EFECTIVO" | "TARJETA" | "TRANSFERENCIA" | "CREDITO" | "MIXTO";

export interface OrdenItem {
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  es_libra?: boolean;
  notas?: string;
}

export interface Orden {
  id: string;
  tenant_id: string;
  numero: string;
  cliente_id: string;
  empleado_id: string;
  servicios: string[];
  items: OrdenItem[];
  subtotal: number;
  itbis: number;
  descuento: number;
  total: number;
  pagado: number;
  saldo: number;
  metodo_pago: MetodoPago;
  estado: EstadoOrden;
  fecha_entrega: string;
  es_urgente: boolean;
  notas?: string;
  creado_en: string;
  ncf?: string;
  motivo_anulacion?: string;
  entrega_domicilio?: boolean;
  repartidor_id?: string;
}

export type EstadoCaja = "ABIERTA" | "CERRADA";
export type TipoMovimiento = "VENTA" | "ABONO" | "INGRESO" | "EGRESO" | "RETIRO" | "GASTO_CAJA_CHICA";

export interface Caja {
  id: string;
  tenant_id: string;
  empleado_id: string;
  monto_inicial: number;
  estado: EstadoCaja;
  abierta_en: string;
  cerrada_en?: string;
  monto_esperado_efectivo?: number;
  monto_contado_efectivo?: number;
  monto_contado_tarjeta?: number;
  monto_contado_transferencia?: number;
  diferencia?: number;
  notas_cierre?: string;
  notas_apertura?: string;
}

export interface MovimientoCaja {
  id: string;
  tenant_id: string;
  caja_id: string;
  empleado_id: string;
  tipo: TipoMovimiento;
  concepto: string;
  monto: number;
  metodo?: MetodoPago;
  referencia?: string;
  orden_id?: string;
  creado_en: string;
}

export interface Gasto {
  id: string;
  tenant_id: string;
  empleado_id: string;
  categoria: string;
  descripcion: string;
  monto: number;
  metodo_pago: string;
  proveedor?: string;
  comprobante_url?: string;
  fecha: string;
  aprobado: boolean;
}

export interface CatalogoItem {
  id: string;
  tenant_id: string;
  categoria: string;
  nombre: string;
  precio: number;
  por_libra?: boolean;
  activo: boolean;
  imagen_url?: string;
  icono?: string; // emoji o nombre lucide
}

export interface Servicio {
  id: string;
  tenant_id: string;
  nombre: string;
  descripcion?: string;
  icono?: string;
  imagen_url?: string;
  activo: boolean;
  precio: number;
}

const KEY = {
  tenants: "lvx:tenants",
  empleados: "lvx:empleados",
  plans: "lvx:plans",
  clientes: "lvx:clientes",
  ordenes: "lvx:ordenes",
  cajas: "lvx:cajas",
  movimientos: "lvx:movimientos",
  gastos: "lvx:gastos",
  catalogo: "lvx:catalogo",
  servicios: "lvx:servicios",
  active: "lvx:activeTenant",
  session: "lvx:session",
  seq: "lvx:orden_seq",
  globalConfig: "lvx:globalConfig",
};

export const PLANS: Plan[] = [
  {
    id: "basico",
    nombre: "Básico",
    precio_mensual: 1500,
    limite_empleados: 3,
    limite_ordenes_mes: 300,
    modulos: { whatsapp: false, facturacion_fiscal: false },
  },
  {
    id: "pro",
    nombre: "Pro",
    precio_mensual: 3500,
    limite_empleados: 10,
    limite_ordenes_mes: 2000,
    modulos: { whatsapp: true, facturacion_fiscal: true },
    destacado: true,
  },
  {
    id: "enterprise",
    nombre: "Enterprise",
    precio_mensual: 7500,
    limite_empleados: 999,
    limite_ordenes_mes: null,
    modulos: { whatsapp: true, facturacion_fiscal: true },
  },
];

export const DEFAULT_CONFIG: TenantConfig = {
  itbis_incluido: false,
  itbis_porcentaje: 18,
  formato_ticket: "80mm",
  ticket_mostrar_rnc: true,
  ticket_mostrar_empleado: true,
  ticket_pie: "¡Gracias por su preferencia!",
  recargo_urgencia: 30,
  umbral_diferencia_caja: 100,
  monto_max_caja_chica: 2000,
  ncf_secuencia: "B02",
  ncf_proximo: 1,
  ncf_tipos: ["B02"],
  ncf_facturacion_activa: false,
  usar_color_secundario: false,
  whatsapp: {
    enabled: false,
    api_key: "",
    instance: "",
    base_url: "https://api.wapisender.com",
    notif_orden_creada: true,
    notif_orden_lista: true,
    notif_orden_entregada: false,
    plantilla_creada: "Hola {cliente} 👋, recibimos tu orden {numero} en {lavanderia}. Total: {total}. Entrega estimada: {entrega}. ¡Gracias!",
    plantilla_lista: "Hola {cliente} ✨, tu orden {numero} en {lavanderia} ya está LISTA para retirar. ¡Te esperamos!",
    plantilla_entregada: "Hola {cliente}, tu orden {numero} fue entregada. ¡Gracias por preferir {lavanderia}!",
  },
};

export const CATEGORIAS_GASTOS = [
  "Suministros",
  "Servicios (luz, agua, internet)",
  "Mantenimiento",
  "Alquiler",
  "Salarios",
  "Transporte",
  "Marketing",
  "Oficina",
  "Otros",
];

export const TIPOS_SERVICIO = [
  "Lavado y secado",
  "Solo lavado",
  "Solo secado",
  "Planchado",
  "Lavado por libra",
  "Lavado en seco",
  "Sastrería",
  "Tapicería",
  "Alfombras",
  "Edredones",
  "Uniformes",
];

export const PROVINCIAS_RD = [
  "Azua","Baoruco","Barahona","Dajabón","Distrito Nacional","Duarte","Elías Piña",
  "El Seibo","Espaillat","Hato Mayor","Hermanas Mirabal","Independencia","La Altagracia",
  "La Romana","La Vega","María Trinidad Sánchez","Monseñor Nouel","Monte Cristi",
  "Monte Plata","Pedernales","Peravia","Puerto Plata","Samaná","San Cristóbal",
  "San José de Ocoa","San Juan","San Pedro de Macorís","Sánchez Ramírez","Santiago",
  "Santiago Rodríguez","Santo Domingo","Valverde",
];

export const NCF_TIPOS: { codigo: string; nombre: string; descripcion: string }[] = [
  { codigo: "B01", nombre: "Crédito Fiscal", descripcion: "Para empresas con RNC" },
  { codigo: "B02", nombre: "Consumidor Final", descripcion: "Venta a consumidor final" },
  { codigo: "B14", nombre: "Gubernamental", descripcion: "Ventas a entidades gubernamentales" },
  { codigo: "B15", nombre: "Régimen Especial", descripcion: "Sectores especiales (zonas francas, etc.)" },
  { codigo: "B16", nombre: "Exportaciones", descripcion: "Para exportaciones de bienes/servicios" },
];

export const PERMISOS_SISTEMA = [
  { id: "dashboard", nombre: "Dashboard", descripcion: "Vista general y métricas rápidas" },
  { id: "nueva-orden", nombre: "Nueva Orden", descripcion: "Crear y recibir pedidos" },
  { id: "ordenes", nombre: "Órdenes", descripcion: "Ver historial y estados de órdenes" },
  { id: "caja", nombre: "Caja", descripcion: "Apertura, cierre y movimientos" },
  { id: "clientes", nombre: "Clientes", descripcion: "Gestión de base de datos de clientes" },
  { id: "catalogo", nombre: "Catálogo", descripcion: "Prendas, precios y servicios" },
  { id: "personal", nombre: "Personal", descripcion: "Gestión de empleados y permisos" },
  { id: "entregas", nombre: "Entregas", descripcion: "Control de despacho y repartidores" },
  { id: "gastos", nombre: "Gastos", descripcion: "Registro de egresos y compras" },
  { id: "reportes", nombre: "Reportes", descripcion: "Estadísticas y análisis financiero" },
  { id: "configuracion", nombre: "Configuración", descripcion: "Ajustes de la lavandería" },
];

export function getPermisosPorRol(rol: RolEmpleado): string[] {
  switch (rol) {
    case "ADMIN":
      return PERMISOS_SISTEMA.map((p) => p.id);
    case "SUPERVISOR":
      return ["dashboard", "nueva-orden", "ordenes", "caja", "clientes", "catalogo", "entregas", "gastos", "reportes"];
    case "VENDEDOR":
      return ["dashboard", "nueva-orden", "ordenes", "caja", "clientes"];
    case "RECEPCIONISTA":
      return ["nueva-orden", "clientes", "ordenes"];
    case "REPARTIDOR":
      return ["entregas"];
    default:
      return [];
  }
}

const isBrowser = () => typeof window !== "undefined";
function read<T>(k: string, f: T): T {
  if (!isBrowser()) return f;
  try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : f; } catch { return f; }
}
function write<T>(k: string, v: T) { if (isBrowser()) localStorage.setItem(k, JSON.stringify(v)); }

// ============ Plans ============
export function getPlans(): Plan[] {
  const s = read<Plan[] | null>(KEY.plans, null);
  if (!Array.isArray(s) || s.length === 0) { write(KEY.plans, PLANS); return PLANS; }
  // Sanitización: Eliminar módulos que ya no existen en la interfaz
  const currentKeys = ["whatsapp", "facturacion_fiscal"];
  return s.map(p => ({
    ...p,
    modulos: Object.fromEntries(
      Object.entries(p.modulos || {}).filter(([k]) => currentKeys.includes(k))
    ) as Plan["modulos"]
  }));
}
export function savePlans(plans: Plan[]) { write(KEY.plans, plans); }

// ============ Tenants (Supabase) ============
export async function getTenants(): Promise<Tenant[]> {
  const { data, error } = await supabase.from('tenants').select('*').order('nombre');
  if (error) { console.error("Error getTenants:", error); return []; }
  return data || [];
}

export async function saveTenant(t: Tenant) {
  const { error } = await supabase.from('tenants').upsert(t);
  if (error) throw error;
}

export async function registerTenant(tenant: Tenant, admin: Empleado) {
  // 1. Crear el usuario en Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: admin.email,
    password: admin.password,
    options: {
      data: {
        nombre: admin.nombre,
        tenant_id: tenant.id
      }
    }
  });

  if (authError) throw authError;
  if (!authData.user) throw new Error("No se pudo crear el usuario");

  // 2. Guardar la lavandería
  const { error: tenantError } = await supabase.from('tenants').insert(tenant);
  if (tenantError) {
    // Rollback Auth user — no se puede desde el cliente, pero al menos señalar el error
    throw new Error("Error al crear lavandería: " + tenantError.message + ". Por favor contacta soporte.");
  }

  // 3. Guardar el Administrador vinculado al ID de Auth
  const { password: _pw, ...empData } = admin;
  const { error: empError } = await supabase.from('empleados').insert({
    ...empData,
    id: authData.user.id,
    password: '***'
  });
  
  if (empError) {
    // Rollback: eliminar el tenant creado
    await supabase.from('tenants').delete().eq('id', tenant.id);
    throw new Error("Error al crear empleado: " + empError.message + ". Por favor intenta de nuevo.");
  }

  // 4. Iniciar sesión
  await supabase.auth.signInWithPassword({
    email: admin.email,
    password: admin.password,
  });

  return { tenant, user: authData.user };
}

export async function deleteTenant(id: string) {
  const { error } = await supabase.from('tenants').delete().eq('id', id);
  if (error) throw error;
}

export async function getTenantBySlug(slug: string): Promise<Tenant | undefined> {
  const { data, error } = await supabase.from('tenants').select('*').eq('slug', slug.toLowerCase()).single();
  if (error) return undefined;
  return data;
}

export async function getTenantById(id: string): Promise<Tenant | undefined> {
  const { data, error } = await supabase.from('tenants').select('*').eq('id', id).single();
  if (error) return undefined;
  return data;
}

export async function isSlugAvailable(slug: string): Promise<boolean> {
  const { data, error } = await supabase.from('tenants').select('id').eq('slug', slug.toLowerCase());
  return !data || data.length === 0;
}

export async function getTenantsForUser(email: string): Promise<Tenant[]> {
  const { data: emps, error: errEmps } = await supabase.from('empleados')
    .select('tenant_id')
    .eq('email', email.toLowerCase())
    .eq('activo', true);
  
  if (errEmps || !emps) return [];
  const tenantIds = Array.from(new Set(emps.map(e => e.tenant_id)));
  
  const { data: tenants, error: errTenants } = await supabase.from('tenants')
    .select('*')
    .in('id', tenantIds);
    
  return tenants || [];
}

export async function updateTenantAdmin(tenant_id: string, newEmail: string, newPassword?: string) {
  // Update Tenant Email
  await supabase.from('tenants').update({ email: newEmail }).eq('id', tenant_id);

  // Update Admin Employee
  const emps = await getEmpleados(tenant_id);
  const admin = emps.find(e => e.rol === "ADMIN");
  if (admin) {
    const updates: Partial<Empleado> = { email: newEmail };
    if (newPassword) updates.password = newPassword;
    await supabase.from('empleados').update(updates).eq('id', admin.id);
  }
}

export async function updateTenantPlan(tenantId: string, planId: PlanId) {
  const { error } = await supabase.from('tenants').update({ plan_id: planId }).eq('id', tenantId);
  return !error;
}

const DEFAULT_GLOBAL_CONFIG: GlobalConfig = {
  requirePlanOnRegistration: true,
  trialDays: 14,
  defaultPlanId: "basico",
};

export function getGlobalConfig(): GlobalConfig {
  return read<GlobalConfig>(KEY.globalConfig, DEFAULT_GLOBAL_CONFIG);
}

export function saveGlobalConfig(config: GlobalConfig) {
  write(KEY.globalConfig, config);
}

// ============ Empleados (Supabase) ============
export async function getEmpleados(tenant_id?: string): Promise<Empleado[]> {
  let query = supabase.from('empleados').select('*');
  if (tenant_id) query = query.eq('tenant_id', tenant_id);
  const { data, error } = await query.order('nombre');
  if (error) { console.error("Error getEmpleados:", error); return []; }
  return data || [];
}

export async function saveEmpleado(e: Empleado) {
  const { error } = await supabase.from('empleados').upsert(e);
  if (error) throw error;
}

export async function deleteEmpleado(id: string) {
  const { error } = await supabase.from('empleados').delete().eq('id', id);
  if (error) throw error;
}

export async function getEmpleadoById(id: string): Promise<Empleado | undefined> {
  const { data, error } = await supabase.from('empleados').select('*').eq('id', id).single();
  if (error) return undefined;
  return data;
}

// ============ Clientes (Supabase) ============
export async function getClientes(tenant_id: string): Promise<Cliente[]> {
  const { data, error } = await supabase.from('clientes').select('*').eq('tenant_id', tenant_id).order('nombre');
  if (error) { console.error("Error getClientes:", error); return []; }
  return data || [];
}

export async function saveCliente(c: Cliente) {
  const { error } = await supabase.from('clientes').upsert(c);
  if (error) throw error;
}

export async function deleteCliente(id: string) {
  const { error } = await supabase.from('clientes').delete().eq('id', id);
  if (error) throw error;
}

export async function getClienteById(id: string): Promise<Cliente | undefined> {
  const { data, error } = await supabase.from('clientes').select('*').eq('id', id).single();
  if (error) return undefined;
  return data;
}

// ============ Órdenes (Supabase) ============
export async function getOrdenes(tenant_id: string): Promise<Orden[]> {
  const { data, error } = await supabase.from('ordenes').select('*').eq('tenant_id', tenant_id).order('creado_en', { ascending: false });
  if (error) { console.error("Error getOrdenes:", error); return []; }
  return data || [];
}

export async function saveOrden(o: Orden) {
  const { error } = await supabase.from('ordenes').upsert(o);
  if (error) throw error;
}

export async function getOrdenById(id: string): Promise<Orden | undefined> {
  const { data, error } = await supabase.from('ordenes').select('*').eq('id', id).single();
  if (error) return undefined;
  return data;
}

export async function nextOrdenNumero(tenant_id: string): Promise<string> {
  // Para un sistema robusto, podríamos usar una tabla de secuencias en Supabase
  // Por ahora, buscaremos el número más alto
  const { data, error } = await supabase.from('ordenes')
    .select('numero')
    .eq('tenant_id', tenant_id)
    .order('creado_en', { ascending: false })
    .limit(1);

  let next = 1;
  if (!error && data && data.length > 0) {
    const lastNum = data[0].numero;
    const match = lastNum.match(/-(\d+)$/);
    if (match) next = parseInt(match[1]) + 1;
  }

  const d = new Date();
  const ym = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
  return `KL-${ym}-${String(next).padStart(4, "0")}`;
}

// ============ Caja (Supabase) ============
export async function getCajas(tenant_id: string): Promise<Caja[]> {
  const { data, error } = await supabase.from('cajas').select('*').eq('tenant_id', tenant_id).order('abierta_en', { ascending: false });
  if (error) return [];
  return data || [];
}

export async function getCajaAbierta(tenant_id: string): Promise<Caja | undefined> {
  const { data, error } = await supabase.from('cajas').select('*').eq('tenant_id', tenant_id).eq('estado', 'ABIERTA').single();
  if (error) return undefined;
  return data;
}

export async function saveCaja(c: Caja) {
  const { error } = await supabase.from('cajas').upsert(c);
  if (error) throw error;
}

export async function getMovimientos(tenant_id: string, caja_id?: string): Promise<MovimientoCaja[]> {
  let query = supabase.from('movimientos_caja').select('*').eq('tenant_id', tenant_id);
  if (caja_id) query = query.eq('caja_id', caja_id);
  const { data, error } = await query.order('creado_en', { ascending: true });
  if (error) return [];
  return data || [];
}

export async function saveMovimiento(m: MovimientoCaja) {
  const { error } = await supabase.from('movimientos_caja').insert(m);
  if (error) throw error;
}

// ============ Gastos (Supabase) ============
export async function getGastos(tenant_id: string): Promise<Gasto[]> {
  const { data, error } = await supabase.from('gastos').select('*').eq('tenant_id', tenant_id).order('fecha', { ascending: false });
  if (error) return [];
  return data || [];
}

export async function saveGasto(g: Gasto) {
  const { error } = await supabase.from('gastos').upsert(g);
  if (error) throw error;
}

export async function deleteGasto(id: string) {
  const { error } = await supabase.from('gastos').delete().eq('id', id);
  if (error) throw error;
}

// ============ Catálogo (Supabase) ============
export async function getCatalogo(tenant_id: string): Promise<CatalogoItem[]> {
  const { data, error } = await supabase
    .from('catalogo_items')
    .select('*')
    .eq('tenant_id', tenant_id)
    .order('categoria', { ascending: true })
    .order('nombre', { ascending: true });
    
  if (error) {
    console.error('Error cargando catálogo:', error);
    return [];
  }
  return data || [];
}

export async function saveCatalogoItem(item: CatalogoItem) {
  const { error } = await supabase
    .from('catalogo_items')
    .upsert(item);
    
  if (error) throw error;
}

export async function deleteCatalogoItem(id: string) {
  const { error } = await supabase
    .from('catalogo_items')
    .delete()
    .eq('id', id);
    
  if (error) throw error;
}

// ============ Servicios (Supabase) ============
export async function getServicios(tenant_id: string): Promise<Servicio[]> {
  const { data, error } = await supabase
    .from('servicios')
    .select('*')
    .eq('tenant_id', tenant_id)
    .order('nombre', { ascending: true });
    
  if (error) {
    console.error('Error cargando servicios:', error);
    return [];
  }
  return data || [];
}

export async function saveServicio(s: Servicio) {
  const { error } = await supabase
    .from('servicios')
    .upsert(s);
    
  if (error) throw error;
}

export async function deleteServicio(id: string) {
  const { error } = await supabase
    .from('servicios')
    .delete()
    .eq('id', id);
    
  if (error) throw error;
}

// ============ Plans CRUD ============
export function savePlan(p: Plan) {
  const all = getPlans();
  const i = all.findIndex((x) => x.id === p.id);
  if (i >= 0) all[i] = p; else all.push(p);
  savePlans(all);
}
export function deletePlan(id: PlanId) {
  savePlans(getPlans().filter((p) => p.id !== id));
}

// ============ Sesión / tenant activo ============
export function setActiveTenant(slug: string) { if (isBrowser()) localStorage.setItem(KEY.active, slug); }
export function getActiveTenant(): Tenant | undefined {
  if (!isBrowser()) return undefined;
  const slug = localStorage.getItem(KEY.active);
  return slug ? getTenantBySlug(slug) : undefined;
}

export interface Session { empleado_id: string; tenant_id: string; iniciado_en: string; }
export function getSession(): Session | null { return read<Session | null>(KEY.session, null); }
export function setSession(s: Session | null) { if (s) write(KEY.session, s); else if (isBrowser()) localStorage.removeItem(KEY.session); }

export async function login(slug: string, email: string, password: string):
  Promise<{ ok: true; empleado: Empleado; tenant: Tenant } | { ok: false; error: string }> {
  
  // 1. Verificar el Tenant
  const tenant = await getTenantBySlug(slug);
  if (!tenant) return { ok: false, error: "Lavandería no encontrada" };

  // 2. Autenticar en Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (authError) return { ok: false, error: "Email o contraseña incorrectos" };
  if (!authData.user) return { ok: false, error: "Error de autenticación" };

  // 3. Obtener el perfil del empleado (usando el ID de Auth)
  const emp = await getEmpleadoById(authData.user.id);
  
  // Validar que el empleado exista, esté activo y pertenezca a esta lavandería
  if (!emp || !emp.activo || emp.tenant_id !== tenant.id) {
    await supabase.auth.signOut();
    return { ok: false, error: "Acceso denegado para esta sucursal" };
  }

  setSession({ empleado_id: emp.id, tenant_id: tenant.id, iniciado_en: new Date().toISOString() });
  setActiveTenant(slug);
  return { ok: true, empleado: emp, tenant };
}

export async function logout() {
  await supabase.auth.signOut();
  setSession(null);
}

export async function switchSession(tenantId: string, email: string): Promise<boolean> {
  // En Auth real, el cambio de sesión requiere que el usuario tenga acceso a ambos
  const emps = await getEmpleados(tenantId);
  const emp = emps.find(
    (e) => e.email.toLowerCase() === email.toLowerCase() && e.activo
  );
  if (!emp) return false;
  setSession({ empleado_id: emp.id, tenant_id: tenantId, iniciado_en: new Date().toISOString() });
  const tenant = await getTenantById(tenantId);
  if (tenant) setActiveTenant(tenant.slug);
  return true;
}

export async function getCurrentUser(): Promise<{ empleado: Empleado; tenant: Tenant } | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const emp = await getEmpleadoById(user.id);
  if (!emp) return null;

  const ten = await getTenantById(emp.tenant_id);
  if (!ten) return null;

  return { empleado: emp, tenant: ten };
}

export async function getMonthlyOrderCount(tenantId: string): Promise<number> {
  const all = (await getOrdenes(tenantId)).filter(o => o.estado !== "ANULADA");
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  return all.filter(o => {
    const d = new Date(o.creado_en);
    return d.getMonth() === month && d.getFullYear() === year;
  }).length;
}

export async function checkPlanLimits(tenant: Tenant) {
  const plans = getPlans();
  const plan = plans.find(p => p.id === tenant.plan_id) || PLANS[0];
  
  const orderCount = await getMonthlyOrderCount(tenant.id);
  const employeeCount = (await getEmpleados(tenant.id)).filter(e => e.rol !== "ADMIN").length;
  
  const ordersReached = plan.limite_ordenes_mes !== null && orderCount >= plan.limite_ordenes_mes;
  const employeesReached = employeeCount >= plan.limite_empleados;
  
  return {
    plan,
    orderCount,
    employeeCount,
    ordersReached,
    employeesReached,
    orderLimit: plan.limite_ordenes_mes,
    employeeLimit: plan.limite_empleados
  };
}

// ============ Helpers ============
export function uid(_prefix = "id"): string {
  return crypto.randomUUID();
}
export function formatRD(n: number): string {
  // en-US for comma thousands + period decimal, prefixed with RD$
  return `RD$${new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0)}`;
}
export function formatNumber(n: number, decimals = 2): string {
  return new Intl.NumberFormat("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(n || 0);
}
/** Parse "1,234.56" or "1234.56" into number. */
export function parseAmount(raw: string): number {
  const cleaned = (raw || "").replace(/[^\d.]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}
/** Format while typing: keeps decimals user is typing. */
export function formatAmountInput(raw: string): string {
  const cleaned = (raw || "").replace(/[^\d.]/g, "");
  if (!cleaned) return "";
  const parts = cleaned.split(".");
  const intPart = parts[0].replace(/^0+(?=\d)/, "");
  const intFmt = new Intl.NumberFormat("en-US").format(Number(intPart || "0"));
  if (parts.length === 1) return intFmt;
  const dec = parts.slice(1).join("").slice(0, 2);
  return `${intFmt}.${dec}`;
}
export function formatPhoneRD(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 10);
  if (d.length < 4) return d;
  if (d.length < 7) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
}
export function formatDateRD(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("es-DO", { day: "2-digit", month: "2-digit", year: "numeric" });
}
export function formatDateTimeRD(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("es-DO", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true });
}

// ============ Permissions ============
export function can(empleado: Empleado, action: string): boolean {
  if (empleado.rol === "ADMIN") return true;
  // Si el empleado tiene permisos definidos explícitamente, usarlos
  if (empleado.permisos) {
    return empleado.permisos.includes(action);
  }
  // Fallback a lógica de roles antigua (retrocompatibilidad)
  const rol = empleado.rol;
  if (rol === "SUPERVISOR") return action !== "configuracion" && action !== "gestionar_personal" && action !== "personal";
  if (rol === "VENDEDOR") return ["dashboard", "crear_orden", "nueva-orden", "aplicar_descuento", "ver_caja", "caja", "ordenes", "clientes"].includes(action);
  if (rol === "RECEPCIONISTA") return ["nueva-orden", "gestionar_clientes", "clientes", "ordenes"].includes(action);
  if (rol === "REPARTIDOR") return ["entregas"].includes(action);
  return false;
}

// ============ Demo seed enriquecido ============
export async function seedDemoIfEmpty() {
  if (!isBrowser()) return;
  getPlans();
  const existingTenants = await getTenants();
  if (existingTenants.length > 0) return;

  const tenantId = uid("ten");
  const tenant: Tenant = {
    id: tenantId,
    nombre: "Lavandería La Burbuja",
    slug: "laburbuja",
    rnc: "131-12345-6",
    telefono: "809-555-0142",
    direccion: "Av. Lope de Vega #45, Naco",
    ciudad: "Santo Domingo",
    email: "admin@laburbuja.do",
    color_primario: "#0F4C81",
    color_secundario: "#E0A82E",
    plan_id: "pro",
    estado: "TRIAL",
    trial_hasta: new Date(Date.now() + 14 * 86400000).toISOString(),
    creado_en: new Date(Date.now() - 30 * 86400000).toISOString(),
    config: { ...DEFAULT_CONFIG },
  };
  await saveTenant(tenant);

  const adminId = uid("emp");
  await saveEmpleado({ id: adminId, tenant_id: tenantId, nombre: "María González", email: "admin@laburbuja.do", password: "demo1234", rol: "ADMIN", activo: true, creado_en: new Date().toISOString(), pin: "1234" });
  await saveEmpleado({ id: uid("emp"), tenant_id: tenantId, nombre: "Carlos Rodríguez", email: "vendedor@laburbuja.do", password: "demo1234", rol: "VENDEDOR", activo: true, creado_en: new Date().toISOString(), pin: "5678" });
  await saveEmpleado({ id: uid("emp"), tenant_id: tenantId, nombre: "Luis Fernández", email: "repartidor@laburbuja.do", password: "demo1234", rol: "REPARTIDOR", activo: true, creado_en: new Date().toISOString() });

  // Servicios
  const servSeed: Array<Omit<Servicio, "id" | "tenant_id">> = [
    { nombre: "Lavado y secado", descripcion: "Lavado completo + secadora", icono: "🧺", activo: true, precio: 0 },
    { nombre: "Solo lavado", descripcion: "Solo lavado en agua", icono: "💧", activo: true, precio: 0 },
    { nombre: "Solo secado", descripcion: "Únicamente secadora", icono: "🌬️", activo: true, precio: 0 },
    { nombre: "Planchado", descripcion: "Planchado profesional", icono: "♨️", activo: true, precio: 0 },
    { nombre: "Lavado en seco", descripcion: "Dry cleaning para prendas delicadas", icono: "✨", activo: true, precio: 50 },
    { nombre: "Sastrería", descripcion: "Arreglos y costura", icono: "🪡", activo: true, precio: 100 },
    { nombre: "Tapicería", descripcion: "Limpieza de muebles y tapizados", icono: "🛋️", activo: true, precio: 500 },
    { nombre: "Alfombras", descripcion: "Lavado de alfombras y tapetes", icono: "🟫", activo: true, precio: 300 },
  ];
  for (const s of servSeed) {
    await saveServicio({ ...s, id: uid("srv"), tenant_id: tenantId });
  }

  // Clientes
  const clientesData = [
    { nombre: "Juan Pérez", telefono: "809-321-4567", email: "juan@email.com", direccion: "Calle Duarte 12, Piantini", tipo: "Consumidor Final" as const, limite_credito: 0 },
    { nombre: "Ana Martínez", telefono: "829-555-1122", email: "ana@email.com", direccion: "Av. 27 de Febrero 88, Bella Vista", tipo: "Consumidor Final" as const, limite_credito: 5000 },
    { nombre: "Pedro Jiménez", telefono: "849-777-3344", direccion: "Calle El Sol 5, Gazcue", tipo: "Empresa" as const, limite_credito: 3000 },
    { nombre: "Luisa Reyes", telefono: "809-444-9988", email: "luisa@email.com", tipo: "Consumidor Final" as const, limite_credito: 0 },
    { nombre: "Roberto Núñez", telefono: "809-222-5566", direccion: "Av. Sarasota 200, Bella Vista", tipo: "Consumidor Final" as const, limite_credito: 0 },
  ];
  const clientesIds: string[] = [];
  for (const c of clientesData) {
    const id = uid("cli");
    clientesIds.push(id);
    await saveCliente({ ...c, id, tenant_id: tenantId, creado_en: new Date(Date.now() - Math.random() * 60 * 86400000).toISOString() });
  }

  // Caja abierta
  const cajaId = uid("caj");
  await saveCaja({
    id: cajaId,
    tenant_id: tenantId,
    empleado_id: adminId,
    monto_inicial: 2000,
    estado: "ABIERTA",
    abierta_en: new Date(new Date().setHours(8, 0, 0, 0)).toISOString(),
    notas_apertura: "Apertura turno mañana",
  });
  await saveMovimiento({
    id: uid("mov"), tenant_id: tenantId, caja_id: cajaId, empleado_id: adminId,
    tipo: "INGRESO", concepto: "Apertura de caja", monto: 2000, creado_en: new Date(new Date().setHours(8, 0, 0, 0)).toISOString(),
  });

  // Algunas órdenes históricas y de hoy
  const items1: OrdenItem[] = [
    { descripcion: "Camisa manga larga", cantidad: 2, precio_unitario: 150 },
    { descripcion: "Pantalón de vestir", cantidad: 1, precio_unitario: 200 },
  ];
  const items2: OrdenItem[] = [
    { descripcion: "Lavado por libra", cantidad: 4.5, precio_unitario: 80, es_libra: true },
  ];
  const items3: OrdenItem[] = [
    { descripcion: "Edredón matrimonial", cantidad: 1, precio_unitario: 450 },
    { descripcion: "Sábana king", cantidad: 2, precio_unitario: 280 },
  ];

  async function crearOrden(idx: number, items: OrdenItem[], estado: EstadoOrden, metodo: MetodoPago, hoursAgo: number, urgente = false) {
    const subtotal = items.reduce((s, it) => s + it.cantidad * it.precio_unitario, 0);
    const itbis = +(subtotal * 0.18).toFixed(2);
    const total = +(subtotal + itbis).toFixed(2);
    const pagado = metodo === "CREDITO" ? 0 : total;
    const saldo = total - pagado;
    const id = uid("ord");
    const numero = await nextOrdenNumero(tenantId);
    const creado = new Date(Date.now() - hoursAgo * 3600 * 1000).toISOString();
    await saveOrden({
      id, tenant_id: tenantId, numero, cliente_id: clientesIds[idx % clientesIds.length],
      empleado_id: adminId, servicios: ["Lavado y secado"], items,
      subtotal, itbis, descuento: 0, total, pagado, saldo,
      metodo_pago: metodo, estado, fecha_entrega: new Date(Date.now() + 2 * 86400000).toISOString(),
      es_urgente: urgente, creado_en: creado,
    });
    if (metodo !== "CREDITO" && estado !== "ANULADA") {
      await saveMovimiento({
        id: uid("mov"), tenant_id: tenantId, caja_id: cajaId, empleado_id: adminId,
        tipo: "VENTA", concepto: `Venta ${numero}`, monto: total, metodo, orden_id: id, creado_en: creado,
      });
    }
  }

  await crearOrden(0, items1, "ENTREGADA", "EFECTIVO", 5);
  await crearOrden(1, items2, "LISTA", "TARJETA", 3);
  await crearOrden(2, items3, "EN_PROCESO", "CREDITO", 2);
  await crearOrden(3, items1, "RECIBIDA", "EFECTIVO", 1, true);
  await crearOrden(4, items2, "EN_PROCESO", "TRANSFERENCIA", 0.5);

  // Gastos
  await saveGasto({ id: uid("gas"), tenant_id: tenantId, empleado_id: adminId, categoria: "Suministros", descripcion: "Detergente líquido 5gal", monto: 850, metodo_pago: "Efectivo", proveedor: "Distribuidora Sol", fecha: new Date().toISOString(), aprobado: true });
  await saveGasto({ id: uid("gas"), tenant_id: tenantId, empleado_id: adminId, categoria: "Servicios (luz, agua, internet)", descripcion: "Factura EDESUR", monto: 4200, metodo_pago: "Transferencia", fecha: new Date(Date.now() - 86400000).toISOString(), aprobado: true });

  setActiveTenant(tenant.slug);
}
