-- ============================================
-- TABLA DE PÓLIZAS - CONTROL SEGUROS AAA
-- ============================================

-- Tabla principal de pólizas con soft delete
CREATE TABLE IF NOT EXISTS policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relación con usuario (automático con RLS)
  user_id UUID DEFAULT auth.uid(),
  
  -- Datos de la póliza
  policy_id TEXT NOT NULL,              -- POL-M4XZ8K-A7B2 (generado en frontend)
  accounting_account TEXT,              -- Cuenta contable
  company TEXT NOT NULL,                -- Nombre compañía
  broker TEXT,                          -- Mediador
  concept TEXT NOT NULL,                -- Concepto/seguro
  policy_number TEXT,                   -- Nº póliza
  start_date DATE,                      -- Fecha inicio
  end_date DATE,                        -- Fecha fin
  payment_frequency TEXT,               -- ANUAL, TRIMESTRAL, BIMESTRAL, MENSUAL
  amount DECIMAL(12,2) NOT NULL,        -- Importe en euros
  year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  status TEXT NOT NULL DEFAULT 'ACTIVA' CHECK (status IN ('ACTIVA', 'VENCIDA', 'ANULADA')),
  notes TEXT,                           -- Notas adicionales
  
  -- Logo de la compañía (ruta relativa)
  company_logo_path TEXT,               -- user_id/company/logo.png
  
  -- Soft delete
  deleted_at TIMESTAMPTZ,               -- NULL = activo
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_policies_user_id ON policies(user_id);
CREATE INDEX IF NOT EXISTS idx_policies_year ON policies(year);
CREATE INDEX IF NOT EXISTS idx_policies_company ON policies(company);
CREATE INDEX IF NOT EXISTS idx_policies_status ON policies(status);
CREATE INDEX IF NOT EXISTS idx_policies_end_date ON policies(end_date);
CREATE INDEX IF NOT EXISTS idx_policies_deleted_at ON policies(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_policies_created_at ON policies(created_at);

-- Índice único: un usuario no puede tener dos pólizas con mismo policy_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_policies_user_policy_id 
  ON policies(user_id, policy_id) WHERE deleted_at IS NULL;

-- Comentario
COMMENT ON TABLE policies IS 'Pólizas de seguros por usuario con soft delete';
COMMENT ON COLUMN policies.policy_id IS 'ID único visible (ej: POL-M4XZ8K-A7B2)';
COMMENT ON COLUMN policies.deleted_at IS 'Fecha de borrado lógico (NULL = activo)';

-- Trigger para updated_at automático
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_policies_updated_at
  BEFORE UPDATE ON policies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();