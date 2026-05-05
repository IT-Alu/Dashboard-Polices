-- ============================================
-- ACTIVAR RLS
-- ============================================

ALTER TABLE policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLÍTICAS PARA POLICIES (CON SOFT DELETE)
-- ============================================

-- SELECT: cada usuario solo ve sus pólizas activas
DROP POLICY IF EXISTS usuarios_ven_sus_policies ON policies;
CREATE POLICY usuarios_ven_sus_policies ON policies
  FOR SELECT
  USING (
    auth.uid() = user_id 
    AND deleted_at IS NULL
  );

-- INSERT: cada usuario puede crear sus pólizas
DROP POLICY IF EXISTS usuarios_insertan_sus_policies ON policies;
CREATE POLICY usuarios_insertan_sus_policies ON policies
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE NORMAL: NO permite cambiar deleted_at
DROP POLICY IF EXISTS usuarios_actualizan_sus_policies ON policies;
CREATE POLICY usuarios_actualizan_sus_policies ON policies
  FOR UPDATE
  USING (
    auth.uid() = user_id 
    AND deleted_at IS NULL
  )
  WITH CHECK (
    auth.uid() = user_id
    AND deleted_at IS NULL
  );

-- SOFT DELETE: permite actualizar deleted_at a un valor NO NULL
DROP POLICY IF EXISTS usuarios_eliminan_sus_policies ON policies;
CREATE POLICY usuarios_eliminan_sus_policies ON policies
  FOR UPDATE
  USING (
    auth.uid() = user_id 
    AND deleted_at IS NULL
  )
  WITH CHECK (
    auth.uid() = user_id
    AND deleted_at IS NOT NULL
  );

-- ============================================
-- POLÍTICAS PARA COMPANIES (CON SOFT DELETE)
-- ============================================

-- SELECT
DROP POLICY IF EXISTS usuarios_ven_sus_companies ON companies;
CREATE POLICY usuarios_ven_sus_companies ON companies
  FOR SELECT
  USING (
    auth.uid() = user_id 
    AND deleted_at IS NULL
  );

-- INSERT
DROP POLICY IF EXISTS usuarios_insertan_sus_companies ON companies;
CREATE POLICY usuarios_insertan_sus_companies ON companies
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE NORMAL
DROP POLICY IF EXISTS usuarios_actualizan_sus_companies ON companies;
CREATE POLICY usuarios_actualizan_sus_companies ON companies
  FOR UPDATE
  USING (
    auth.uid() = user_id 
    AND deleted_at IS NULL
  )
  WITH CHECK (
    auth.uid() = user_id
    AND deleted_at IS NULL
  );

-- SOFT DELETE
DROP POLICY IF EXISTS usuarios_eliminan_sus_companies ON companies;
CREATE POLICY usuarios_eliminan_sus_companies ON companies
  FOR UPDATE
  USING (
    auth.uid() = user_id 
    AND deleted_at IS NULL
  )
  WITH CHECK (
    auth.uid() = user_id 
    AND deleted_at IS NOT NULL
  );

-- ============================================
-- FUNCIÓN PARA OBTENER EL USER_ID
-- ============================================

CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID AS $$
BEGIN
  RETURN auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- VISTA PARA MÉTRICAS DEL USUARIO
-- ============================================

CREATE OR REPLACE VIEW user_policies_summary AS
SELECT 
  COUNT(*) as total_policies,
  COUNT(CASE WHEN status = 'ACTIVA' THEN 1 END) as active_policies,
  COUNT(CASE WHEN status = 'VENCIDA' THEN 1 END) as expired_policies,
  COUNT(CASE WHEN status = 'ANULADA' THEN 1 END) as cancelled_policies,
  SUM(CASE WHEN status = 'ACTIVA' THEN amount ELSE 0 END) as total_amount,
  COUNT(DISTINCT company) as total_companies
FROM policies
WHERE user_id = auth.uid() AND deleted_at IS NULL;
