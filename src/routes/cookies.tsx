import { createFileRoute } from '@tanstack/react-router';
import { Cookie } from 'lucide-react';
import { motion } from 'framer-motion';
import { LandingNavbar } from '@/components/klynn/LandingNavbar';

export const Route = createFileRoute('/cookies')({
  component: CookiesPage,
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
          &copy; 2026 Klynn S.R.L. Todos los derechos reservados.
        </footer>
      </main>
    </div>
  );
}

function CookiesPage() {
  return (
    <LegalLayout title="Política de Cookies" icon={Cookie}>
      <p>Klynn utiliza cookies y tecnologías similares para garantizar el funcionamiento correcto de la plataforma y mejorar su experiencia de usuario.</p>

      <h2>1. ¿Qué son las Cookies?</h2>
      <p>Las cookies son pequeños archivos de texto que se almacenan en su navegador cuando visita un sitio web. Nos permiten recordar sus preferencias y mantener su sesión activa.</p>

      <h2>2. Tipos de Cookies que utilizamos</h2>
      <ul>
        <li><strong>Cookies Esenciales:</strong> Necesarias para el inicio de sesión y la seguridad de la plataforma. Sin ellas, el servicio no puede funcionar correctamente.</li>
        <li><strong>Cookies de Sesión:</strong> Se utilizan para recordar su lavandería activa y sus preferencias de visualización durante su visita.</li>
        <li><strong>Cookies de Análisis:</strong> (Opcionales) Nos ayudan a entender cómo se utiliza la plataforma de forma agregada y anónima para mejorar nuestras funciones.</li>
      </ul>

      <h2>3. Control de Cookies</h2>
      <p>Usted puede desactivar las cookies a través de la configuración de su navegador. Sin embargo, tenga en cuenta que desactivar las cookies esenciales le impedirá iniciar sesión y utilizar las funciones principales de Klynn.</p>

      <h2>4. Cookies de Terceros</h2>
      <p>Servicios como Polar.sh o Supabase pueden establecer sus propias cookies para gestionar el proceso de pago de forma segura y validar su identidad.</p>
    </LegalLayout>
  );
}
