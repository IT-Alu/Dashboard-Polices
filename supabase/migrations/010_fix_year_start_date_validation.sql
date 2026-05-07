-- ============================================
-- FIX: Eliminar validació restrictiva any vs start_date
-- ============================================
-- El trigger anterior impedia insertar pólizas cuyo
-- año fiscal (columna year) no coincidiera con el
-- EXTRACT(YEAR FROM start_date). Esto era demasiado
-- restrictivo: una póliza puede empezar en diciembre
-- pero pertenecer fiscalmente al año siguiente.
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
  
  -- NOTA: Se ha eliminado la comprobación de que el año
  -- coincida con la fecha de inicio, ya que impedía
  -- importar pólizas donde el año fiscal difiere del
  -- año natural de la fecha de inicio.
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Reaplicar el trigger (usa la función actualizada)
DROP TRIGGER IF EXISTS validate_policy_dates_trigger ON policies;
CREATE TRIGGER validate_policy_dates_trigger
  BEFORE INSERT OR UPDATE ON policies
  FOR EACH ROW
  EXECUTE FUNCTION validate_policy_dates();