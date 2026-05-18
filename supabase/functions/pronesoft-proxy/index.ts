import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-tenant-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

// Cache de tokens en memoria
let cachedToken: { token: string; expires: number } | null = null;

async function getAccessToken(baseUrl: string, clientId: string, clientSecret: string): Promise<string> {
  // Limpieza agresiva de credenciales
  const cleanId = clientId.trim();
  const cleanSecret = clientSecret.trim();

  // Reutilizar token si es válido
  if (cachedToken && Date.now() < cachedToken.expires) {
    return cachedToken.token;
  }

  console.log(`[pronesoft-proxy] 🔑 Renovando token para: ${cleanId.substring(0, 10)}...`);

  const res = await fetch(`${baseUrl}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId: cleanId, clientSecret: cleanSecret }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Error de Autenticación Pronesoft: ${err}`);
  }

  const data = await res.json();
  const token = data.accessToken || data.access_token;
  
  // Guardamos el token y calculamos expiración (menos un margen de seguridad)
  cachedToken = {
    token,
    expires: Date.now() + ((data.expiresIn || data.expires_in || 3600) - 60) * 1000
  };

  return token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 })
  }

  try {
    const { action, payload, config } = await req.json()

    // Acciones de RNC (Microservicio aparte)
    if (action === 'get-rnc') {
      const rncRes = await fetch(`https://dgii-rnc.pronesoft.com/get/${payload.rnc}`);
      const data = await rncRes.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    // Configuración base
    const baseUrl = config.baseUrl || 'https://api.ecf.pronesoft.com/api/v1';
    const ecfEnv = config.ecfEnv || 'TesteCF';

    // Obtener Token fresco (Auto-refresh)
    const token = await getAccessToken(baseUrl, config.clientId, config.clientSecret);

    let result;

    if (action === 'submit') {
      console.log("[pronesoft-proxy] 📤 Enviando eCF a DGII...");
      
      const headers: any = {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      };
      if (config.tenantId) headers["x-tenant-id"] = config.tenantId;

      const res = await fetch(`${baseUrl}/${ecfEnv}/ecf/submit`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload)
      });

      const responseText = await res.text();
      if (!res.ok) throw new Error(`Error Fiscal: ${responseText}`);

      result = JSON.parse(responseText);
      console.log("[pronesoft-proxy] ✅ eCF emitido:", result.encf);

    } else if (action === 'status') {
      const res = await fetch(`${baseUrl}/${ecfEnv}/ecf/status/${payload.documentId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      result = await res.json();

    } else if (action === 'register-company') {
      const res = await fetch(`${baseUrl}/companies`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      result = await res.json();

    } else if (action === 'upload-cert') {
      const binaryString = atob(payload.certificate);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: "application/x-pkcs12" });
      const formData = new FormData();
      formData.append("file", blob, "certificado.p12");
      formData.append("password", payload.password);

      const res = await fetch(`${baseUrl}/${payload.rnc}/certificates`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData
      });
      const text = await res.text();
      if (!res.ok) throw new Error(`Error Certificado: ${text}`);
      result = { ok: true, ...JSON.parse(text) };

    } else if (action === 'test-connection') {
      result = { ok: true, message: "Conexión estable" };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error: any) {
    console.error("[pronesoft-proxy] ❌ ERROR:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });
  }
})
