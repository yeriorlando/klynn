
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lqtjwcphidbwiwrnqbac.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxdGp3Y3BoaWRid2l3cm5xYmFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMjc4NjUsImV4cCI6MjA5MzYwMzg2NX0.ZX6X1marjaOCaTt9gM2sVN9u07Qp7YmqsDR5sd71DE0';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const tables = [
  'planes',
  'tenants',
  'empleados',
  'global_config',
  'clientes',
  'ordenes',
  'cajas',
  'movimientos_caja',
  'gastos',
  'catalogo_items',
  'servicios'
];

async function checkTables() {
  console.log('--- Checking active tables in Supabase ---');
  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`[${table}] Error: ${error.message}`);
      } else {
        console.log(`[${table}] Active - Count: ${count}`);
      }
    } catch (err) {
      console.log(`[${table}] Exception: ${err.message}`);
    }
  }
}

checkTables();
