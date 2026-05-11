import { createFileRoute } from '@tanstack/react-router';
import { FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import { LandingNavbar } from '@/components/klynn/LandingNavbar';

export const Route = createFileRoute('/terminos')({
  component: TerminosPage,
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

function TerminosPage() {
  return (
    <LegalLayout title="Términos y Condiciones de Uso" icon={FileText}>
      <p>Bienvenido a Klynn. Al utilizar nuestra plataforma, usted acepta cumplir con los siguientes términos y condiciones. Por favor, léalos detenidamente.</p>

      <h2>1. Descripción del Servicio</h2>
      <p>Klynn es una plataforma de software como servicio (SaaS) diseñada para la gestión integral de lavanderías. El servicio incluye herramientas de punto de venta (POS), gestión de clientes, catálogo de servicios, control de inventario y reportes financieros.</p>

      <h2>2. Planes y Suscripciones</h2>
      <p>Ofrecemos diferentes planes de suscripción (Básico, Pro, Enterprise) con límites específicos de empleados y órdenes mensuales:</p>
      <ul>
        <li><strong>Período de Prueba:</strong> Al registrarse, el usuario accede a un período de prueba gratuito de 14 días.</li>
        <li><strong>Renovación Automática:</strong> Los pagos realizados con tarjeta de crédito/débito a través de Polar.sh se procesarán de forma mensual y se debitarán automáticamente de su cuenta el mismo día de cada mes.</li>
        <li><strong>Transferencias Bancarias:</strong> En caso de optar por transferencia, el acceso al plan se activará una vez enviado el comprobante vía WhatsApp y verificado por nuestro equipo administrativo.</li>
      </ul>

      <h2>3. Políticas de Cobro</h2>
      <p>Usted autoriza a Klynn a realizar cargos recurrentes mensuales según el plan seleccionado. En caso de fallo en el cobro automático, se le notificará para regularizar la situación en un plazo de 5 días hábiles antes de la suspensión temporal del servicio.</p>

      <h2>4. Uso de la Plataforma</h2>
      <p>Usted es responsable de mantener la confidencialidad de su cuenta y contraseña. Klynn no se hace responsable por pérdidas o daños resultantes del acceso no autorizado a su cuenta debido a negligencia en la seguridad de sus credenciales.</p>

      <h2>5. Cancelación y Reembolsos</h2>
      <p>Usted puede cancelar su suscripción en cualquier momento desde el panel de configuración. No se realizarán reembolsos por períodos ya facturados o fracciones de mes no utilizadas una vez procesado el cobro automático.</p>

      <h2>6. Limitación de Responsabilidad</h2>
      <p>Klynn se esfuerza por mantener la disponibilidad del servicio al 99.9%. Sin embargo, no nos hacemos responsables por interrupciones debidas a causas de fuerza mayor o fallos en proveedores de infraestructura externos.</p>
    </LegalLayout>
  );
}
