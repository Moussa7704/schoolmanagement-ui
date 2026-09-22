import {
  ApartmentOutlined,
  BankOutlined,
  BookOutlined,
  CalendarOutlined,
  CheckSquareOutlined,
  ClusterOutlined,
  ContactsOutlined,
  CreditCardOutlined,
  DashboardOutlined,
  DollarOutlined,
  FileDoneOutlined,
  FileTextOutlined,
  FormOutlined,
  IdcardOutlined,
  KeyOutlined,
  SafetyCertificateOutlined,
  ScheduleOutlined,
  SolutionOutlined,
  TeamOutlined,
  UserOutlined,
  UsergroupAddOutlined,
} from "@ant-design/icons";
import type { ComponentType } from "react";
import { PERMISSIONS, type PermissionName } from "./permissions";

export interface NavItem {
  key: string;
  label: string;
  path: string;
  icon: ComponentType;
  // null = always visible (e.g. dashboard home), no backend permission gates it
  permission: PermissionName | null;
  // true for the two modules wired to real pages this pass; the rest render ModuleStub
  implemented: boolean;
}

// Single source of truth for the sidebar Menu and for each stub page's
// title/permission — keeps navigation and route guards from drifting apart
// as the remaining 17 modules get filled in.
export const NAV_ITEMS: NavItem[] = [
  { key: "dashboard", label: "Tableau de bord", path: "/", icon: DashboardOutlined, permission: null, implemented: true },
  { key: "users", label: "Utilisateurs", path: "/users", icon: TeamOutlined, permission: PERMISSIONS.USERS_VIEW, implemented: true },
  { key: "students", label: "Élèves", path: "/students", icon: IdcardOutlined, permission: PERMISSIONS.STUDENTS_VIEW, implemented: true },
  { key: "roles", label: "Rôles", path: "/roles", icon: SafetyCertificateOutlined, permission: PERMISSIONS.ROLES_VIEW, implemented: true },
  // routes/permission.js gate le catalogue sur ROLES_VIEW (pas PERMISSIONS_MANAGE) côté backend — reflété ici à l'identique.
  { key: "permissions", label: "Permissions", path: "/permissions", icon: KeyOutlined, permission: PERMISSIONS.ROLES_VIEW, implemented: true },
  { key: "schools", label: "Écoles", path: "/schools", icon: BankOutlined, permission: PERMISSIONS.SCHOOLS_VIEW, implemented: true },
  { key: "academic-years", label: "Années scolaires", path: "/academic-years", icon: CalendarOutlined, permission: PERMISSIONS.ACADEMIC_YEARS_VIEW, implemented: true },
  { key: "periods", label: "Périodes", path: "/periods", icon: ScheduleOutlined, permission: PERMISSIONS.PERIODS_VIEW, implemented: true },
  { key: "teachers", label: "Enseignants", path: "/teachers", icon: UserOutlined, permission: PERMISSIONS.TEACHERS_VIEW, implemented: true },
  { key: "guardians", label: "Tuteurs / Parents", path: "/guardians", icon: ContactsOutlined, permission: PERMISSIONS.GUARDIANS_VIEW, implemented: true },
  { key: "student-guardians", label: "Liens élève-tuteur", path: "/student-guardians", icon: ApartmentOutlined, permission: PERMISSIONS.STUDENT_GUARDIANS_VIEW, implemented: true },
  { key: "subjects", label: "Matières", path: "/subjects", icon: BookOutlined, permission: PERMISSIONS.SUBJECTS_VIEW, implemented: true },
  { key: "classes", label: "Classes", path: "/classes", icon: ClusterOutlined, permission: PERMISSIONS.CLASSES_VIEW, implemented: true },
  { key: "enrollments", label: "Inscriptions", path: "/enrollments", icon: SolutionOutlined, permission: PERMISSIONS.ENROLLMENTS_VIEW, implemented: true },
  { key: "teacher-assignments", label: "Affectations enseignants", path: "/teacher-assignments", icon: UsergroupAddOutlined, permission: PERMISSIONS.TEACHER_ASSIGNMENTS_VIEW, implemented: true },
  { key: "assessments", label: "Évaluations", path: "/assessments", icon: FormOutlined, permission: PERMISSIONS.ASSESSMENTS_VIEW, implemented: true },
  { key: "grades", label: "Notes", path: "/grades", icon: FileTextOutlined, permission: PERMISSIONS.GRADES_VIEW, implemented: true },
  { key: "report-cards", label: "Bulletins", path: "/report-cards", icon: FileDoneOutlined, permission: PERMISSIONS.REPORT_CARDS_VIEW, implemented: true },
  { key: "attendances", label: "Présences", path: "/attendances", icon: CheckSquareOutlined, permission: PERMISSIONS.ATTENDANCES_VIEW, implemented: true },
  { key: "tuition-fees", label: "Frais de scolarité", path: "/tuition-fees", icon: DollarOutlined, permission: PERMISSIONS.TUITION_FEES_VIEW, implemented: true },
  { key: "payments", label: "Paiements", path: "/payments", icon: CreditCardOutlined, permission: PERMISSIONS.PAYMENTS_VIEW, implemented: true },
];

export const getNavItem = (key: string): NavItem => {
  const item = NAV_ITEMS.find((i) => i.key === key);
  if (!item) throw new Error(`Unknown nav item: ${key}`);
  return item;
};
