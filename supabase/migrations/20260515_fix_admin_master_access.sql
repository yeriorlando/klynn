-- 1. Borrar la versión anterior para permitir cambio de tipo de retorno
DROP FUNCTION IF EXISTS public.get_my_tenants() CASCADE;

-- 2. Redefinir la función get_my_tenants para que sea más robusta
-- Ahora busca tanto por ID como por EMAIL (sacado del JWT de Supabase)
CREATE OR REPLACE FUNCTION public.get_my_tenants()
RETURNS TABLE (t_id text) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT tenant_id::text
  FROM public.empleados
  WHERE id::text = auth.uid()::text 
     OR email = (auth.jwt() ->> 'email');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Asegurar políticas para clientes (re-aplicar con la nueva función)
DROP POLICY IF EXISTS "Management for own clients" ON public.clientes;
CREATE POLICY "Management for own clients" ON public.clientes 
FOR ALL 
USING ( tenant_id::text IN (SELECT t_id FROM get_my_tenants()) )
WITH CHECK ( tenant_id::text IN (SELECT t_id FROM get_my_tenants()) );

-- 3. Asegurar políticas para órdenes (fundamental para que el Admin vea el historial)
DROP POLICY IF EXISTS "Management for own orders" ON public.ordenes;
CREATE POLICY "Management for own orders" ON public.ordenes 
FOR ALL 
USING ( tenant_id::text IN (SELECT t_id FROM get_my_tenants()) )
WITH CHECK ( tenant_id::text IN (SELECT t_id FROM get_my_tenants()) );

-- 4. Asegurar políticas para cajas y movimientos
DROP POLICY IF EXISTS "Management for own boxes" ON public.cajas;
CREATE POLICY "Management for own boxes" ON public.cajas 
FOR ALL 
USING ( tenant_id::text IN (SELECT t_id FROM get_my_tenants()) )
WITH CHECK ( tenant_id::text IN (SELECT t_id FROM get_my_tenants()) );

DROP POLICY IF EXISTS "Management for own movements" ON public.movimientos_caja;
CREATE POLICY "Management for own movements" ON public.movimientos_caja 
FOR ALL 
USING ( tenant_id::text IN (SELECT t_id FROM get_my_tenants()) )
WITH CHECK ( tenant_id::text IN (SELECT t_id FROM get_my_tenants()) );

-- 5. Asegurar políticas para catálogo (incluyendo muestras globales)
DROP POLICY IF EXISTS "Manage own catalog items" ON public.catalogo_items;
DROP POLICY IF EXISTS "View global catalog" ON public.catalogo_items;
DROP POLICY IF EXISTS "Catalog select" ON public.catalogo_items;
DROP POLICY IF EXISTS "Catalog manage" ON public.catalogo_items;

CREATE POLICY "Catalog select" ON public.catalogo_items 
FOR SELECT USING ( 
  tenant_id::text = 'admin' 
  OR tenant_id::text IN (SELECT t_id FROM get_my_tenants()) 
);

CREATE POLICY "Catalog manage" ON public.catalogo_items 
FOR ALL USING ( 
  tenant_id::text IN (SELECT t_id FROM get_my_tenants()) 
) WITH CHECK ( 
  tenant_id::text IN (SELECT t_id FROM get_my_tenants()) 
);

-- 6. Asegurar políticas para servicios (incluyendo muestras globales)
DROP POLICY IF EXISTS "Manage own services" ON public.servicios;
DROP POLICY IF EXISTS "View global services" ON public.servicios;
DROP POLICY IF EXISTS "Services select" ON public.servicios;
DROP POLICY IF EXISTS "Services manage" ON public.servicios;

CREATE POLICY "Services select" ON public.servicios 
FOR SELECT USING ( 
  tenant_id::text = 'admin' 
  OR tenant_id::text IN (SELECT t_id FROM get_my_tenants()) 
);

CREATE POLICY "Services manage" ON public.servicios 
FOR ALL USING ( 
  tenant_id::text IN (SELECT t_id FROM get_my_tenants()) 
) WITH CHECK ( 
  tenant_id::text IN (SELECT t_id FROM get_my_tenants()) 
);

-- 7. Asegurar RLS en todas las tablas críticas
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ordenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalogo_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gastos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cajas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimientos_caja ENABLE ROW LEVEL SECURITY;
