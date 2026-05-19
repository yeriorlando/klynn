-- Migración: Agrega columnas de servicio a domicilio a la tabla ordenes
-- Fecha: 2026-05-19
-- Descripción: Permite registrar si una orden tiene envío a domicilio y su costo.

ALTER TABLE ordenes
  ADD COLUMN IF NOT EXISTS entrega_domicilio BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS costo_envio       NUMERIC(12, 2) DEFAULT NULL;

COMMENT ON COLUMN ordenes.entrega_domicilio IS 'Indica si la orden requiere entrega a domicilio';
COMMENT ON COLUMN ordenes.costo_envio       IS 'Costo del servicio de entrega a domicilio (no gravable por ITBIS)';
