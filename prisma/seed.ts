import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database...");

  // ── Confidentiality Levels ─────────────────────────────────────
  const confLevels = await Promise.all([
    prisma.confidentialityLevel.upsert({ where: { code: "STANDARD" }, update: {}, create: { code: "STANDARD", label: "Standard", rank: 1, color: "#64748b" } }),
    prisma.confidentialityLevel.upsert({ where: { code: "SENSITIVE" }, update: {}, create: { code: "SENSITIVE", label: "Sensible", rank: 2, color: "#f59e0b" } }),
    prisma.confidentialityLevel.upsert({ where: { code: "CONFIDENTIAL" }, update: {}, create: { code: "CONFIDENTIAL", label: "Confidentiel", rank: 3, color: "#ef4444" } }),
    prisma.confidentialityLevel.upsert({ where: { code: "VERY_CONFIDENTIAL" }, update: {}, create: { code: "VERY_CONFIDENTIAL", label: "Très Confidentiel", rank: 4, color: "#7c3aed" } }),
    prisma.confidentialityLevel.upsert({ where: { code: "REGULATOR" }, update: {}, create: { code: "REGULATOR", label: "Régulateur", rank: 5, color: "#dc2626" } }),
    prisma.confidentialityLevel.upsert({ where: { code: "EXEC_COMMITTEE" }, update: {}, create: { code: "EXEC_COMMITTEE", label: "Comité Exécutif", rank: 6, color: "#1e293b" } }),
  ]);
  console.log(`✅ ${confLevels.length} confidentiality levels`);

  // ── Mission Types ──────────────────────────────────────────────
  const missionTypes = [
    { code: "AUDIT_LEGAL", label: "Audit Légal" },
    { code: "MISSION_CAC", label: "Mission CAC" },
    { code: "INSPECTION_GENERALE", label: "Inspection Générale" },
    { code: "MISSION_REGULATEUR", label: "Mission Régulateur" },
    { code: "CONTROLE_PERMANENT", label: "Contrôle Permanent" },
    { code: "AUDIT_INTERNE", label: "Audit Interne" },
    { code: "REVUE_THEMATIQUE", label: "Revue Thématique" },
    { code: "MISSION_CONFORMITE", label: "Mission Conformité" },
    { code: "MISSION_RISQUES", label: "Mission Risques" },
    { code: "CONTROLE_SUR_PIECES", label: "Contrôle sur Pièces" },
    { code: "CONTROLE_SUR_PLACE", label: "Contrôle sur Place" },
    { code: "REVUE_POST_INCIDENT", label: "Revue Post-Incident" },
    { code: "REVUE_REGLEMENTAIRE", label: "Revue Réglementaire" },
  ];
  for (const mt of missionTypes) {
    await prisma.missionType.upsert({ where: { code: mt.code }, update: {}, create: mt });
  }
  console.log(`✅ ${missionTypes.length} mission types`);

  // ── Mission Statuses ───────────────────────────────────────────
  const missionStatuses = [
    { code: "DRAFT", label: "Brouillon", rank: 1, color: "#94a3b8" },
    { code: "PLANNED", label: "Planifiée", rank: 2, color: "#3b82f6" },
    { code: "IN_PROGRESS", label: "En cours", rank: 3, color: "#f59e0b" },
    { code: "REPORT_RECEIVED", label: "Rapport reçu", rank: 4, color: "#8b5cf6" },
    { code: "RECOMMENDATIONS_ENTERED", label: "Recommandations saisies", rank: 5, color: "#6366f1" },
    { code: "ACTION_PLANS_IN_PROGRESS", label: "Plans d'action en cours", rank: 6, color: "#0ea5e9" },
    { code: "PARTIALLY_CLOSED", label: "Partiellement clôturée", rank: 7, color: "#14b8a6" },
    { code: "CLOSED", label: "Clôturée", rank: 8, color: "#22c55e", isFinal: true },
    { code: "ARCHIVED", label: "Archivée", rank: 9, color: "#64748b", isFinal: true },
    { code: "CANCELLED", label: "Annulée", rank: 10, color: "#ef4444", isFinal: true },
  ];
  for (const ms of missionStatuses) {
    await prisma.missionStatus.upsert({ where: { code: ms.code }, update: {}, create: ms });
  }
  console.log(`✅ ${missionStatuses.length} mission statuses`);

  // ── Source Types ───────────────────────────────────────────────
  const sourceTypes = [
    { code: "CAC", label: "CAC", sourceCoefficient: 1.2, isRegulator: false },
    { code: "INSPECTION_GENERALE", label: "Inspection Générale", sourceCoefficient: 1.3, isRegulator: false },
    { code: "AUDIT_INTERNE", label: "Audit Interne", sourceCoefficient: 1.1, isRegulator: false },
    { code: "CONTROLE_PERMANENT", label: "Contrôle Permanent", sourceCoefficient: 1.0, isRegulator: false },
    { code: "REGULATEUR", label: "Régulateur", sourceCoefficient: 1.5, isRegulator: true },
    { code: "BAM", label: "BAM", sourceCoefficient: 1.5, isRegulator: true },
    { code: "AMMC", label: "AMMC", sourceCoefficient: 1.5, isRegulator: true },
    { code: "ACAPS", label: "ACAPS", sourceCoefficient: 1.5, isRegulator: true },
    { code: "COUR_COMPTES", label: "Cour des Comptes", sourceCoefficient: 1.4, isRegulator: true },
    { code: "CONFORMITE", label: "Conformité", sourceCoefficient: 1.1, isRegulator: false },
    { code: "RISQUES", label: "Risques", sourceCoefficient: 1.1, isRegulator: false },
    { code: "SECURITE_SI", label: "Sécurité SI", sourceCoefficient: 1.1, isRegulator: false },
    { code: "DATA_PROTECTION", label: "Data Protection", sourceCoefficient: 1.1, isRegulator: false },
    { code: "CONTROLE_INTERNE_GROUPE", label: "Contrôle Interne Groupe", sourceCoefficient: 1.2, isRegulator: false },
    { code: "AUTRE", label: "Autre Source", sourceCoefficient: 1.0, isRegulator: false },
  ];
  for (const st of sourceTypes) {
    await prisma.sourceType.upsert({ where: { code: st.code }, update: {}, create: st });
  }
  console.log(`✅ ${sourceTypes.length} source types`);

  // ── Risk Types ─────────────────────────────────────────────────
  const riskTypes = [
    { code: "ORGANISATIONAL", label: "Organisationnel", category: "Gouvernance" },
    { code: "PROCEDURAL", label: "Procédural", category: "Opérationnel" },
    { code: "REGULATORY", label: "Réglementaire", category: "Conformité" },
    { code: "ACCOUNTING", label: "Comptable", category: "Financier" },
    { code: "FINANCIAL", label: "Financier", category: "Financier" },
    { code: "CREDIT_RISK", label: "Risque Crédit", category: "Crédit" },
    { code: "OPERATIONAL_RISK", label: "Risque Opérationnel", category: "Opérationnel" },
    { code: "MARKET_RISK", label: "Risque Marché", category: "Marché" },
    { code: "LIQUIDITY_RISK", label: "Risque Liquidité", category: "Financier" },
    { code: "COMPLIANCE_RISK", label: "Risque Conformité", category: "Conformité" },
    { code: "LEGAL_RISK", label: "Risque Juridique", category: "Juridique" },
    { code: "IT_RISK", label: "Risque SI", category: "SI" },
    { code: "CYBER_RISK", label: "Risque Cybersécurité", category: "SI" },
    { code: "BCP_RISK", label: "Risque Continuité d'activité", category: "Opérationnel" },
    { code: "ESG_RISK", label: "Risque ESG / Climat", category: "ESG" },
    { code: "GOVERNANCE", label: "Gouvernance", category: "Gouvernance" },
    { code: "REPORTING", label: "Reporting", category: "Opérationnel" },
    { code: "DATA_QUALITY", label: "Qualité des données", category: "SI" },
    { code: "INTERNAL_CONTROL", label: "Contrôle Interne", category: "Opérationnel" },
    { code: "DOCUMENTATION", label: "Documentation", category: "Opérationnel" },
    { code: "KYC_AML", label: "KYC / AML", category: "Conformité" },
    { code: "PHYSICAL_SECURITY", label: "Sécurité Physique", category: "Opérationnel" },
    { code: "HR", label: "Ressources Humaines", category: "RH" },
    { code: "FRAUD", label: "Fraude", category: "Opérationnel" },
    { code: "OTHER", label: "Autre", category: "Autre" },
  ];
  for (const rt of riskTypes) {
    await prisma.riskType.upsert({ where: { code: rt.code }, update: {}, create: rt });
  }
  console.log(`✅ ${riskTypes.length} risk types`);

  // ── Severity Levels ────────────────────────────────────────────
  const severityLevels = [
    { code: "S1", label: "Faible", numericValue: 1, color: "#22c55e", description: "Impact limité, sans risque majeur" },
    { code: "S2", label: "Modéré", numericValue: 2, color: "#84cc16", description: "Impact maîtrisable" },
    { code: "S3", label: "Significatif", numericValue: 3, color: "#f59e0b", description: "Impact réel sur contrôle ou conformité" },
    { code: "S4", label: "Élevé", numericValue: 4, color: "#f97316", description: "Risque important pour la banque" },
    { code: "S5", label: "Critique", numericValue: 5, color: "#ef4444", description: "Risque réglementaire, financier ou réputationnel majeur" },
  ];
  for (const sl of severityLevels) {
    await prisma.severityLevel.upsert({ where: { code: sl.code }, update: {}, create: sl });
  }
  console.log(`✅ ${severityLevels.length} severity levels`);

  // ── Probability Levels ─────────────────────────────────────────
  const probabilityLevels = [
    { code: "P1", label: "Rare", numericValue: 1, color: "#22c55e" },
    { code: "P2", label: "Peu probable", numericValue: 2, color: "#84cc16" },
    { code: "P3", label: "Possible", numericValue: 3, color: "#f59e0b" },
    { code: "P4", label: "Probable", numericValue: 4, color: "#f97316" },
    { code: "P5", label: "Très probable", numericValue: 5, color: "#ef4444" },
  ];
  for (const pl of probabilityLevels) {
    await prisma.probabilityLevel.upsert({ where: { code: pl.code }, update: {}, create: pl });
  }
  console.log(`✅ ${probabilityLevels.length} probability levels`);

  // ── Priority Levels ────────────────────────────────────────────
  const priorityLevels = [
    { code: "LOW", label: "Faible", scoreMin: 1, scoreMax: 5, color: "#22c55e", badgeVariant: "success" },
    { code: "MEDIUM", label: "Moyenne", scoreMin: 6, scoreMax: 10, color: "#f59e0b", badgeVariant: "warning" },
    { code: "HIGH", label: "Élevée", scoreMin: 11, scoreMax: 15, color: "#f97316", badgeVariant: "warning" },
    { code: "VERY_HIGH", label: "Très élevée", scoreMin: 16, scoreMax: 20, color: "#ef4444", badgeVariant: "destructive" },
    { code: "CRITICAL", label: "Critique", scoreMin: 21, scoreMax: 999, color: "#7c3aed", badgeVariant: "critical" },
  ];
  for (const pl of priorityLevels) {
    await prisma.priorityLevel.upsert({ where: { code: pl.code }, update: {}, create: pl });
  }
  console.log(`✅ ${priorityLevels.length} priority levels`);

  // ── Recommendation Statuses ────────────────────────────────────
  const recoStatuses = [
    { code: "DRAFT", label: "Brouillon", rank: 1, color: "#94a3b8", isOpen: true },
    { code: "OPEN", label: "Ouverte", rank: 2, color: "#3b82f6", isOpen: true },
    { code: "ASSIGNED", label: "Affectée", rank: 3, color: "#6366f1", isOpen: true },
    { code: "IN_ANALYSIS", label: "En analyse", rank: 4, color: "#8b5cf6", isOpen: true },
    { code: "PLAN_TO_DEFINE", label: "Plan d'action à définir", rank: 5, color: "#f59e0b", isOpen: true },
    { code: "PLAN_SUBMITTED", label: "Plan d'action soumis", rank: 6, color: "#0ea5e9", isOpen: true },
    { code: "PLAN_VALIDATED", label: "Plan d'action validé", rank: 7, color: "#14b8a6", isOpen: true },
    { code: "IN_PROGRESS", label: "En cours de traitement", rank: 8, color: "#22c55e", isOpen: true },
    { code: "AWAITING_PROOF", label: "En attente de preuve", rank: 9, color: "#f97316", isOpen: true },
    { code: "PROOF_SUBMITTED", label: "Preuve soumise", rank: 10, color: "#0ea5e9", isOpen: true },
    { code: "IN_REVIEW", label: "En revue", rank: 11, color: "#8b5cf6", isOpen: true },
    { code: "COMPLEMENT_REQUIRED", label: "Complément demandé", rank: 12, color: "#f59e0b", isOpen: true },
    { code: "CLOSURE_PROPOSED", label: "Clôture proposée", rank: 13, color: "#14b8a6", isOpen: true },
    { code: "CLOSED", label: "Clôturée", rank: 14, color: "#22c55e", isFinal: true, isOpen: false },
    { code: "REJECTED", label: "Rejetée", rank: 15, color: "#ef4444", isOpen: false },
    { code: "SUSPENDED", label: "Suspendue", rank: 16, color: "#94a3b8", isOpen: true },
    { code: "EXTENSION_REQUESTED", label: "Report demandé", rank: 17, color: "#f59e0b", isOpen: true },
    { code: "EXTENSION_VALIDATED", label: "Report validé", rank: 18, color: "#84cc16", isOpen: true },
    { code: "OVERDUE", label: "Échue", rank: 19, color: "#ef4444", isOpen: true },
    { code: "LATE", label: "En retard", rank: 20, color: "#f97316", isOpen: true },
    { code: "CRITICAL", label: "Critique", rank: 21, color: "#7c3aed", isOpen: true },
    { code: "ARCHIVED", label: "Archivée", rank: 22, color: "#64748b", isFinal: true, isOpen: false },
  ];
  for (const rs of recoStatuses) {
    await prisma.recommendationStatus.upsert({ where: { code: rs.code }, update: {}, create: rs });
  }
  console.log(`✅ ${recoStatuses.length} recommendation statuses`);

  // ── Action Statuses ────────────────────────────────────────────
  const actionStatuses = [
    { code: "NOT_STARTED", label: "Non démarrée", rank: 1, color: "#94a3b8" },
    { code: "IN_PROGRESS", label: "En cours", rank: 2, color: "#3b82f6" },
    { code: "WAITING", label: "En attente", rank: 3, color: "#f59e0b" },
    { code: "BLOCKED", label: "Bloquée", rank: 4, color: "#ef4444" },
    { code: "COMPLETED", label: "Terminée", rank: 5, color: "#22c55e" },
    { code: "PROOF_SUBMITTED", label: "Preuve déposée", rank: 6, color: "#0ea5e9" },
    { code: "VALIDATED", label: "Validée", rank: 7, color: "#22c55e", isFinal: true },
    { code: "REJECTED", label: "Rejetée", rank: 8, color: "#ef4444" },
    { code: "CANCELLED", label: "Annulée", rank: 9, color: "#64748b", isFinal: true },
    { code: "OVERDUE", label: "En retard", rank: 10, color: "#f97316" },
  ];
  for (const as of actionStatuses) {
    await prisma.actionStatus.upsert({ where: { code: as.code }, update: {}, create: as });
  }
  console.log(`✅ ${actionStatuses.length} action statuses`);

  // ── Evidence Types ─────────────────────────────────────────────
  const evidenceTypes = [
    { code: "PDF", label: "Document PDF", allowedMime: ["application/pdf"] },
    { code: "WORD", label: "Document Word", allowedMime: ["application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"] },
    { code: "EXCEL", label: "Fichier Excel", allowedMime: ["application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"] },
    { code: "IMAGE", label: "Image", allowedMime: ["image/jpeg", "image/png", "image/gif"] },
    { code: "SCREENSHOT", label: "Capture d'écran", allowedMime: ["image/png", "image/jpeg"] },
    { code: "EMAIL", label: "Email", allowedMime: ["message/rfc822", "application/pdf"] },
    { code: "REPORT", label: "Rapport", allowedMime: ["application/pdf"] },
    { code: "PROCEDURE", label: "Procédure mise à jour", allowedMime: ["application/pdf", "application/msword"] },
    { code: "MEETING_MINUTES", label: "PV de Comité", allowedMime: ["application/pdf", "application/msword"] },
    { code: "SYSTEM_EXTRACT", label: "Extrait Système", allowedMime: ["application/pdf", "text/csv", "application/vnd.ms-excel"] },
    { code: "ATTESTATION", label: "Attestation", allowedMime: ["application/pdf"] },
    { code: "INTERNAL_NOTE", label: "Note Interne", allowedMime: ["application/pdf", "application/msword"] },
    { code: "CONFIGURATION_PROOF", label: "Preuve de Paramétrage", allowedMime: ["image/png", "application/pdf"] },
    { code: "ACCOUNTING_PROOF", label: "Preuve Comptable", allowedMime: ["application/pdf", "application/vnd.ms-excel"] },
    { code: "REGULATORY_PROOF", label: "Preuve Réglementaire", allowedMime: ["application/pdf"] },
  ];
  for (const et of evidenceTypes) {
    await prisma.evidenceType.upsert({ where: { code: et.code }, update: {}, create: et });
  }
  console.log(`✅ ${evidenceTypes.length} evidence types`);

  // ── Recommendation Types ───────────────────────────────────────
  const recoTypes = [
    { code: "ORGANISATIONAL", label: "Organisationnelle", category: "Organisation" },
    { code: "PROCEDURAL", label: "Procédurale", category: "Processus" },
    { code: "REGULATORY", label: "Réglementaire", category: "Conformité" },
    { code: "ACCOUNTING", label: "Comptable", category: "Finance" },
    { code: "FINANCIAL", label: "Financière", category: "Finance" },
    { code: "GOVERNANCE", label: "Gouvernance", category: "Gouvernance" },
    { code: "REPORTING", label: "Reporting", category: "Reporting" },
    { code: "DATA_QUALITY", label: "Qualité des données", category: "SI" },
    { code: "INTERNAL_CONTROL", label: "Contrôle Interne", category: "Contrôle" },
    { code: "DOCUMENTATION", label: "Documentation", category: "Processus" },
    { code: "KYC_AML", label: "KYC / AML", category: "Conformité" },
    { code: "IT_SECURITY", label: "Sécurité SI", category: "SI" },
    { code: "OTHER", label: "Autre", category: "Autre" },
  ];
  for (const rt of recoTypes) {
    await prisma.recommendationType.upsert({ where: { code: rt.code }, update: {}, create: rt });
  }
  console.log(`✅ ${recoTypes.length} recommendation types`);

  // ── Root Cause Types ───────────────────────────────────────────
  const rootCauses = [
    { code: "MISSING_PROCEDURE", label: "Absence de procédure" },
    { code: "OUTDATED_PROCEDURE", label: "Procédure non mise à jour" },
    { code: "MISSING_CONTROL", label: "Absence de contrôle" },
    { code: "INEFFECTIVE_CONTROL", label: "Contrôle inefficace" },
    { code: "HUMAN_ERROR", label: "Erreur humaine" },
    { code: "IT_DEFICIENCY", label: "Insuffisance SI" },
    { code: "GOVERNANCE_DEFICIENCY", label: "Défaut de gouvernance" },
    { code: "TRAINING_DEFICIENCY", label: "Insuffisance de formation" },
    { code: "REGULATORY_NON_COMPLIANCE", label: "Non-respect réglementaire" },
    { code: "MISSING_SEGREGATION", label: "Absence de séparation des tâches" },
    { code: "DOCUMENTATION_DEFICIENCY", label: "Insuffisance documentaire" },
    { code: "DATA_QUALITY", label: "Qualité des données insuffisante" },
    { code: "OPERATIONAL_CHAIN_BREAK", label: "Rupture de chaîne opérationnelle" },
    { code: "LACK_OF_SUPERVISION", label: "Manque de supervision" },
    { code: "MISSING_AUTOMATION", label: "Absence d'automatisation" },
  ];
  for (const rc of rootCauses) {
    await prisma.rootCauseType.upsert({ where: { code: rc.code }, update: {}, create: rc });
  }
  console.log(`✅ ${rootCauses.length} root cause types`);

  // ── Roles ──────────────────────────────────────────────────────
  const roles = [
    { code: "ADMIN_SYSTEM", label: "Administrateur Système", description: "Accès total à l'application", isSystem: true },
    { code: "ADMIN_METIER", label: "Administrateur Métier", description: "Paramétrage des référentiels" },
    { code: "EMETTEUR", label: "Émetteur de Recommandation", description: "CAC, Inspection, Audit, Régulateur" },
    { code: "RESPONSABLE_ENTITE", label: "Responsable d'Entité", description: "Responsable des recommandations de son entité" },
    { code: "RESPONSABLE_ACTION", label: "Responsable d'Action", description: "Responsable de mise en oeuvre des actions" },
    { code: "VALIDATEUR", label: "Validateur / Contrôleur", description: "Valide les preuves et clôtures" },
    { code: "MANAGEMENT", label: "Management", description: "Lecture dashboards et reporting" },
    { code: "REGULATOR_READ", label: "Régulateur (lecture)", description: "Lecture seule des recommandations régulateur" },
  ];
  for (const r of roles) {
    await prisma.role.upsert({ where: { code: r.code }, update: {}, create: r });
  }
  console.log(`✅ ${roles.length} roles`);

  // ── Permissions ────────────────────────────────────────────────
  const permissions = [
    { code: "mission:read", label: "Lire les missions", module: "missions", action: "read" },
    { code: "mission:create", label: "Créer une mission", module: "missions", action: "create" },
    { code: "mission:update", label: "Modifier une mission", module: "missions", action: "update" },
    { code: "mission:delete", label: "Supprimer une mission", module: "missions", action: "delete" },
    { code: "mission:close", label: "Clôturer une mission", module: "missions", action: "close" },
    { code: "recommendation:read", label: "Lire les recommandations", module: "recommendations", action: "read" },
    { code: "recommendation:create", label: "Créer une recommandation", module: "recommendations", action: "create" },
    { code: "recommendation:update", label: "Modifier une recommandation", module: "recommendations", action: "update" },
    { code: "recommendation:delete", label: "Supprimer une recommandation", module: "recommendations", action: "delete" },
    { code: "recommendation:validate", label: "Valider une recommandation", module: "recommendations", action: "validate" },
    { code: "recommendation:close", label: "Clôturer une recommandation", module: "recommendations", action: "close" },
    { code: "recommendation:reopen", label: "Rouvrir une recommandation", module: "recommendations", action: "reopen" },
    { code: "action_plan:read", label: "Lire les plans d'action", module: "action_plans", action: "read" },
    { code: "action_plan:create", label: "Créer un plan d'action", module: "action_plans", action: "create" },
    { code: "action_plan:update", label: "Modifier un plan d'action", module: "action_plans", action: "update" },
    { code: "action_plan:validate", label: "Valider un plan d'action", module: "action_plans", action: "validate" },
    { code: "action:read", label: "Lire les actions", module: "actions", action: "read" },
    { code: "action:create", label: "Créer une action", module: "actions", action: "create" },
    { code: "action:update", label: "Modifier une action", module: "actions", action: "update" },
    { code: "action:delete", label: "Supprimer une action", module: "actions", action: "delete" },
    { code: "evidence:read", label: "Lire les preuves", module: "evidences", action: "read" },
    { code: "evidence:create", label: "Déposer une preuve", module: "evidences", action: "create" },
    { code: "evidence:validate", label: "Valider une preuve", module: "evidences", action: "validate" },
    { code: "evidence:reject", label: "Rejeter une preuve", module: "evidences", action: "reject" },
    { code: "report:read", label: "Voir les rapports", module: "reports", action: "read" },
    { code: "report:export", label: "Exporter les rapports", module: "reports", action: "export" },
    { code: "admin:users", label: "Gérer les utilisateurs", module: "admin", action: "users" },
    { code: "admin:roles", label: "Gérer les rôles", module: "admin", action: "roles" },
    { code: "admin:parameters", label: "Gérer les paramètres", module: "admin", action: "parameters" },
    { code: "admin:audit", label: "Voir le journal d'audit", module: "admin", action: "audit" },
    { code: "extension:create", label: "Demander un report", module: "extensions", action: "create" },
    { code: "extension:validate", label: "Valider un report", module: "extensions", action: "validate" },
  ];
  for (const p of permissions) {
    await prisma.permission.upsert({ where: { code: p.code }, update: {}, create: p });
  }
  console.log(`✅ ${permissions.length} permissions`);

  // ── Assign permissions to ADMIN_SYSTEM role ────────────────────
  const adminRole = await prisma.role.findUnique({ where: { code: "ADMIN_SYSTEM" } });
  const allPermissions = await prisma.permission.findMany();
  if (adminRole) {
    for (const perm of allPermissions) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: adminRole.id, permissionId: perm.id } },
        update: {},
        create: { roleId: adminRole.id, permissionId: perm.id },
      });
    }
    console.log(`✅ ADMIN_SYSTEM assigned all ${allPermissions.length} permissions`);
  }

  // ── Entities ───────────────────────────────────────────────────
  const entities = [
    { code: "DG", label: "Direction Générale", type: "DIRECTION" },
    { code: "DRH", label: "Direction des Ressources Humaines", type: "DIRECTION" },
    { code: "DFC", label: "Direction Finance & Comptabilité", type: "DIRECTION" },
    { code: "DRI", label: "Direction des Risques", type: "DIRECTION" },
    { code: "DCO", label: "Direction Conformité", type: "DIRECTION" },
    { code: "DSI", label: "Direction des Systèmes d'Information", type: "DIRECTION" },
    { code: "DCM", label: "Direction Commerciale", type: "DIRECTION" },
    { code: "DOP", label: "Direction des Opérations", type: "DIRECTION" },
    { code: "DAI", label: "Direction Audit Interne", type: "DIRECTION" },
    { code: "DCPR", label: "Direction Contrôle Permanent", type: "DIRECTION" },
    { code: "AGE_CASABLANCA", label: "Agence Casablanca Centre", type: "AGENCE" },
    { code: "AGE_RABAT", label: "Agence Rabat", type: "AGENCE" },
  ];
  for (const e of entities) {
    await prisma.entity.upsert({ where: { code: e.code }, update: {}, create: e });
  }
  console.log(`✅ ${entities.length} entities`);

  // ── Escalation Rules ───────────────────────────────────────────
  const escalationRules = [
    { code: "ESC_J_MINUS_30", label: "Relance J-30", daysBeforeDue: 30, escalationLevel: 1, notifyRoles: ["RESPONSABLE_ACTION"] },
    { code: "ESC_J_MINUS_15", label: "Relance J-15", daysBeforeDue: 15, escalationLevel: 1, notifyRoles: ["RESPONSABLE_ACTION", "RESPONSABLE_ENTITE"] },
    { code: "ESC_J_MINUS_7", label: "Relance J-7", daysBeforeDue: 7, escalationLevel: 2, notifyRoles: ["RESPONSABLE_ACTION", "RESPONSABLE_ENTITE"] },
    { code: "ESC_J_MINUS_3", label: "Relance J-3", daysBeforeDue: 3, escalationLevel: 2, notifyRoles: ["RESPONSABLE_ACTION", "RESPONSABLE_ENTITE", "MANAGEMENT"] },
    { code: "ESC_J_PLUS_1", label: "Relance J+1 (retard)", daysBeforeDue: -1, escalationLevel: 3, notifyRoles: ["RESPONSABLE_ACTION", "RESPONSABLE_ENTITE", "MANAGEMENT"] },
    { code: "ESC_J_PLUS_7", label: "Relance J+7", daysBeforeDue: -7, escalationLevel: 3, notifyRoles: ["RESPONSABLE_ENTITE", "MANAGEMENT"] },
    { code: "ESC_J_PLUS_15", label: "Relance J+15", daysBeforeDue: -15, escalationLevel: 4, notifyRoles: ["MANAGEMENT", "EMETTEUR"] },
  ];
  for (const er of escalationRules) {
    await prisma.escalationRule.upsert({ where: { code: er.code }, update: {}, create: er });
  }
  console.log(`✅ ${escalationRules.length} escalation rules`);

  // ── Parameter Settings ─────────────────────────────────────────
  const parameters = [
    { category: "WORKFLOW", key: "REQUIRE_PROOF_FOR_CLOSURE", value: "true", label: "Preuve obligatoire pour clôture", dataType: "boolean" },
    { category: "WORKFLOW", key: "REQUIRE_PROOF_FOR_REGULATOR_CLOSURE", value: "true", label: "Preuve obligatoire clôture régulateur", dataType: "boolean" },
    { category: "WORKFLOW", key: "MAX_EXTENSIONS_BEFORE_CRITICAL", value: "3", label: "Nb max de reports avant criticité", dataType: "number" },
    { category: "ALERTS", key: "OVERDUE_CRITICALITY_MULTIPLIER", value: "1.3", label: "Coefficient retard pour criticité", dataType: "number" },
    { category: "ALERTS", key: "RECURRENCE_CRITICALITY_MULTIPLIER", value: "1.2", label: "Coefficient récurrence pour criticité", dataType: "number" },
    { category: "NOTIFICATIONS", key: "EMAIL_ENABLED", value: "true", label: "Notifications email activées", dataType: "boolean" },
    { category: "NOTIFICATIONS", key: "REMINDER_DAYS", value: "30,15,7,3,0,-1,-7,-15", label: "Jours de relance (J-X)", dataType: "string" },
    { category: "SECURITY", key: "SESSION_TIMEOUT_MINUTES", value: "480", label: "Expiration session (minutes)", dataType: "number" },
    { category: "SECURITY", key: "MAX_LOGIN_ATTEMPTS", value: "5", label: "Tentatives max avant blocage", dataType: "number" },
    { category: "SECURITY", key: "PASSWORD_EXPIRY_DAYS", value: "90", label: "Expiration mot de passe (jours)", dataType: "number" },
  ];
  for (const p of parameters) {
    await prisma.parameterSetting.upsert({
      where: { category_key: { category: p.category, key: p.key } },
      update: {},
      create: { ...p },
    });
  }
  console.log(`✅ ${parameters.length} parameter settings`);

  // ── Demo Admin User ────────────────────────────────────────────
  const adminSystemRole = await prisma.role.findUnique({ where: { code: "ADMIN_SYSTEM" } });
  const demoUser = await prisma.user.upsert({
    where: { email: "admin@banque.ma" },
    update: {},
    create: {
      email: "admin@banque.ma",
      firstName: "Admin",
      lastName: "Système",
      title: "Administrateur Système",
      isActive: true,
    },
  });
  if (adminSystemRole) {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: demoUser.id, roleId: adminSystemRole.id } },
      update: {},
      create: { userId: demoUser.id, roleId: adminSystemRole.id },
    });
  }
  console.log(`✅ Demo admin user: admin@banque.ma`);

  // ── Report Templates ───────────────────────────────────────────
  const reportTemplates = [
    { code: "SYNTHESE", label: "Rapport Synthétique", type: "recommendations", format: "PDF" },
    { code: "DETAIL", label: "Rapport Détaillé", type: "recommendations", format: "PDF" },
    { code: "FICHE_RECO", label: "Fiche Recommandation", type: "recommendation", format: "PDF" },
    { code: "FICHE_MISSION", label: "Fiche Mission", type: "mission", format: "PDF" },
    { code: "RAPPORT_REGULATEUR", label: "Rapport Régulateur", type: "regulator", format: "PDF" },
    { code: "REPORTING_COMITE", label: "Reporting Comité", type: "committee", format: "PowerPoint" },
    { code: "REPORTING_DG", label: "Reporting Direction Générale", type: "management", format: "PDF" },
    { code: "REPORTING_ENTITE", label: "Reporting Entité", type: "entity", format: "Excel" },
  ];
  for (const rt of reportTemplates) {
    await prisma.reportTemplate.upsert({ where: { code: rt.code }, update: {}, create: rt });
  }
  console.log(`✅ ${reportTemplates.length} report templates`);

  console.log("\n🎉 Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
