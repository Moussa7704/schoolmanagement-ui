import type { AuthUser } from "@/types/models";

// Mirrors the `Permission.name` rows seeded in schoolmanagement-api
// (seeders/*-permissions*.js) — one entry per `authorize(...)` check backend-side.
export const PERMISSIONS = {
  USERS_VIEW: "users.view",
  USERS_CREATE: "users.create",
  USERS_UPDATE: "users.update",
  USERS_DELETE: "users.delete",
  USERS_CHANGE_STATUS: "users.change_status",
  USERS_CHANGE_PASSWORD: "users.change_password",

  ROLES_VIEW: "roles.view",
  ROLES_MANAGE: "roles.manage",
  PERMISSIONS_MANAGE: "permissions.manage",

  SCHOOLS_VIEW: "schools.view",
  SCHOOLS_CREATE: "schools.create",
  SCHOOLS_UPDATE: "schools.update",
  SCHOOLS_DELETE: "schools.delete",

  ACADEMIC_YEARS_VIEW: "academic_years.view",
  ACADEMIC_YEARS_CREATE: "academic_years.create",
  ACADEMIC_YEARS_UPDATE: "academic_years.update",
  ACADEMIC_YEARS_DELETE: "academic_years.delete",

  PERIODS_VIEW: "periods.view",
  PERIODS_CREATE: "periods.create",
  PERIODS_UPDATE: "periods.update",
  PERIODS_DELETE: "periods.delete",

  TEACHERS_VIEW: "teachers.view",
  TEACHERS_CREATE: "teachers.create",
  TEACHERS_UPDATE: "teachers.update",
  TEACHERS_DELETE: "teachers.delete",

  STUDENTS_VIEW: "students.view",
  STUDENTS_CREATE: "students.create",
  STUDENTS_UPDATE: "students.update",
  STUDENTS_DELETE: "students.delete",
  STUDENTS_GRANT_ACCESS: "students.grant_access",

  GUARDIANS_VIEW: "guardians.view",
  GUARDIANS_CREATE: "guardians.create",
  GUARDIANS_UPDATE: "guardians.update",
  GUARDIANS_DELETE: "guardians.delete",
  GUARDIANS_GRANT_ACCESS: "guardians.grant_access",

  STUDENT_GUARDIANS_VIEW: "student_guardians.view",
  STUDENT_GUARDIANS_CREATE: "student_guardians.create",
  STUDENT_GUARDIANS_DELETE: "student_guardians.delete",

  SUBJECTS_VIEW: "subjects.view",
  SUBJECTS_CREATE: "subjects.create",
  SUBJECTS_UPDATE: "subjects.update",
  SUBJECTS_DELETE: "subjects.delete",

  CLASSES_VIEW: "classes.view",
  CLASSES_CREATE: "classes.create",
  CLASSES_UPDATE: "classes.update",
  CLASSES_DELETE: "classes.delete",

  ENROLLMENTS_VIEW: "enrollments.view",
  ENROLLMENTS_CREATE: "enrollments.create",
  ENROLLMENTS_UPDATE: "enrollments.update",
  ENROLLMENTS_DELETE: "enrollments.delete",

  TEACHER_ASSIGNMENTS_VIEW: "teacher_assignments.view",
  TEACHER_ASSIGNMENTS_CREATE: "teacher_assignments.create",
  TEACHER_ASSIGNMENTS_DELETE: "teacher_assignments.delete",

  ASSESSMENTS_VIEW: "assessments.view",
  ASSESSMENTS_CREATE: "assessments.create",
  ASSESSMENTS_UPDATE: "assessments.update",
  ASSESSMENTS_DELETE: "assessments.delete",

  GRADES_VIEW: "grades.view",
  GRADES_CREATE: "grades.create",
  GRADES_UPDATE: "grades.update",
  GRADES_DELETE: "grades.delete",

  REPORT_CARDS_VIEW: "report_cards.view",
  REPORT_CARDS_CREATE: "report_cards.create",
  REPORT_CARDS_DELETE: "report_cards.delete",
  REPORT_CARDS_VALIDATE: "report_cards.validate",

  ATTENDANCES_VIEW: "attendances.view",
  ATTENDANCES_CREATE: "attendances.create",
  ATTENDANCES_UPDATE: "attendances.update",
  ATTENDANCES_DELETE: "attendances.delete",

  TUITION_FEES_VIEW: "tuition_fees.view",
  TUITION_FEES_CREATE: "tuition_fees.create",
  TUITION_FEES_UPDATE: "tuition_fees.update",
  TUITION_FEES_DELETE: "tuition_fees.delete",

  PAYMENTS_VIEW: "payments.view",
  PAYMENTS_CREATE: "payments.create",
  PAYMENTS_DELETE: "payments.delete",
} as const;

export type PermissionName = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// Mirrors middlewares/auth.js's `authorize(...permissionNames)` exactly:
// SUPER_ADMIN always passes, everyone else needs the permission on their Role.
export const can = (user: AuthUser | null, permission: PermissionName): boolean => {
  if (!user) return false;
  if (user.Role?.name === "SUPER_ADMIN") return true;
  return user.Role?.Permissions?.some((p) => p.name === permission) ?? false;
};
