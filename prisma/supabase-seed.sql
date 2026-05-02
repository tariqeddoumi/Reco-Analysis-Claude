-- ==============================================================
-- SCRIPT D'INITIALISATION SUPABASE - RECO ANALYSIS
-- ==============================================================
-- Coller et exécuter dans : Supabase > SQL Editor > New query
--
-- COMPTES DE TEST :
--   admin@banque.ma         / Admin@2026!    (Administrateur Système)
--   auditeur@banque.ma      / Audit@2026!    (Émetteur)
--   validateur@banque.ma    / Valid@2026!    (Validateur)
--   responsable@banque.ma   / Resp@2026!     (Responsable Entité)
--   management@banque.ma    / Mgmt@2026!     (Management)
-- ==============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ==============================================================
-- PARTIE 1 — DDL : CRÉATION DES TABLES
-- ==============================================================

CREATE TABLE IF NOT EXISTS confidentiality_levels (
  id          TEXT        NOT NULL PRIMARY KEY,
  code        TEXT        NOT NULL UNIQUE,
  label       TEXT        NOT NULL,
  description TEXT,
  rank        INTEGER     NOT NULL DEFAULT 0,
  color       TEXT,
  "isActive"  BOOLEAN     NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS mission_types (
  id          TEXT        NOT NULL PRIMARY KEY,
  code        TEXT        NOT NULL UNIQUE,
  label       TEXT        NOT NULL,
  description TEXT,
  "isActive"  BOOLEAN     NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS mission_statuses (
  id          TEXT        NOT NULL PRIMARY KEY,
  code        TEXT        NOT NULL UNIQUE,
  label       TEXT        NOT NULL,
  description TEXT,
  rank        INTEGER     NOT NULL DEFAULT 0,
  color       TEXT,
  "isFinal"   BOOLEAN     NOT NULL DEFAULT false,
  "isActive"  BOOLEAN     NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS source_types (
  id                   TEXT             NOT NULL PRIMARY KEY,
  code                 TEXT             NOT NULL UNIQUE,
  label                TEXT             NOT NULL,
  description          TEXT,
  "sourceCoefficient"  DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  "isRegulator"        BOOLEAN          NOT NULL DEFAULT false,
  "requiresProof"      BOOLEAN          NOT NULL DEFAULT true,
  "isActive"           BOOLEAN          NOT NULL DEFAULT true,
  "createdAt"          TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"          TIMESTAMP(3)     NOT NULL
);

CREATE TABLE IF NOT EXISTS risk_types (
  id          TEXT        NOT NULL PRIMARY KEY,
  code        TEXT        NOT NULL UNIQUE,
  label       TEXT        NOT NULL,
  description TEXT,
  category    TEXT,
  "isActive"  BOOLEAN     NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS severity_levels (
  id            TEXT        NOT NULL PRIMARY KEY,
  code          TEXT        NOT NULL UNIQUE,
  label         TEXT        NOT NULL,
  description   TEXT,
  "numericValue" INTEGER    NOT NULL,
  color         TEXT,
  "isActive"    BOOLEAN     NOT NULL DEFAULT true,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS probability_levels (
  id            TEXT        NOT NULL PRIMARY KEY,
  code          TEXT        NOT NULL UNIQUE,
  label         TEXT        NOT NULL,
  description   TEXT,
  "numericValue" INTEGER    NOT NULL,
  color         TEXT,
  "isActive"    BOOLEAN     NOT NULL DEFAULT true,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS priority_levels (
  id            TEXT        NOT NULL PRIMARY KEY,
  code          TEXT        NOT NULL UNIQUE,
  label         TEXT        NOT NULL,
  description   TEXT,
  "scoreMin"    INTEGER     NOT NULL,
  "scoreMax"    INTEGER     NOT NULL,
  color         TEXT,
  "badgeVariant" TEXT,
  "isActive"    BOOLEAN     NOT NULL DEFAULT true,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS recommendation_statuses (
  id          TEXT        NOT NULL PRIMARY KEY,
  code        TEXT        NOT NULL UNIQUE,
  label       TEXT        NOT NULL,
  description TEXT,
  rank        INTEGER     NOT NULL DEFAULT 0,
  color       TEXT,
  "isFinal"   BOOLEAN     NOT NULL DEFAULT false,
  "isOpen"    BOOLEAN     NOT NULL DEFAULT true,
  "isActive"  BOOLEAN     NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS action_statuses (
  id          TEXT        NOT NULL PRIMARY KEY,
  code        TEXT        NOT NULL UNIQUE,
  label       TEXT        NOT NULL,
  description TEXT,
  rank        INTEGER     NOT NULL DEFAULT 0,
  color       TEXT,
  "isFinal"   BOOLEAN     NOT NULL DEFAULT false,
  "isActive"  BOOLEAN     NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS evidence_types (
  id            TEXT        NOT NULL PRIMARY KEY,
  code          TEXT        NOT NULL UNIQUE,
  label         TEXT        NOT NULL,
  description   TEXT,
  "allowedMime" TEXT[]      NOT NULL DEFAULT '{}',
  "isActive"    BOOLEAN     NOT NULL DEFAULT true,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS recommendation_types (
  id          TEXT        NOT NULL PRIMARY KEY,
  code        TEXT        NOT NULL UNIQUE,
  label       TEXT        NOT NULL,
  description TEXT,
  category    TEXT,
  "isActive"  BOOLEAN     NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS root_cause_types (
  id          TEXT        NOT NULL PRIMARY KEY,
  code        TEXT        NOT NULL UNIQUE,
  label       TEXT        NOT NULL,
  description TEXT,
  category    TEXT,
  "isActive"  BOOLEAN     NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS escalation_rules (
  id               TEXT        NOT NULL PRIMARY KEY,
  code             TEXT        NOT NULL UNIQUE,
  label            TEXT        NOT NULL,
  description      TEXT,
  "daysBeforeDue"  INTEGER     NOT NULL,
  "escalationLevel" INTEGER    NOT NULL DEFAULT 1,
  "notifyRoles"    TEXT[]      NOT NULL DEFAULT '{}',
  "isActive"       BOOLEAN     NOT NULL DEFAULT true,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS workflow_steps (
  id                  TEXT        NOT NULL PRIMARY KEY,
  code                TEXT        NOT NULL UNIQUE,
  label               TEXT        NOT NULL,
  description         TEXT,
  "entityType"        TEXT        NOT NULL,
  "fromStatus"        TEXT        NOT NULL,
  "toStatus"          TEXT        NOT NULL,
  "requiredRoles"     TEXT[]      NOT NULL DEFAULT '{}',
  "requiresProof"     BOOLEAN     NOT NULL DEFAULT false,
  "requiresComment"   BOOLEAN     NOT NULL DEFAULT false,
  "requiresHierarchy" BOOLEAN     NOT NULL DEFAULT false,
  rank                INTEGER     NOT NULL DEFAULT 0,
  "isActive"          BOOLEAN     NOT NULL DEFAULT true,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS parameter_settings (
  id          TEXT        NOT NULL PRIMARY KEY,
  category    TEXT        NOT NULL,
  key         TEXT        NOT NULL,
  value       TEXT        NOT NULL,
  label       TEXT,
  description TEXT,
  "dataType"  TEXT        NOT NULL DEFAULT 'string',
  "isEditable" BOOLEAN    NOT NULL DEFAULT true,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "updatedBy" TEXT,
  UNIQUE(category, key)
);

CREATE TABLE IF NOT EXISTS entities (
  id          TEXT        NOT NULL PRIMARY KEY,
  code        TEXT        NOT NULL UNIQUE,
  label       TEXT        NOT NULL,
  description TEXT,
  "parentId"  TEXT,
  type        TEXT,
  "isActive"  BOOLEAN     NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  FOREIGN KEY ("parentId") REFERENCES entities(id)
);

CREATE TABLE IF NOT EXISTS directions (
  id        TEXT    NOT NULL PRIMARY KEY,
  code      TEXT    NOT NULL UNIQUE,
  label     TEXT    NOT NULL,
  "entityId" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS processes (
  id        TEXT    NOT NULL PRIMARY KEY,
  code      TEXT    NOT NULL UNIQUE,
  label     TEXT    NOT NULL,
  category  TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS roles (
  id          TEXT        NOT NULL PRIMARY KEY,
  code        TEXT        NOT NULL UNIQUE,
  label       TEXT        NOT NULL,
  description TEXT,
  "isSystem"  BOOLEAN     NOT NULL DEFAULT false,
  "isActive"  BOOLEAN     NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS permissions (
  id          TEXT        NOT NULL PRIMARY KEY,
  code        TEXT        NOT NULL UNIQUE,
  label       TEXT        NOT NULL,
  description TEXT,
  module      TEXT        NOT NULL,
  action      TEXT        NOT NULL,
  "isActive"  BOOLEAN     NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS role_permissions (
  "roleId"       TEXT        NOT NULL,
  "permissionId" TEXT        NOT NULL,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("roleId", "permissionId"),
  FOREIGN KEY ("roleId")       REFERENCES roles(id)       ON DELETE CASCADE,
  FOREIGN KEY ("permissionId") REFERENCES permissions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS users (
  id            TEXT        NOT NULL PRIMARY KEY,
  "supabaseId"  TEXT        UNIQUE,
  email         TEXT        NOT NULL UNIQUE,
  "firstName"   TEXT        NOT NULL,
  "lastName"    TEXT        NOT NULL,
  phone         TEXT,
  title         TEXT,
  "isActive"    BOOLEAN     NOT NULL DEFAULT true,
  "lastLoginAt" TIMESTAMP(3),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS user_roles (
  "userId"    TEXT        NOT NULL,
  "roleId"    TEXT        NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("userId", "roleId"),
  FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY ("roleId") REFERENCES roles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_entities (
  "userId"    TEXT        NOT NULL,
  "entityId"  TEXT        NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("userId", "entityId"),
  FOREIGN KEY ("userId")   REFERENCES users(id)    ON DELETE CASCADE,
  FOREIGN KEY ("entityId") REFERENCES entities(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS missions (
  id                     TEXT        NOT NULL PRIMARY KEY,
  reference              TEXT        NOT NULL UNIQUE,
  title                  TEXT        NOT NULL,
  description            TEXT,
  "missionTypeId"        TEXT        NOT NULL,
  "sourceId"             TEXT        NOT NULL,
  "issuingAuthority"     TEXT,
  "entityId"             TEXT        NOT NULL,
  scope                  TEXT,
  "periodCovered"        TEXT,
  "startDate"            TIMESTAMP(3),
  "endDate"              TIMESTAMP(3),
  "reportReceivedAt"     TIMESTAMP(3),
  "reportValidatedAt"    TIMESTAMP(3),
  "responsibleId"        TEXT        NOT NULL,
  "confidentialityLevelId" TEXT      NOT NULL,
  "statusId"             TEXT        NOT NULL,
  observations           TEXT,
  "isDeleted"            BOOLEAN     NOT NULL DEFAULT false,
  "deletedAt"            TIMESTAMP(3),
  "deletedBy"            TEXT,
  "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"            TIMESTAMP(3) NOT NULL,
  "createdBy"            TEXT,
  FOREIGN KEY ("missionTypeId")        REFERENCES mission_types(id),
  FOREIGN KEY ("sourceId")             REFERENCES source_types(id),
  FOREIGN KEY ("entityId")             REFERENCES entities(id),
  FOREIGN KEY ("responsibleId")        REFERENCES users(id),
  FOREIGN KEY ("confidentialityLevelId") REFERENCES confidentiality_levels(id),
  FOREIGN KEY ("statusId")             REFERENCES mission_statuses(id)
);

CREATE TABLE IF NOT EXISTS recommendations (
  id                       TEXT             NOT NULL PRIMARY KEY,
  code                     TEXT             NOT NULL UNIQUE,
  "missionId"              TEXT             NOT NULL,
  "sourceId"               TEXT             NOT NULL,
  "reportReference"        TEXT,
  "pageReference"          TEXT,
  "issuedAt"               TIMESTAMP(3)     NOT NULL,
  "entityId"               TEXT             NOT NULL,
  "directionId"            TEXT,
  "processId"              TEXT,
  "riskTypeId"             TEXT,
  "recommendationTypeId"   TEXT,
  "rootCauseTypeId"        TEXT,
  "findingDescription"     TEXT             NOT NULL,
  "rootCause"              TEXT,
  "potentialConsequence"   TEXT,
  recommendation           TEXT             NOT NULL,
  "severityId"             TEXT,
  "probabilityId"          TEXT,
  "rawCriticality"         DOUBLE PRECISION,
  "finalCriticality"       DOUBLE PRECISION,
  "regulatorCoefficient"   DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  "recurrenceCoefficient"  DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  "delayCoefficient"       DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  "priorityId"             TEXT,
  "ownerId"                TEXT,
  "operationalResponsibleId" TEXT,
  "initialDueDate"         TIMESTAMP(3),
  "revisedDueDate"         TIMESTAMP(3),
  "closedAt"               TIMESTAMP(3),
  "statusId"               TEXT             NOT NULL,
  "progressRate"           INTEGER          NOT NULL DEFAULT 0,
  "entityComment"          TEXT,
  "controllerComment"      TEXT,
  "isRegulator"            BOOLEAN          NOT NULL DEFAULT false,
  "isRecurrent"            BOOLEAN          NOT NULL DEFAULT false,
  "financialImpact"        DOUBLE PRECISION,
  "regulatoryImpact"       INTEGER,
  "reputationalImpact"     INTEGER,
  "operationalImpact"      INTEGER,
  "clientImpact"           INTEGER,
  "siImpact"               INTEGER,
  "legalImpact"            INTEGER,
  "complianceImpact"       INTEGER,
  "confidentialityLevelId" TEXT,
  "isDeleted"              BOOLEAN          NOT NULL DEFAULT false,
  "deletedAt"              TIMESTAMP(3),
  "deletedBy"              TEXT,
  "createdAt"              TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"              TIMESTAMP(3)     NOT NULL,
  "createdBy"              TEXT,
  FOREIGN KEY ("missionId")            REFERENCES missions(id),
  FOREIGN KEY ("sourceId")             REFERENCES source_types(id),
  FOREIGN KEY ("entityId")             REFERENCES entities(id),
  FOREIGN KEY ("directionId")          REFERENCES directions(id),
  FOREIGN KEY ("processId")            REFERENCES processes(id),
  FOREIGN KEY ("riskTypeId")           REFERENCES risk_types(id),
  FOREIGN KEY ("recommendationTypeId") REFERENCES recommendation_types(id),
  FOREIGN KEY ("rootCauseTypeId")      REFERENCES root_cause_types(id),
  FOREIGN KEY ("severityId")           REFERENCES severity_levels(id),
  FOREIGN KEY ("probabilityId")        REFERENCES probability_levels(id),
  FOREIGN KEY ("priorityId")           REFERENCES priority_levels(id),
  FOREIGN KEY ("ownerId")              REFERENCES users(id),
  FOREIGN KEY ("operationalResponsibleId") REFERENCES users(id),
  FOREIGN KEY ("statusId")             REFERENCES recommendation_statuses(id),
  FOREIGN KEY ("confidentialityLevelId") REFERENCES confidentiality_levels(id)
);

CREATE TABLE IF NOT EXISTS action_plans (
  id               TEXT        NOT NULL PRIMARY KEY,
  "recommendationId" TEXT      NOT NULL,
  title            TEXT        NOT NULL,
  description      TEXT,
  "statusCode"     TEXT        NOT NULL DEFAULT 'DRAFT',
  "validatedAt"    TIMESTAMP(3),
  "validatedBy"    TEXT,
  "progressRate"   INTEGER     NOT NULL DEFAULT 0,
  "isDeleted"      BOOLEAN     NOT NULL DEFAULT false,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,
  "createdBy"      TEXT,
  FOREIGN KEY ("recommendationId") REFERENCES recommendations(id)
);

CREATE TABLE IF NOT EXISTS actions (
  id              TEXT        NOT NULL PRIMARY KEY,
  "actionPlanId"  TEXT        NOT NULL,
  title           TEXT        NOT NULL,
  description     TEXT,
  "responsibleId" TEXT,
  "statusId"      TEXT        NOT NULL,
  priority        INTEGER     NOT NULL DEFAULT 2,
  "progressRate"  INTEGER     NOT NULL DEFAULT 0,
  weight          INTEGER     NOT NULL DEFAULT 100,
  "estimatedEffort" TEXT,
  complexity      TEXT,
  "plannedStartAt" TIMESTAMP(3),
  "plannedEndAt"  TIMESTAMP(3),
  "actualEndAt"   TIMESTAMP(3),
  deliverable     TEXT,
  "expectedProof" TEXT,
  "blockReason"   TEXT,
  comment         TEXT,
  "isDeleted"     BOOLEAN     NOT NULL DEFAULT false,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL,
  "createdBy"     TEXT,
  FOREIGN KEY ("actionPlanId")  REFERENCES action_plans(id),
  FOREIGN KEY ("responsibleId") REFERENCES users(id),
  FOREIGN KEY ("statusId")      REFERENCES action_statuses(id)
);

CREATE TABLE IF NOT EXISTS evidences (
  id               TEXT        NOT NULL PRIMARY KEY,
  "recommendationId" TEXT,
  "actionId"       TEXT,
  "evidenceTypeId" TEXT,
  title            TEXT        NOT NULL,
  description      TEXT,
  "fileName"       TEXT,
  "fileUrl"        TEXT,
  "fileSize"       INTEGER,
  "mimeType"       TEXT,
  "fileHash"       TEXT,
  version          INTEGER     NOT NULL DEFAULT 1,
  "depositorId"    TEXT        NOT NULL,
  "depositedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "statusCode"     TEXT        NOT NULL DEFAULT 'DEPOSITED',
  "validatorComment" TEXT,
  "validatedAt"    TIMESTAMP(3),
  "validatedBy"    TEXT,
  "isDeleted"      BOOLEAN     NOT NULL DEFAULT false,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,
  FOREIGN KEY ("recommendationId") REFERENCES recommendations(id),
  FOREIGN KEY ("actionId")         REFERENCES actions(id),
  FOREIGN KEY ("evidenceTypeId")   REFERENCES evidence_types(id),
  FOREIGN KEY ("depositorId")      REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS comments (
  id               TEXT        NOT NULL PRIMARY KEY,
  "recommendationId" TEXT,
  "actionId"       TEXT,
  "authorId"       TEXT        NOT NULL,
  content          TEXT        NOT NULL,
  "isInternal"     BOOLEAN     NOT NULL DEFAULT false,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,
  FOREIGN KEY ("recommendationId") REFERENCES recommendations(id),
  FOREIGN KEY ("actionId")         REFERENCES actions(id),
  FOREIGN KEY ("authorId")         REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS attachments (
  id               TEXT        NOT NULL PRIMARY KEY,
  "missionId"      TEXT,
  "recommendationId" TEXT,
  "actionId"       TEXT,
  "deadlineExtId"  TEXT,
  title            TEXT        NOT NULL,
  description      TEXT,
  "fileName"       TEXT        NOT NULL,
  "fileUrl"        TEXT        NOT NULL,
  "fileSize"       INTEGER,
  "mimeType"       TEXT,
  "uploaderId"     TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("missionId")        REFERENCES missions(id),
  FOREIGN KEY ("recommendationId") REFERENCES recommendations(id),
  FOREIGN KEY ("actionId")         REFERENCES actions(id)
);

CREATE TABLE IF NOT EXISTS status_history (
  id                  TEXT        NOT NULL PRIMARY KEY,
  "entityType"        TEXT        NOT NULL,
  "entityId"          TEXT        NOT NULL,
  "recommendationId"  TEXT,
  "actionId"          TEXT,
  "fromStatusRecoId"  TEXT,
  "toStatusRecoId"    TEXT,
  "fromStatusActionId" TEXT,
  "toStatusActionId"  TEXT,
  "changedById"       TEXT        NOT NULL,
  comment             TEXT,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("recommendationId")  REFERENCES recommendations(id),
  FOREIGN KEY ("actionId")          REFERENCES actions(id),
  FOREIGN KEY ("fromStatusRecoId")  REFERENCES recommendation_statuses(id),
  FOREIGN KEY ("toStatusRecoId")    REFERENCES recommendation_statuses(id),
  FOREIGN KEY ("fromStatusActionId") REFERENCES action_statuses(id),
  FOREIGN KEY ("toStatusActionId")  REFERENCES action_statuses(id),
  FOREIGN KEY ("changedById")       REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS deadline_extensions (
  id               TEXT        NOT NULL PRIMARY KEY,
  "recommendationId" TEXT,
  "actionId"       TEXT,
  "currentDueDate" TIMESTAMP(3) NOT NULL,
  "requestedDueDate" TIMESTAMP(3) NOT NULL,
  reason           TEXT        NOT NULL,
  justification    TEXT,
  impact           TEXT,
  "requesterId"    TEXT        NOT NULL,
  "requestedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "statusCode"     TEXT        NOT NULL DEFAULT 'DRAFT',
  "validatorId"    TEXT,
  "validatedAt"    TIMESTAMP(3),
  "rejectionReason" TEXT,
  "isDeleted"      BOOLEAN     NOT NULL DEFAULT false,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,
  FOREIGN KEY ("recommendationId") REFERENCES recommendations(id),
  FOREIGN KEY ("actionId")         REFERENCES actions(id),
  FOREIGN KEY ("requesterId")      REFERENCES users(id),
  FOREIGN KEY ("validatorId")      REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id               TEXT        NOT NULL PRIMARY KEY,
  "userId"         TEXT        NOT NULL,
  "recommendationId" TEXT,
  type             TEXT        NOT NULL,
  title            TEXT        NOT NULL,
  message          TEXT        NOT NULL,
  "isRead"         BOOLEAN     NOT NULL DEFAULT false,
  "readAt"         TIMESTAMP(3),
  data             JSONB,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("userId")           REFERENCES users(id),
  FOREIGN KEY ("recommendationId") REFERENCES recommendations(id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id               TEXT        NOT NULL PRIMARY KEY,
  "userId"         TEXT,
  "missionId"      TEXT,
  "recommendationId" TEXT,
  "actionId"       TEXT,
  "evidenceId"     TEXT,
  "entityType"     TEXT        NOT NULL,
  "entityId"       TEXT        NOT NULL,
  action           TEXT        NOT NULL,
  module           TEXT        NOT NULL,
  "oldValues"      JSONB,
  "newValues"      JSONB,
  "ipAddress"      TEXT,
  "userAgent"      TEXT,
  comment          TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("userId")           REFERENCES users(id),
  FOREIGN KEY ("missionId")        REFERENCES missions(id),
  FOREIGN KEY ("recommendationId") REFERENCES recommendations(id),
  FOREIGN KEY ("actionId")         REFERENCES actions(id),
  FOREIGN KEY ("evidenceId")       REFERENCES evidences(id)
);

CREATE TABLE IF NOT EXISTS report_templates (
  id          TEXT        NOT NULL PRIMARY KEY,
  code        TEXT        NOT NULL UNIQUE,
  label       TEXT        NOT NULL,
  description TEXT,
  type        TEXT        NOT NULL,
  format      TEXT        NOT NULL,
  template    JSONB,
  "isActive"  BOOLEAN     NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);


-- ==============================================================
-- PARTIE 2 — UTILISATEURS SUPABASE AUTH
-- ==============================================================

DO $$
DECLARE
  uid_admin       uuid := '00000000-0000-0000-0000-000000000001';
  uid_auditeur    uuid := '00000000-0000-0000-0000-000000000002';
  uid_validateur  uuid := '00000000-0000-0000-0000-000000000003';
  uid_responsable uuid := '00000000-0000-0000-0000-000000000004';
  uid_management  uuid := '00000000-0000-0000-0000-000000000005';
BEGIN

  DELETE FROM auth.identities WHERE user_id IN (uid_admin, uid_auditeur, uid_validateur, uid_responsable, uid_management);
  DELETE FROM auth.users      WHERE id       IN (uid_admin, uid_auditeur, uid_validateur, uid_responsable, uid_management);

  -- Admin
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token)
  VALUES ('00000000-0000-0000-0000-000000000000', uid_admin, 'authenticated', 'authenticated', 'admin@banque.ma',
    crypt('Admin@2026!', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW(), '', '');
  INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (uid_admin::text, uid_admin, json_build_object('sub', uid_admin::text, 'email', 'admin@banque.ma'), 'email', NOW(), NOW(), NOW());

  -- Auditeur
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token)
  VALUES ('00000000-0000-0000-0000-000000000000', uid_auditeur, 'authenticated', 'authenticated', 'auditeur@banque.ma',
    crypt('Audit@2026!', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW(), '', '');
  INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (uid_auditeur::text, uid_auditeur, json_build_object('sub', uid_auditeur::text, 'email', 'auditeur@banque.ma'), 'email', NOW(), NOW(), NOW());

  -- Validateur
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token)
  VALUES ('00000000-0000-0000-0000-000000000000', uid_validateur, 'authenticated', 'authenticated', 'validateur@banque.ma',
    crypt('Valid@2026!', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW(), '', '');
  INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (uid_validateur::text, uid_validateur, json_build_object('sub', uid_validateur::text, 'email', 'validateur@banque.ma'), 'email', NOW(), NOW(), NOW());

  -- Responsable
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token)
  VALUES ('00000000-0000-0000-0000-000000000000', uid_responsable, 'authenticated', 'authenticated', 'responsable@banque.ma',
    crypt('Resp@2026!', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW(), '', '');
  INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (uid_responsable::text, uid_responsable, json_build_object('sub', uid_responsable::text, 'email', 'responsable@banque.ma'), 'email', NOW(), NOW(), NOW());

  -- Management
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token)
  VALUES ('00000000-0000-0000-0000-000000000000', uid_management, 'authenticated', 'authenticated', 'management@banque.ma',
    crypt('Mgmt@2026!', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW(), '', '');
  INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (uid_management::text, uid_management, json_build_object('sub', uid_management::text, 'email', 'management@banque.ma'), 'email', NOW(), NOW(), NOW());

END $$;


-- ==============================================================
-- PARTIE 3 — RÉFÉRENTIELS
-- ==============================================================

INSERT INTO confidentiality_levels (id, code, label, rank, color, "isActive", "createdAt", "updatedAt") VALUES
  (gen_random_uuid(), 'STANDARD',         'Standard',          1, '#64748b', true, NOW(), NOW()),
  (gen_random_uuid(), 'SENSITIVE',         'Sensible',          2, '#f59e0b', true, NOW(), NOW()),
  (gen_random_uuid(), 'CONFIDENTIAL',      'Confidentiel',      3, '#ef4444', true, NOW(), NOW()),
  (gen_random_uuid(), 'VERY_CONFIDENTIAL', 'Très Confidentiel', 4, '#7c3aed', true, NOW(), NOW()),
  (gen_random_uuid(), 'REGULATOR',         'Régulateur',        5, '#dc2626', true, NOW(), NOW()),
  (gen_random_uuid(), 'EXEC_COMMITTEE',    'Comité Exécutif',   6, '#1e293b', true, NOW(), NOW())
ON CONFLICT (code) DO NOTHING;

INSERT INTO mission_types (id, code, label, "isActive", "createdAt", "updatedAt") VALUES
  (gen_random_uuid(),'AUDIT_LEGAL',         'Audit Légal',         true,NOW(),NOW()),
  (gen_random_uuid(),'MISSION_CAC',         'Mission CAC',         true,NOW(),NOW()),
  (gen_random_uuid(),'INSPECTION_GENERALE', 'Inspection Générale', true,NOW(),NOW()),
  (gen_random_uuid(),'MISSION_REGULATEUR',  'Mission Régulateur',  true,NOW(),NOW()),
  (gen_random_uuid(),'CONTROLE_PERMANENT',  'Contrôle Permanent',  true,NOW(),NOW()),
  (gen_random_uuid(),'AUDIT_INTERNE',       'Audit Interne',       true,NOW(),NOW()),
  (gen_random_uuid(),'REVUE_THEMATIQUE',    'Revue Thématique',    true,NOW(),NOW()),
  (gen_random_uuid(),'MISSION_CONFORMITE',  'Mission Conformité',  true,NOW(),NOW()),
  (gen_random_uuid(),'MISSION_RISQUES',     'Mission Risques',     true,NOW(),NOW()),
  (gen_random_uuid(),'CONTROLE_SUR_PIECES', 'Contrôle sur Pièces', true,NOW(),NOW()),
  (gen_random_uuid(),'CONTROLE_SUR_PLACE',  'Contrôle sur Place',  true,NOW(),NOW()),
  (gen_random_uuid(),'REVUE_POST_INCIDENT', 'Revue Post-Incident', true,NOW(),NOW()),
  (gen_random_uuid(),'REVUE_REGLEMENTAIRE', 'Revue Réglementaire', true,NOW(),NOW())
ON CONFLICT (code) DO NOTHING;

INSERT INTO mission_statuses (id, code, label, rank, color, "isFinal", "isActive", "createdAt", "updatedAt") VALUES
  (gen_random_uuid(),'DRAFT',                    'Brouillon',                   1, '#94a3b8',false,true,NOW(),NOW()),
  (gen_random_uuid(),'PLANNED',                  'Planifiée',                   2, '#3b82f6',false,true,NOW(),NOW()),
  (gen_random_uuid(),'IN_PROGRESS',              'En cours',                    3, '#f59e0b',false,true,NOW(),NOW()),
  (gen_random_uuid(),'REPORT_RECEIVED',          'Rapport reçu',                4, '#8b5cf6',false,true,NOW(),NOW()),
  (gen_random_uuid(),'RECOMMENDATIONS_ENTERED',  'Recommandations saisies',     5, '#6366f1',false,true,NOW(),NOW()),
  (gen_random_uuid(),'ACTION_PLANS_IN_PROGRESS', 'Plans d''action en cours',    6, '#0ea5e9',false,true,NOW(),NOW()),
  (gen_random_uuid(),'PARTIALLY_CLOSED',         'Partiellement clôturée',      7, '#14b8a6',false,true,NOW(),NOW()),
  (gen_random_uuid(),'CLOSED',                   'Clôturée',                    8, '#22c55e',true, true,NOW(),NOW()),
  (gen_random_uuid(),'ARCHIVED',                 'Archivée',                    9, '#64748b',true, true,NOW(),NOW()),
  (gen_random_uuid(),'CANCELLED',                'Annulée',                    10, '#ef4444',true, true,NOW(),NOW())
ON CONFLICT (code) DO NOTHING;

INSERT INTO source_types (id, code, label, "sourceCoefficient", "isRegulator", "requiresProof", "isActive", "createdAt", "updatedAt") VALUES
  (gen_random_uuid(),'CAC',                    'CAC',                     1.2,false,true,true,NOW(),NOW()),
  (gen_random_uuid(),'INSPECTION_GENERALE',    'Inspection Générale',     1.3,false,true,true,NOW(),NOW()),
  (gen_random_uuid(),'AUDIT_INTERNE',          'Audit Interne',           1.1,false,true,true,NOW(),NOW()),
  (gen_random_uuid(),'CONTROLE_PERMANENT',     'Contrôle Permanent',      1.0,false,true,true,NOW(),NOW()),
  (gen_random_uuid(),'REGULATEUR',             'Régulateur',              1.5,true, true,true,NOW(),NOW()),
  (gen_random_uuid(),'BAM',                    'BAM',                     1.5,true, true,true,NOW(),NOW()),
  (gen_random_uuid(),'AMMC',                   'AMMC',                    1.5,true, true,true,NOW(),NOW()),
  (gen_random_uuid(),'ACAPS',                  'ACAPS',                   1.5,true, true,true,NOW(),NOW()),
  (gen_random_uuid(),'COUR_COMPTES',           'Cour des Comptes',        1.4,true, true,true,NOW(),NOW()),
  (gen_random_uuid(),'CONFORMITE',             'Conformité',              1.1,false,true,true,NOW(),NOW()),
  (gen_random_uuid(),'RISQUES',                'Risques',                 1.1,false,true,true,NOW(),NOW()),
  (gen_random_uuid(),'SECURITE_SI',            'Sécurité SI',             1.1,false,true,true,NOW(),NOW()),
  (gen_random_uuid(),'DATA_PROTECTION',        'Data Protection',         1.1,false,true,true,NOW(),NOW()),
  (gen_random_uuid(),'CONTROLE_INTERNE_GROUPE','Contrôle Interne Groupe', 1.2,false,true,true,NOW(),NOW()),
  (gen_random_uuid(),'AUTRE',                  'Autre Source',            1.0,false,true,true,NOW(),NOW())
ON CONFLICT (code) DO NOTHING;

INSERT INTO risk_types (id, code, label, category, "isActive", "createdAt", "updatedAt") VALUES
  (gen_random_uuid(),'ORGANISATIONAL',   'Organisationnel',             'Gouvernance',  true,NOW(),NOW()),
  (gen_random_uuid(),'PROCEDURAL',       'Procédural',                  'Opérationnel', true,NOW(),NOW()),
  (gen_random_uuid(),'REGULATORY',       'Réglementaire',               'Conformité',   true,NOW(),NOW()),
  (gen_random_uuid(),'ACCOUNTING',       'Comptable',                   'Financier',    true,NOW(),NOW()),
  (gen_random_uuid(),'FINANCIAL',        'Financier',                   'Financier',    true,NOW(),NOW()),
  (gen_random_uuid(),'CREDIT_RISK',      'Risque Crédit',               'Crédit',       true,NOW(),NOW()),
  (gen_random_uuid(),'OPERATIONAL_RISK', 'Risque Opérationnel',         'Opérationnel', true,NOW(),NOW()),
  (gen_random_uuid(),'MARKET_RISK',      'Risque Marché',               'Marché',       true,NOW(),NOW()),
  (gen_random_uuid(),'LIQUIDITY_RISK',   'Risque Liquidité',            'Financier',    true,NOW(),NOW()),
  (gen_random_uuid(),'COMPLIANCE_RISK',  'Risque Conformité',           'Conformité',   true,NOW(),NOW()),
  (gen_random_uuid(),'LEGAL_RISK',       'Risque Juridique',            'Juridique',    true,NOW(),NOW()),
  (gen_random_uuid(),'IT_RISK',          'Risque SI',                   'SI',           true,NOW(),NOW()),
  (gen_random_uuid(),'CYBER_RISK',       'Risque Cybersécurité',        'SI',           true,NOW(),NOW()),
  (gen_random_uuid(),'BCP_RISK',         'Risque Continuité d''activité','Opérationnel',true,NOW(),NOW()),
  (gen_random_uuid(),'ESG_RISK',         'Risque ESG / Climat',         'ESG',          true,NOW(),NOW()),
  (gen_random_uuid(),'GOVERNANCE',       'Gouvernance',                 'Gouvernance',  true,NOW(),NOW()),
  (gen_random_uuid(),'REPORTING',        'Reporting',                   'Opérationnel', true,NOW(),NOW()),
  (gen_random_uuid(),'DATA_QUALITY',     'Qualité des données',         'SI',           true,NOW(),NOW()),
  (gen_random_uuid(),'INTERNAL_CONTROL', 'Contrôle Interne',            'Opérationnel', true,NOW(),NOW()),
  (gen_random_uuid(),'DOCUMENTATION',    'Documentation',               'Opérationnel', true,NOW(),NOW()),
  (gen_random_uuid(),'KYC_AML',          'KYC / AML',                   'Conformité',   true,NOW(),NOW()),
  (gen_random_uuid(),'PHYSICAL_SECURITY','Sécurité Physique',           'Opérationnel', true,NOW(),NOW()),
  (gen_random_uuid(),'HR',               'Ressources Humaines',         'RH',           true,NOW(),NOW()),
  (gen_random_uuid(),'FRAUD',            'Fraude',                      'Opérationnel', true,NOW(),NOW()),
  (gen_random_uuid(),'OTHER',            'Autre',                       'Autre',        true,NOW(),NOW())
ON CONFLICT (code) DO NOTHING;

INSERT INTO severity_levels (id, code, label, "numericValue", color, "isActive", "createdAt", "updatedAt") VALUES
  (gen_random_uuid(),'S1','Faible',      1,'#22c55e',true,NOW(),NOW()),
  (gen_random_uuid(),'S2','Modéré',      2,'#84cc16',true,NOW(),NOW()),
  (gen_random_uuid(),'S3','Significatif',3,'#f59e0b',true,NOW(),NOW()),
  (gen_random_uuid(),'S4','Élevé',       4,'#f97316',true,NOW(),NOW()),
  (gen_random_uuid(),'S5','Critique',    5,'#ef4444',true,NOW(),NOW())
ON CONFLICT (code) DO NOTHING;

INSERT INTO probability_levels (id, code, label, "numericValue", color, "isActive", "createdAt", "updatedAt") VALUES
  (gen_random_uuid(),'P1','Rare',          1,'#22c55e',true,NOW(),NOW()),
  (gen_random_uuid(),'P2','Peu probable',  2,'#84cc16',true,NOW(),NOW()),
  (gen_random_uuid(),'P3','Possible',      3,'#f59e0b',true,NOW(),NOW()),
  (gen_random_uuid(),'P4','Probable',      4,'#f97316',true,NOW(),NOW()),
  (gen_random_uuid(),'P5','Très probable', 5,'#ef4444',true,NOW(),NOW())
ON CONFLICT (code) DO NOTHING;

INSERT INTO priority_levels (id, code, label, "scoreMin", "scoreMax", color, "badgeVariant", "isActive", "createdAt", "updatedAt") VALUES
  (gen_random_uuid(),'LOW',      'Faible',     1, 5,  '#22c55e','success',    true,NOW(),NOW()),
  (gen_random_uuid(),'MEDIUM',   'Moyenne',    6, 10, '#f59e0b','warning',    true,NOW(),NOW()),
  (gen_random_uuid(),'HIGH',     'Élevée',    11, 15, '#f97316','warning',    true,NOW(),NOW()),
  (gen_random_uuid(),'VERY_HIGH','Très élevée',16,20, '#ef4444','destructive',true,NOW(),NOW()),
  (gen_random_uuid(),'CRITICAL', 'Critique',  21, 999,'#7c3aed','critical',   true,NOW(),NOW())
ON CONFLICT (code) DO NOTHING;

INSERT INTO recommendation_statuses (id, code, label, rank, color, "isFinal", "isOpen", "isActive", "createdAt", "updatedAt") VALUES
  (gen_random_uuid(),'DRAFT',               'Brouillon',                 1, '#94a3b8',false,true, true,NOW(),NOW()),
  (gen_random_uuid(),'OPEN',                'Ouverte',                   2, '#3b82f6',false,true, true,NOW(),NOW()),
  (gen_random_uuid(),'ASSIGNED',            'Affectée',                  3, '#6366f1',false,true, true,NOW(),NOW()),
  (gen_random_uuid(),'IN_ANALYSIS',         'En analyse',                4, '#8b5cf6',false,true, true,NOW(),NOW()),
  (gen_random_uuid(),'PLAN_TO_DEFINE',      'Plan d''action à définir',  5, '#f59e0b',false,true, true,NOW(),NOW()),
  (gen_random_uuid(),'PLAN_SUBMITTED',      'Plan d''action soumis',     6, '#0ea5e9',false,true, true,NOW(),NOW()),
  (gen_random_uuid(),'PLAN_VALIDATED',      'Plan d''action validé',     7, '#14b8a6',false,true, true,NOW(),NOW()),
  (gen_random_uuid(),'IN_PROGRESS',         'En cours de traitement',    8, '#22c55e',false,true, true,NOW(),NOW()),
  (gen_random_uuid(),'AWAITING_PROOF',      'En attente de preuve',      9, '#f97316',false,true, true,NOW(),NOW()),
  (gen_random_uuid(),'PROOF_SUBMITTED',     'Preuve soumise',           10, '#0ea5e9',false,true, true,NOW(),NOW()),
  (gen_random_uuid(),'IN_REVIEW',           'En revue',                 11, '#8b5cf6',false,true, true,NOW(),NOW()),
  (gen_random_uuid(),'COMPLEMENT_REQUIRED', 'Complément demandé',       12, '#f59e0b',false,true, true,NOW(),NOW()),
  (gen_random_uuid(),'CLOSURE_PROPOSED',    'Clôture proposée',         13, '#14b8a6',false,true, true,NOW(),NOW()),
  (gen_random_uuid(),'CLOSED',              'Clôturée',                 14, '#22c55e',true, false,true,NOW(),NOW()),
  (gen_random_uuid(),'REJECTED',            'Rejetée',                  15, '#ef4444',false,false,true,NOW(),NOW()),
  (gen_random_uuid(),'SUSPENDED',           'Suspendue',                16, '#94a3b8',false,true, true,NOW(),NOW()),
  (gen_random_uuid(),'EXTENSION_REQUESTED', 'Report demandé',           17, '#f59e0b',false,true, true,NOW(),NOW()),
  (gen_random_uuid(),'EXTENSION_VALIDATED', 'Report validé',            18, '#84cc16',false,true, true,NOW(),NOW()),
  (gen_random_uuid(),'OVERDUE',             'Échue',                    19, '#ef4444',false,true, true,NOW(),NOW()),
  (gen_random_uuid(),'LATE',                'En retard',                20, '#f97316',false,true, true,NOW(),NOW()),
  (gen_random_uuid(),'CRITICAL',            'Critique',                 21, '#7c3aed',false,true, true,NOW(),NOW()),
  (gen_random_uuid(),'ARCHIVED',            'Archivée',                 22, '#64748b',true, false,true,NOW(),NOW())
ON CONFLICT (code) DO NOTHING;

INSERT INTO action_statuses (id, code, label, rank, color, "isFinal", "isActive", "createdAt", "updatedAt") VALUES
  (gen_random_uuid(),'NOT_STARTED',   'Non démarrée', 1, '#94a3b8',false,true,NOW(),NOW()),
  (gen_random_uuid(),'IN_PROGRESS',   'En cours',     2, '#3b82f6',false,true,NOW(),NOW()),
  (gen_random_uuid(),'WAITING',       'En attente',   3, '#f59e0b',false,true,NOW(),NOW()),
  (gen_random_uuid(),'BLOCKED',       'Bloquée',      4, '#ef4444',false,true,NOW(),NOW()),
  (gen_random_uuid(),'COMPLETED',     'Terminée',     5, '#22c55e',false,true,NOW(),NOW()),
  (gen_random_uuid(),'PROOF_SUBMITTED','Preuve déposée',6,'#0ea5e9',false,true,NOW(),NOW()),
  (gen_random_uuid(),'VALIDATED',     'Validée',      7, '#22c55e',true, true,NOW(),NOW()),
  (gen_random_uuid(),'REJECTED',      'Rejetée',      8, '#ef4444',false,true,NOW(),NOW()),
  (gen_random_uuid(),'CANCELLED',     'Annulée',      9, '#64748b',true, true,NOW(),NOW()),
  (gen_random_uuid(),'OVERDUE',       'En retard',   10, '#f97316',false,true,NOW(),NOW())
ON CONFLICT (code) DO NOTHING;

INSERT INTO evidence_types (id, code, label, "allowedMime", "isActive", "createdAt", "updatedAt") VALUES
  (gen_random_uuid(),'PDF',             'Document PDF',             ARRAY['application/pdf'],true,NOW(),NOW()),
  (gen_random_uuid(),'WORD',            'Document Word',            ARRAY['application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'],true,NOW(),NOW()),
  (gen_random_uuid(),'EXCEL',           'Fichier Excel',            ARRAY['application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],true,NOW(),NOW()),
  (gen_random_uuid(),'IMAGE',           'Image',                    ARRAY['image/jpeg','image/png','image/gif'],true,NOW(),NOW()),
  (gen_random_uuid(),'SCREENSHOT',      'Capture d''écran',         ARRAY['image/png','image/jpeg'],true,NOW(),NOW()),
  (gen_random_uuid(),'EMAIL',           'Email',                    ARRAY['message/rfc822','application/pdf'],true,NOW(),NOW()),
  (gen_random_uuid(),'REPORT',          'Rapport',                  ARRAY['application/pdf'],true,NOW(),NOW()),
  (gen_random_uuid(),'PROCEDURE',       'Procédure mise à jour',    ARRAY['application/pdf','application/msword'],true,NOW(),NOW()),
  (gen_random_uuid(),'MEETING_MINUTES', 'PV de Comité',             ARRAY['application/pdf','application/msword'],true,NOW(),NOW()),
  (gen_random_uuid(),'SYSTEM_EXTRACT',  'Extrait Système',          ARRAY['application/pdf','text/csv','application/vnd.ms-excel'],true,NOW(),NOW()),
  (gen_random_uuid(),'ATTESTATION',     'Attestation',              ARRAY['application/pdf'],true,NOW(),NOW()),
  (gen_random_uuid(),'INTERNAL_NOTE',   'Note Interne',             ARRAY['application/pdf','application/msword'],true,NOW(),NOW()),
  (gen_random_uuid(),'CONFIGURATION_PROOF','Preuve de Paramétrage', ARRAY['image/png','application/pdf'],true,NOW(),NOW()),
  (gen_random_uuid(),'ACCOUNTING_PROOF','Preuve Comptable',         ARRAY['application/pdf','application/vnd.ms-excel'],true,NOW(),NOW()),
  (gen_random_uuid(),'REGULATORY_PROOF','Preuve Réglementaire',     ARRAY['application/pdf'],true,NOW(),NOW())
ON CONFLICT (code) DO NOTHING;

INSERT INTO recommendation_types (id, code, label, category, "isActive", "createdAt", "updatedAt") VALUES
  (gen_random_uuid(),'ORGANISATIONAL', 'Organisationnelle',  'Organisation',true,NOW(),NOW()),
  (gen_random_uuid(),'PROCEDURAL',     'Procédurale',        'Processus',   true,NOW(),NOW()),
  (gen_random_uuid(),'REGULATORY',     'Réglementaire',      'Conformité',  true,NOW(),NOW()),
  (gen_random_uuid(),'ACCOUNTING',     'Comptable',          'Finance',     true,NOW(),NOW()),
  (gen_random_uuid(),'FINANCIAL',      'Financière',         'Finance',     true,NOW(),NOW()),
  (gen_random_uuid(),'GOVERNANCE',     'Gouvernance',        'Gouvernance', true,NOW(),NOW()),
  (gen_random_uuid(),'REPORTING',      'Reporting',          'Reporting',   true,NOW(),NOW()),
  (gen_random_uuid(),'DATA_QUALITY',   'Qualité des données','SI',          true,NOW(),NOW()),
  (gen_random_uuid(),'INTERNAL_CONTROL','Contrôle Interne',  'Contrôle',   true,NOW(),NOW()),
  (gen_random_uuid(),'DOCUMENTATION',  'Documentation',      'Processus',   true,NOW(),NOW()),
  (gen_random_uuid(),'KYC_AML',        'KYC / AML',          'Conformité',  true,NOW(),NOW()),
  (gen_random_uuid(),'IT_SECURITY',    'Sécurité SI',        'SI',          true,NOW(),NOW()),
  (gen_random_uuid(),'OTHER',          'Autre',              'Autre',       true,NOW(),NOW())
ON CONFLICT (code) DO NOTHING;

INSERT INTO root_cause_types (id, code, label, "isActive", "createdAt", "updatedAt") VALUES
  (gen_random_uuid(),'MISSING_PROCEDURE',        'Absence de procédure',                 true,NOW(),NOW()),
  (gen_random_uuid(),'OUTDATED_PROCEDURE',        'Procédure non mise à jour',            true,NOW(),NOW()),
  (gen_random_uuid(),'MISSING_CONTROL',           'Absence de contrôle',                  true,NOW(),NOW()),
  (gen_random_uuid(),'INEFFECTIVE_CONTROL',       'Contrôle inefficace',                  true,NOW(),NOW()),
  (gen_random_uuid(),'HUMAN_ERROR',               'Erreur humaine',                       true,NOW(),NOW()),
  (gen_random_uuid(),'IT_DEFICIENCY',             'Insuffisance SI',                      true,NOW(),NOW()),
  (gen_random_uuid(),'GOVERNANCE_DEFICIENCY',     'Défaut de gouvernance',                true,NOW(),NOW()),
  (gen_random_uuid(),'TRAINING_DEFICIENCY',       'Insuffisance de formation',            true,NOW(),NOW()),
  (gen_random_uuid(),'REGULATORY_NON_COMPLIANCE', 'Non-respect réglementaire',            true,NOW(),NOW()),
  (gen_random_uuid(),'MISSING_SEGREGATION',       'Absence de séparation des tâches',     true,NOW(),NOW()),
  (gen_random_uuid(),'DOCUMENTATION_DEFICIENCY',  'Insuffisance documentaire',            true,NOW(),NOW()),
  (gen_random_uuid(),'DATA_QUALITY',              'Qualité des données insuffisante',     true,NOW(),NOW()),
  (gen_random_uuid(),'OPERATIONAL_CHAIN_BREAK',   'Rupture de chaîne opérationnelle',     true,NOW(),NOW()),
  (gen_random_uuid(),'LACK_OF_SUPERVISION',       'Manque de supervision',                true,NOW(),NOW()),
  (gen_random_uuid(),'MISSING_AUTOMATION',        'Absence d''automatisation',            true,NOW(),NOW())
ON CONFLICT (code) DO NOTHING;

INSERT INTO entities (id, code, label, type, "isActive", "createdAt", "updatedAt") VALUES
  (gen_random_uuid(),'DG',            'Direction Générale',                    'DIRECTION',true,NOW(),NOW()),
  (gen_random_uuid(),'DRH',           'Direction des Ressources Humaines',     'DIRECTION',true,NOW(),NOW()),
  (gen_random_uuid(),'DFC',           'Direction Finance & Comptabilité',      'DIRECTION',true,NOW(),NOW()),
  (gen_random_uuid(),'DRI',           'Direction des Risques',                 'DIRECTION',true,NOW(),NOW()),
  (gen_random_uuid(),'DCO',           'Direction Conformité',                  'DIRECTION',true,NOW(),NOW()),
  (gen_random_uuid(),'DSI',           'Direction des Systèmes d''Information', 'DIRECTION',true,NOW(),NOW()),
  (gen_random_uuid(),'DCM',           'Direction Commerciale',                 'DIRECTION',true,NOW(),NOW()),
  (gen_random_uuid(),'DOP',           'Direction des Opérations',              'DIRECTION',true,NOW(),NOW()),
  (gen_random_uuid(),'DAI',           'Direction Audit Interne',               'DIRECTION',true,NOW(),NOW()),
  (gen_random_uuid(),'DCPR',          'Direction Contrôle Permanent',          'DIRECTION',true,NOW(),NOW()),
  (gen_random_uuid(),'AGE_CASABLANCA','Agence Casablanca Centre',              'AGENCE',   true,NOW(),NOW()),
  (gen_random_uuid(),'AGE_RABAT',     'Agence Rabat',                          'AGENCE',   true,NOW(),NOW())
ON CONFLICT (code) DO NOTHING;

INSERT INTO roles (id, code, label, description, "isSystem", "isActive", "createdAt", "updatedAt") VALUES
  (gen_random_uuid(),'ADMIN_SYSTEM',      'Administrateur Système',         'Accès total à l''application',                   true, true,NOW(),NOW()),
  (gen_random_uuid(),'ADMIN_METIER',      'Administrateur Métier',          'Paramétrage des référentiels',                   false,true,NOW(),NOW()),
  (gen_random_uuid(),'EMETTEUR',          'Émetteur de Recommandation',     'CAC, Inspection, Audit, Régulateur',             false,true,NOW(),NOW()),
  (gen_random_uuid(),'RESPONSABLE_ENTITE','Responsable d''Entité',          'Responsable des recommandations de son entité',  false,true,NOW(),NOW()),
  (gen_random_uuid(),'RESPONSABLE_ACTION','Responsable d''Action',          'Responsable de mise en oeuvre des actions',      false,true,NOW(),NOW()),
  (gen_random_uuid(),'VALIDATEUR',        'Validateur / Contrôleur',        'Valide les preuves et clôtures',                 false,true,NOW(),NOW()),
  (gen_random_uuid(),'MANAGEMENT',        'Management',                     'Lecture dashboards et reporting',                false,true,NOW(),NOW()),
  (gen_random_uuid(),'REGULATOR_READ',    'Régulateur (lecture)',            'Lecture seule des recommandations régulateur',   false,true,NOW(),NOW())
ON CONFLICT (code) DO NOTHING;

INSERT INTO permissions (id, code, label, module, action, "isActive", "createdAt", "updatedAt") VALUES
  (gen_random_uuid(),'mission:read',           'Lire les missions',            'missions',      'read',     true,NOW(),NOW()),
  (gen_random_uuid(),'mission:create',         'Créer une mission',            'missions',      'create',   true,NOW(),NOW()),
  (gen_random_uuid(),'mission:update',         'Modifier une mission',         'missions',      'update',   true,NOW(),NOW()),
  (gen_random_uuid(),'mission:delete',         'Supprimer une mission',        'missions',      'delete',   true,NOW(),NOW()),
  (gen_random_uuid(),'mission:close',          'Clôturer une mission',         'missions',      'close',    true,NOW(),NOW()),
  (gen_random_uuid(),'recommendation:read',    'Lire les recommandations',     'recommendations','read',    true,NOW(),NOW()),
  (gen_random_uuid(),'recommendation:create',  'Créer une recommandation',     'recommendations','create',  true,NOW(),NOW()),
  (gen_random_uuid(),'recommendation:update',  'Modifier une recommandation',  'recommendations','update',  true,NOW(),NOW()),
  (gen_random_uuid(),'recommendation:delete',  'Supprimer une recommandation', 'recommendations','delete',  true,NOW(),NOW()),
  (gen_random_uuid(),'recommendation:validate','Valider une recommandation',   'recommendations','validate',true,NOW(),NOW()),
  (gen_random_uuid(),'recommendation:close',   'Clôturer une recommandation',  'recommendations','close',   true,NOW(),NOW()),
  (gen_random_uuid(),'recommendation:reopen',  'Rouvrir une recommandation',   'recommendations','reopen',  true,NOW(),NOW()),
  (gen_random_uuid(),'action_plan:read',       'Lire les plans d''action',     'action_plans',  'read',     true,NOW(),NOW()),
  (gen_random_uuid(),'action_plan:create',     'Créer un plan d''action',      'action_plans',  'create',   true,NOW(),NOW()),
  (gen_random_uuid(),'action_plan:update',     'Modifier un plan d''action',   'action_plans',  'update',   true,NOW(),NOW()),
  (gen_random_uuid(),'action_plan:validate',   'Valider un plan d''action',    'action_plans',  'validate', true,NOW(),NOW()),
  (gen_random_uuid(),'action:read',            'Lire les actions',             'actions',       'read',     true,NOW(),NOW()),
  (gen_random_uuid(),'action:create',          'Créer une action',             'actions',       'create',   true,NOW(),NOW()),
  (gen_random_uuid(),'action:update',          'Modifier une action',          'actions',       'update',   true,NOW(),NOW()),
  (gen_random_uuid(),'action:delete',          'Supprimer une action',         'actions',       'delete',   true,NOW(),NOW()),
  (gen_random_uuid(),'evidence:read',          'Lire les preuves',             'evidences',     'read',     true,NOW(),NOW()),
  (gen_random_uuid(),'evidence:create',        'Déposer une preuve',           'evidences',     'create',   true,NOW(),NOW()),
  (gen_random_uuid(),'evidence:validate',      'Valider une preuve',           'evidences',     'validate', true,NOW(),NOW()),
  (gen_random_uuid(),'evidence:reject',        'Rejeter une preuve',           'evidences',     'reject',   true,NOW(),NOW()),
  (gen_random_uuid(),'report:read',            'Voir les rapports',            'reports',       'read',     true,NOW(),NOW()),
  (gen_random_uuid(),'report:export',          'Exporter les rapports',        'reports',       'export',   true,NOW(),NOW()),
  (gen_random_uuid(),'admin:users',            'Gérer les utilisateurs',       'admin',         'users',    true,NOW(),NOW()),
  (gen_random_uuid(),'admin:roles',            'Gérer les rôles',              'admin',         'roles',    true,NOW(),NOW()),
  (gen_random_uuid(),'admin:parameters',       'Gérer les paramètres',         'admin',         'parameters',true,NOW(),NOW()),
  (gen_random_uuid(),'admin:audit',            'Voir le journal d''audit',     'admin',         'audit',    true,NOW(),NOW()),
  (gen_random_uuid(),'extension:create',       'Demander un report',           'extensions',    'create',   true,NOW(),NOW()),
  (gen_random_uuid(),'extension:validate',     'Valider un report',            'extensions',    'validate', true,NOW(),NOW())
ON CONFLICT (code) DO NOTHING;

-- ADMIN_SYSTEM : toutes les permissions
INSERT INTO role_permissions ("roleId","permissionId","createdAt")
SELECT r.id, p.id, NOW() FROM roles r, permissions p WHERE r.code = 'ADMIN_SYSTEM'
ON CONFLICT DO NOTHING;

-- MANAGEMENT : lecture + export
INSERT INTO role_permissions ("roleId","permissionId","createdAt")
SELECT r.id, p.id, NOW() FROM roles r, permissions p
WHERE r.code='MANAGEMENT' AND p.code IN ('mission:read','recommendation:read','action_plan:read','action:read','evidence:read','report:read','report:export')
ON CONFLICT DO NOTHING;

-- EMETTEUR
INSERT INTO role_permissions ("roleId","permissionId","createdAt")
SELECT r.id, p.id, NOW() FROM roles r, permissions p
WHERE r.code='EMETTEUR' AND p.code IN ('mission:read','mission:create','mission:update','recommendation:read','recommendation:create','recommendation:update','action_plan:read','action:read','evidence:read','report:read','report:export')
ON CONFLICT DO NOTHING;

-- VALIDATEUR
INSERT INTO role_permissions ("roleId","permissionId","createdAt")
SELECT r.id, p.id, NOW() FROM roles r, permissions p
WHERE r.code='VALIDATEUR' AND p.code IN ('mission:read','recommendation:read','recommendation:validate','recommendation:close','action_plan:read','action_plan:validate','action:read','evidence:read','evidence:validate','evidence:reject','report:read','report:export','extension:validate')
ON CONFLICT DO NOTHING;

-- RESPONSABLE_ENTITE
INSERT INTO role_permissions ("roleId","permissionId","createdAt")
SELECT r.id, p.id, NOW() FROM roles r, permissions p
WHERE r.code='RESPONSABLE_ENTITE' AND p.code IN ('mission:read','recommendation:read','recommendation:update','action_plan:read','action_plan:create','action_plan:update','action:read','action:create','action:update','evidence:read','evidence:create','report:read','extension:create')
ON CONFLICT DO NOTHING;

INSERT INTO parameter_settings (id, category, key, value, label, "dataType", "isEditable", "updatedAt") VALUES
  (gen_random_uuid(),'WORKFLOW',     'REQUIRE_PROOF_FOR_CLOSURE',          'true',                  'Preuve obligatoire pour clôture',          'boolean',true,NOW()),
  (gen_random_uuid(),'WORKFLOW',     'REQUIRE_PROOF_FOR_REGULATOR_CLOSURE','true',                  'Preuve obligatoire clôture régulateur',     'boolean',true,NOW()),
  (gen_random_uuid(),'WORKFLOW',     'MAX_EXTENSIONS_BEFORE_CRITICAL',     '3',                     'Nb max de reports avant criticité',         'number', true,NOW()),
  (gen_random_uuid(),'ALERTS',       'OVERDUE_CRITICALITY_MULTIPLIER',     '1.3',                   'Coefficient retard pour criticité',         'number', true,NOW()),
  (gen_random_uuid(),'ALERTS',       'RECURRENCE_CRITICALITY_MULTIPLIER',  '1.2',                   'Coefficient récurrence pour criticité',     'number', true,NOW()),
  (gen_random_uuid(),'NOTIFICATIONS','EMAIL_ENABLED',                      'true',                  'Notifications email activées',             'boolean',true,NOW()),
  (gen_random_uuid(),'NOTIFICATIONS','REMINDER_DAYS',                      '30,15,7,3,0,-1,-7,-15', 'Jours de relance (J-X)',                   'string', true,NOW()),
  (gen_random_uuid(),'SECURITY',     'SESSION_TIMEOUT_MINUTES',            '480',                   'Expiration session (minutes)',              'number', true,NOW()),
  (gen_random_uuid(),'SECURITY',     'MAX_LOGIN_ATTEMPTS',                 '5',                     'Tentatives max avant blocage',              'number', true,NOW()),
  (gen_random_uuid(),'SECURITY',     'PASSWORD_EXPIRY_DAYS',               '90',                    'Expiration mot de passe (jours)',           'number', true,NOW())
ON CONFLICT (category, key) DO NOTHING;

INSERT INTO escalation_rules (id, code, label, "daysBeforeDue", "escalationLevel", "notifyRoles", "isActive", "createdAt", "updatedAt") VALUES
  (gen_random_uuid(),'ESC_J_MINUS_30','Relance J-30',      30, 1,ARRAY['RESPONSABLE_ACTION'],true,NOW(),NOW()),
  (gen_random_uuid(),'ESC_J_MINUS_15','Relance J-15',      15, 1,ARRAY['RESPONSABLE_ACTION','RESPONSABLE_ENTITE'],true,NOW(),NOW()),
  (gen_random_uuid(),'ESC_J_MINUS_7', 'Relance J-7',       7,  2,ARRAY['RESPONSABLE_ACTION','RESPONSABLE_ENTITE'],true,NOW(),NOW()),
  (gen_random_uuid(),'ESC_J_MINUS_3', 'Relance J-3',       3,  2,ARRAY['RESPONSABLE_ACTION','RESPONSABLE_ENTITE','MANAGEMENT'],true,NOW(),NOW()),
  (gen_random_uuid(),'ESC_J_PLUS_1',  'Relance J+1 (retard)',-1,3,ARRAY['RESPONSABLE_ACTION','RESPONSABLE_ENTITE','MANAGEMENT'],true,NOW(),NOW()),
  (gen_random_uuid(),'ESC_J_PLUS_7',  'Relance J+7',      -7,  3,ARRAY['RESPONSABLE_ENTITE','MANAGEMENT'],true,NOW(),NOW()),
  (gen_random_uuid(),'ESC_J_PLUS_15', 'Relance J+15',     -15, 4,ARRAY['MANAGEMENT','EMETTEUR'],true,NOW(),NOW())
ON CONFLICT (code) DO NOTHING;

INSERT INTO report_templates (id, code, label, type, format, "isActive", "createdAt", "updatedAt") VALUES
  (gen_random_uuid(),'SYNTHESE',          'Rapport Synthétique',        'recommendations','PDF',       true,NOW(),NOW()),
  (gen_random_uuid(),'DETAIL',            'Rapport Détaillé',           'recommendations','PDF',       true,NOW(),NOW()),
  (gen_random_uuid(),'FICHE_RECO',        'Fiche Recommandation',       'recommendation', 'PDF',       true,NOW(),NOW()),
  (gen_random_uuid(),'FICHE_MISSION',     'Fiche Mission',              'mission',        'PDF',       true,NOW(),NOW()),
  (gen_random_uuid(),'RAPPORT_REGULATEUR','Rapport Régulateur',         'regulator',      'PDF',       true,NOW(),NOW()),
  (gen_random_uuid(),'REPORTING_COMITE',  'Reporting Comité',           'committee',      'PowerPoint',true,NOW(),NOW()),
  (gen_random_uuid(),'REPORTING_DG',      'Reporting Direction Générale','management',    'PDF',       true,NOW(),NOW()),
  (gen_random_uuid(),'REPORTING_ENTITE',  'Reporting Entité',           'entity',         'Excel',     true,NOW(),NOW())
ON CONFLICT (code) DO NOTHING;


-- ==============================================================
-- PARTIE 4 — UTILISATEURS APPLICATIFS
-- ==============================================================

DO $$
DECLARE
  uid_admin       text := '00000000-0000-0000-0000-000000000001';
  uid_auditeur    text := '00000000-0000-0000-0000-000000000002';
  uid_validateur  text := '00000000-0000-0000-0000-000000000003';
  uid_responsable text := '00000000-0000-0000-0000-000000000004';
  uid_management  text := '00000000-0000-0000-0000-000000000005';

  user_admin_id text; user_auditeur_id text; user_validateur_id text;
  user_responsable_id text; user_management_id text;

  role_admin_id text; role_emetteur_id text; role_validateur_id text;
  role_responsable_id text; role_management_id text;

  entity_dai_id text; entity_dri_id text; entity_dfc_id text;
BEGIN
  SELECT id INTO role_admin_id       FROM roles WHERE code='ADMIN_SYSTEM';
  SELECT id INTO role_emetteur_id    FROM roles WHERE code='EMETTEUR';
  SELECT id INTO role_validateur_id  FROM roles WHERE code='VALIDATEUR';
  SELECT id INTO role_responsable_id FROM roles WHERE code='RESPONSABLE_ENTITE';
  SELECT id INTO role_management_id  FROM roles WHERE code='MANAGEMENT';
  SELECT id INTO entity_dai_id FROM entities WHERE code='DAI';
  SELECT id INTO entity_dri_id FROM entities WHERE code='DRI';
  SELECT id INTO entity_dfc_id FROM entities WHERE code='DFC';

  INSERT INTO users (id,"supabaseId",email,"firstName","lastName",title,"isActive","createdAt","updatedAt")
  VALUES (gen_random_uuid(),uid_admin,'admin@banque.ma','Admin','Système','Administrateur Système',true,NOW(),NOW())
  ON CONFLICT (email) DO UPDATE SET "supabaseId"=uid_admin RETURNING id INTO user_admin_id;
  IF user_admin_id IS NULL THEN SELECT id INTO user_admin_id FROM users WHERE email='admin@banque.ma'; END IF;
  INSERT INTO user_roles ("userId","roleId","createdAt") VALUES (user_admin_id,role_admin_id,NOW()) ON CONFLICT DO NOTHING;

  INSERT INTO users (id,"supabaseId",email,"firstName","lastName",title,"isActive","createdAt","updatedAt")
  VALUES (gen_random_uuid(),uid_auditeur,'auditeur@banque.ma','Youssef','Benali','Auditeur Senior',true,NOW(),NOW())
  ON CONFLICT (email) DO UPDATE SET "supabaseId"=uid_auditeur RETURNING id INTO user_auditeur_id;
  IF user_auditeur_id IS NULL THEN SELECT id INTO user_auditeur_id FROM users WHERE email='auditeur@banque.ma'; END IF;
  INSERT INTO user_roles ("userId","roleId","createdAt") VALUES (user_auditeur_id,role_emetteur_id,NOW()) ON CONFLICT DO NOTHING;
  INSERT INTO user_entities ("userId","entityId","createdAt") VALUES (user_auditeur_id,entity_dai_id,NOW()) ON CONFLICT DO NOTHING;

  INSERT INTO users (id,"supabaseId",email,"firstName","lastName",title,"isActive","createdAt","updatedAt")
  VALUES (gen_random_uuid(),uid_validateur,'validateur@banque.ma','Fatima','Alaoui','Contrôleur Interne',true,NOW(),NOW())
  ON CONFLICT (email) DO UPDATE SET "supabaseId"=uid_validateur RETURNING id INTO user_validateur_id;
  IF user_validateur_id IS NULL THEN SELECT id INTO user_validateur_id FROM users WHERE email='validateur@banque.ma'; END IF;
  INSERT INTO user_roles ("userId","roleId","createdAt") VALUES (user_validateur_id,role_validateur_id,NOW()) ON CONFLICT DO NOTHING;
  INSERT INTO user_entities ("userId","entityId","createdAt") VALUES (user_validateur_id,entity_dri_id,NOW()) ON CONFLICT DO NOTHING;

  INSERT INTO users (id,"supabaseId",email,"firstName","lastName",title,"isActive","createdAt","updatedAt")
  VALUES (gen_random_uuid(),uid_responsable,'responsable@banque.ma','Karim','Tazi','Directeur Finance',true,NOW(),NOW())
  ON CONFLICT (email) DO UPDATE SET "supabaseId"=uid_responsable RETURNING id INTO user_responsable_id;
  IF user_responsable_id IS NULL THEN SELECT id INTO user_responsable_id FROM users WHERE email='responsable@banque.ma'; END IF;
  INSERT INTO user_roles ("userId","roleId","createdAt") VALUES (user_responsable_id,role_responsable_id,NOW()) ON CONFLICT DO NOTHING;
  INSERT INTO user_entities ("userId","entityId","createdAt") VALUES (user_responsable_id,entity_dfc_id,NOW()) ON CONFLICT DO NOTHING;

  INSERT INTO users (id,"supabaseId",email,"firstName","lastName",title,"isActive","createdAt","updatedAt")
  VALUES (gen_random_uuid(),uid_management,'management@banque.ma','Nadia','Chraibi','Directrice Générale',true,NOW(),NOW())
  ON CONFLICT (email) DO UPDATE SET "supabaseId"=uid_management RETURNING id INTO user_management_id;
  IF user_management_id IS NULL THEN SELECT id INTO user_management_id FROM users WHERE email='management@banque.ma'; END IF;
  INSERT INTO user_roles ("userId","roleId","createdAt") VALUES (user_management_id,role_management_id,NOW()) ON CONFLICT DO NOTHING;
END $$;


-- ==============================================================
-- PARTIE 5 — DONNÉES DE DÉMONSTRATION
-- ==============================================================

DO $$
DECLARE
  v_mission_status_id text; v_source_id text; v_source_bam_id text;
  v_entity_dfc_id text; v_entity_dri_id text; v_conf_level_id text;
  v_mission_type_id text; v_responsible_id text; v_owner_id text;
  v_reco_status_open_id text; v_reco_status_prog_id text; v_reco_status_late_id text;
  v_severity_s4_id text; v_severity_s5_id text;
  v_prob_p4_id text; v_prob_p3_id text;
  v_priority_high_id text; v_priority_crit_id text;
  v_action_status_prog_id text; v_action_status_ns_id text;
  v_mission_id text; v_reco1_id text; v_reco2_id text; v_reco3_id text; v_plan1_id text;
BEGIN
  SELECT id INTO v_mission_status_id   FROM mission_statuses        WHERE code='ACTION_PLANS_IN_PROGRESS';
  SELECT id INTO v_source_id           FROM source_types            WHERE code='AUDIT_INTERNE';
  SELECT id INTO v_source_bam_id       FROM source_types            WHERE code='BAM';
  SELECT id INTO v_entity_dfc_id       FROM entities                WHERE code='DFC';
  SELECT id INTO v_entity_dri_id       FROM entities                WHERE code='DRI';
  SELECT id INTO v_conf_level_id       FROM confidentiality_levels  WHERE code='CONFIDENTIAL';
  SELECT id INTO v_mission_type_id     FROM mission_types           WHERE code='AUDIT_INTERNE';
  SELECT id INTO v_responsible_id      FROM users                   WHERE email='auditeur@banque.ma';
  SELECT id INTO v_owner_id            FROM users                   WHERE email='responsable@banque.ma';
  SELECT id INTO v_reco_status_open_id FROM recommendation_statuses WHERE code='OPEN';
  SELECT id INTO v_reco_status_prog_id FROM recommendation_statuses WHERE code='IN_PROGRESS';
  SELECT id INTO v_reco_status_late_id FROM recommendation_statuses WHERE code='LATE';
  SELECT id INTO v_severity_s4_id      FROM severity_levels         WHERE code='S4';
  SELECT id INTO v_severity_s5_id      FROM severity_levels         WHERE code='S5';
  SELECT id INTO v_prob_p4_id          FROM probability_levels      WHERE code='P4';
  SELECT id INTO v_prob_p3_id          FROM probability_levels      WHERE code='P3';
  SELECT id INTO v_priority_high_id    FROM priority_levels         WHERE code='HIGH';
  SELECT id INTO v_priority_crit_id    FROM priority_levels         WHERE code='CRITICAL';
  SELECT id INTO v_action_status_prog_id FROM action_statuses       WHERE code='IN_PROGRESS';
  SELECT id INTO v_action_status_ns_id   FROM action_statuses       WHERE code='NOT_STARTED';

  -- Mission
  INSERT INTO missions (id,reference,title,description,"missionTypeId","sourceId","entityId","responsibleId","confidentialityLevelId","statusId","startDate","endDate","reportReceivedAt","isDeleted","createdAt","updatedAt")
  VALUES (gen_random_uuid(),'MAI-2026-001','Audit des processus de crédit — DFC','Revue complète des processus d''octroi, de suivi et de recouvrement des crédits.',
    v_mission_type_id,v_source_id,v_entity_dfc_id,v_responsible_id,v_conf_level_id,v_mission_status_id,
    '2026-01-15','2026-03-31','2026-04-10',false,NOW(),NOW())
  ON CONFLICT (reference) DO NOTHING RETURNING id INTO v_mission_id;
  IF v_mission_id IS NULL THEN SELECT id INTO v_mission_id FROM missions WHERE reference='MAI-2026-001'; END IF;

  -- Reco 1 — En retard, critique
  INSERT INTO recommendations (id,code,"missionId","sourceId","entityId","findingDescription",recommendation,"rootCause","severityId","probabilityId","rawCriticality","finalCriticality","priorityId","ownerId","initialDueDate","statusId","progressRate","isRegulator","isRecurrent","regulatorCoefficient","recurrenceCoefficient","issuedAt","isDeleted","createdAt","updatedAt")
  VALUES (gen_random_uuid(),'REC-2026-001',v_mission_id,v_source_id,v_entity_dfc_id,
    'Absence de procédure formalisée pour l''octroi des crédits à la clientèle PME.',
    'Formaliser et mettre en production une procédure d''octroi crédit PME conforme aux exigences réglementaires BAM.',
    'Absence de procédure',v_severity_s4_id,v_prob_p4_id,16.0,19.2,v_priority_crit_id,v_owner_id,
    '2026-03-31',v_reco_status_late_id,35,false,true,1.0,1.2,'2026-01-20',false,NOW(),NOW())
  ON CONFLICT (code) DO NOTHING RETURNING id INTO v_reco1_id;
  IF v_reco1_id IS NULL THEN SELECT id INTO v_reco1_id FROM recommendations WHERE code='REC-2026-001'; END IF;

  -- Reco 2 — En cours, BAM réglementaire
  INSERT INTO recommendations (id,code,"missionId","sourceId","entityId","findingDescription",recommendation,"severityId","probabilityId","rawCriticality","finalCriticality","priorityId","ownerId","initialDueDate","statusId","progressRate","isRegulator","isRecurrent","regulatorCoefficient","issuedAt","isDeleted","createdAt","updatedAt")
  VALUES (gen_random_uuid(),'REC-2026-002',v_mission_id,v_source_bam_id,v_entity_dri_id,
    'Dispositif de surveillance des risques de concentration insuffisant.',
    'Mettre en place un tableau de bord de suivi des concentrations sectorielles conforme à la circulaire BAM n°26/G/2006.',
    v_severity_s5_id,v_prob_p3_id,15.0,22.5,v_priority_crit_id,v_owner_id,
    '2026-06-30',v_reco_status_prog_id,55,true,false,1.5,'2026-02-01',false,NOW(),NOW())
  ON CONFLICT (code) DO NOTHING RETURNING id INTO v_reco2_id;
  IF v_reco2_id IS NULL THEN SELECT id INTO v_reco2_id FROM recommendations WHERE code='REC-2026-002'; END IF;

  -- Reco 3 — Ouverte, priorité haute
  INSERT INTO recommendations (id,code,"missionId","sourceId","entityId","findingDescription",recommendation,"severityId","probabilityId","rawCriticality","finalCriticality","priorityId","ownerId","initialDueDate","statusId","progressRate","isRegulator","isRecurrent","issuedAt","isDeleted","createdAt","updatedAt")
  VALUES (gen_random_uuid(),'REC-2026-003',v_mission_id,v_source_id,v_entity_dfc_id,
    'Les habilitations SI du module crédit ne respectent pas le principe de séparation des tâches.',
    'Revoir la matrice des habilitations du module crédit en appliquant strictement la séparation des tâches.',
    v_severity_s4_id,v_prob_p3_id,12.0,12.0,v_priority_high_id,v_owner_id,
    '2026-09-30',v_reco_status_open_id,0,false,false,'2026-03-01',false,NOW(),NOW())
  ON CONFLICT (code) DO NOTHING RETURNING id INTO v_reco3_id;
  IF v_reco3_id IS NULL THEN SELECT id INTO v_reco3_id FROM recommendations WHERE code='REC-2026-003'; END IF;

  -- Plan d'action pour REC-2026-001
  INSERT INTO action_plans (id,"recommendationId",title,"statusCode","progressRate","isDeleted","createdAt","updatedAt")
  VALUES (gen_random_uuid(),v_reco1_id,'Formalisation procédure crédit PME','VALIDATED',35,false,NOW(),NOW())
  RETURNING id INTO v_plan1_id;

  INSERT INTO actions (id,"actionPlanId",title,description,"responsibleId","statusId",priority,"progressRate",weight,"plannedEndAt","isDeleted","createdAt","updatedAt") VALUES
  (gen_random_uuid(),v_plan1_id,'Rédiger le projet de procédure',       'Rédiger la V1 de la procédure d''octroi crédit PME.',         v_owner_id,v_action_status_prog_id,1,100,30,'2026-02-28',false,NOW(),NOW()),
  (gen_random_uuid(),v_plan1_id,'Validation juridique',                 'Valider la conformité réglementaire avec la direction juridique.',v_owner_id,v_action_status_prog_id,2,60,30,'2026-03-15',false,NOW(),NOW()),
  (gen_random_uuid(),v_plan1_id,'Déploiement et formation des équipes', 'Former les chargés PME à la nouvelle procédure.',             v_responsible_id,v_action_status_ns_id,3,0,40,'2026-04-30',false,NOW(),NOW());
END $$;


-- ==============================================================
-- VÉRIFICATION
-- ==============================================================
SELECT 'auth.users (banque.ma)'  AS table_name, COUNT(*) AS lignes FROM auth.users WHERE email LIKE '%@banque.ma'
UNION ALL SELECT 'users',         COUNT(*) FROM users
UNION ALL SELECT 'roles',         COUNT(*) FROM roles
UNION ALL SELECT 'permissions',   COUNT(*) FROM permissions
UNION ALL SELECT 'entities',      COUNT(*) FROM entities
UNION ALL SELECT 'missions',      COUNT(*) FROM missions
UNION ALL SELECT 'recommendations',COUNT(*) FROM recommendations
UNION ALL SELECT 'action_plans',  COUNT(*) FROM action_plans
UNION ALL SELECT 'actions',       COUNT(*) FROM actions;
