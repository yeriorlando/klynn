-- 1. Preparar cascadas para que nada detenga la limpieza
-- Órdenes (vínculo con empleado)
ALTER TABLE public.ordenes DROP CONSTRAINT IF EXISTS ordenes_empleado_id_fkey,
ADD CONSTRAINT ordenes_empleado_id_fkey FOREIGN KEY (empleado_id) REFERENCES public.empleados(id) ON DELETE CASCADE;

-- Cajas (vínculo con empleado)
ALTER TABLE public.cajas DROP CONSTRAINT IF EXISTS cajas_empleado_id_fkey,
ADD CONSTRAINT cajas_empleado_id_fkey FOREIGN KEY (empleado_id) REFERENCES public.empleados(id) ON DELETE CASCADE;

-- Movimientos de caja (vínculo con empleado)
ALTER TABLE public.movimientos_caja DROP CONSTRAINT IF EXISTS movimientos_caja_empleado_id_fkey,
ADD CONSTRAINT movimientos_caja_empleado_id_fkey FOREIGN KEY (empleado_id) REFERENCES public.empleados(id) ON DELETE CASCADE;

-- 2. Ahora sí, limpiar empleados huérfanos sin errores
DELETE FROM public.empleados 
WHERE id NOT IN (SELECT id FROM auth.users);

-- 3. Asegurar que public.empleados tenga DELETE CASCADE hacia auth.users
ALTER TABLE public.empleados
DROP CONSTRAINT IF EXISTS empleados_id_fkey,
ADD CONSTRAINT empleados_id_fkey 
  FOREIGN KEY (id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

-- 4. Función y Trigger para borrar el Tenant cuando se borra el Empleado
CREATE OR REPLACE FUNCTION public.on_empleado_deleted_cleanup_tenant()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.tenants WHERE id::text = OLD.tenant_id::text;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_cleanup_tenant_on_user_delete ON public.empleados;
CREATE TRIGGER trigger_cleanup_tenant_on_user_delete
AFTER DELETE ON public.empleados
FOR EACH ROW EXECUTE FUNCTION public.on_empleado_deleted_cleanup_tenant();

-- 5. Asegurar cascada de Tenant hacia todas sus tablas
ALTER TABLE public.clientes DROP CONSTRAINT IF EXISTS clientes_tenant_id_fkey,
ADD CONSTRAINT clientes_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.ordenes DROP CONSTRAINT IF EXISTS ordenes_tenant_id_fkey,
ADD CONSTRAINT ordenes_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.cajas DROP CONSTRAINT IF EXISTS cajas_tenant_id_fkey,
ADD CONSTRAINT cajas_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.catalogo_items DROP CONSTRAINT IF EXISTS catalogo_items_tenant_id_fkey,
ADD CONSTRAINT catalogo_items_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.servicios DROP CONSTRAINT IF EXISTS servicios_tenant_id_fkey,
ADD CONSTRAINT servicios_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
