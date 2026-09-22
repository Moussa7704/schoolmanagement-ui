import api from "./client";
import type { ApiEnvelope } from "@/types/api";
import type { School, Student, User } from "@/types/models";

export function createResourceApi<T, TCreate = Partial<T>, TUpdate = Partial<T>>(
  basePath: string
) {
  return {
    list: async (): Promise<T[]> => {
      const res = await api.get<ApiEnvelope<T[]>>(basePath);
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

export const schoolsApi = createResourceApi<School>("/schools");
