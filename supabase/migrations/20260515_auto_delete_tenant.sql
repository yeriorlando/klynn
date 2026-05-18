-- 1. Preparar la tabla empleados para ser referenciada por (id, tenant_id)
ALTER TABLE public.empleados DROP CONSTRAINT IF EXISTS empleados_id_tenant_id_key;
ALTER TABLE public.empleados ADD CONSTRAINT empleados_id_tenant_id_key UNIQUE (id, tenant_id);

-- 2. Configurar cascadas para empleados (para que no bloqueen la limpieza)
ALTER TABLE public.cajas DROP CONSTRAINT IF EXISTS cajas_empleado_id_fkey,
ADD CONSTRAINT cajas_empleado_id_fkey FOREIGN KEY (empleado_id, tenant_id) REFERENCES public.empleados(id, tenant_id) ON DELETE CASCADE;

ALTER TABLE public.ordenes DROP CONSTRAINT IF EXISTS ordenes_empleado_id_fkey,
ADD CONSTRAINT ordenes_empleado_id_fkey FOREIGN KEY (empleado_id, tenant_id) REFERENCES public.empleados(id, tenant_id) ON DELETE CASCADE;

ALTER TABLE public.movimientos_caja DROP CONSTRAINT IF EXISTS movimientos_caja_empleado_id_fkey,
ADD CONSTRAINT movimientos_caja_empleado_id_fkey FOREIGN KEY (empleado_id, tenant_id) REFERENCES public.empleados(id, tenant_id) ON DELETE CASCADE;

-- 3. Limpiar empleados huérfanos antes de aplicar la restricción de Auth
DELETE FROM public.empleados 
WHERE id NOT IN (SELECT id FROM auth.users);

-- 4. Asegurar que public.empleados tenga DELETE CASCADE hacia auth.users
ALTER TABLE public.empleados
DROP CONSTRAINT IF EXISTS empleados_id_fkey,
ADD CONSTRAINT empleados_id_fkey 
  FOREIGN KEY (id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

-- 2. Función y Trigger para borrar el Tenant cuando se borra el Empleado
CREATE OR REPLACE FUNCTION public.on_empleado_deleted_cleanup_tenant()
RETURNS TRIGGER AS $$
BEGIN
  -- Borramos el tenant asociado
  DELETE FROM public.tenants WHERE id::text = OLD.tenant_id::text;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_cleanup_tenant_on_user_delete ON public.empleados;
CREATE TRIGGER trigger_cleanup_tenant_on_user_delete
AFTER DELETE ON public.empleados
FOR EACH ROW EXECUTE FUNCTION public.on_empleado_deleted_cleanup_tenant();

-- 3. EL CONSERJE: Función que limpia TODO rastro de un tenant al ser borrado
-- Esto evita tener que usar ON DELETE CASCADE que da problemas de tipos (UUID vs TEXT)
CREATE OR REPLACE FUNCTION public.on_tenant_deleted_cleanup_all_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Limpiar Clientes
  DELETE FROM public.clientes WHERE tenant_id::text = OLD.id::text;
  
  -- Limpiar Órdenes y sus ítems
  -- (Asumiendo que items_orden tiene cascada con ordenes, si no, habría que añadirlo)
  DELETE FROM public.ordenes WHERE tenant_id::text = OLD.id::text;
  
  -- Limpiar Caja y Movimientos
  DELETE FROM public.movimientos_caja WHERE tenant_id::text = OLD.id::text;
  DELETE FROM public.cajas WHERE tenant_id::text = OLD.id::text;
  
  -- Limpiar Catálogo y Servicios
  DELETE FROM public.catalogo_items WHERE tenant_id::text = OLD.id::text;
  DELETE FROM public.servicios WHERE tenant_id::text = OLD.id::text;
  
  -- Limpiar Configuración (si existen estas tablas)
  -- DELETE FROM public.config_factura WHERE tenant_id::text = OLD.id::text;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Activar el conserje en la tabla tenants
DROP TRIGGER IF EXISTS trigger_cleanup_tenant_data_total ON public.tenants;
CREATE TRIGGER trigger_cleanup_tenant_data_total
BEFORE DELETE ON public.tenants
FOR EACH ROW EXECUTE FUNCTION public.on_tenant_deleted_cleanup_all_data();

-- NOTA: Con esto, al borrar un usuario en Auth -> se borra el empleado -> se borra el tenant -> se borra TODO lo demás.
