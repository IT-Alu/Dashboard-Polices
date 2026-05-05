-- ============================================
-- MIGRACIÓN 009: CORREGIR UUID DE USUARIO ÚNICO EN RLS Y STORAGE
-- ============================================

-- UUID correcto del usuario autenticado real
-- 274b8cc4-b06c-4766-b639-e81b38a635fd

ALTER TABLE policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas anteriores de un solo usuario / antiguo UUID
DROP POLICY IF EXISTS single_user_select_policies ON policies;
DROP POLICY IF EXISTS single_user_insert_policies ON policies;
DROP POLICY IF EXISTS single_user_update_policies ON policies;
DROP POLICY IF EXISTS single_user_select_companies ON companies;
DROP POLICY IF EXISTS single_user_insert_companies ON companies;
DROP POLICY IF EXISTS single_user_update_companies ON companies;
DROP POLICY IF EXISTS usuarios_ven_sus_policies ON policies;
DROP POLICY IF EXISTS usuarios_insertan_sus_policies ON policies;
DROP POLICY IF EXISTS usuarios_actualizan_sus_policies ON policies;
DROP POLICY IF EXISTS usuarios_eliminan_sus_policies ON policies;
DROP POLICY IF EXISTS usuarios_ven_sus_companies ON companies;
DROP POLICY IF EXISTS usuarios_insertan_sus_companies ON companies;
DROP POLICY IF EXISTS usuarios_actualizan_sus_companies ON companies;
DROP POLICY IF EXISTS usuarios_eliminan_sus_companies ON companies;

DROP POLICY IF EXISTS usuarios_gestionan_sus_logos ON storage.objects;
DROP POLICY IF EXISTS single_user_manage_company_logos ON storage.objects;

-- Políticas de acceso para policies
CREATE POLICY single_user_select_policies ON policies
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = '274b8cc4-b06c-4766-b639-e81b38a635fd'::uuid
  );

CREATE POLICY single_user_insert_policies ON policies
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = '274b8cc4-b06c-4766-b639-e81b38a635fd'::uuid
    AND user_id = '274b8cc4-b06c-4766-b639-e81b38a635fd'::uuid
  );

CREATE POLICY single_user_update_policies ON policies
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = '274b8cc4-b06c-4766-b639-e81b38a635fd'::uuid
    AND deleted_at IS NULL
  )
  WITH CHECK (
    auth.uid() = '274b8cc4-b06c-4766-b639-e81b38a635fd'::uuid
    AND user_id = '274b8cc4-b06c-4766-b639-e81b38a635fd'::uuid
  );

-- Políticas de acceso para companies
CREATE POLICY single_user_select_companies ON companies
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = '274b8cc4-b06c-4766-b639-e81b38a635fd'::uuid
  );

CREATE POLICY single_user_insert_companies ON companies
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = '274b8cc4-b06c-4766-b639-e81b38a635fd'::uuid
    AND user_id = '274b8cc4-b06c-4766-b639-e81b38a635fd'::uuid
  );

CREATE POLICY single_user_update_companies ON companies
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = '274b8cc4-b06c-4766-b639-e81b38a635fd'::uuid
    AND deleted_at IS NULL
  )
  WITH CHECK (
    auth.uid() = '274b8cc4-b06c-4766-b639-e81b38a635fd'::uuid
    AND user_id = '274b8cc4-b06c-4766-b639-e81b38a635fd'::uuid
  );

-- Política de Storage para bucket company-logos
CREATE POLICY single_user_manage_company_logos ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'company-logos'
    AND auth.role() = 'authenticated'
    AND auth.uid() = '274b8cc4-b06c-4766-b639-e81b38a635fd'::uuid
    AND (storage.foldername(name))[1] = '274b8cc4-b06c-4766-b639-e81b38a635fd'::text
  )
  WITH CHECK (
    bucket_id = 'company-logos'
    AND auth.role() = 'authenticated'
    AND auth.uid() = '274b8cc4-b06c-4766-b639-e81b38a635fd'::uuid
    AND (storage.foldername(name))[1] = '274b8cc4-b06c-4766-b639-e81b38a635fd'::text
  );

-- Reasignar user_id existentes al UUID correcto sin borrar datos
UPDATE policies
SET user_id = '274b8cc4-b06c-4766-b639-e81b38a635fd'::uuid
WHERE user_id IS NULL
   OR user_id <> '274b8cc4-b06c-4766-b639-e81b38a635fd'::uuid;

UPDATE companies
SET user_id = '274b8cc4-b06c-4766-b639-e81b38a635fd'::uuid
WHERE user_id IS NULL
   OR user_id <> '274b8cc4-b06c-4766-b639-e81b38a635fd'::uuid;
