import type { Rule } from "antd/es/form";

export type FormFieldType = "text" | "email" | "password" | "select" | "date" | "time" | "textarea" | "number" | "switch";

export interface FormFieldOption {
  label: string;
  value: string | number;
}

export interface FormFieldSchema {
  name: string;
  label: string;
  type: FormFieldType;
  required?: boolean;
  options?: FormFieldOption[];
  placeholder?: string;
  rules?: Rule[];
}
