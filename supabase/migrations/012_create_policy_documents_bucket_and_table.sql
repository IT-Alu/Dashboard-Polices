-- ============================================
-- STORAGE PRIVADO Y TABLA PARA DOCUMENTS PDF
-- ============================================

-- Crear bucket PRIVADO para PDFs de pólizas
INSERT INTO storage.buckets (id, name, public)
VALUES ('policy-documents', 'policy-documents', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Políticas de storage para que cada usuario gestione solo sus PDFs
DROP POLICY IF EXISTS usuarios_gestionan_sus_pdfs ON storage.objects;
CREATE POLICY usuarios_gestionan_sus_pdfs
ON storage.objects FOR ALL
USING (
  bucket_id = 'policy-documents'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'policy-documents'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================
-- Tabla de metadatos de PDFs
-- ============================================

CREATE TABLE IF NOT EXISTS policy_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID DEFAULT auth.uid(),
  year INTEGER NOT NULL,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_policy_documents_user_id ON policy_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_policy_documents_year ON policy_documents(year);
CREATE UNIQUE INDEX IF NOT EXISTS idx_policy_documents_user_path
  ON policy_documents(user_id, storage_path);

ALTER TABLE policy_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS usuarios_ven_sus_policy_documents ON policy_documents;
CREATE POLICY usuarios_ven_sus_policy_documents ON policy_documents
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS usuarios_insertan_sus_policy_documents ON policy_documents;
CREATE POLICY usuarios_insertan_sus_policy_documents ON policy_documents
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS usuarios_actualizan_sus_policy_documents ON policy_documents;
CREATE POLICY usuarios_actualizan_sus_policy_documents ON policy_documents
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS usuarios_eliminan_sus_policy_documents ON policy_documents;
CREATE POLICY usuarios_eliminan_sus_policy_documents ON policy_documents
  FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON TABLE policy_documents IS 'Metadatos de PDFs de pólizas por usuario';
COMMENT ON COLUMN policy_documents.storage_path IS 'Ruta relativa dentro del bucket policy-documents';
COMMENT ON COLUMN policy_documents.file_name IS 'Nombre del archivo original del PDF';
COMMENT ON COLUMN policy_documents.file_size IS 'Tamaño del archivo en bytes';
