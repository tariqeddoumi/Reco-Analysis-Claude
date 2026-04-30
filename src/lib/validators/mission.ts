import { z } from "zod";

export const missionSchema = z.object({
  reference: z.string().min(1, "La référence est obligatoire"),
  title: z.string().min(3, "Le libellé est obligatoire (min 3 caractères)"),
  description: z.string().optional(),
  missionTypeId: z.string().min(1, "Le type de mission est obligatoire"),
  sourceId: z.string().min(1, "La source est obligatoire"),
  issuingAuthority: z.string().optional(),
  entityId: z.string().min(1, "L'entité est obligatoire"),
  scope: z.string().optional(),
  periodCovered: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  reportReceivedAt: z.string().optional(),
  reportValidatedAt: z.string().optional(),
  responsibleId: z.string().min(1, "Le responsable est obligatoire"),
  confidentialityLevelId: z.string().min(1, "Le niveau de confidentialité est obligatoire"),
  statusId: z.string().min(1, "Le statut est obligatoire"),
  observations: z.string().optional(),
});

export type MissionFormData = z.infer<typeof missionSchema>;
