"use client";

import { useEffect } from "react";
import { Button, DatePicker, Drawer, Form, Input, InputNumber, Select, Space, Switch } from "antd";
import dayjs from "dayjs";
import type { FormFieldSchema } from "./form-field";

interface CrudFormDrawerProps<TValues extends object> {
  open: boolean;
  title: string;
  fields: FormFieldSchema[];
  initialValues?: object;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (values: TValues) => void | Promise<void>;
}

export default function CrudFormDrawer<TValues extends object>({
  open,
  title,
  fields,
  initialValues,
  submitting,
  onClose,
  onSubmit,
}: CrudFormDrawerProps<TValues>) {
  const [form] = Form.useForm();

  useEffect(() => {
    if (!open) return;
    form.resetFields();

    if (initialValues) {
      const prepared: Record<string, unknown> = { ...(initialValues as Record<string, unknown>) };
      for (const field of fields) {
        const value = prepared[field.name];
        if (field.type === "date" && value) {
          prepared[field.name] = dayjs(value as string);
        }
      }
      form.setFieldsValue(prepared);
    }
  }, [open, initialValues, fields, form]);

  const handleFinish = async (values: Record<string, unknown>) => {
    const prepared: Record<string, unknown> = { ...values };
    for (const field of fields) {
      const value = prepared[field.name];
      if (field.type === "date" && value) {
        prepared[field.name] = (value as dayjs.Dayjs).format("YYYY-MM-DD");
      }
    }
    await onSubmit(prepared as TValues);
  };

  return (
    <Drawer
      title={title}
      open={open}
      onClose={onClose}
      width={420}
      destroyOnHidden
      extra={
        <Space>
          <Button onClick={onClose}>Annuler</Button>
          <Button type="primary" loading={submitting} onClick={() => form.submit()}>
            Enregistrer
          </Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical" onFinish={handleFinish}>
        {fields.map((field) => (
          <Form.Item
            key={field.name}
            name={field.name}
            label={field.label}
            valuePropName={field.type === "switch" ? "checked" : "value"}
            rules={field.rules ?? (field.required ? [{ required: true, message: `${field.label} est requis` }] : [])}
          >
            {field.type === "select" ? (
              <Select options={field.options} placeholder={field.placeholder} allowClear />
            ) : field.type === "number" ? (
              <InputNumber className="w-full" placeholder={field.placeholder} />
            ) : field.type === "date" ? (
              <DatePicker className="w-full" placeholder={field.placeholder} />
            ) : field.type === "textarea" ? (
              <Input.TextArea placeholder={field.placeholder} />
            ) : field.type === "password" ? (
              <Input.Password placeholder={field.placeholder} autoComplete="new-password" />
            ) : field.type === "switch" ? (
              <Switch />
            ) : (
              <Input type={field.type === "email" ? "email" : "text"} placeholder={field.placeholder} />
            )}
          </Form.Item>
        ))}
      </Form>
    </Drawer>
  );
}
