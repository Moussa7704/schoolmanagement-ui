"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import api, { clearAccessToken, getAccessToken, refreshAccessToken, setAccessToken } from "@/api/client";
import type { ApiEnvelope } from "@/types/api";
import type { AuthUser } from "@/types/models";

interface LoginResponse {
  message: string;
  /** Jeton temporaire de la connexion en cours, exigé pour vérifier ou renvoyer le code. */
  otp_token: string;
  email: string;
  expires_at: string;
}

// Connexion en attente du code : gardée le temps de l'onglet (sessionStorage),
// jamais dans l'adresse de la page (historique, partage de lien…).
const OTP_CHALLENGE_KEY = "pendingOtpLogin";

interface PendingOtpLogin {
  token: string;
  email: string;
}

export const getPendingOtpLogin = (): PendingOtpLogin | null => {
  try {
    const raw = sessionStorage.getItem(OTP_CHALLENGE_KEY);
    return raw ? (JSON.parse(raw) as PendingOtpLogin) : null;
  } catch {
    return null;
  }
};

const setPendingOtpLogin = (value: PendingOtpLogin | null) => {
  try {
    if (value) sessionStorage.setItem(OTP_CHALLENGE_KEY, JSON.stringify(value));
    else sessionStorage.removeItem(OTP_CHALLENGE_KEY);
  } catch {
    // stockage indisponible (navigation privée stricte) : l'utilisateur devra se reconnecter
  }
};

interface VerifyOtpResponse {
  message: string;
  accessToken: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<LoginResponse>;
  resendOtp: () => Promise<void>;
  verifyOtp: (code: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  updateMe: (data: Partial<Pick<AuthUser, "first_name" | "last_name" | "phone" | "email">>) => Promise<AuthUser>;
  changeMyPassword: (currentPassword: string, newPassword: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string, confirmPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Permissions live in the DB, not the JWT (see middlewares/auth.js: `authorize`
// re-reads them every request) — so the frontend hydrates the user from
// /auth/me rather than decoding the access token, to stay in sync the same way.
const fetchMe = async (): Promise<AuthUser> => {
  const res = await api.get<ApiEnvelope<AuthUser>>("/auth/me");
  return res.data.data;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      if (getAccessToken()) {
        try {
          setUser(await fetchMe());
          setLoading(false);
          return;
        } catch {
          clearAccessToken();
        }
      }

      try {
        await refreshAccessToken();
        setUser(await fetchMe());
      } catch {
        clearAccessToken();
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post<LoginResponse>("/auth/login", { email, password });
    setPendingOtpLogin({ token: res.data.otp_token, email: res.data.email });
    return res.data;
  }, []);

  const resendOtp = useCallback(async () => {
    await api.post("/auth/resend-otp", { otp_token: getPendingOtpLogin()?.token });
  }, []);

  const verifyOtp = useCallback(async (code: string) => {
    const res = await api.post<VerifyOtpResponse>("/auth/verify-otp", { otp_token: getPendingOtpLogin()?.token, code });
    setPendingOtpLogin(null);
    setAccessToken(res.data.accessToken);
    const me = await fetchMe();
    setUser(me);
    return me;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // best-effort — clear local state regardless
    }
    clearAccessToken();
    setUser(null);
  }, []);

  const updateMe = useCallback(async (data: Partial<Pick<AuthUser, "first_name" | "last_name" | "phone" | "email">>) => {
    const res = await api.put<ApiEnvelope<AuthUser>>("/auth/me", data);
    setUser(res.data.data);
    return res.data.data;
  }, []);

  const changeMyPassword = useCallback(async (currentPassword: string, newPassword: string) => {
    await api.put("/auth/me/password", { current_password: currentPassword, new_password: newPassword });
  }, []);

  const forgotPassword = useCallback(async (email: string) => {
    await api.post("/auth/forgot-password", { email });
  }, []);

  const resetPassword = useCallback(async (token: string, password: string, confirmPassword: string) => {
    await api.post("/auth/reset-password", { token, password, confirm_password: confirmPassword });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        resendOtp,
        verifyOtp,
        logout,
        updateMe,
        changeMyPassword,
        forgotPassword,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
};
