"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Card, Form, Input, Typography, message } from "antd";
import { SafetyOutlined } from "@ant-design/icons";
import { useAuth } from "@/hooks/useAuth";
import { getErrorMessage } from "@/lib/errors";

function VerifyOtpForm() {
  const searchParams = useSearchParams();
  const userId = Number(searchParams.get("user_id"));
  const email = searchParams.get("email") ?? "";

  const { verifyOtp, resendOtp } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleFinish = async (values: { code: string }) => {
    setLoading(true);
    try {
      await verifyOtp(userId, values.code);
      router.push("/");
    } catch (err) {
      message.error(getErrorMessage(err, "Code invalide"));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await resendOtp(userId);
      message.success("Un nouveau code a été envoyé");
    } catch (err) {
      message.error(getErrorMessage(err, "Échec de l'envoi"));
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
          Un code à 6 chiffres a été envoyé à {email || "votre adresse email"}
        </Typography.Paragraph>
        <Form layout="vertical" onFinish={handleFinish} disabled={loading}>
          <Form.Item
            name="code"
            label="Code de vérification"
            rules={[{ required: true, len: 6, message: "Le code doit contenir 6 chiffres" }]}
          >
            <Input prefix={<SafetyOutlined />} maxLength={6} placeholder="123456" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={loading}>
            Vérifier
          </Button>
        </Form>
        <div className="text-center mt-4">
          <Button type="link" onClick={handleResend} loading={resending}>
            Renvoyer le code
          </Button>
        </div>
      </Card>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={null}>
      <VerifyOtpForm />
    </Suspense>
  );
}
