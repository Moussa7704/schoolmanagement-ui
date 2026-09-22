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
