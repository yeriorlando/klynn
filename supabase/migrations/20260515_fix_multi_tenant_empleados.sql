-- 1. Eliminar las llaves foráneas que dependen de la PK actual de empleados
ALTER TABLE public.ordenes DROP CONSTRAINT IF EXISTS ordenes_empleado_id_fkey;
ALTER TABLE public.ordenes DROP CONSTRAINT IF EXISTS ordenes_repartidor_id_fkey;
ALTER TABLE public.cajas DROP CONSTRAINT IF EXISTS cajas_empleado_id_fkey;
ALTER TABLE public.movimientos_caja DROP CONSTRAINT IF EXISTS movimientos_caja_empleado_id_fkey;
ALTER TABLE public.gastos DROP CONSTRAINT IF EXISTS gastos_empleado_id_fkey;

-- 2. Ahora sí podemos quitar la PK de empleados
ALTER TABLE public.empleados DROP CONSTRAINT IF EXISTS empleados_pkey;

-- 3. Crear la nueva llave primaria compuesta (ID de usuario + Sucursal)
ALTER TABLE public.empleados ADD PRIMARY KEY (id, tenant_id);

-- 4. Re-crear las llaves foráneas usando la nueva PK compuesta (id, tenant_id)
-- Esto asegura que el empleado pertenezca a la misma sucursal que el registro
ALTER TABLE public.ordenes 
  ADD CONSTRAINT ordenes_empleado_id_fkey 
  FOREIGN KEY (empleado_id, tenant_id) REFERENCES public.empleados(id, tenant_id);

ALTER TABLE public.ordenes 
  ADD CONSTRAINT ordenes_repartidor_id_fkey 
  FOREIGN KEY (repartidor_id, tenant_id) REFERENCES public.empleados(id, tenant_id);

ALTER TABLE public.cajas 
  ADD CONSTRAINT cajas_empleado_id_fkey 
  FOREIGN KEY (empleado_id, tenant_id) REFERENCES public.empleados(id, tenant_id);

ALTER TABLE public.movimientos_caja 
  ADD CONSTRAINT movimientos_caja_empleado_id_fkey 
  FOREIGN KEY (empleado_id, tenant_id) REFERENCES public.empleados(id, tenant_id);

ALTER TABLE public.gastos 
  ADD CONSTRAINT gastos_empleado_id_fkey 
  FOREIGN KEY (empleado_id, tenant_id) REFERENCES public.empleados(id, tenant_id);

-- 5. Actualizar políticas de RLS
DROP POLICY IF EXISTS "Permitir insert propio" ON public.empleados;
CREATE POLICY "Permitir insert propio" ON public.empleados 
FOR INSERT WITH CHECK ( id::text = auth.uid()::text );

DROP POLICY IF EXISTS "Ver perfiles propios" ON public.empleados;
CREATE POLICY "Ver perfiles propios" ON public.empleados 
FOR SELECT USING ( id::text = auth.uid()::text );

-- 6. Reparar registros de sucursales previas (vincular a tu ID real)
UPDATE public.empleados 
SET id = auth.uid()::text 
WHERE email IN ('yeriorlando00@gmail.com', 'admin@klynn.com.do') 
AND id <> auth.uid()::text;
