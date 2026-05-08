-- ============================================
-- ELIMINAR CONSTRAINT UNIQUE DE policy_id
-- ============================================
-- Permite que dos pólizas activas del mismo usuario
-- puedan tener el mismo policy_id (ej: POL-001).
-- El sistema ya distingue registros por su UUID interno (id).
-- ============================================

-- Eliminar índice único compuesto (user_id, policy_id)
DROP INDEX IF EXISTS idx_policies_user_policy_id;

-- Actualizar comentario de la columna
COMMENT ON COLUMN policies.policy_id IS 'ID visible (ej: POL-001). Puede repetirse entre pólizas.';