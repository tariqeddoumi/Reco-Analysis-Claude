export const PERMISSIONS = {
  // Missions
  MISSION_READ: "mission:read",
  MISSION_CREATE: "mission:create",
  MISSION_UPDATE: "mission:update",
  MISSION_DELETE: "mission:delete",
  MISSION_CLOSE: "mission:close",
  // Recommendations
  RECOMMENDATION_READ: "recommendation:read",
  RECOMMENDATION_CREATE: "recommendation:create",
  RECOMMENDATION_UPDATE: "recommendation:update",
  RECOMMENDATION_DELETE: "recommendation:delete",
  RECOMMENDATION_VALIDATE: "recommendation:validate",
  RECOMMENDATION_CLOSE: "recommendation:close",
  RECOMMENDATION_REOPEN: "recommendation:reopen",
  // Action Plans
  ACTION_PLAN_READ: "action_plan:read",
  ACTION_PLAN_CREATE: "action_plan:create",
  ACTION_PLAN_UPDATE: "action_plan:update",
  ACTION_PLAN_VALIDATE: "action_plan:validate",
  // Actions
  ACTION_READ: "action:read",
  ACTION_CREATE: "action:create",
  ACTION_UPDATE: "action:update",
  ACTION_DELETE: "action:delete",
  // Evidences
  EVIDENCE_READ: "evidence:read",
  EVIDENCE_CREATE: "evidence:create",
  EVIDENCE_VALIDATE: "evidence:validate",
  EVIDENCE_REJECT: "evidence:reject",
  // Reports
  REPORT_READ: "report:read",
  REPORT_EXPORT: "report:export",
  // Admin
  ADMIN_USERS: "admin:users",
  ADMIN_ROLES: "admin:roles",
  ADMIN_PARAMETERS: "admin:parameters",
  ADMIN_AUDIT: "admin:audit",
  // Deadline extensions
  EXTENSION_CREATE: "extension:create",
  EXTENSION_VALIDATE: "extension:validate",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ROLES = {
  ADMIN_SYSTEM: "ADMIN_SYSTEM",
  ADMIN_METIER: "ADMIN_METIER",
  EMETTEUR: "EMETTEUR",
  RESPONSABLE_ENTITE: "RESPONSABLE_ENTITE",
  RESPONSABLE_ACTION: "RESPONSABLE_ACTION",
  VALIDATEUR: "VALIDATEUR",
  MANAGEMENT: "MANAGEMENT",
  REGULATOR_READ: "REGULATOR_READ",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

type UserWithRoles = {
  userRoles: Array<{
    role: {
      code: string;
      permissions: Array<{
        permission: { code: string };
      }>;
    };
  }>;
};

export function hasPermission(user: UserWithRoles, permission: string): boolean {
  return user.userRoles.some((ur) =>
    ur.role.permissions.some((rp) => rp.permission.code === permission)
  );
}

export function hasRole(user: UserWithRoles, roleCode: string): boolean {
  return user.userRoles.some((ur) => ur.role.code === roleCode);
}

export function isAdmin(user: UserWithRoles): boolean {
  return hasRole(user, ROLES.ADMIN_SYSTEM) || hasRole(user, ROLES.ADMIN_METIER);
}
