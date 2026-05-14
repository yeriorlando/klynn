const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envPath = '.env';
const envFile = fs.readFileSync(envPath, 'utf-8');
const anonKey = envFile.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1];
const url = envFile.match(/VITE_SUPABASE_URL=(.*)/)[1];

const supabase = createClient(url, anonKey);

const newTemplate = `✨ *{tipo_documento}* ✨
-----------------------------------
🧺 *{lavanderia}*
🏢 RNC: {rnc}
📞 Tel: {lavanderia_tel}
📍 {lavanderia_dir}
-----------------------------------
📄 *ORDEN:* {numero}
🧾 *NCF:* {ncf}
📅 *Fecha:* {fecha}
-----------------------------------
👤 *CLIENTE:* {cliente}
🪪 *{cliente_tipo_doc}:* {cliente_cedula}
📞 Tel: {cliente_tel}
📍 Dir: {cliente_dir}
-----------------------------------
✨ *SERVICIOS:*
{servicios}
-----------------------------------
👕 *DETALLE:*
{detalle}
-----------------------------------
💰 *SUBTOTAL:* {subtotal}
💸 *ITBIS:* {itbis}
🔥 *TOTAL:* {total}
-----------------------------------
💳 *Pago:* {metodo_pago}
💵 *Recibido:* {pagado}
🔙 *Vuelto:* {vuelto}
🛑 *Saldo Pendiente:* {saldo}
-----------------------------------
🚚 *Entrega:* {entrega}
✅ *Estado:* {estado}

¡Gracias por su preferencia!`;

async function run() {
  const { data: tenants, error: err1 } = await supabase.from('tenants').select('id, config');
  if (err1) {
    console.error("Error fetching tenants:", err1);
    return;
  }

  console.log(`Found ${tenants.length} tenants to update.`);

  for (const t of tenants) {
    const config = t.config || {};
    if (!config.whatsapp) {
      config.whatsapp = {};
    }
    config.whatsapp.plantilla_creada = newTemplate;

    const { error: err2 } = await supabase.from('tenants').update({ config }).eq('id', t.id);
    if (err2) {
      console.error(`Error updating tenant ${t.id}:`, err2);
    } else {
      console.log(`Updated tenant ${t.id}`);
    }
  }
  console.log("Done!");
}

run();
