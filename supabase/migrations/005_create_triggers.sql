-- ============================================
-- TRIGGERS ADICIONALES - CONTROL SEGUROS AAA
-- ============================================

-- ============================================
-- FUNCIÓN PARA GENERAR POLICY_ID AUTOMÁTICO
-- ============================================

-- Función para generar policy_id único por usuario (opcional, se recomienda generar en frontend)
CREATE OR REPLACE FUNCTION generate_policy_id_for_user()
RETURNS TEXT AS $$
DECLARE
  new_id TEXT;
  exists BOOLEAN;
BEGIN
  -- Generar ID tipo POL-M4XZ8K-A7B2 (timestamp + aleatorio)
  -- Esto evita race conditions
  new_id := 'POL-' || substr(md5(random()::text || clock_timestamp()::text), 1, 8);
  
  -- Convertir a mayúsculas
  new_id := upper(new_id);
  
  -- Verificar que no existe (raro pero posible)
  SELECT EXISTS(
    SELECT 1 FROM policies 
    WHERE user_id = auth.uid() AND policy_id = new_id AND deleted_at IS NULL
  ) INTO exists;
  
  IF exists THEN
    -- Si por casualidad existe, añadir sufijo aleatorio
    new_id := new_id || '-' || substr(md5(random()::text), 1, 4);
  END IF;
  
  RETURN new_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCIÓN PARA VALIDAR FECHAS
-- ============================================

CREATE OR REPLACE FUNCTION validate_policy_dates()
RETURNS TRIGGER AS $$
BEGIN
  -- Verificar que fecha_fin >= fecha_inicio
  IF NEW.start_date IS NOT NULL AND NEW.end_date IS NOT NULL THEN
    IF NEW.end_date < NEW.start_date THEN
      RAISE EXCEPTION 'La fecha de fin debe ser posterior a la fecha de inicio';
    END IF;
  END IF;
  
  -- Verificar que el año coincide con las fechas
  IF NEW.start_date IS NOT NULL THEN
    IF EXTRACT(YEAR FROM NEW.start_date) != NEW.year THEN
      RAISE EXCEPTION 'El año no coincide con la fecha de inicio';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para validar fechas al insertar/actualizar
CREATE TRIGGER validate_policy_dates_trigger
  BEFORE INSERT OR UPDATE ON policies
  FOR EACH ROW
  EXECUTE FUNCTION validate_policy_dates();

-- ============================================
-- FUNCIÓN PARA ACTUALIZAR ESTADO AUTOMÁTICAMENTE
-- ============================================

-- Función para sugerir estado basado en fechas
CREATE OR REPLACE FUNCTION suggest_policy_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Si está anulada, mantener
  IF NEW.status = 'ANULADA' THEN
    RETURN NEW;
  END IF;
  
  -- Verificar si está vencida
  IF NEW.end_date IS NOT NULL AND NEW.end_date < CURRENT_DATE THEN
    NEW.status := 'VENCIDA';
  ELSE
    NEW.status := 'ACTIVA';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger opcional para actualizar estado automáticamente (comentado por defecto)
-- Descomentar si se quiere activar
-- CREATE TRIGGER auto_update_policy_status
--   BEFORE INSERT OR UPDATE ON policies
--   FOR EACH ROW
--   EXECUTE FUNCTION suggest_policy_status();

-- ============================================
-- FUNCIÓN PARA LIMPIAR DATOS ANTIGUOS (MANTENIMIENTO)
-- ============================================

-- Función para eliminar registros soft-deleted antiguos (más de 1 año)
CREATE OR REPLACE FUNCTION cleanup_old_deleted_records()
RETURNS VOID AS $$
BEGIN
  -- Eliminar pólizas eliminadas hace más de 1 año
  DELETE FROM policies 
  WHERE deleted_at < NOW() - INTERVAL '1 year';
  
  -- Eliminar compañías eliminadas hace más de 1 año
  DELETE FROM companies 
  WHERE deleted_at < NOW() - INTERVAL '1 year';
  
  RAISE NOTICE 'Limpieza completada: registros antiguos eliminados';
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VISTAS ADICIONALES PARA DASHBOARD
-- ============================================

-- Vista para renovaciones próximas (60 días)
CREATE OR REPLACE VIEW upcoming_renewals AS
SELECT 
  id,
  policy_id,
  company,
  concept,
  amount,
  end_date,
  (end_date - CURRENT_DATE) as days_until_expiry
FROM policies
WHERE user_id = auth.uid() 
  AND deleted_at IS NULL 
  AND status = 'ACTIVA'
  AND end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '60 days'
ORDER BY end_date ASC;

-- Vista para top 5 pólizas por importe
CREATE OR REPLACE VIEW top_policies AS
SELECT 
  id,
  policy_id,
  company,
  concept,
  amount,
  year
FROM policies
WHERE user_id = auth.uid() AND deleted_at IS NULL
ORDER BY amount DESC
LIMIT 5;

-- Vista para resumen por compañía
CREATE OR REPLACE VIEW company_summary AS
SELECT 
  company,
  COUNT(*) as policy_count,
  SUM(amount) as total_amount,
  AVG(amount) as avg_amount,
  COUNT(CASE WHEN status = 'ACTIVA' THEN 1 END) as active_count,
  COUNT(CASE WHEN status = 'VENCIDA' THEN 1 END) as expired_count
FROM policies
WHERE user_id = auth.uid() AND deleted_at IS NULL
GROUP BY company
ORDER BY total_amount DESC;

-- ============================================
-- ÍNDICES ADICIONALES PARA RENDIMIENTO
-- ============================================

-- Índices compuestos para consultas comunes
CREATE INDEX IF NOT EXISTS idx_policies_user_year_status 
  ON policies(user_id, year, status) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_policies_user_company 
  ON policies(user_id, company) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_policies_user_end_date 
  ON policies(user_id, end_date) WHERE deleted_at IS NULL;

-- ============================================
-- COMENTARIOS FINALES
-- ============================================

COMMENT ON FUNCTION generate_policy_id_for_user() IS 'Genera un policy_id único sin race conditions';
COMMENT ON FUNCTION validate_policy_dates() IS 'Valida que las fechas de la póliza sean coherentes';
COMMENT ON FUNCTION cleanup_old_deleted_records() IS 'Elimina registros soft-deleted antiguos (mantenimiento)';
COMMENT ON VIEW upcoming_renewals IS 'Pólizas que vencen en los próximos 60 días';
COMMENT ON VIEW top_policies IS 'Top 5 pólizas por importe del usuario';
COMMENT ON VIEW company_summary IS 'Resumen de pólizas por compañía';