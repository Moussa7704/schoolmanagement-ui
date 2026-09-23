export type UserStatus = "active" | "inactive" | "suspended" | "pending";

export type RoleName =
  | "SUPER_ADMIN"
  | "SCHOOL_ADMIN"
  | "DIRECTOR"
  | "ACCOUNTANT"
  | "TEACHER"
  | "STUDENT"
  | "PARENT"
  | "STAFF";

export interface Permission {
  id: number;
  name: string;
  description: string | null;
}

export interface Role {
  id: number;
  name: RoleName;
  description: string | null;
  Permissions?: Permission[];
}

export interface School {
  id: number;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
}

export interface AuthUser {
  id: number;
  school_id: number | null;
  role_id: number;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string;
  status: UserStatus;
  Role: Role;
  School?: School;
}

export interface User {
  id: number;
  school_id: number | null;
  role_id: number;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string;
  status: UserStatus;
  Role?: Role;
  School?: School;
}

export interface Student {
  id: number;
  user_id: number | null;
  school_id: number;
  student_number: string | null;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  gender: string | null;
  School?: School;
}

export interface Subject {
  id: number;
  school_id: number;
  name: string;
  coefficient_default: number;
  School?: School;
}

export interface AcademicYear {
  id: number;
  school_id: number;
  label: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  School?: School;
}

export interface Period {
  id: number;
  academic_year_id: number;
  label: string;
  start_date: string;
  end_date: string;
  position: number;
}

export interface Teacher {
  id: number;
  user_id: number;
  school_id: number;
  specialty: string | null;
  hire_date: string | null;
  employee_number: string | null;
  User?: User;
  School?: School;
}

export interface Guardian {
  id: number;
  user_id: number | null;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  User?: Pick<User, "id" | "email" | "status">;
}

export type GuardianRelationship = "PERE" | "MERE" | "TUTEUR" | "AUTRE";

export interface StudentGuardian {
  id: number;
  student_id: number;
  guardian_id: number;
  relationship: GuardianRelationship;
  is_primary_contact: boolean;
  Student?: Pick<Student, "id" | "first_name" | "last_name" | "school_id">;
  Guardian?: Pick<Guardian, "id" | "first_name" | "last_name" | "phone" | "email">;
}

export interface Class {
  id: number;
  academic_year_id: number;
  name: string;
  level: string | null;
  capacity: number | null;
  students_count?: number;
  boys_count?: number;
  girls_count?: number;
}

export type EnrollmentStatus = "ACTIVE" | "TRANSFERRED" | "REPEATING" | "WITHDRAWN";

export interface Enrollment {
  id: number;
  student_id: number;
  class_id: number;
  academic_year_id: number;
  status: EnrollmentStatus;
  enrollment_date: string | null;
  registration_number: string | null;
}

export interface TeacherAssignment {
  id: number;
  teacher_id: number;
  class_id: number;
  subject_id: number;
  academic_year_id: number;
}

export type AssessmentType = "DEVOIR" | "EXAMEN";

export interface Assessment {
  id: number;
  teacher_assignment_id: number;
  period_id: number;
  name: string;
  type: AssessmentType;
  coefficient: number;
  max_score: number;
  date: string | null;
}

export interface Grade {
  id: number;
  assessment_id: number;
  student_id: number;
  score: number;
  // Présent sur les réponses de GET /grades (jointure jusqu'à la matière) —
  // absent des payloads envoyés en création/modification.
  Assessment?: Assessment & {
    TeacherAssignment?: TeacherAssignment & {
      Subject?: Subject;
    };
  };
}

export type ReportCardStatus = "DRAFT" | "VALIDATED";

export interface ReportCard {
  id: number;
  student_id: number;
  class_id: number;
  period_id: number;
  status: ReportCardStatus;
  generated_at: string | null;
  validated_at: string | null;
  validated_by: number | null;
}

export interface ReportCardSubjectAverage {
  subject_id: number;
  subject_name: string;
  coefficient: number;
  average: number | null;
}

export interface ReportCardDetail extends ReportCard {
  subjects: ReportCardSubjectAverage[];
  overall_average: number | null;
}

export type AttendanceSession = "MORNING" | "AFTERNOON";
export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE";

export interface Attendance {
  id: number;
  student_id: number;
  class_id: number;
  date: string;
  session: AttendanceSession;
  status: AttendanceStatus;
  justified: boolean;
  reason: string | null;
}

export interface AttendanceStats {
  student_id: number;
  period_id: number;
  total_sessions: number;
  present_count: number;
  absent_count: number;
  late_count: number;
  absenteeism_rate: number | null;
}

export type TuitionFeeStatus = "PAID" | "OVERDUE" | "PARTIAL" | "PENDING";

export interface TuitionFee {
  id: number;
  student_id: number;
  academic_year_id: number;
  label: string;
  amount: number;
  due_date: string | null;
  paid_amount: number;
  balance: number;
  status: TuitionFeeStatus;
}

export type PaymentMethod = "ESPECES" | "MOBILE_MONEY" | "VIREMENT" | "CHEQUE";

export interface Payment {
  id: number;
  tuition_fee_id: number;
  amount: number;
  payment_date: string;
  method: PaymentMethod;
  reference: string | null;
}
