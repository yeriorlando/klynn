import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-tenant-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

// Cache simple de tokens en memoria (dura mientras la función esté "caliente")
let cachedToken: { token: string; expires: number } | null = null;

/**
 * Obtiene un token OAuth de Pronesoft.
 * 
 * Según la documentación oficial y la captura del soporte de Pronesoft:
 * - Endpoint: POST /api/v1/oauth/token
 * - Content-Type: application/json
 * - Body: { "clientId": "app_live_...", "clientSecret": "sk_live_..." }
 */
async function getAccessToken(baseUrl: string, clientId: string, clientSecret: string): Promise<string> {
  // Validar credenciales
  if (!clientId || !clientSecret) {
    throw new Error("Credenciales de Pronesoft no proporcionadas.");
  }

  // Reutilizar token en caché si aún es válido
  if (cachedToken && Date.now() < cachedToken.expires) {
    return cachedToken.token;
  }

  // Limpiar espacios invisibles de las credenciales
  const cleanId = clientId.trim();
  const cleanSecret = clientSecret.trim();

  console.log(`[pronesoft-proxy] 🔑 Auth → ClientID COMPLETO: "${cleanId}"`);
  console.log(`[pronesoft-proxy] 🔑 Auth → ClientSecret longitud: ${cleanSecret.length}, primeros 15: "${cleanSecret.substring(0, 15)}..."`);
  console.log(`[pronesoft-proxy] 🔑 Auth → BaseURL: "${baseUrl}"`);

  // Según la documentación oficial de Pronesoft:
  // POST https://api.ecf.sandbox.pronesoft.com/api/v1/oauth/token
  const authUrl = `${baseUrl}/oauth/token`;

  const authBody = { clientId: cleanId, clientSecret: cleanSecret };
  console.log(`[pronesoft-proxy] 🔑 Auth → URL: ${authUrl}`);
  console.log(`[pronesoft-proxy] 🔑 Auth → Body keys: ${Object.keys(authBody).join(', ')}`);

  const res = await fetch(authUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(authBody),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error(`[pronesoft-proxy] ❌ Auth FAILED (${res.status}): ${errText}`);
    console.error(`[pronesoft-proxy] ❌ Auth falló (${res.status}): ${errText}`);
    cachedToken = null;
    throw new Error(`Error de autenticación Pronesoft (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const token = data.accessToken || data.access_token;

  if (!token) {
    throw new Error("Pronesoft no devolvió un accessToken en la respuesta.");
  }

  console.log("[pronesoft-proxy] ✅ Token obtenido correctamente");

  cachedToken = {
    token,
    expires: Date.now() + ((data.expiresIn || data.expires_in || 3600) - 60) * 1000,
  };

  return token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 })
  }

  try {
    const { action, payload, config } = await req.json()

    console.log("[pronesoft-proxy] action:", action);
    console.log("[pronesoft-proxy] tenantId:", config.tenantId);

    // 1. Obtener token
    const token = await getAccessToken(config.baseUrl, config.clientId, config.clientSecret);

    let result;

    if (action === 'submit') {
      // ─── Enviar eCF ───────────────────────────────────────────────
      const headers: Record<string, string> = {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      };

      if (config.tenantId) {
        headers["x-tenant-id"] = config.tenantId;
      }

      // Según docs oficiales: POST /api/v1/{environment}/ecf/submit
      // https://docs.ecf.pronesoft.com/guides/quickstart
      const ecfEnv = config.ecfEnv || "TesteCF";
      const submitUrl = `${config.baseUrl}/${ecfEnv}/ecf/submit`;

      console.log(`[pronesoft-proxy] 📤 Enviando a: ${submitUrl}`);
      console.log(`[pronesoft-proxy] 📤 Payload:`, JSON.stringify(payload).substring(0, 300));

      // El payload va DIRECTO según la documentación de Pronesoft
      const submitRes = await fetch(submitUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const responseText = await submitRes.text();

      if (!submitRes.ok) {
        console.error("[pronesoft-proxy] ❌ Error:", submitRes.status, responseText);
        return new Response(JSON.stringify({
          error: `Error de Pronesoft (${submitRes.status}): ${responseText}`
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }

      result = JSON.parse(responseText);
      console.log("[pronesoft-proxy] ✅ Respuesta Pronesoft:", JSON.stringify(result).substring(0, 500));

      console.log("[pronesoft-proxy] ✅ eCF emitido:", result.encf, "Status:", result.status);

    } else if (action === 'status') {
      const statusUrl = `${config.baseUrl}/${config.ecfEnv}/ecf/status/${payload.documentId}`;
      const statusRes = await fetch(statusUrl, {
        headers: { "Authorization": `Bearer ${token}` },
      });
      result = await statusRes.json();

    } else if (action === 'register-company') {
      const companyRes = await fetch(`${config.baseUrl}/companies`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      result = await companyRes.json();

    } else if (action === 'upload-cert') {
      const { certificate, password, rnc } = payload;
      if (!rnc) throw new Error("RNC es requerido para subir el certificado");

      const binaryString = atob(certificate);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: "application/x-pkcs12" });

      const formData = new FormData();
      formData.append("file", blob, "certificado.p12");
      formData.append("password", password);

      const certRes = await fetch(`${config.baseUrl}/${rnc}/certificates`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData,
      });

      const certText = await certRes.text();
      if (!certRes.ok) throw new Error(`Error al subir certificado (${certRes.status}): ${certText}`);

      result = JSON.parse(certText);
      result.ok = true;

    } else if (action === 'import-sequences') {
      const { file } = payload;

      const binaryString = atob(file);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });

      const formData = new FormData();
      formData.append("file", blob, "secuencias_dgii.xlsx");

      const importRes = await fetch(`${config.baseUrl}/tax-sequences/import`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData,
      });

      const importText = await importRes.text();
      if (!importRes.ok) throw new Error(`Error al importar secuencias (${importRes.status}): ${importText}`);

      result = JSON.parse(importText);
      result.ok = true;

    } else if (action === 'test-connection') {
      result = { ok: true, message: "Conexión exitosa con Pronesoft" };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error) {
    console.error("[pronesoft-proxy] ❌ Error Crítico:", error.message);

    return new Response(JSON.stringify({
      error: error.message || "Error desconocido en el proxy"
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })
  }
})
