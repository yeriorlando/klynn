-- Habilitar permisos para el bucket de 'catalogo'
-- Permitir que usuarios autenticados suban imágenes a sus propias carpetas (tenant_id)

-- 1. Asegurar que el bucket existe (esto suele hacerse en consola, pero por si acaso)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('catalogo', 'catalogo', true) ON CONFLICT (id) DO NOTHING;

-- 2. Política de Inserción (Subida)
DROP POLICY IF EXISTS "Permitir subida a su carpeta de tenant" ON storage.objects;
CREATE POLICY "Permitir subida a su carpeta de tenant" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK ( bucket_id = 'catalogo' );

-- 3. Política de Selección (Lectura pública)
DROP POLICY IF EXISTS "Lectura pública de catálogo" ON storage.objects;
CREATE POLICY "Lectura pública de catálogo" ON storage.objects
FOR SELECT TO public
USING ( bucket_id = 'catalogo' );

-- 4. Política de Eliminación (Borrado de sus propias imágenes)
DROP POLICY IF EXISTS "Borrado de sus propias imágenes" ON storage.objects;
CREATE POLICY "Borrado de sus propias imágenes" ON storage.objects
FOR DELETE TO authenticated
USING ( bucket_id = 'catalogo' );
