-- Agregar columna para el monto de caja chica a la tabla tenants
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS monto_caja_chica NUMERIC DEFAULT 0;

-- Comentario para documentar la columna
COMMENT ON COLUMN tenants.monto_caja_chica IS 'Monto asignado para la caja chica del negocio';
