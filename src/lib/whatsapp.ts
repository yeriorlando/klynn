import type { Tenant, Cliente, Orden } from "@/lib/storage";
import { formatRD, DEFAULT_CONFIG } from "@/lib/storage";

type Evento = "creada" | "lista" | "entregada";

function normalizePhoneRD(tel: string): string {
  const d = tel.replace(/\D/g, "");
  if (d.length === 10) return "1" + d; // RD: 1 + 10 dígitos
  return d;
}

function render(tpl: string, vars: Record<string, string>) {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
}

export async function notificarWhatsApp(
  tenant: Tenant,
  cliente: Cliente,
  orden: Orden,
  evento: Evento,
): Promise<{ ok: boolean; reason?: string }> {
  const wa = tenant.config?.whatsapp ?? DEFAULT_CONFIG.whatsapp!;
  if (!wa?.enabled) return { ok: false, reason: "WhatsApp deshabilitado" };
  if (!wa.api_key || !wa.instance) return { ok: false, reason: "Credenciales faltantes" };
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

  const mensaje = render(tpl, {
    cliente: cliente.nombre.split(" ")[0],
    numero: orden.numero,
    total: formatRD(orden.total),
    entrega: new Date(orden.fecha_entrega).toLocaleDateString("es-DO"),
    lavanderia: tenant.nombre,
  });

  const phone = normalizePhoneRD(cliente.telefono);
  const base = (wa.base_url || "https://api.wapisender.com").replace(/\/$/, "");
  const url = `${base}/v1/instances/${encodeURIComponent(wa.instance)}/send-message`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${wa.api_key}` },
      body: JSON.stringify({ phone, message: mensaje }),
    });
    if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: (e as Error).message };
  }
}
