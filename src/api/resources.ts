import api from "./client";
import type { ApiEnvelope } from "@/types/api";
import type {
  AcademicYear,
  Assessment,
  Attendance,
  AttendanceStats,
  Class,
  DashboardStats,
  DayOfWeek,
  EducationCycle,
  Enrollment,
  Grade,
  Guardian,
  Payment,
  Period,
  Permission,
  ReportCard,
  ReportCardDetail,
  Role,
  Schedule,
  School,
  Student,
  StudentGuardian,
  Subject,
  Teacher,
  TeacherAssignment,
  TeacherGender,
  TuitionFee,
  User,
} from "@/types/models";

// Déclenche le téléchargement d'un fichier binaire (PDF) servi par l'API,
// qui répond en `application/pdf` et non dans l'enveloppe JSON habituelle.
async function downloadFile(path: string, filename: string): Promise<void> {
  const res = await api.get<Blob>(path, { responseType: "blob" });
  const url = window.URL.createObjectURL(new Blob([res.data]));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export function createResourceApi<T, TCreate = Partial<T>, TUpdate = Partial<T>>(
  basePath: string
) {
  return {
    list: async (params?: Record<string, unknown>): Promise<T[]> => {
      const res = await api.get<ApiEnvelope<T[]>>(basePath, { params });
      return res.data.data;
    },
    getById: async (id: number | string): Promise<T> => {
      const res = await api.get<ApiEnvelope<T>>(`${basePath}/${id}`);
      return res.data.data;
    },
    create: async (payload: TCreate): Promise<T> => {
      const res = await api.post<ApiEnvelope<T>>(basePath, payload);
      return res.data.data;
    },
    update: async (id: number | string, payload: TUpdate): Promise<T> => {
      const res = await api.put<ApiEnvelope<T>>(`${basePath}/${id}`, payload);
      return res.data.data;
    },
    remove: async (id: number | string): Promise<void> => {
      await api.delete<ApiEnvelope<null>>(`${basePath}/${id}`);
    },
  };
}

export interface CreateUserPayload {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  phone?: string;
  role: "SCHOOL_ADMIN" | "DIRECTOR" | "ACCOUNTANT" | "STAFF";
  school_id?: number;
}

export interface UpdateUserPayload {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
}

export const usersApi = {
  ...createResourceApi<User, CreateUserPayload, UpdateUserPayload>("/users"),
  changeStatus: async (id: number, status: "active" | "inactive" | "suspended") => {
    const res = await api.patch<ApiEnvelope<User>>(`/users/${id}/status`, { status });
    return res.data.data;
  },
  changePassword: async (id: number, new_password: string) => {
    await api.put<ApiEnvelope<null>>(`/users/${id}/change-password`, { new_password });
  },
};

export interface CreateStudentPayload {
  student_number?: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  gender?: string;
  school_id?: number;
}

export type UpdateStudentPayload = Partial<CreateStudentPayload>;

export const studentsApi = {
  ...createResourceApi<Student, CreateStudentPayload, UpdateStudentPayload>("/students"),
  grantAccess: async (id: number, payload: { email: string; password: string }) => {
    const res = await api.post<ApiEnvelope<Student>>(`/students/${id}/grant-access`, payload);
    return res.data.data;
  },
};

export interface CreateSchoolPayload {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
}

export type UpdateSchoolPayload = Partial<CreateSchoolPayload>;

export const schoolsApi = {
  ...createResourceApi<School, CreateSchoolPayload, UpdateSchoolPayload>("/schools"),
  exportData: async (id: number) => {
    await downloadFile(`/schools/${id}/export`, `export-ecole-${id}.zip`);
  },
};

export interface CreateSubjectPayload {
  name: string;
  coefficient_default?: number;
  school_id?: number;
}

export type UpdateSubjectPayload = Partial<Pick<CreateSubjectPayload, "name" | "coefficient_default">>;

export const subjectsApi = createResourceApi<Subject, CreateSubjectPayload, UpdateSubjectPayload>("/subjects");

export interface CreateAcademicYearPayload {
  label: string;
  start_date: string;
  end_date: string;
  school_id?: number;
}

export type UpdateAcademicYearPayload = Partial<Pick<CreateAcademicYearPayload, "label" | "start_date" | "end_date">>;

export const academicYearsApi = {
  ...createResourceApi<AcademicYear, CreateAcademicYearPayload, UpdateAcademicYearPayload>("/academic-years"),
  setCurrent: async (id: number) => {
    const res = await api.patch<ApiEnvelope<AcademicYear>>(`/academic-years/${id}/set-current`);
    return res.data.data;
  },
};

export interface CreatePeriodPayload {
  academic_year_id: number;
  label: string;
  start_date: string;
  end_date: string;
  position?: number;
}

export type UpdatePeriodPayload = Partial<Pick<CreatePeriodPayload, "label" | "start_date" | "end_date" | "position">>;

export const periodsApi = createResourceApi<Period, CreatePeriodPayload, UpdatePeriodPayload>("/periods");

export interface CreateTeacherPayload {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  phone?: string;
  specialty?: string;
  hire_date?: string;
  employee_number?: string;
  gender?: TeacherGender;
  school_id?: number;
}

export type UpdateTeacherPayload = Partial<Pick<CreateTeacherPayload, "specialty" | "hire_date" | "employee_number" | "gender">>;

export const teachersApi = createResourceApi<Teacher, CreateTeacherPayload, UpdateTeacherPayload>("/teachers");

export interface CreateGuardianPayload {
  first_name: string;
  last_name: string;
  phone?: string;
  email?: string;
  address?: string;
}

export type UpdateGuardianPayload = Partial<CreateGuardianPayload>;

export interface ChildSummary {
  student_id: number;
  first_name: string;
  last_name: string;
  student_number: string | null;
  relationship: "PERE" | "MERE" | "TUTEUR" | "AUTRE";
  is_primary_contact: boolean;
  class_id: number | null;
  class_name: string | null;
}

export const guardiansApi = {
  ...createResourceApi<Guardian, CreateGuardianPayload, UpdateGuardianPayload>("/guardians"),
  grantAccess: async (id: number, payload: { email: string; password: string }) => {
    const res = await api.post<ApiEnvelope<Guardian>>(`/guardians/${id}/grant-access`, payload);
    return res.data.data;
  },
  getMyChildren: async (): Promise<ChildSummary[]> => {
    const res = await api.get<ApiEnvelope<ChildSummary[]>>("/guardians/me/children");
    return res.data.data;
  },
};

// Rôles/Permissions : catalogue seedé côté backend, pas de create/update/delete.
export const rolesApi = {
  list: async (): Promise<Role[]> => {
    const res = await api.get<ApiEnvelope<Role[]>>("/roles");
    return res.data.data;
  },
  updatePermissions: async (id: number, permission_ids: number[]): Promise<Role> => {
    const res = await api.put<ApiEnvelope<Role>>(`/roles/${id}/permissions`, { permission_ids });
    return res.data.data;
  },
};

export const permissionsApi = {
  list: async (): Promise<Permission[]> => {
    const res = await api.get<ApiEnvelope<Permission[]>>("/permissions");
    return res.data.data;
  },
};

export interface CreateStudentGuardianPayload {
  student_id: number;
  guardian_id: number;
  relationship: "PERE" | "MERE" | "TUTEUR" | "AUTRE";
  is_primary_contact?: boolean;
}

// Pas de update : on détache et on rattache si le lien doit changer.
export const studentGuardiansApi = {
  list: async (): Promise<StudentGuardian[]> => {
    const res = await api.get<ApiEnvelope<StudentGuardian[]>>("/student-guardians");
    return res.data.data;
  },
  attach: async (payload: CreateStudentGuardianPayload): Promise<StudentGuardian> => {
    const res = await api.post<ApiEnvelope<StudentGuardian>>("/student-guardians", payload);
    return res.data.data;
  },
  detach: async (id: number): Promise<void> => {
    await api.delete<ApiEnvelope<null>>(`/student-guardians/${id}`);
  },
};

export interface CreateClassPayload {
  academic_year_id: number;
  name: string;
  level?: string;
  cycle?: EducationCycle;
  capacity?: number;
}

export type UpdateClassPayload = Partial<Pick<CreateClassPayload, "name" | "level" | "cycle" | "capacity">>;

export interface PromotionEntry {
  student_id: number;
  target_class_id: number;
  status?: "ACTIVE" | "REPEATING";
}

export const classesApi = {
  ...createResourceApi<Class, CreateClassPayload, UpdateClassPayload>("/classes"),
  promote: async (id: number, promotions: PromotionEntry[]): Promise<Enrollment[]> => {
    const res = await api.post<ApiEnvelope<Enrollment[]>>(`/classes/${id}/promote`, { promotions });
    return res.data.data;
  },
  /** Liste des élèves inscrits (actifs + redoublants) au format PDF. */
  exportStudents: async (id: number, filename: string): Promise<void> => {
    await downloadFile(`/classes/${id}/students/export`, filename);
  },
  /** Emploi du temps de la classe au format PDF (heures en lignes, jours en colonnes). */
  exportSchedule: async (id: number, filename: string): Promise<void> => {
    await downloadFile(`/classes/${id}/schedule/export`, filename);
  },
};

export interface CreateEnrollmentPayload {
  student_id: number;
  class_id: number;
  status?: "ACTIVE" | "TRANSFERRED" | "REPEATING" | "WITHDRAWN";
  enrollment_date?: string;
  registration_number?: string;
}

export type UpdateEnrollmentPayload = Partial<Pick<CreateEnrollmentPayload, "status" | "enrollment_date" | "registration_number">>;

export const enrollmentsApi = createResourceApi<Enrollment, CreateEnrollmentPayload, UpdateEnrollmentPayload>(
  "/enrollments"
);

export interface CreateTeacherAssignmentPayload {
  teacher_id: number;
  class_id: number;
  subject_id: number;
}

// Pas de update côté backend : on supprime et recrée si l'affectation doit changer.
export const teacherAssignmentsApi = {
  list: async (): Promise<TeacherAssignment[]> => {
    const res = await api.get<ApiEnvelope<TeacherAssignment[]>>("/teacher-assignments");
    return res.data.data;
  },
  create: async (payload: CreateTeacherAssignmentPayload): Promise<TeacherAssignment> => {
    const res = await api.post<ApiEnvelope<TeacherAssignment>>("/teacher-assignments", payload);
    return res.data.data;
  },
  remove: async (id: number): Promise<void> => {
    await api.delete<ApiEnvelope<null>>(`/teacher-assignments/${id}`);
  },
};

export interface CreateSchedulePayload {
  teacher_assignment_id: number;
  day_of_week: DayOfWeek;
  start_time: string;
  end_time: string;
  room?: string;
}

export type UpdateSchedulePayload = Partial<CreateSchedulePayload>;

export interface ScheduleListFilters {
  class_id?: number;
  teacher_id?: number;
  teacher_assignment_id?: number;
}

export const schedulesApi = {
  ...createResourceApi<Schedule, CreateSchedulePayload, UpdateSchedulePayload>("/schedules"),
  list: async (filters: ScheduleListFilters = {}): Promise<Schedule[]> => {
    const res = await api.get<ApiEnvelope<Schedule[]>>("/schedules", { params: filters });
    return res.data.data;
  },
};

export interface CreateAssessmentPayload {
  teacher_assignment_id: number;
  period_id: number;
  name: string;
  type?: "DEVOIR" | "EXAMEN";
  coefficient?: number;
  max_score?: number;
  date?: string;
}

export type UpdateAssessmentPayload = Partial<Pick<CreateAssessmentPayload, "name" | "type" | "coefficient" | "max_score" | "date">>;

export const assessmentsApi = createResourceApi<Assessment, CreateAssessmentPayload, UpdateAssessmentPayload>(
  "/assessments"
);

export interface CreateGradePayload {
  assessment_id: number;
  student_id: number;
  score: number;
}

export const gradesApi = createResourceApi<Grade, CreateGradePayload, { score: number }>("/grades");

export interface CreateReportCardPayload {
  student_id: number;
  period_id: number;
}

// Pas de update : le contenu se recalcule à la lecture (voir getDetail), seul le statut change via validate.
export interface ReportCardListFilters {
  class_id?: number;
  period_id?: number;
  student_id?: number;
}

export const reportCardsApi = {
  list: async (filters: ReportCardListFilters = {}): Promise<ReportCard[]> => {
    const res = await api.get<ApiEnvelope<ReportCard[]>>("/report-cards", { params: filters });
    return res.data.data;
  },
  create: async (payload: CreateReportCardPayload): Promise<ReportCard> => {
    const res = await api.post<ApiEnvelope<ReportCard>>("/report-cards", payload);
    return res.data.data;
  },
  getDetail: async (id: number): Promise<ReportCardDetail> => {
    const res = await api.get<ApiEnvelope<ReportCardDetail>>(`/report-cards/${id}`);
    return res.data.data;
  },
  validate: async (id: number): Promise<ReportCard> => {
    const res = await api.patch<ApiEnvelope<ReportCard>>(`/report-cards/${id}/validate`);
    return res.data.data;
  },
  remove: async (id: number): Promise<void> => {
    await api.delete<ApiEnvelope<null>>(`/report-cards/${id}`);
  },
  /** Bulletin imprimable (PDF A4) généré par l'API. */
  downloadPdf: async (id: number, filename: string): Promise<void> => {
    await downloadFile(`/report-cards/${id}/pdf`, filename);
  },
  /** Tous les bulletins d'une classe pour une période, deux par feuille A4. */
  downloadClassPdf: async (classId: number, periodId: number, filename: string): Promise<void> => {
    await downloadFile(`/report-cards/class-pdf?class_id=${classId}&period_id=${periodId}`, filename);
  },
};

export interface CreateAttendancePayload {
  student_id: number;
  class_id: number;
  date: string;
  session: "MORNING" | "AFTERNOON";
  status?: "PRESENT" | "ABSENT" | "LATE";
  justified?: boolean;
  reason?: string;
}

export type UpdateAttendancePayload = Partial<Pick<CreateAttendancePayload, "status" | "justified" | "reason">>;

export const attendancesApi = {
  ...createResourceApi<Attendance, CreateAttendancePayload, UpdateAttendancePayload>("/attendances"),
  stats: async (student_id: number, period_id: number): Promise<AttendanceStats> => {
    const res = await api.get<ApiEnvelope<AttendanceStats>>("/attendances/stats", { params: { student_id, period_id } });
    return res.data.data;
  },
};

export interface CreateTuitionFeePayload {
  student_id: number;
  academic_year_id: number;
  label: string;
  amount: number;
  due_date?: string;
}

export type UpdateTuitionFeePayload = Partial<Pick<CreateTuitionFeePayload, "label" | "amount" | "due_date">>;

export const tuitionFeesApi = {
  ...createResourceApi<TuitionFee, CreateTuitionFeePayload, UpdateTuitionFeePayload>("/tuition-fees"),
  downloadInvoice: async (id: number): Promise<void> => {
    await downloadFile(`/tuition-fees/${id}/invoice`, `facture-${id}.pdf`);
  },
};

export interface CreatePaymentPayload {
  tuition_fee_id: number;
  amount: number;
  payment_date: string;
  method?: "ESPECES" | "MOBILE_MONEY" | "VIREMENT" | "CHEQUE";
  reference?: string;
}

// Pas de update : un paiement enregistré est définitif, seule la suppression est possible.
export const paymentsApi = {
  list: async (filters: { tuition_fee_id?: number; student_id?: number } = {}): Promise<Payment[]> => {
    const res = await api.get<ApiEnvelope<Payment[]>>("/payments", { params: filters });
    return res.data.data;
  },
  create: async (payload: CreatePaymentPayload): Promise<Payment> => {
    const res = await api.post<ApiEnvelope<Payment>>("/payments", payload);
    return res.data.data;
  },
  remove: async (id: number): Promise<void> => {
    await api.delete<ApiEnvelope<null>>(`/payments/${id}`);
  },
  downloadReceipt: async (id: number): Promise<void> => {
    await downloadFile(`/payments/${id}/receipt`, `recu-paiement-${id}.pdf`);
  },
};

export const dashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    const res = await api.get<ApiEnvelope<DashboardStats>>("/dashboard/stats");
    return res.data.data;
  },
};
