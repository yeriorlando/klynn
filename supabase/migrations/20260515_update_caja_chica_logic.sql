-- Agregar columnas para la gestión de caja chica
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS monto_actual_caja_chica NUMERIC DEFAULT 0;

-- Actualizar comentario
COMMENT ON COLUMN tenants.monto_caja_chica IS 'Monto base/fondo fijo asignado para la caja chica';
COMMENT ON COLUMN tenants.monto_actual_caja_chica IS 'Monto disponible actualmente en la caja chica';
