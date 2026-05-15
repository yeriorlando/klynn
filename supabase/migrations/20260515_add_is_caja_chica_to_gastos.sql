-- Agregar columna is_caja_chica a la tabla de gastos
ALTER TABLE gastos 
ADD COLUMN IF NOT EXISTS is_caja_chica BOOLEAN DEFAULT false;

-- Comentario para claridad
COMMENT ON COLUMN gastos.is_caja_chica IS 'Indica si el gasto fue realizado utilizando el fondo de caja chica';
