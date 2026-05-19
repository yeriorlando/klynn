-- ====================================================================
-- MIGRACIÓN SEGURA: Tablas e-CF con manejo de conflictos
-- Ejecutar en Supabase SQL Editor
-- ====================================================================

-- 1. TABLA: ecf_config
CREATE TABLE IF NOT EXISTS public.ecf_config (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    rnc_emisor TEXT NOT NULL,
    razon_social TEXT NOT NULL,
    nombre_comercial TEXT,
    certificate_data TEXT,
    certificate_password TEXT,
    certificate_expiry TEXT,
    ambiente TEXT NOT NULL DEFAULT 'pruebas',
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    api_auth_token TEXT,
    api_token_expires_at TEXT,
    pronesoft_tenant_id TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. TABLA: ecf_sequences
CREATE TABLE IF NOT EXISTS public.ecf_sequences (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    tipo_ecf TEXT NOT NULL,
    prefijo TEXT NOT NULL,
    valor_inicial INTEGER NOT NULL DEFAULT 1,
    valor_final INTEGER NOT NULL DEFAULT 100,
    valor_actual INTEGER NOT NULL DEFAULT 0,
    expiration_date TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    recibir_alertas BOOLEAN NOT NULL DEFAULT FALSE,
    alerta_limite INTEGER NOT NULL DEFAULT 50
);

-- 3. TABLA: ecf_documents
CREATE TABLE IF NOT EXISTS public.ecf_documents (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    order_id TEXT,
    encf TEXT NOT NULL,
    tipo_ecf TEXT NOT NULL,
    rnc_receptor TEXT,
    track_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    dgii_response JSONB,
    xml_content TEXT,
    signature_value TEXT,
    signature_date TEXT,
    qr_content TEXT,
    monto_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    monto_itbis NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    fecha_emision TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. TABLA: ecf_documentos_recibidos
CREATE TABLE IF NOT EXISTS public.ecf_documentos_recibidos (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    pronesoft_id TEXT,
    encf TEXT NOT NULL,
    rnc_emisor TEXT NOT NULL,
    nombre_emisor TEXT,
    tipo_ecf TEXT NOT NULL,
    fecha_emision TEXT NOT NULL,
    monto_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    monto_itbis NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    estado_comercial TEXT NOT NULL DEFAULT 'PENDIENTE',
    pdf_url TEXT,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Agregar columnas que puedan faltar (seguro si ya existen)
ALTER TABLE public.ecf_config ADD COLUMN IF NOT EXISTS pronesoft_tenant_id TEXT;
ALTER TABLE public.ecf_sequences ADD COLUMN IF NOT EXISTS expiration_date TEXT;
ALTER TABLE public.ecf_sequences ADD COLUMN IF NOT EXISTS recibir_alertas BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.ecf_sequences ADD COLUMN IF NOT EXISTS alerta_limite INTEGER NOT NULL DEFAULT 50;

-- 6. Índices
CREATE INDEX IF NOT EXISTS idx_ecf_config_tenant ON public.ecf_config(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ecf_sequences_tenant ON public.ecf_sequences(tenant_id, tipo_ecf, is_active);
CREATE INDEX IF NOT EXISTS idx_ecf_documents_tenant ON public.ecf_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ecf_recibidos_tenant ON public.ecf_documentos_recibidos(tenant_id);

-- 7. RLS
ALTER TABLE public.ecf_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ecf_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ecf_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ecf_documentos_recibidos ENABLE ROW LEVEL SECURITY;

-- 8. Eliminar políticas antiguas si existen (evitar conflicto)
DROP POLICY IF EXISTS "ecf_config_tenant_access" ON public.ecf_config;
DROP POLICY IF EXISTS "ecf_sequences_tenant_access" ON public.ecf_sequences;
DROP POLICY IF EXISTS "ecf_documents_tenant_access" ON public.ecf_documents;
DROP POLICY IF EXISTS "ecf_recibidos_tenant_access" ON public.ecf_documentos_recibidos;

-- 9. Recrear políticas limpias
CREATE POLICY "ecf_config_tenant_access" ON public.ecf_config
    FOR ALL USING (tenant_id IN (
        SELECT tenant_id FROM public.empleados WHERE id = auth.uid()
    ));

CREATE POLICY "ecf_sequences_tenant_access" ON public.ecf_sequences
    FOR ALL USING (tenant_id IN (
        SELECT tenant_id FROM public.empleados WHERE id = auth.uid()
    ));

CREATE POLICY "ecf_documents_tenant_access" ON public.ecf_documents
    FOR ALL USING (tenant_id IN (
        SELECT tenant_id FROM public.empleados WHERE id = auth.uid()
    ));

CREATE POLICY "ecf_recibidos_tenant_access" ON public.ecf_documentos_recibidos
    FOR ALL USING (tenant_id IN (
        SELECT tenant_id FROM public.empleados WHERE id = auth.uid()
    ));

-- 10. REFRESCAR CACHE DE POSTGREST (esto es CLAVE para que desaparezca el error)
NOTIFY pgrst, 'reload schema';
