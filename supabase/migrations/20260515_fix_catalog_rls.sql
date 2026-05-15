-- 1. Habilitar políticas de gestión para catalogo_items
-- Permitir que los usuarios gestionen sus propios ítems
DROP POLICY IF EXISTS "Management for own catalog items" ON public.catalogo_items;
CREATE POLICY "Management for own catalog items" ON public.catalogo_items 
FOR ALL 
USING ( tenant_id::text IN (SELECT t_id::text FROM get_my_tenants()) )
WITH CHECK ( tenant_id::text IN (SELECT t_id::text FROM get_my_tenants()) );

-- 2. Habilitar políticas de gestión para servicios
DROP POLICY IF EXISTS "Management for own services" ON public.servicios;
CREATE POLICY "Management for own services" ON public.servicios 
FOR ALL 
USING ( tenant_id::text IN (SELECT t_id::text FROM get_my_tenants()) )
WITH CHECK ( tenant_id::text IN (SELECT t_id::text FROM get_my_tenants()) );

-- 3. Asegurar que RLS está activo
ALTER TABLE public.catalogo_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servicios ENABLE ROW LEVEL SECURITY;

-- 4. Nota: Las políticas de SELECT ya existen en la migración enable_global_catalog
-- que permiten ver tanto los ítems propios como los de 'admin'.
