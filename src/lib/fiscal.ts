import forge from 'node-forge';
import { SignedXml } from 'xml-crypto';
import { type ECFConfig, type ECFDocument } from './storage';

/**
 * Utilidad para el manejo de Facturación Electrónica (e-CF)
 * según especificaciones de la DGII.
 */

interface DGIIAuthResponse {
  token: string;
  expira: string;
}

/**
 * Obtiene la semilla (seed) de la DGII para iniciar el proceso de autenticación.
 */
export async function getSeed(ambiente: 'pruebas' | 'produccion'): Promise<string> {
  const url = ambiente === 'pruebas' 
    ? 'https://testapi.dgii.gov.do/estatus/api/Estatus/Semilla'
    : 'https://api.dgii.gov.do/estatus/api/Estatus/Semilla';

  const res = await fetch(url);
  if (!res.ok) throw new Error("No se pudo obtener la semilla de la DGII");
  const xml = await res.text();
  
  // Extraer el valor de la semilla del XML
  const match = xml.match(/<value>(.*)<\/value>/);
  if (!match) throw new Error("Formato de semilla inválido");
  return match[1];
}

/**
 * Firma la semilla con el certificado digital y obtiene el Token de la DGII.
 */
export async function authenticateDGII(config: ECFConfig): Promise<DGIIAuthResponse> {
  if (!config.certificate_data || !config.certificate_password) {
    throw new Error("Certificado no configurado");
  }

  const seed = await getSeed(config.ambiente);
  const signedSeed = await signXML(seed, config);

  const url = config.ambiente === 'pruebas'
    ? 'https://testapi.dgii.gov.do/autenticacion/api/Oauth/Token'
    : 'https://api.dgii.gov.do/autenticacion/api/Oauth/Token';

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/xml' },
    body: signedSeed
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Error de autenticación DGII: ${errorText}`);
  }

  const data = await res.json();
  return {
    token: data.token,
    expira: data.expira
  };
}

/**
 * Firma un documento XML utilizando el estándar XMLDSig (C14N).
 */
export async function signXML(xml: string, config: ECFConfig): Promise<string> {
  const p12Der = forge.util.decode64(config.certificate_data!);
  const p12Asn1 = forge.asn1.fromDer(p12Der);
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, config.certificate_password!);

  // Buscar la llave privada y el certificado
  const bags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
  const keyBag = bags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0];
  if (!keyBag?.key) throw new Error("No se encontró la llave privada en el certificado");

  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
  const certBag = certBags[forge.pki.oids.certBag]?.[0];
  if (!certBag?.cert) throw new Error("No se encontró el certificado en el archivo .p12");

  const privateKeyPem = forge.pki.privateKeyToPem(keyBag.key);
  const certPem = forge.pki.certificateToPem(certBag.cert);

  const sig = new SignedXml();
  sig.addReference("//*[local-name(.)='Semilla' or local-name(.)='ECF']");
  sig.signingKey = privateKeyPem;
  sig.keyInfoProvider = {
    getKeyInfo: () => `<X509Data><X509Certificate>${certPem.replace(/-----(BEGIN|END) CERTIFICATE-----|\n/g, '')}</X509Certificate></X509Data>`,
    getKey: () => Buffer.from(privateKeyPem)
  };
  
  sig.computeSignature(xml);
  return sig.getSignedXml();
}

/**
 * Genera el XML de un e-CF (E31, E32, etc.)
 */
export function generateECFXml(doc: Partial<ECFDocument>, tenant: any): string {
  const fecha = new Date(doc.fecha_emision!).toISOString().split('T')[0];
  
  // Estructura simplificada para cumplimiento DGII
  return `<?xml version="1.0" encoding="utf-8"?>
<ECF xmlns="http://dgii.gov.do/core/ecf" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <Encabezado>
    <IdDoc>
      <TipoeCF>${doc.tipo_ecf}</TipoeCF>
      <eNCF>${doc.encf}</eNCF>
      <FechaEmision>${fecha}</FechaEmision>
    </IdDoc>
    <Emisor>
      <RNCEmisor>${tenant.rnc}</RNCEmisor>
      <RazonSocial>${tenant.nombre}</RazonSocial>
      <DireccionEmisor>${tenant.direccion}</DireccionEmisor>
    </Emisor>
    <Totales>
      <MontoTotal>${doc.monto_total}</MontoTotal>
      <MontoITBIS>${doc.monto_itbis}</MontoITBIS>
    </Totales>
  </Encabezado>
</ECF>`;
}

/**
 * Envía un e-CF a la DGII.
 */
export async function sendToDGII(signedXml: string, config: ECFConfig): Promise<string> {
  if (!config.api_auth_token) {
    const auth = await authenticateDGII(config);
    config.api_auth_token = auth.token;
  }

  const url = config.ambiente === 'pruebas'
    ? 'https://testapi.dgii.gov.do/recepcion/api/Recepcion/Enviar'
    : 'https://api.dgii.gov.do/recepcion/api/Recepcion/Enviar';

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.api_auth_token}`,
      'Content-Type': 'application/xml'
    },
    body: signedXml
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Error enviando a DGII: ${errorText}`);
  }

  const data = await res.json();
  return data.trackId;
}
