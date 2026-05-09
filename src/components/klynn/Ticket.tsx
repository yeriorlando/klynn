import type { Orden, Tenant, Empleado, Cliente } from "@/lib/storage";
import { formatRD, formatDateTimeRD } from "@/lib/storage";

interface Props {
  orden: Orden;
  tenant: Tenant;
  empleado: Empleado;
  cliente: Cliente;
  formato?: "57mm" | "80mm";
  pagoRecibido?: number;
}

/**
 * Ticket imprimible térmico.
 * Usa @media print para ocultar el resto de la página y solo imprimir el ticket.
 */
export function Ticket({ orden, tenant, empleado, cliente, formato = "80mm", pagoRecibido }: Props) {
  const cfg = tenant.config;
  const w = formato === "57mm" ? "w-[58mm]" : "w-[80mm]";
  const cols = formato === "57mm" ? "max-w-[32ch]" : "max-w-[44ch]";

  const vuelto = pagoRecibido && pagoRecibido > orden.total ? pagoRecibido - orden.total : 0;

  return (
    <div className={`thermal-ticket mx-auto ${w} ${cols} bg-white p-3 font-mono text-[11px] leading-snug text-black`}>
      <div className="text-center space-y-0.5">
        {tenant.logo_url && (
          <div className="flex justify-center mb-0">
            <img src={tenant.logo_url} alt="Logo" className="h-18 w-auto max-w-[180px] object-contain filter grayscale" />
          </div>
        )}
        <div className="text-base font-bold uppercase leading-tight">{tenant.nombre}</div>
        {cfg?.ncf_facturacion_activa && cfg?.ticket_mostrar_rnc && tenant.rnc && <div>RNC: {tenant.rnc}</div>}
        <div>Tel: {tenant.telefono}</div>
        {tenant.direccion && <div className="text-[10px] leading-tight">{tenant.direccion}</div>}
      </div>
      <Sep />
      <div>
        <div><b>ORDEN:</b> {orden.numero}</div>
        {orden.ncf && <div><b>NCF:</b> {orden.ncf}</div>}
        <div><b>Fecha:</b> {formatDateTimeRD(orden.creado_en)}</div>
      </div>
      <Sep />
      <div className="text-center font-bold">DATOS DEL CLIENTE</div>
      <Sep />
      <div>
        <div><b>Cliente:</b> {cliente.nombre}</div>
        <div><b>Teléfono:</b> {cliente.telefono}</div>
        {cliente.direccion && <div><b>Dirección:</b> {cliente.direccion}</div>}
        {orden.notas && (
          <div className="mt-1 border-t border-dashed border-black/20 pt-1 italic">
            <b>Nota:</b> {orden.notas}
          </div>
        )}
      </div>
      <Sep />
      <div>
        <div className="font-bold">DETALLE:</div>
        {orden.items.map((it, i) => (
          <div key={i} className="mt-1">
            <div>{it.descripcion}{it.es_libra ? ` (${it.cantidad}lb)` : ` x${it.cantidad}`}</div>
            <div className="flex justify-between">
              <span> {it.cantidad} × {formatRD(it.precio_unitario).replace("DOP", "RD$")}</span>
              <span>{formatRD(it.cantidad * it.precio_unitario).replace("DOP", "RD$")}</span>
            </div>
            {it.notas && <div className="text-[10px]"> Nota: {it.notas}</div>}
          </div>
        ))}
      </div>
      <Sep />
      <div>
        <Row k="Subtotal" v={formatRD(orden.subtotal).replace("DOP", "RD$")} />
        {cfg?.ncf_facturacion_activa && orden.itbis > 0 && (
          <Row k={`ITBIS ${cfg?.itbis_porcentaje ?? 18}%`} v={formatRD(orden.itbis).replace("DOP", "RD$")} />
        )}
        {orden.descuento > 0 && <Row k="Descuento" v={`-${formatRD(orden.descuento).replace("DOP", "RD$")}`} />}
        <div className="my-1 border-t border-dashed border-black" />
        <Row k="TOTAL" v={formatRD(orden.total).replace("DOP", "RD$")} bold />
      </div>
      <Sep />
      <div>
        <Row k="Pago" v={orden.metodo_pago} />
        {pagoRecibido !== undefined && <Row k="Recibido" v={formatRD(pagoRecibido).replace("DOP", "RD$")} />}
        {vuelto > 0 && <Row k="Vuelto" v={formatRD(vuelto).replace("DOP", "RD$")} />}
        {orden.saldo > 0 && <Row k="Saldo pendiente" v={formatRD(orden.saldo).replace("DOP", "RD$")} bold />}
      </div>
      <Sep />
      <div>
        <Row k="Entrega" v={new Date(orden.fecha_entrega).toLocaleDateString("es-DO")} />
        <Row k="Estado" v={orden.estado.replace("_", " ")} />
        {orden.es_urgente && <div className="font-bold text-center mt-1">★ URGENTE ★</div>}
      </div>
      {cfg?.ticket_mostrar_empleado && (
        <>
          <Sep />
          <div>Atendido por: {empleado.nombre}</div>
        </>
      )}
      <Sep />
      <div className="text-center">
        <div>{cfg?.ticket_pie ?? "¡Gracias por su preferencia!"}</div>
        <div className="mt-2 text-[9px] opacity-60">{tenant.slug}.lavanderx.com</div>
      </div>
    </div>
  );
}

function Sep() { return <div className="my-1.5 border-t border-dashed border-black" />; }
function Row({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "font-bold text-[12px]" : ""}`}>
      <span>{k}:</span>
      <span>{v}</span>
    </div>
  );
}
