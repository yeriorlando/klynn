import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Klynn — Software de gestión para lavanderías en RD" },
      { name: "description", content: "Plataforma SaaS multi-tenant para lavanderías dominicanas: órdenes, caja, ITBIS, tickets térmicos, clientes y entregas." },
      { name: "author", content: "Klynn" },
      { property: "og:title", content: "Klynn — Software de gestión para lavanderías en RD" },
      { property: "og:description", content: "Plataforma SaaS multi-tenant para lavanderías dominicanas: órdenes, caja, ITBIS, tickets térmicos, clientes y entregas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "Klynn — Software de gestión para lavanderías en RD" },
      { name: "twitter:description", content: "Plataforma SaaS multi-tenant para lavanderías dominicanas: órdenes, caja, ITBIS, tickets térmicos, clientes y entregas." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/05ff4a4b-0512-4fb9-b96c-1b005d4fa98a/id-preview-e1b6eddf--32655e9b-c01d-4ebb-89e1-08399bd65bae.lovable.app-1777726950641.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/05ff4a4b-0512-4fb9-b96c-1b005d4fa98a/id-preview-e1b6eddf--32655e9b-c01d-4ebb-89e1-08399bd65bae.lovable.app-1777726950641.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "icon",
        type: "image/webp",
        href: "/favicon.webp",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Toaster richColors position="top-center" closeButton />
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return <Outlet />;
}
