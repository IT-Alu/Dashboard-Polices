-- ============================================
-- TABLA DE COMPAÑÍAS - CONTROL SEGUROS AAA
-- ============================================

-- Tabla de compañías (para logos y metadata)
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relación con usuario
  user_id UUID DEFAULT auth.uid(),
  
  -- Datos de la compañía
  name TEXT NOT NULL,                   -- Nombre compañía
  logo_url TEXT,                        -- URL en Storage
  logo_mime_type TEXT,                  -- image/png, image/jpeg
  logo_file_name TEXT,                  -- Nombre original del archivo
  
  -- Soft delete
  deleted_at TIMESTAMPTZ,               -- NULL = activo
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_companies_user_id ON companies(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_user_name 
  ON companies(user_id, name) WHERE deleted_at IS NULL;

-- Comentario
COMMENT ON TABLE companies IS 'Compañías de seguros con logos por usuario';

-- Trigger para updated_at automático
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();