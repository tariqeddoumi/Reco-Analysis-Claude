// ============================================================
// Types métier centralisés
// ============================================================

export type TemporalStatus = "ON_TIME" | "TO_WATCH" | "DUE_SOON" | "OVERDUE" | "CLOSED" | "NO_DATE";

export type EvidenceStatusCode = "DEPOSITED" | "IN_REVIEW" | "ACCEPTED" | "REJECTED" | "COMPLEMENT_REQUIRED" | "REPLACED" | "ARCHIVED";

export type ActionPlanStatusCode = "DRAFT" | "SUBMITTED" | "VALIDATED" | "IN_PROGRESS" | "COMPLETED" | "REJECTED";

export type ExtensionStatusCode = "DRAFT" | "SUBMITTED" | "IN_VALIDATION" | "VALIDATED" | "REJECTED" | "CANCELLED";

export interface DashboardKpi {
  totalMissions: number;
  totalRecommandations: number;
  openRecommendations: number;
  closedRecommendations: number;
  overdueRecommendations: number;
  criticalRecommendations: number;
  regulatorRecommendations: number;
  globalClosureRate: number;
  averageProgressRate: number;
  averageProcessingDays: number;
  totalExtensions: number;
  rejectedEvidences: number;
}

export interface RecommendationWithRelations {
  id: string;
  code: string;
  recommendation: string;
  findingDescription: string;
  issuedAt: Date;
  initialDueDate: Date | null;
  revisedDueDate: Date | null;
  closedAt: Date | null;
  progressRate: number;
  isRegulator: boolean;
  isRecurrent: boolean;
  finalCriticality: number | null;
  mission: { reference: string; title: string };
  source: { code: string; label: string };
  entity: { code: string; label: string };
  status: { code: string; label: string; color: string | null };
  priority: { code: string; label: string; color: string | null } | null;
  severity: { numericValue: number; label: string } | null;
  probability: { numericValue: number; label: string } | null;
  owner: { firstName: string; lastName: string } | null;
}

export interface MissionWithRelations {
  id: string;
  reference: string;
  title: string;
  startDate: Date | null;
  endDate: Date | null;
  reportReceivedAt: Date | null;
  createdAt: Date;
  missionType: { code: string; label: string };
  source: { code: string; label: string };
  entity: { code: string; label: string };
  status: { code: string; label: string; color: string | null };
  confidentialityLevel: { code: string; label: string };
  responsible: { firstName: string; lastName: string };
  _count: { recommendations: number };
}

export interface ActionWithRelations {
  id: string;
  title: string;
  progressRate: number;
  plannedEndAt: Date | null;
  actualEndAt: Date | null;
  priority: number;
  weight: number;
  status: { code: string; label: string; color: string | null };
  responsible: { firstName: string; lastName: string } | null;
  actionPlan: {
    recommendation: {
      code: string;
      entity: { label: string };
    };
  };
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface FilterOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  statusId?: string;
  sourceId?: string;
  entityId?: string;
  priorityId?: string;
  isRegulator?: boolean;
  isOverdue?: boolean;
  isCritical?: boolean;
  isOpen?: boolean;
  missionId?: string;
  responsibleId?: string;
  fromDate?: string;
  toDate?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}
