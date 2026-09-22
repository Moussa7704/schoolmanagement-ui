"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Card, Form, Input, Result, Typography, message } from "antd";
import { LockOutlined } from "@ant-design/icons";
import { useAuth } from "@/hooks/useAuth";
import { getErrorMessage } from "@/lib/errors";

interface ResetPasswordFormValues {
  password: string;
  confirm_password: string;
}

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const { resetPassword } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleFinish = async (values: ResetPasswordFormValues) => {
    setLoading(true);
    try {
      await resetPassword(token, values.password, values.confirm_password);
      setDone(true);
    } catch (err) {
      message.error(getErrorMessage(err, "Échec de la réinitialisation"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-sm shadow-md">
        {done ? (
          <Result
            status="success"
            title="Mot de passe réinitialisé"
            extra={
              <Button type="primary" onClick={() => router.push("/login")}>
                Aller à la connexion
              </Button>
            }
          />
        ) : (
          <>
            <Typography.Title level={3} className="!mb-1 text-center">
              Réinitialiser le mot de passe
            </Typography.Title>
            <Form layout="vertical" onFinish={handleFinish} disabled={loading}>
              <Form.Item
                name="password"
                label="Nouveau mot de passe"
                rules={[{ required: true, min: 8, message: "8 caractères minimum" }]}
              >
                <Input.Password prefix={<LockOutlined />} autoComplete="new-password" />
              </Form.Item>
              <Form.Item
                name="confirm_password"
                label="Confirmer le mot de passe"
                dependencies={["password"]}
                rules={[
                  { required: true, message: "Confirmation requise" },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue("password") === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error("Les mots de passe ne correspondent pas"));
                    },
                  }),
                ]}
              >
                <Input.Password prefix={<LockOutlined />} autoComplete="new-password" />
              </Form.Item>
              <Button type="primary" htmlType="submit" block loading={loading}>
                Réinitialiser
              </Button>
            </Form>
          </>
        )}
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
