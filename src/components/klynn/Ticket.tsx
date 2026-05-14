import type { Orden, Tenant, Empleado, Cliente, Servicio } from "@/lib/storage";
import { formatRD, formatDateTimeRD } from "@/lib/storage";
import { QRCodeSVG } from "qrcode.react";

interface Props {
  orden: Orden;
  tenant: Tenant;
  empleado: Empleado;
  cliente: Cliente;
  formato?: "57mm" | "80mm";
  pagoRecibido?: number;
  serviciosList?: Servicio[];
}

function humanizeDate(dateStr: string, showTime = true): string {
  const d = new Date(dateStr);
  const now = new Date();
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

/**
 * Ticket imprimible térmico.
 * Usa @media print para ocultar el resto de la página y solo imprimir el ticket.
 */
export function Ticket({ orden, tenant, empleado, cliente, formato = "80mm", pagoRecibido, serviciosList = [] }: Props) {
  const cfg = tenant.config;
  const w = formato === "57mm" ? "w-[58mm]" : "w-[80mm]";
  const cols = formato === "57mm" ? "max-w-[32ch]" : "max-w-[44ch]";

  const vuelto = pagoRecibido && pagoRecibido > orden.total ? pagoRecibido - orden.total : 0;

  // Generar URL para el QR de la DGII (e-CF)
  const isECF = orden.ncf?.startsWith("E");
  const qrUrl = isECF ? `https://dgii.gov.do/consulta_ecf?RNC_EMISOR=${tenant.rnc}&E_NCF=${orden.ncf}&MONTO_TOTAL=${orden.total}&FECHA_EMISION=${new Date(orden.creado_en).toLocaleDateString('en-GB').replace(/\//g, '')}` : "";

  let tipoDocumento = "RECIBO";
  if (orden.nota_credito_ncf) {
    tipoDocumento = isECF ? "NOTA DE CRÉDITO ELECTRÓNICA" : "NOTA DE CRÉDITO";
  } else if (orden.ncf) {
    if (orden.ncf.startsWith('E31') || orden.ncf.startsWith('B01')) tipoDocumento = "FACTURA PARA CRÉDITO FISCAL";
    else if (orden.ncf.startsWith('E32') || orden.ncf.startsWith('B02')) tipoDocumento = "FACTURA PARA CONSUMIDOR FINAL";
    else if (orden.ncf.startsWith('E33') || orden.ncf.startsWith('B03')) tipoDocumento = "NOTA DE DÉBITO";
    else if (orden.ncf.startsWith('E34') || orden.ncf.startsWith('B04')) tipoDocumento = "NOTA DE CRÉDITO";
    else tipoDocumento = "COMPROBANTE FISCAL";
  }

  return (
    <div className={`thermal-ticket mx-auto ${w} ${cols} bg-white p-3 font-mono text-[11px] leading-snug text-black`}>
      <div className="text-center space-y-0.5">
        {tenant.logo_url && (
          <div className="flex justify-center mb-0">
            <img src={tenant.logo_url} alt="Logo" className="h-18 w-auto max-w-[180px] object-contain filter grayscale" />
          </div>
        )}
        {!tenant.logo_url && <div className="text-base font-bold uppercase leading-tight">{tenant.nombre}</div>}
        {cfg?.ncf_facturacion_activa && cfg?.ticket_mostrar_rnc && tenant.rnc && <div>RNC: {tenant.rnc}</div>}
        <div>Tel: {tenant.telefono}</div>
        {tenant.direccion && <div className="text-[10px] leading-tight">{tenant.direccion}</div>}
      </div>
      <Sep />
      <div className="text-center font-bold uppercase text-[12px] py-1">{tipoDocumento}</div>
      <Sep />
      <div>
        <div><b>ORDEN:</b> {orden.numero}</div>
        {orden.nota_credito_ncf ? (
          <>
            <div className="text-destructive font-bold">
              <b>{isECF ? 'e-NCF' : 'NCF'}:</b> {orden.nota_credito_ncf}
            </div>
            <div><b>Doc. Modificado:</b> {orden.ncf}</div>
          </>
        ) : (
          orden.ncf && <div><b>{isECF ? 'e-NCF' : 'NCF'}:</b> {orden.ncf}</div>
        )}
        <div><b>Fecha:</b> {formatDateTimeRD(orden.creado_en)}</div>
      </div>
      {cliente.id.includes("generic-consumidor") ? (
        <Sep />
      ) : (
        <>
          <Sep />
          <div className="text-center font-bold uppercase tracking-widest">Datos del Cliente</div>
          <Sep />
          <div>
            <div><b>Cliente:</b> {cliente.nombre} {cliente.apellido || ""}</div>
            {cliente.cedula && <div><b>{cliente.tipo === 'Empresa' ? 'RNC:' : 'Cédula:'}</b> {cliente.cedula}</div>}
            {cliente.telefono && cliente.telefono !== "---" && <div><b>Teléfono:</b> {cliente.telefono}</div>}
            {cliente.direccion && <div><b>Dirección:</b> {cliente.direccion}</div>}
            {orden.notas && (
              <div className="mt-1 border-t border-dashed border-black/20 pt-1 italic">
                <b>Nota:</b> {orden.notas}
              </div>
            )}
          </div>
          <Sep />
        </>
      )}
      <div className="flex justify-between font-bold uppercase text-[10px] mb-1">
        <div className="w-[44%]">DESCRIPCION</div>
        <div className="w-[26%] text-right">ITBIS</div>
        <div className="w-[30%] text-right">VALOR</div>
      </div>
      <Sep />
      <div className="mt-1 mb-2">
        {(() => {
           const subtotalBruto = orden.items.reduce((acc, it) => acc + (it.cantidad * it.precio_unitario), 0) + 
                                 (orden.servicios?.map(s => serviciosList.find(x => x.nombre === s)?.precio || 0).reduce((a,b) => a+b, 0) || 0);
           
           // Si el subtotal de la orden es significativamente menor al subtotal bruto de los items, 
           // significa que cuando se creó la orden, los precios INCLUÍAN el ITBIS (y se extrajo el subtotal base).
           const isItbisIncluidoEnEstaOrden = cfg?.ncf_facturacion_activa && orden.itbis > 0 
                                              ? (subtotalBruto - orden.subtotal > 1) 
                                              : !!cfg?.itbis_incluido;

           return (
             <>
                {orden.items.map((it, i) => {
                   let baseTotal = it.cantidad * it.precio_unitario;
                   let itemItbis = 0;
                   let valor = baseTotal;
                   if (cfg?.ncf_facturacion_activa && orden.itbis > 0) {
                     if (isItbisIncluidoEnEstaOrden) {
                       itemItbis = baseTotal - (baseTotal / (1 + (cfg.itbis_porcentaje || 18) / 100));
                     } else {
                       itemItbis = baseTotal * ((cfg.itbis_porcentaje || 18) / 100);
                       valor = baseTotal + itemItbis;
                     }
                   }
                   return (
                    <div key={i} className="flex justify-between items-start mb-1.5">
                      <div className="w-[44%] pr-1">
                        <div className="font-medium leading-tight">{it.descripcion}{it.es_libra ? ` (${it.cantidad}lb)` : ""}</div>
                        <div className="text-[9px] text-black/70 leading-tight">{it.cantidad} × {formatRD(it.precio_unitario).replace("RD$", "")}</div>
                        {it.notas && <div className="text-[9px] italic leading-tight">Nota: {it.notas}</div>}
                      </div>
                      <div className="w-[26%] text-right font-medium pt-0.5">{itemItbis > 0 ? formatRD(itemItbis).replace("RD$", "") : "0.00"}</div>
                      <div className="w-[30%] text-right font-medium pt-0.5">{formatRD(valor).replace("RD$", "")}</div>
                    </div>
                   )
                })}

                {orden.servicios?.map((sName, i) => {
                   const srv = serviciosList.find(s => s.nombre === sName);
                   const p = srv ? srv.precio : 0;
                   let baseTotal = p;
                   let itemItbis = 0;
                   let valor = baseTotal;
                   if (cfg?.ncf_facturacion_activa && orden.itbis > 0) {
                     if (isItbisIncluidoEnEstaOrden) {
                       itemItbis = baseTotal - (baseTotal / (1 + (cfg.itbis_porcentaje || 18) / 100));
                     } else {
                       itemItbis = baseTotal * ((cfg.itbis_porcentaje || 18) / 100);
                       valor = baseTotal + itemItbis;
                     }
                   }
           return (
            <div key={'s'+i} className="flex justify-between items-start mb-1.5">
              <div className="w-[44%] pr-1">
                <div className="font-medium leading-tight">Servicio: {sName}</div>
                {p > 0 && <div className="text-[9px] text-black/70 leading-tight">1 × {formatRD(p).replace("RD$", "")}</div>}
              </div>
              <div className="w-[26%] text-right font-medium pt-0.5">{p > 0 ? (itemItbis > 0 ? formatRD(itemItbis).replace("RD$", "") : "0.00") : "—"}</div>
              <div className="w-[30%] text-right font-medium pt-0.5">{p > 0 ? formatRD(valor).replace("RD$", "") : "—"}</div>
            </div>
           )
        })}
             </>
           );
        })()}
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
        <Row 
          k="Entrega" 
          v={orden.es_urgente 
            ? `${humanizeDate(orden.fecha_entrega, true)} (${cfg?.tiempo_entrega_urgente || 3} HORAS)` 
            : humanizeDate(orden.fecha_entrega, false)
          } 
        />
        <Row k="Estado" v={orden.estado.replace("_", " ")} />
        {orden.motivo_anulacion && (
          <div className="text-[9px] mt-1 italic leading-tight">
            <b>Motivo ({orden.motivo_anulacion_codigo || "01"}):</b> {orden.motivo_anulacion}
          </div>
        )}
        {orden.es_urgente && <div className="font-bold text-center mt-1">★ URGENTE ★</div>}
      </div>
      {cfg?.ticket_mostrar_empleado && (
        <>
          <Sep />
          <div>Atendido por: <b>{empleado.nombre}</b></div>
        </>
      )}
      <Sep />
      <div className="text-center">
        <div>{cfg?.ticket_pie ?? "¡Gracias por su preferencia!"}</div>
      </div>

      {isECF && qrUrl && (
        <div className="mt-4 flex flex-col items-center gap-2 border-t border-dashed border-black pt-4">
          <div className="text-[9px] font-bold uppercase">Factura de Consumo Electrónica</div>
          <div className="p-1 bg-white">
            <QRCodeSVG value={qrUrl} size={100} level="M" />
          </div>
          <div className="text-[8px] text-center leading-tight">
            Consulte su factura en:<br/>
            dgii.gov.do
          </div>
        </div>
      )}
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
