-- Migration: Add NCF alerts columns to ecf_sequences and ensure tenants.config JSONB exists
-- Created: 2026-05-18

-- 1. Asegurar que la tabla public.tenants tenga la columna 'config' de tipo JSONB para almacenar 'alerta_ncf_telefono'
ALTER TABLE public.tenants 
  ADD COLUMN IF NOT EXISTS config JSONB NOT NULL DEFAULT '{}'::jsonb;

-- 2. Agregar columnas de alertas a la tabla de secuencias public.ecf_sequences
ALTER TABLE public.ecf_sequences 
  ADD COLUMN IF NOT EXISTS recibir_alertas BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS alerta_limite INTEGER NOT NULL DEFAULT 50;

-- 3. Actualizar registros existentes con valores por defecto consistentes
UPDATE public.ecf_sequences 
SET 
  recibir_alertas = COALESCE(recibir_alertas, FALSE),
  alerta_limite = COALESCE(alerta_limite, 50);

-- 4. Verificar la creación de las nuevas columnas
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'ecf_sequences' 
AND column_name IN ('recibir_alertas', 'alerta_limite');
