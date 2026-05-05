-- ============================================
-- MIGRACIÓN 006: USUARIO COMPARTIDO ÚNICO Y RLS EN SUPABASE
-- ============================================

-- Usuario compartido que debe ser el único autenticado en la aplicación
-- UUID: 453d371b-38ad-4438-9060-68b52b27675a

-- Activar RLS si no está activo
ALTER TABLE policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas antiguas de usuario individual y multiusuario
DROP POLICY IF EXISTS usuarios_ven_sus_policies ON policies;
DROP POLICY IF EXISTS usuarios_insertan_sus_policies ON policies;
DROP POLICY IF EXISTS usuarios_actualizan_sus_policies ON policies;
DROP POLICY IF EXISTS usuarios_eliminan_sus_policies ON policies;
DROP POLICY IF EXISTS single_user_select_policies ON policies;
DROP POLICY IF EXISTS single_user_insert_policies ON policies;
DROP POLICY IF EXISTS single_user_update_policies ON policies;

DROP POLICY IF EXISTS usuarios_ven_sus_companies ON companies;
DROP POLICY IF EXISTS usuarios_insertan_sus_companies ON companies;
DROP POLICY IF EXISTS usuarios_actualizan_sus_companies ON companies;
DROP POLICY IF EXISTS usuarios_eliminan_sus_companies ON companies;
DROP POLICY IF EXISTS single_user_select_companies ON companies;
DROP POLICY IF EXISTS single_user_insert_companies ON companies;
DROP POLICY IF EXISTS single_user_update_companies ON companies;

-- Políticas de acceso para policies
CREATE POLICY single_user_select_policies ON policies
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = '453d371b-38ad-4438-9060-68b52b27675a'::uuid
  );

CREATE POLICY single_user_insert_policies ON policies
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = '453d371b-38ad-4438-9060-68b52b27675a'::uuid
    AND user_id = '453d371b-38ad-4438-9060-68b52b27675a'::uuid
  );

CREATE POLICY single_user_update_policies ON policies
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = '453d371b-38ad-4438-9060-68b52b27675a'::uuid
    AND deleted_at IS NULL
  )
  WITH CHECK (
    auth.uid() = '453d371b-38ad-4438-9060-68b52b27675a'::uuid
    AND user_id = '453d371b-38ad-4438-9060-68b52b27675a'::uuid
  );

-- Políticas de acceso para companies
CREATE POLICY single_user_select_companies ON companies
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = '453d371b-38ad-4438-9060-68b52b27675a'::uuid
  );

CREATE POLICY single_user_insert_companies ON companies
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = '453d371b-38ad-4438-9060-68b52b27675a'::uuid
    AND user_id = '453d371b-38ad-4438-9060-68b52b27675a'::uuid
  );

CREATE POLICY single_user_update_companies ON companies
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = '453d371b-38ad-4438-9060-68b52b27675a'::uuid
    AND deleted_at IS NULL
  )
  WITH CHECK (
    auth.uid() = '453d371b-38ad-4438-9060-68b52b27675a'::uuid
    AND user_id = '453d371b-38ad-4438-9060-68b52b27675a'::uuid
  );

-- Políticas de storage para bucket de logos: solo el usuario compartido puede gestionar archivos
DROP POLICY IF EXISTS usuarios_gestionan_sus_logos ON storage.objects;
CREATE POLICY single_user_manage_company_logos ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'company-logos'
    AND auth.role() = 'authenticated'
    AND auth.uid() = '453d371b-38ad-4438-9060-68b52b27675a'::uuid
    AND (storage.foldername(name))[1] = '453d371b-38ad-4438-9060-68b52b27675a'::text
  )
  WITH CHECK (
    bucket_id = 'company-logos'
    AND auth.role() = 'authenticated'
    AND auth.uid() = '453d371b-38ad-4438-9060-68b52b27675a'::uuid
    AND (storage.foldername(name))[1] = '453d371b-38ad-4438-9060-68b52b27675a'::text
  );

-- Asegurar el DEFAULT auth.uid() en las tablas
ALTER TABLE policies ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE companies ALTER COLUMN user_id SET DEFAULT auth.uid();

-- Revisar qué filas se van a reasignar
-- SELECT * FROM policies WHERE user_id IS NULL OR user_id <> '453d371b-38ad-4438-9060-68b52b27675a'::uuid;
-- SELECT * FROM companies WHERE user_id IS NULL OR user_id <> '453d371b-38ad-4438-9060-68b52b27675a'::uuid;

-- Reasignar datos existentes al usuario compartido
UPDATE policies
SET user_id = '453d371b-38ad-4438-9060-68b52b27675a'::uuid
WHERE user_id IS NULL
   OR user_id <> '453d371b-38ad-4438-9060-68b52b27675a'::uuid;

UPDATE companies
SET user_id = '453d371b-38ad-4438-9060-68b52b27675a'::uuid
WHERE user_id IS NULL
   OR user_id <> '453d371b-38ad-4438-9060-68b52b27675a'::uuid;

-- Establecer NOT NULL después de corregir los valores
ALTER TABLE policies ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE companies ALTER COLUMN user_id SET NOT NULL;
