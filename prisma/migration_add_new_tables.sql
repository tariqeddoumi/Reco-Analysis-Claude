-- ================================================================
-- MIGRATION: Ajout des tables et colonnes manquantes
-- Date: 2026-06-05
-- Appliquer dans: Supabase > SQL Editor > New query
-- ================================================================

-- 1. Nouvelles tables référentiels paramétrable

CREATE TABLE IF NOT EXISTS complexity_levels (
  id          TEXT        NOT NULL PRIMARY KEY,
  code        TEXT        NOT NULL UNIQUE,
  label       TEXT        NOT NULL,
  description TEXT,
  rank        INTEGER,
  "isActive"  BOOLEAN     NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS effort_levels (
  id          TEXT        NOT NULL PRIMARY KEY,
  code        TEXT        NOT NULL UNIQUE,
  label       TEXT        NOT NULL,
  description TEXT,
  rank        INTEGER,
  "isActive"  BOOLEAN     NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS evidence_statuses (
  id          TEXT        NOT NULL PRIMARY KEY,
  code        TEXT        NOT NULL UNIQUE,
  label       TEXT        NOT NULL,
  description TEXT,
  color       TEXT,
  rank        INTEGER,
  "isFinal"   BOOLEAN     NOT NULL DEFAULT false,
  "isActive"  BOOLEAN     NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

-- 2. Colonnes manquantes dans la table actions

ALTER TABLE actions
  ADD COLUMN IF NOT EXISTS "priorityLevelId"   TEXT,
  ADD COLUMN IF NOT EXISTS "complexityLevelId" TEXT,
  ADD COLUMN IF NOT EXISTS "effortLevelId"     TEXT,
  ADD COLUMN IF NOT EXISTS "deletedAt"         TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "deletedBy"         TEXT;

-- 3. Clés étrangères pour les nouvelles colonnes FK

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'actions_priorityLevelId_fkey'
  ) THEN
    ALTER TABLE actions ADD CONSTRAINT "actions_priorityLevelId_fkey"
      FOREIGN KEY ("priorityLevelId") REFERENCES priority_levels(id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'actions_complexityLevelId_fkey'
  ) THEN
    ALTER TABLE actions ADD CONSTRAINT "actions_complexityLevelId_fkey"
      FOREIGN KEY ("complexityLevelId") REFERENCES complexity_levels(id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'actions_effortLevelId_fkey'
  ) THEN
    ALTER TABLE actions ADD CONSTRAINT "actions_effortLevelId_fkey"
      FOREIGN KEY ("effortLevelId") REFERENCES effort_levels(id);
  END IF;
END $$;

-- 4. Données initiales - Complexity Levels

INSERT INTO complexity_levels (id, code, label, description, rank, "isActive", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid()::text, 'SIMPLE',   'Simple',   'Tâche simple sans dépendance', 1, true, NOW(), NOW()),
  (gen_random_uuid()::text, 'MODERATE', 'Modérée',  'Quelques dépendances ou étapes', 2, true, NOW(), NOW()),
  (gen_random_uuid()::text, 'COMPLEX',  'Complexe', 'Nombreuses dépendances techniques ou organisationnelles', 3, true, NOW(), NOW()),
  (gen_random_uuid()::text, 'CRITICAL', 'Critique', 'Impact systémique ou risque élevé', 4, true, NOW(), NOW())
ON CONFLICT (code) DO NOTHING;

-- 5. Données initiales - Effort Levels

INSERT INTO effort_levels (id, code, label, description, rank, "isActive", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid()::text, 'MINIMAL',  'Minimal',  'Moins d''une journée', 1, true, NOW(), NOW()),
  (gen_random_uuid()::text, 'LOW',      'Faible',   '1 à 3 jours', 2, true, NOW(), NOW()),
  (gen_random_uuid()::text, 'MEDIUM',   'Moyen',    '1 à 2 semaines', 3, true, NOW(), NOW()),
  (gen_random_uuid()::text, 'HIGH',     'Élevé',    '2 semaines à 1 mois', 4, true, NOW(), NOW()),
  (gen_random_uuid()::text, 'CRITICAL', 'Majeur',   'Plus d''un mois', 5, true, NOW(), NOW())
ON CONFLICT (code) DO NOTHING;

-- 6. Données initiales - Evidence Statuses

INSERT INTO evidence_statuses (id, code, label, color, rank, "isFinal", "isActive", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid()::text, 'DEPOSITED',           'Déposée',               '#3b82f6', 1, false, true, NOW(), NOW()),
  (gen_random_uuid()::text, 'UNDER_REVIEW',        'En cours de vérification', '#f59e0b', 2, false, true, NOW(), NOW()),
  (gen_random_uuid()::text, 'ACCEPTED',            'Acceptée',              '#22c55e', 3, true,  true, NOW(), NOW()),
  (gen_random_uuid()::text, 'COMPLEMENT_REQUIRED', 'Complément requis',     '#f97316', 4, false, true, NOW(), NOW()),
  (gen_random_uuid()::text, 'REJECTED',            'Rejetée',               '#ef4444', 5, true,  true, NOW(), NOW()),
  (gen_random_uuid()::text, 'ARCHIVED',            'Archivée',              '#94a3b8', 6, true,  true, NOW(), NOW())
ON CONFLICT (code) DO NOTHING;
