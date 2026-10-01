"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Form, Input, Typography } from "antd";
import { SafetyOutlined } from "@ant-design/icons";
import { useAuth } from "@/hooks/useAuth";
import { useMessage } from "@/hooks/useMessage";
import { getErrorMessage } from "@/lib/errors";
import { getPendingOtpLogin } from "@/context/AuthContext";

// Délai affiché avant de pouvoir redemander un code (même règle que l'API).
const RESEND_COOLDOWN_S = 60;

export default function VerifyOtpPage() {
  const message = useMessage();
  const { verifyOtp, resendOtp } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_S);

  // Sans connexion en cours (page rouverte, onglet différent…), retour au login.
  useEffect(() => {
    const pending = getPendingOtpLogin();
    if (!pending) {
      router.replace("/login");
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lecture unique du stockage de session au montage
    setEmail(pending.email);
  }, [router]);

  // Compte à rebours du bouton « Renvoyer le code ».
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  // Session de connexion expirée ou falsifiée : il faut ressaisir le mot de passe.
  const isChallengeExpired = (err: unknown) =>
    (err as { response?: { status?: number } })?.response?.status === 401;

  const handleFinish = async (values: { code: string }) => {
    setLoading(true);
    try {
      await verifyOtp(values.code);
      router.push("/");
    } catch (err) {
      message.error(getErrorMessage(err, "Code invalide"));
      if (isChallengeExpired(err)) router.replace("/login");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await resendOtp();
      message.success("Un nouveau code a été envoyé");
      setCooldown(RESEND_COOLDOWN_S);
    } catch (err) {
      message.error(getErrorMessage(err, "Échec de l'envoi"));
      if (isChallengeExpired(err)) router.replace("/login");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-sm shadow-md">
        <Typography.Title level={3} className="!mb-1 text-center">
          Vérification
        </Typography.Title>
        <Typography.Paragraph type="secondary" className="text-center">
          Un code à 6 chiffres a été envoyé à {email || "votre adresse email"}. Il est valable 10 minutes.
        </Typography.Paragraph>
        <Form layout="vertical" onFinish={handleFinish} disabled={loading}>
          <Form.Item
            name="code"
            label="Code de vérification"
            rules={[{ required: true, pattern: /^\d{6}$/, message: "Le code doit contenir 6 chiffres" }]}
          >
            <Input prefix={<SafetyOutlined />} maxLength={6} placeholder="123456" inputMode="numeric" autoComplete="one-time-code" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={loading}>
            Vérifier
          </Button>
        </Form>
        <div className="text-center mt-4">
          <Button type="link" onClick={handleResend} loading={resending} disabled={cooldown > 0}>
            {cooldown > 0 ? `Renvoyer le code (${cooldown} s)` : "Renvoyer le code"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
