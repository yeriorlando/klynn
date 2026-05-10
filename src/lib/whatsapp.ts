import type { Tenant, Cliente, Orden } from "@/lib/storage";
import { formatRD, DEFAULT_CONFIG, getServicios } from "@/lib/storage";

type Evento = "creada" | "lista" | "entregada";

function normalizePhoneRD(tel: string): string {
  const d = tel.replace(/\D/g, "");
  if (d.length === 10) return "1" + d; // RD: 1 + 10 dígitos
  return d;
}

function render(tpl: string, vars: Record<string, string>) {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
}

function humanizeDate(dateStr: string, showTime = true): string {
  const d = new Date(dateStr);
  const now = new Date();
  
  // Normalizar a inicio del día para comparar días
  const dDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const diffTime = dDate.getTime() - nowDate.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  
  if (!showTime) {
    if (diffDays === 0) return "Hoy";
    if (diffDays === 1) return "Mañana";
    return d.toLocaleDateString("es-DO", { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  const timeStr = d.toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit", hour12: true });
  
  if (diffDays === 0) return `Hoy a las ${timeStr}`;
  if (diffDays === 1) return `Mañana a las ${timeStr}`;
  
  return d.toLocaleString("es-DO", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true });
}

export async function notificarWhatsApp(
  tenant: Tenant,
  cliente: Cliente,
  orden: Orden,
  evento: Evento,
  pagoRecibido?: number,
): Promise<{ ok: boolean; reason?: string }> {
  const wa = tenant.config?.whatsapp ?? DEFAULT_CONFIG.whatsapp!;
  if (!wa?.enabled) return { ok: false, reason: "WhatsApp deshabilitado" };
  if (!wa.api_key) return { ok: false, reason: "API Token faltante" };
  if (!cliente.telefono) return { ok: false, reason: "Cliente sin teléfono" };

  const flag =
    evento === "creada" ? wa.notif_orden_creada :
    evento === "lista" ? wa.notif_orden_lista :
    wa.notif_orden_entregada;
  if (!flag) return { ok: false, reason: "Notificación desactivada" };

  const tpl =
    evento === "creada" ? wa.plantilla_creada :
    evento === "lista" ? wa.plantilla_lista :
    wa.plantilla_entregada;

  const detalleStr = (evento === "creada")
    ? orden.items.map(it => 
        `${it.descripcion} x${it.cantidad}\n${it.cantidad} × ${formatRD(it.precio_unitario).replace("DOP", "RD$")} = ${formatRD(it.precio_unitario * it.cantidad).replace("DOP", "RD$")}`
      ).join("\n\n")
    : orden.items.map(it => `${it.descripcion} x${it.cantidad}`).join(", ");

  const serviciosList = await getServicios(tenant.id);
  const serviciosStr = (orden.servicios || []).map(sName => {
    const srv = serviciosList.find(s => s.nombre === sName);
    if (srv && srv.precio > 0) {
      const pStr = formatRD(srv.precio).replace("DOP", "RD$");
      return `${sName}\n1 × ${pStr} = ${pStr}`;
    }
    return sName;
  }).join("\n\n") || "Ninguno";

  const mensaje = render(tpl, {
    lavanderia: tenant.nombre,
    lavanderia_tel: tenant.telefono || "",
    lavanderia_dir: tenant.direccion || "",
    numero: orden.numero,
    fecha: new Date(orden.creado_en).toLocaleString("es-DO", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true }),
    cliente: cliente.nombre,
    cliente_tel: cliente.telefono || "",
    cliente_dir: cliente.direccion || "",
    servicios: serviciosStr,
    detalle: detalleStr,
    subtotal: formatRD(orden.subtotal).replace("DOP", "RD$"),
    total: formatRD(orden.total).replace("DOP", "RD$"),
    metodo_pago: orden.metodo_pago,
    pagado: formatRD(orden.pagado).replace("DOP", "RD$"),
    saldo: formatRD(orden.saldo).replace("DOP", "RD$"),
    vuelto: (pagoRecibido && pagoRecibido > orden.total) 
      ? formatRD(pagoRecibido - orden.total).replace("DOP", "RD$") 
      : "RD$0.00",
    entrega: orden.es_urgente 
      ? `${humanizeDate(orden.fecha_entrega, true)} (${tenant.config?.tiempo_entrega_urgente || 3} HORAS)`
      : humanizeDate(orden.fecha_entrega, false),
    estado: orden.estado,
  });

  const phone = normalizePhoneRD(cliente.telefono);
  const base = (wa.base_url || "https://wasenderapi.com").replace(/\/$/, "");
  const url = `${base}/api/send-message`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json", 
        "Authorization": `Bearer ${wa.api_key}`,
        "Accept": "application/json"
      },
      body: JSON.stringify({ to: phone, text: mensaje }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, reason: data.message || `HTTP ${res.status}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: (e as Error).message };
  }
}
