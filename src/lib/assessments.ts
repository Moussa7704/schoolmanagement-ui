import type { AssessmentType } from "@/types/models";

// Vocabulaire des écoles maliennes : un devoir en cours de trimestre, une
// composition en fin de trimestre (compte double dans la moyenne du bulletin).
export const ASSESSMENT_TYPE_LABELS: Record<AssessmentType, string> = {
  DEVOIR: "Devoir",
  COMPOSITION: "Composition",
};

export const ASSESSMENT_TYPE_OPTIONS = (Object.keys(ASSESSMENT_TYPE_LABELS) as AssessmentType[]).map((value) => ({
  label: ASSESSMENT_TYPE_LABELS[value],
  value,
}));
