import { z } from "zod";

export const actionSchema = z.object({
  actionPlanId: z.string().min(1, "Le plan d'action est obligatoire"),
  title: z.string().min(3, "Le libellé est obligatoire"),
  description: z.string().optional(),
  responsibleId: z.string().optional(),
  statusId: z.string().min(1, "Le statut est obligatoire"),
  priority: z.number().min(1).max(5).default(2),
  progressRate: z.number().min(0).max(100).default(0),
  weight: z.number().min(1).max(100).default(100),
  estimatedEffort: z.string().optional(),
  complexity: z.string().optional(),
  plannedStartAt: z.string().optional(),
  plannedEndAt: z.string().optional(),
  deliverable: z.string().optional(),
  expectedProof: z.string().optional(),
  blockReason: z.string().optional(),
  comment: z.string().optional(),
});

export type ActionFormData = z.infer<typeof actionSchema>;

export const actionPlanSchema = z.object({
  recommendationId: z.string().min(1, "La recommandation est obligatoire"),
  title: z.string().min(3, "Le libellé est obligatoire"),
  description: z.string().optional(),
});

export type ActionPlanFormData = z.infer<typeof actionPlanSchema>;
