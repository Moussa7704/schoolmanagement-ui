"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Form, Input, Typography } from "antd";
import { LockOutlined, MailOutlined } from "@ant-design/icons";
import { useAuth } from "@/hooks/useAuth";
import { useMessage } from "@/hooks/useMessage";
import { getErrorMessage } from "@/lib/errors";

interface LoginFormValues {
  email: string;
  password: string;
}

export default function LoginPage() {
  const message = useMessage();
  const { login } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleFinish = async (values: LoginFormValues) => {
    setLoading(true);
    try {
      const res = await login(values.email, values.password);
      message.success(res.message);
      // Le jeton de la connexion en cours est gardé par AuthContext (sessionStorage),
      // pas dans l'adresse de la page.
      router.push("/verify-otp");
    } catch (err) {
      message.error(getErrorMessage(err, "Échec de la connexion"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-sm shadow-md">
        <Typography.Title level={3} className="!mb-1 text-center">
          SchoolManager
        </Typography.Title>
        <Typography.Paragraph type="secondary" className="text-center">
          Connectez-vous à votre espace
        </Typography.Paragraph>
        <Form layout="vertical" onFinish={handleFinish} disabled={loading}>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: "email", message: "Email invalide" }]}>
            <Input prefix={<MailOutlined />} placeholder="vous@ecole.com" autoComplete="email" />
          </Form.Item>
          <Form.Item name="password" label="Mot de passe" rules={[{ required: true, message: "Mot de passe requis" }]}>
            <Input.Password prefix={<LockOutlined />} autoComplete="current-password" />
          </Form.Item>
          <div className="text-right mb-4">
            <a href="/forgot-password">Mot de passe oublié ?</a>
          </div>
          <Button type="primary" htmlType="submit" block loading={loading}>
            Se connecter
          </Button>
        </Form>
      </Card>
    </div>
  );
}
