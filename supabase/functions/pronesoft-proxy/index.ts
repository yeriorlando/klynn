import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-tenant-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

// Base URL de la API REST según documentación oficial
const SANDBOX_API = "https://api.ecf.sandbox.pronesoft.com/api/v1";

// Cache simple de tokens en memoria (dura mientras la función esté "caliente")
let cachedToken: { token: string; expires: number } | null = null;

async function getAccessToken(baseUrl: string, clientId: string, clientSecret: string): Promise<string> {
  // Si tenemos un token válido, reutilizarlo
  if (cachedToken && Date.now() < cachedToken.expires) {
    return cachedToken.token;
  }

  console.log("[pronesoft-proxy] 🔑 Solicitando token OAuth...");
  const res = await fetch(`${baseUrl}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId, clientSecret }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("[pronesoft-proxy] ❌ Error de autenticación:", res.status, errText);
    throw new Error(`Error de autenticación Pronesoft (${res.status}): ${errText}`);
  }

  const data = await res.json();
  console.log("[pronesoft-proxy] ✅ Token obtenido, expira en:", data.expiresIn, "seg");
  
  cachedToken = {
    token: data.accessToken,
    expires: Date.now() + (data.expiresIn - 60) * 1000, // Renovar 1 min antes
  };

  return data.accessToken;
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
      const headers: Record<string, string> = {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      };
      
      if (config.tenantId) {
        headers["x-tenant-id"] = config.tenantId;
      }

      const wrappedPayload = {
        environment: config.ecfEnv || "TesteCF",
        electronicDocument: payload,
      };
      
      console.log(`[pronesoft-proxy] 📤 Envió a ${config.ecfEnv} via /ecf/send`);
      
      let submitUrl = `${config.baseUrl}/ecf/send`;
      let submitRes = await fetch(submitUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(wrappedPayload),
      });
      
      let responseText = await submitRes.text();
      
      if (submitRes.status === 404) {
        submitUrl = `${config.baseUrl}/${config.ecfEnv}/ecf/submit`;
        console.log("[pronesoft-proxy] 📤 Fallback a:", submitUrl);
        
        submitRes = await fetch(submitUrl, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });
        responseText = await submitRes.text();
      }

      if (!submitRes.ok) {
        console.error("[pronesoft-proxy] ❌ Error de Pronesoft:", submitRes.status, responseText);
        return new Response(JSON.stringify({ 
          error: `Error de Pronesoft (${submitRes.status}): ${responseText}` 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }

      result = JSON.parse(responseText);
      console.log("[pronesoft-proxy] ✅ eCF emitido:", result.encf, "Status:", result.status);

    } else if (action === 'status') {
      // GET /api/v1/{environment}/ecf/status/{id}
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
      
      console.log(`[pronesoft-proxy] 🔑 Subiendo certificado para RNC: ${rnc}`);
      
      // Convertir base64 a Blob para Deno
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
        headers: {
          "Authorization": `Bearer ${token}`,
        },
        body: formData,
      });
      
      const responseText = await certRes.text();
      console.log("[pronesoft-proxy] 📥 /certificates Status:", certRes.status, "Body:", responseText);
      
      if (!certRes.ok) {
        throw new Error(`Error al subir certificado (${certRes.status}): ${responseText}`);
      }
      
      result = JSON.parse(responseText);
      result.ok = true;

    } else if (action === 'import-sequences') {
      const { file } = payload;
      
      console.log(`[pronesoft-proxy] 📊 Importando secuencias desde Excel...`);
      
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
        headers: {
          "Authorization": `Bearer ${token}`,
        },
        body: formData,
      });
      
      const responseText = await importRes.text();
      console.log("[pronesoft-proxy] 📥 /import Status:", importRes.status, "Body:", responseText);
      
      if (!importRes.ok) {
        throw new Error(`Error al importar secuencias (${importRes.status}): ${responseText}`);
      }
      
      result = JSON.parse(responseText);
      result.ok = true;

    } else if (action === 'test-connection') {
      // Simple test: si logramos obtener token, la conexión funciona
      result = { ok: true, message: "Conexión exitosa con Pronesoft Sandbox" };
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
