"use client";

import { useEffect, useMemo, useState } from "react";
import { Tag, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import CrudTable, { buildActionsColumn } from "@/components/common/CrudTable";
import CrudFormDrawer from "@/components/common/CrudFormDrawer";
import type { FormFieldSchema } from "@/components/common/form-field";
import {
  paymentsApi,
  studentsApi,
  tuitionFeesApi,
  type CreatePaymentPayload,
} from "@/api/resources";
import type { Payment, PaymentMethod, Student, TuitionFee } from "@/types/models";
import { usePermission } from "@/hooks/usePermission";
import { PERMISSIONS } from "@/lib/permissions";
import { getErrorMessage } from "@/lib/errors";

const METHOD_OPTIONS = [
  { label: "Espèces", value: "ESPECES" },
  { label: "Mobile Money", value: "MOBILE_MONEY" },
  { label: "Virement", value: "VIREMENT" },
  { label: "Chèque", value: "CHEQUE" },
];

const METHOD_COLORS: Record<PaymentMethod, string> = {
  ESPECES: "default",
  MOBILE_MONEY: "blue",
  VIREMENT: "purple",
  CHEQUE: "gold",
};

export default function PaymentsPage() {
  const can = usePermission();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [tuitionFees, setTuitionFees] = useState<TuitionFee[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadPayments = async () => {
    setLoading(true);
    try {
      setPayments(await paymentsApi.list());
    } catch (err) {
      message.error(getErrorMessage(err, "Échec du chargement des paiements"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch-on-mount, not a render-triggered cascade
    loadPayments();
    tuitionFeesApi.list().then(setTuitionFees).catch(() => {});
    studentsApi.list().then(setStudents).catch(() => {});
  }, []);

  const studentLabel = (id: number) => {
    const s = students.find((s) => s.id === id);
    return s ? `${s.first_name} ${s.last_name}` : "—";
  };
  const tuitionFeeLabel = (id: number) => {
    const tf = tuitionFees.find((t) => t.id === id);
    return tf ? `${tf.label} — ${studentLabel(tf.student_id)}` : "—";
  };

  const tuitionFeeOptions = useMemo(
    () => tuitionFees.map((tf) => ({ label: `${tuitionFeeLabel(tf.id)} (solde ${tf.balance})`, value: tf.id })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tuitionFees, students]
  );

  const fields: FormFieldSchema[] = [
    { name: "tuition_fee_id", label: "Échéance", type: "select", required: true, options: tuitionFeeOptions },
    { name: "amount", label: "Montant", type: "number", required: true },
    { name: "payment_date", label: "Date de paiement", type: "date", required: true },
    { name: "method", label: "Méthode", type: "select", options: METHOD_OPTIONS },
    { name: "reference", label: "Référence", type: "text" },
  ];

  const handleSubmit = async (values: CreatePaymentPayload) => {
    setSubmitting(true);
    try {
      await paymentsApi.create(values);
      message.success("Paiement enregistré");
      setDrawerOpen(false);
      await loadPayments();
      await tuitionFeesApi.list().then(setTuitionFees).catch(() => {});
    } catch (err) {
      message.error(getErrorMessage(err, "Échec de l'enregistrement"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (record: Payment) => {
    try {
      await paymentsApi.remove(record.id);
      message.success("Paiement supprimé");
      await loadPayments();
      await tuitionFeesApi.list().then(setTuitionFees).catch(() => {});
    } catch (err) {
      message.error(getErrorMessage(err, "Échec de la suppression"));
    }
  };

  const columns: ColumnsType<Payment> = [
    {
      title: "Élève",
      key: "student",
      render: (_, record) => {
        const tf = tuitionFees.find((t) => t.id === record.tuition_fee_id);
        return tf ? studentLabel(tf.student_id) : "—";
      },
    },
    { title: "Échéance", key: "tuition_fee", render: (_, record) => tuitionFees.find((t) => t.id === record.tuition_fee_id)?.label ?? "—" },
    { title: "Montant", dataIndex: "amount" },
    { title: "Date", dataIndex: "payment_date" },
    { title: "Méthode", dataIndex: "method", render: (v: PaymentMethod) => <Tag color={METHOD_COLORS[v]}>{v}</Tag> },
    { title: "Référence", dataIndex: "reference", render: (v) => v || "—" },
    buildActionsColumn<Payment>({
      onDelete: can(PERMISSIONS.PAYMENTS_DELETE) ? handleDelete : undefined,
    }),
  ];

  return (
    <>
      <CrudTable<Payment>
        title="Paiements"
        data={payments}
        loading={loading}
        rowKey={(r) => r.id}
        columns={columns}
        onCreate={() => setDrawerOpen(true)}
        canCreate={can(PERMISSIONS.PAYMENTS_CREATE)}
      />

      <CrudFormDrawer<CreatePaymentPayload>
        open={drawerOpen}
        title="Nouveau paiement"
        fields={fields}
        submitting={submitting}
        onClose={() => setDrawerOpen(false)}
        onSubmit={handleSubmit}
      />
    </>
  );
}
