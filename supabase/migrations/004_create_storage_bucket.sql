-- ============================================
-- STORAGE PRIVADO PARA LOGOS - CONTROL SEGUROS AAA
-- ============================================

-- Crear bucket PRIVADO para logos de compañías
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-logos', 'company-logos', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- ============================================
-- POLÍTICAS DE STORAGE
-- ============================================

-- Política: usuarios autenticados pueden gestionar SUS archivos
-- El path será: user_id/company_name/logo.png
DROP POLICY IF EXISTS usuarios_gestionan_sus_logos ON storage.objects;
CREATE POLICY usuarios_gestionan_sus_logos
ON storage.objects FOR ALL
USING (
  bucket_id = 'company-logos' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'company-logos' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================
-- FUNCIÓN PARA LIMPIAR STORAGE AL ELIMINAR COMPAÑÍA
-- ============================================

-- Función para eliminar logo del storage cuando se elimina una compañía
CREATE OR REPLACE FUNCTION delete_company_logo()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.logo_url IS NOT NULL THEN
    -- Extraer el path relativo de la URL
    -- La URL es como: https://xxxxx.supabase.co/storage/v1/object/public/company-logos/user_id/company/logo.png
    -- Necesitamos extraer: user_id/company/logo.png
    DECLARE
      logo_path TEXT;
    BEGIN
      -- Extraer path después de '/object/'
      logo_path := substring(OLD.logo_url from '/object/[^/]+/(.*)$');
      
      IF logo_path IS NOT NULL THEN
        -- Eliminar archivo del storage
        DELETE FROM storage.objects
        WHERE bucket_id = 'company-logos'
        AND name = logo_path;
      END IF;
    END;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger para eliminar logo cuando se elimina compañía (soft delete)
CREATE TRIGGER cleanup_company_logo_on_delete
  AFTER UPDATE ON companies
  FOR EACH ROW
  WHEN (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL)
  EXECUTE FUNCTION delete_company_logo();

-- ============================================
-- NOTAS IMPORTANTES
-- ============================================

-- 1. Las URLs se generan firmadas desde el frontend (createSignedUrl)
-- 2. El path será: user_id/company_name/logo.png
-- 3. Ejemplo: 550e8400-e29b-41d4-a716-446655440000/allianz/logo.png
-- 4. Las URLs firmadas expiran en 1 hora por defecto
-- 5. El bucket es privado para mayor seguridad