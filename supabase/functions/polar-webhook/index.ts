import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const POLAR_WEBHOOK_SECRET = Deno.env.get("POLAR_WEBHOOK_SECRET")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Mapeo de IDs de productos de Polar a IDs de planes de Klynn
// IMPORTANTE: El usuario debe actualizar estos IDs con los reales de su Dashboard de Polar
const PLAN_MAPPING: Record<string, string> = {
  "prod_basico_id": "basico",
  "prod_pro_id": "pro",
  "prod_enterprise_id": "enterprise"
};

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const payload = await req.text();
    // En un entorno productivo, validar la firma de Polar aquí
    // const signature = req.headers.get("polar-signature");
    // ... validación de firma ...

    const event = JSON.parse(payload);
    console.log("Evento recibido de Polar:", event.type);

    // Manejamos tanto órdenes completadas como suscripciones creadas
    if (event.type === "order.created" || event.type === "subscription.created") {
      const data = event.data;
      const customerEmail = data.customer?.email || data.user?.email;
      const productId = data.product_id || data.product?.id;

      if (!customerEmail) {
        return new Response("No customer email found", { status: 400 });
      }

      console.log(`Procesando pago para: ${customerEmail}, Producto: ${productId}`);

      // 1. Buscar el plan correspondiente
      // Si el ID no está en el mapeo, intentamos buscarlo en la tabla 'planes' de Supabase
      let planId = PLAN_MAPPING[productId];
      
      if (!planId) {
        const { data: planData } = await supabase
          .from("planes")
          .select("id")
          .or(`polar_product_monthly_url.ilike.%${productId}%,polar_product_yearly_url.ilike.%${productId}%`)
          .single();
        
        if (planData) planId = planData.id;
      }

      if (!planId) {
        console.error("No se pudo mapear el producto de Polar a un plan de Klynn:", productId);
        return new Response("Plan not found", { status: 404 });
      }

      // 2. Actualizar el tenant en Supabase
      const { error: updateError } = await supabase
        .from("tenants")
        .update({ 
          plan_id: planId,
          estado: "ACTIVO" 
        })
        .eq("email", customerEmail);

      if (updateError) {
        console.error("Error actualizando tenant:", updateError);
        return new Response("Error updating tenant", { status: 500 });
      }

      console.log(`Plan ${planId} activado exitosamente para ${customerEmail}`);
      return new Response(JSON.stringify({ ok: true, plan: planId }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response("Event type not handled", { status: 200 });
  } catch (err) {
    console.error("Webhook Error:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
});
