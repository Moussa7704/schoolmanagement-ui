import type { EducationCycle } from "@/types/models";

export const CYCLE_LABELS: Record<EducationCycle, string> = {
  PRESCOLAIRE: "Préscolaire / Maternelle",
  PRIMAIRE: "Primaire",
  COLLEGE: "Collège",
  LYCEE: "Lycée",
  SUPERIEUR: "Supérieur",
};

export const CYCLE_OPTIONS = (Object.keys(CYCLE_LABELS) as EducationCycle[]).map((value) => ({
  label: CYCLE_LABELS[value],
  value,
}));
