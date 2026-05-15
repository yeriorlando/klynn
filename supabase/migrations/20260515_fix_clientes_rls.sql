-- 1. Habilitar políticas de gestión para clientes
DROP POLICY IF EXISTS "Management for own clients" ON public.clientes;
CREATE POLICY "Management for own clients" ON public.clientes 
FOR ALL 
USING ( tenant_id::text IN (SELECT t_id::text FROM get_my_tenants()) )
WITH CHECK ( tenant_id::text IN (SELECT t_id::text FROM get_my_tenants()) );

-- 2. Asegurar que RLS está activo
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
