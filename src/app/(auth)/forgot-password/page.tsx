"use client";

import { useState } from "react";
import { Button, Card, Form, Input, Result, Typography } from "antd";
import { MailOutlined } from "@ant-design/icons";
import { useAuth } from "@/hooks/useAuth";
import { useMessage } from "@/hooks/useMessage";
import { getErrorMessage } from "@/lib/errors";

export default function ForgotPasswordPage() {
  const message = useMessage();
  const { forgotPassword } = useAuth();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleFinish = async (values: { email: string }) => {
    setLoading(true);
    try {
      await forgotPassword(values.email);
      setSent(true);
    } catch (err) {
      message.error(getErrorMessage(err, "Échec de l'envoi"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-sm shadow-md">
        {sent ? (
          <Result
            status="success"
            title="Email envoyé"
            subTitle="Vérifiez votre boîte de réception pour réinitialiser votre mot de passe."
          />
        ) : (
          <>
            <Typography.Title level={3} className="!mb-1 text-center">
              Mot de passe oublié
            </Typography.Title>
            <Typography.Paragraph type="secondary" className="text-center">
              Saisissez votre email pour recevoir un lien de réinitialisation
            </Typography.Paragraph>
            <Form layout="vertical" onFinish={handleFinish} disabled={loading}>
              <Form.Item name="email" label="Email" rules={[{ required: true, type: "email", message: "Email invalide" }]}>
                <Input prefix={<MailOutlined />} placeholder="vous@ecole.com" autoComplete="email" />
              </Form.Item>
              <Button type="primary" htmlType="submit" block loading={loading}>
                Envoyer le lien
              </Button>
            </Form>
          </>
        )}
      </Card>
    </div>
  );
}
