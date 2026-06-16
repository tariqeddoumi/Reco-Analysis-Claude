-- Migration: add evidence:update and evidence:delete permissions
-- Run this once against the production database

INSERT INTO permissions (id, code, label, module, action, "createdAt", "updatedAt")
VALUES
  (gen_random_uuid()::text, 'evidence:update', 'Modifier une preuve', 'evidences', 'update', NOW(), NOW()),
  (gen_random_uuid()::text, 'evidence:delete', 'Supprimer une preuve', 'evidences', 'delete', NOW(), NOW())
ON CONFLICT (code) DO NOTHING;

-- Assign to ADMIN_SYSTEM and ADMIN_METIER
INSERT INTO role_permissions (id, "roleId", "permissionId", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  r.id,
  p.id,
  NOW(),
  NOW()
FROM roles r
CROSS JOIN permissions p
WHERE r.code IN ('ADMIN_SYSTEM', 'ADMIN_METIER')
  AND p.code IN ('evidence:update', 'evidence:delete')
ON CONFLICT DO NOTHING;

-- Assign evidence:update to RESPONSABLE_ACTION
INSERT INTO role_permissions (id, "roleId", "permissionId", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  r.id,
  p.id,
  NOW(),
  NOW()
FROM roles r
CROSS JOIN permissions p
WHERE r.code = 'RESPONSABLE_ACTION'
  AND p.code = 'evidence:update'
ON CONFLICT DO NOTHING;
