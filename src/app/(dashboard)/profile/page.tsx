"use client";

import { useState } from "react";
import { Button, Card, Form, Input, Space, Tag } from "antd";
import { useAuth } from "@/hooks/useAuth";
import { useMessage } from "@/hooks/useMessage";
import { getErrorMessage } from "@/lib/errors";

interface ProfileFormValues {
  first_name: string;
  last_name: string;
  phone?: string;
  email: string;
}

interface PasswordFormValues {
  current_password: string;
  new_password: string;
}

export default function ProfilePage() {
  const message = useMessage();
  const { user, updateMe, changeMyPassword } = useAuth();
  const [passwordForm] = Form.useForm<PasswordFormValues>();
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const handleProfileSubmit = async (values: ProfileFormValues) => {
    setSavingProfile(true);
    try {
      await updateMe(values);
      message.success("Profil mis à jour avec succès");
    } catch (err) {
      message.error(getErrorMessage(err, "Échec de la mise à jour du profil"));
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (values: PasswordFormValues) => {
    setSavingPassword(true);
    try {
      await changeMyPassword(values.current_password, values.new_password);
      message.success("Mot de passe modifié avec succès");
      passwordForm.resetFields();
    } catch (err) {
      message.error(getErrorMessage(err, "Échec du changement de mot de passe"));
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <Card
        title="Mon profil"
        extra={
          <Space>
            <Tag color="blue">{user?.Role?.name}</Tag>
            <Tag>{user?.status}</Tag>
          </Space>
        }
      >
        <Form<ProfileFormValues>
          layout="vertical"
          initialValues={{
            first_name: user?.first_name,
            last_name: user?.last_name,
            phone: user?.phone ?? undefined,
            email: user?.email,
          }}
          onFinish={handleProfileSubmit}
          disabled={savingProfile}
        >
          <Form.Item name="first_name" label="Prénom" rules={[{ required: true, message: "Prénom requis" }]}>
            <Input />
          </Form.Item>
          <Form.Item name="last_name" label="Nom" rules={[{ required: true, message: "Nom requis" }]}>
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="Téléphone">
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: "email", message: "Email invalide" }]}>
            <Input />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={savingProfile}>
            Enregistrer
          </Button>
        </Form>
      </Card>

      <Card title="Changer le mot de passe" className="mt-6">
        <Form<PasswordFormValues>
          form={passwordForm}
          layout="vertical"
          onFinish={handlePasswordSubmit}
          disabled={savingPassword}
        >
          <Form.Item
            name="current_password"
            label="Mot de passe actuel"
            rules={[{ required: true, message: "Mot de passe actuel requis" }]}
          >
            <Input.Password autoComplete="current-password" />
          </Form.Item>
          <Form.Item
            name="new_password"
            label="Nouveau mot de passe"
            rules={[{ required: true, min: 8, message: "8 caractères minimum" }]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={savingPassword}>
            Modifier le mot de passe
          </Button>
        </Form>
      </Card>
    </div>
  );
}
