# Implementación de PWA y Modo Offline-First para POS

Este plan detalla la arquitectura para convertir Klynn en una aplicación robusta que funcione sin conexión (tanto en PC como en Tablets), permitiendo a las lavanderías seguir operando y registrando órdenes cuando el internet falla, y sincronizando los datos automáticamente al regresar la conexión.

## ⚠️ User Review Required

Implementar un modo offline real ("Offline-First") es un cambio estructural profundo. Significa que **toda la aplicación** (catálogo, clientes, creación de órdenes) debe leer y escribir primero en una base de datos local en el navegador del usuario, y luego sincronizarse con Supabase. 

Requiere la instalación de librerías adicionales y modificar cómo interactuamos con Supabase en la página de **Nueva Orden**. Por favor, revisa las herramientas propuestas y aprueba si estás de acuerdo con el nivel de complejidad.

## Open Questions

> [!IMPORTANT]
> 1. **Manejo de Errores de Sincronización:** Si se crea una orden offline y al subirla a Supabase falla (por ejemplo, el cliente fue borrado por otro usuario o falla una validación), ¿debemos mantener la orden en una pestaña de "Órdenes con error" para revisión manual?
> 2. **Límites del Plan:** Si el usuario llega al límite de órdenes (ordersReached) mientras está offline, el sistema no lo sabrá hasta reconectarse. ¿Permitimos crear órdenes ilimitadas offline y aplicamos el bloqueo o recargo al sincronizar?

## Proposed Changes

Para implementar esto de manera eficiente sin reescribir toda la aplicación, dividiremos el trabajo en 4 fases lógicas.

---

### Phase 1: PWA y Caché de Interfaz (Vite Plugin PWA)

Haremos que la aplicación sea instalable (app de escritorio o pantalla de inicio de tablet) y que la interfaz y las imágenes estáticas (como las que acabamos de convertir a `.webp`) se almacenen en caché.

#### [NEW] `vite.config.ts` (Modificación)
- Instalación de `vite-plugin-pwa`.
- Configuración del manifiesto de la aplicación (nombre, colores, iconos).
- Configuración de Workbox para cachear rutas dinámicas y recursos estáticos (`/samples/**/*`).

#### [NEW] `public/manifest-icons/`
- Añadiremos íconos genéricos para que Klynn pueda ser instalada formalmente.

---

### Phase 2: Base de Datos Local (Dexie.js)

`localStorage` no es suficiente para almacenar catálogos complejos y listas de clientes. Usaremos **Dexie.js**, un wrapper robusto para `IndexedDB` (la base de datos nativa del navegador), ideal para arquitecturas offline.

#### [NEW] `src/lib/offline-db.ts`
- Crearemos la configuración de Dexie.
- **Tablas Locales:** 
  - `catalogo_cache`
  - `servicios_cache`
  - `clientes_cache`
  - `outbox_ordenes` (Cola de espera para órdenes creadas offline).

---

### Phase 3: Lógica Offline-First (Modificando los fetchers)

Modificaremos las funciones principales que obtienen y guardan datos para que usen la base de datos local como intermediario.

#### [MODIFY] Funciones de lectura en `src/lib/supabase.ts` (o donde residan)
- **Modo Lectura:** Al pedir clientes o catálogo, primero devolveremos la versión local (rápido y funciona offline). En segundo plano, pediremos la versión de Supabase y actualizaremos la local si hay conexión.

#### [MODIFY] Creación de Órdenes (`src/routes/t.$slug.nueva-orden.tsx`)
- Al crear una orden, en lugar de enviarla directamente a Supabase, se guardará en la tabla local `outbox_ordenes`.
- Un proceso en segundo plano intentará vaciar el `outbox` y enviar a Supabase inmediatamente si hay internet.

---

### Phase 4: UI de Estado y Sincronización

El usuario debe saber en todo momento si está operando online u offline, y si tiene datos pendientes de subir.

#### [NEW] `src/components/OfflineIndicator.tsx`
- Un pequeño badge en el header del POS que indique: "🟢 Online", "🔴 Offline - Trabajando localmente", o "🔄 Sincronizando (X pendientes)".

#### [MODIFY] `src/routes/t.$slug.nueva-orden.tsx`
- Integrar el `OfflineIndicator`.
- Lógica para deshabilitar ciertas acciones críticas que *estrictamente* requieran internet (ej. procesar pagos con tarjeta o registrar una lavandería nueva), aunque el cobro en efectivo y crédito funcionará perfecto offline.

## Verification Plan

### Automated / Dev Tests
- **PWA:** Inspeccionar la pestaña "Application" en DevTools para verificar que el Service Worker está activo y cacheando recursos.
- **Simulación Offline:** Apagar la red en las DevTools del navegador.
- **CRUD Offline:** Intentar crear un cliente nuevo y una orden. Verificar que se guarden en IndexedDB (Dexie).
- **Sincronización:** Encender la red y verificar que la cola (`outbox`) se vacíe y las órdenes aparezcan en Supabase.

### Manual Verification
- Instalar la PWA en un PC o Tablet real.
- Apagar el Wi-Fi, registrar un cobro, encender Wi-Fi, y ver si la orden se refleja en la base de datos principal.
