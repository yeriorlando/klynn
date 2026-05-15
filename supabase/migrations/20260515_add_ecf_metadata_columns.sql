-- Agregar columnas de metadatos eCF a la tabla ordenes
-- Estas columnas almacenan los datos que devuelve Pronesoft al emitir un comprobante:
--   ecf_qr             → documentStampUrl de Pronesoft (URL del QR de la DGII)
--   ecf_security_code  → securityCode de Pronesoft (código de 6 chars)
--   ecf_signature_date → signatureDate de Pronesoft (fecha de firma digital)

ALTER TABLE ordenes ADD COLUMN IF NOT EXISTS ecf_qr TEXT;
ALTER TABLE ordenes ADD COLUMN IF NOT EXISTS ecf_security_code TEXT;
ALTER TABLE ordenes ADD COLUMN IF NOT EXISTS ecf_signature_date TEXT;

-- Verificar que las columnas se crearon
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'ordenes' 
AND column_name IN ('ecf_qr', 'ecf_security_code', 'ecf_signature_date');
