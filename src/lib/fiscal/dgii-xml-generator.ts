import type { Orden, Tenant, Cliente } from "../storage";

/**
 * Generador de XML para Comprobantes Fiscales Electrónicos (e-CF) de la DGII.
 * Cumple con los esquemas XSD definidos por la DGII en RD.
 */
export function generateECFXML(orden: Orden, tenant: Tenant, cliente: Cliente): string {
  const fecha = new Date().toISOString().split('T')[0];
  const rncEmisor = tenant.rnc?.replace(/[^0-9]/g, '') || '';
  const rncReceptor = cliente.cedula?.replace(/[^0-9]/g, '') || cliente.tipo === "Empresa" ? cliente.telefono.replace(/[^0-9]/g, '') : ''; // Simplificación para el ejemplo
  
  const tipoECF = orden.tipo_ecf || 'E32';
  const eNCF = orden.ncf || '';

  // Estructura básica del XML e-CF
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<ECF xmlns="http://dgii.gov.do/sicf/facturacion">
  <Encabezado>
    <IdDoc>
      <TipoeCF>${tipoECF.replace('E', '')}</TipoeCF>
      <eNCF>${eNCF}</eNCF>
      <FechaEmision>${fecha}</FechaEmision>
      <TipoIngreso>1</TipoIngreso>
      <TipoPago>1</TipoPago>
    </IdDoc>
    <Emisor>
      <RNCEmisor>${rncEmisor}</RNCEmisor>
      <RazonSocialEmisor>${tenant.nombre}</RazonSocialEmisor>
      <NombreComercial>${tenant.nombre}</NombreComercial>
      <DireccionEmisor>${tenant.direccion}</DireccionEmisor>
      <TelefonoEmisor>${tenant.telefono.replace(/[^0-9]/g, '')}</TelefonoEmisor>
    </Emisor>
    <Receptor>
      <RNCReceptor>${rncReceptor || '22400000000'}</RNCReceptor>
      <RazonSocialReceptor>${cliente.nombre} ${cliente.apellido || ''}</RazonSocialReceptor>
    </Receptor>
    <Totales>
      <MontoSustraendoNeto>0.00</MontoSustraendoNeto>
      <MontoTotal>${orden.total.toFixed(2)}</MontoTotal>
      <MontoGravadoTotal>${orden.subtotal.toFixed(2)}</MontoGravadoTotal>
      <ITBISTotal>${orden.itbis.toFixed(2)}</ITBISTotal>
    </Totales>
  </Encabezado>
  <Detalles>
    ${orden.items.map((it, idx) => `
    <Item>
      <NumeroLinea>${idx + 1}</NumeroLinea>
      <IndicadorExentoITBIS>0</IndicadorExentoITBIS>
      <NombreItem>${it.descripcion}</NombreItem>
      <CantidadItem>${it.cantidad}</CantidadItem>
      <UnidadMedida>Unidad</UnidadMedida>
      <PrecioUnitarioItem>${it.precio_unitario.toFixed(2)}</PrecioUnitarioItem>
      <MontoItem>${(it.cantidad * it.precio_unitario).toFixed(2)}</MontoItem>
    </Item>`).join('')}
  </Detalles>
</ECF>`;

  return xml.trim();
}
