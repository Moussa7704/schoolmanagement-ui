export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
  pagination: unknown;
}

export interface ApiErrorBody {
  message?: string;
  error?: string;
}
