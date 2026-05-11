import { createFileRoute } from '@tanstack/react-router';
import { ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { LandingNavbar } from '@/components/klynn/LandingNavbar';

export const Route = createFileRoute('/privacidad')({
  component: PrivacidadPage,
});

function LegalLayout({ title, icon: Icon, children }: { title: string, icon: any, children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#1E293B] font-sans selection:bg-primary/20">
      <LandingNavbar />

      <main className="max-w-4xl mx-auto px-6 py-12 md:py-20">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden"
        >
          <div className="p-8 md:p-12 border-b border-slate-50 bg-slate-50/50">
            <div className="h-14 w-14 bg-primary rounded-2xl flex items-center justify-center text-white mb-6">
              <Icon className="h-7 w-7" />
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-slate-900 mb-2">{title}</h1>
            <p className="text-slate-500 font-medium">Última actualización: 11 de mayo de 2026</p>
          </div>
          <div className="p-8 md:p-12 prose prose-slate prose-blue max-w-none 
            prose-headings:font-display prose-headings:font-bold prose-headings:text-slate-900 
            prose-p:leading-relaxed prose-li:leading-relaxed 
            [&>h2]:mt-24 [&>h2]:mb-10 [&>h2]:text-2xl [&>h2]:border-b [&>h2]:border-slate-100 [&>h2]:pb-4
            [&>h3]:mt-16 [&>h3]:mb-6 [&>h3]:text-xl
            [&>p]:mb-8 [&>p]:text-slate-600 [&>p]:text-lg
            [&>ul]:mb-10 [&>ul]:space-y-4 [&>ul]:text-slate-600 [&>ul]:text-lg
            [&>li]:ml-4">
            {children}
          </div>
        </motion.div>

        <footer className="mt-12 text-center text-slate-400 text-sm">
          &copy; 2026 Klynn Todos los derechos reservados.
        </footer>
      </main>
    </div>
  );
}

function PrivacidadPage() {
  return (
    <LegalLayout title="Política de Privacidad" icon={ShieldCheck}>
      <p>En Klynn, la privacidad de su negocio y de sus clientes es nuestra prioridad. Esta política describe cómo recopilamos, usamos y protegemos su información.</p>

      <h2>1. Información que Recopilamos</h2>
      <p>Recopilamos información necesaria para la prestación del servicio, incluyendo:</p>
      <ul>
        <li><strong>Datos de Usuario:</strong> Nombre, correo electrónico y teléfono de los administradores y empleados.</li>
        <li><strong>Datos del Negocio:</strong> Nombre de la lavandería, RNC, dirección y configuración personalizada.</li>
        <li><strong>Datos de Clientes del Tenant:</strong> Nombres, teléfonos y direcciones de los clientes de su lavandería (estos datos son propiedad exclusiva de su negocio y Klynn no los utiliza para fines comerciales).</li>
      </ul>

      <h2>2. Uso de la Información</h2>
      <p>Utilizamos su información únicamente para:</p>
      <ul>
        <li>Procesar sus órdenes y gestionar su catálogo.</li>
        <li>Enviar notificaciones automáticas vía WhatsApp (si el módulo está activo).</li>
        <li>Procesar pagos y facturación.</li>
        <li>Mejorar la estabilidad y seguridad de la plataforma.</li>
      </ul>

      <h2>3. Protección de Datos</h2>
      <p>Toda la información se almacena en bases de datos cifradas y con aislamiento de datos por inquilino (Multi-tenant isolation), lo que garantiza que sus datos nunca se mezclen con los de otro negocio.</p>

      <h2>4. Compartición con Terceros</h2>
      <p>Klynn no vende ni alquila sus datos a terceros. Solo compartimos información necesaria con proveedores de servicios críticos como:</p>
      <ul>
        <li><strong>Supabase:</strong> Para el almacenamiento de datos y autenticación.</li>
        <li><strong>Polar.sh / Stripe:</strong> Para el procesamiento seguro de pagos con tarjeta.</li>
        <li><strong>WAPI / API WhatsApp:</strong> Para el envío de notificaciones.</li>
      </ul>

      <h2>5. Sus Derechos</h2>
      <p>Usted tiene derecho a acceder, rectificar o eliminar sus datos personales y los de sus clientes en cualquier momento a través de las herramientas de exportación y borrado integradas en el panel de control.</p>
    </LegalLayout>
  );
}
