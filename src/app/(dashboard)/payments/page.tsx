"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Select, Tag, Typography } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { useMessage } from "@/hooks/useMessage";
import CrudTable, { buildActionsColumn } from "@/components/common/CrudTable";
import CrudFormDrawer from "@/components/common/CrudFormDrawer";
import type { FormFieldSchema } from "@/components/common/form-field";
import {
  classesApi,
  enrollmentsApi,
  paymentsApi,
  studentsApi,
  tuitionFeesApi,
  type CreatePaymentPayload,
} from "@/api/resources";
import type { Class, Enrollment, Payment, PaymentMethod, Student, TuitionFee } from "@/types/models";
import { usePermission } from "@/hooks/usePermission";
import { PERMISSIONS } from "@/lib/permissions";
import { getErrorMessage } from "@/lib/errors";

const METHOD_LABELS: Record<PaymentMethod, string> = {
  ESPECES: "Espèces",
  MOBILE_MONEY: "Mobile Money",
  VIREMENT: "Virement",
  CHEQUE: "Chèque",
};
const METHOD_OPTIONS = (Object.keys(METHOD_LABELS) as PaymentMethod[]).map((value) => ({ label: METHOD_LABELS[value], value }));

// 25000 -> "25 000 CFA"
const formatAmount = (value: number) => `${value.toLocaleString("fr-FR")} CFA`;

const METHOD_COLORS: Record<PaymentMethod, string> = {
  ESPECES: "default",
  MOBILE_MONEY: "blue",
  VIREMENT: "purple",
  CHEQUE: "gold",
};

export default function PaymentsPage() {
  const message = useMessage();
  const can = usePermission();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [tuitionFees, setTuitionFees] = useState<TuitionFee[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [classes, setClasses] = useState<Class[]>([]);
  const [classEnrollments, setClassEnrollments] = useState<Enrollment[]>([]);
  const [classId, setClassId] = useState<number | undefined>();

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
    classesApi.list().then(setClasses).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadPayments is a stable mount-time fetch, not meant to re-run when its own closure identity changes
  }, []);

  // Inscriptions de la classe choisie, rechargées à chaque changement de classe.
  useEffect(() => {
    if (!classId) return;
    enrollmentsApi
      .list({ class_id: classId })
      .then(setClassEnrollments)
      .catch((err) => message.error(getErrorMessage(err, "Échec du chargement des élèves de la classe")));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `message` is a stable App.useApp() instance
  }, [classId]);

  const selectedClass = classes.find((c) => c.id === classId);

  const classOptions = useMemo(
    () => classes.map((c) => ({ label: c.name, value: c.id })).sort((a, b) => a.label.localeCompare(b.label, "fr")),
    [classes]
  );

  const studentLabel = (id: number) => {
    const s = students.find((s) => s.id === id);
    return s ? `${s.last_name} ${s.first_name}` : "—";
  };

  // Échéances de la classe choisie : élèves inscrits dans la classe (y compris
  // un élève transféré en cours d'année, qui peut encore payer), année de la classe.
  const classTuitionFees = useMemo(() => {
    if (!classId || !selectedClass) return [];
    const classStudentIds = new Set(classEnrollments.filter((e) => e.class_id === classId).map((e) => e.student_id));
    return tuitionFees.filter(
      (tf) => classStudentIds.has(tf.student_id) && tf.academic_year_id === selectedClass.academic_year_id
    );
  }, [classEnrollments, classId, selectedClass, tuitionFees]);

  // Formulaire : seulement les échéances encore à payer, triées par élève.
  const tuitionFeeOptions = useMemo(
    () =>
      classTuitionFees
        .filter((tf) => (tf.balance ?? tf.amount) > 0)
        .map((tf) => ({
          label: `${studentLabel(tf.student_id)} — ${tf.label}`,
          value: tf.id,
        }))
        .sort((a, b) => a.label.localeCompare(b.label, "fr")),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- studentLabel ne dépend que de students
    [classTuitionFees, students]
  );

  // Tableau : seulement les paiements des échéances de la classe choisie.
  const visiblePayments = useMemo(() => {
    if (!classId) return payments;
    const ids = new Set(classTuitionFees.map((tf) => tf.id));
    return payments.filter((p) => ids.has(p.tuition_fee_id));
  }, [classId, classTuitionFees, payments]);

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

  const handleDownloadReceipt = async (record: Payment) => {
    setDownloadingId(record.id);
    try {
      await paymentsApi.downloadReceipt(record.id);
    } catch (err) {
      message.error(getErrorMessage(err, "Échec du téléchargement du reçu"));
    } finally {
      setDownloadingId(null);
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
    {
      title: "Méthode",
      dataIndex: "method",
      render: (v: PaymentMethod) => <Tag color={METHOD_COLORS[v]}>{METHOD_LABELS[v] ?? v}</Tag>,
    },
    { title: "Référence", dataIndex: "reference", render: (v) => v || "—" },
    buildActionsColumn<Payment>({
      onDelete: can(PERMISSIONS.PAYMENTS_DELETE) ? handleDelete : undefined,
      extra: (record) => (
        <Button
          size="small"
          icon={<DownloadOutlined />}
          loading={downloadingId === record.id}
          onClick={() => handleDownloadReceipt(record)}
        >
          Reçu
        </Button>
      ),
    }),
  ];

  return (
    <>
      <CrudTable<Payment>
        title="Paiements"
        data={visiblePayments}
        loading={loading}
        rowKey={(r) => r.id}
        columns={columns}
        onCreate={() => setDrawerOpen(true)}
        // L'enregistrement commence par le choix de la classe : sans elle, on ne
        // sait pas quelles échéances proposer.
        canCreate={can(PERMISSIONS.PAYMENTS_CREATE) && !!classId}
        extraActions={
          <>
            <Select
              showSearch
              allowClear
              optionFilterProp="label"
              placeholder="Choisir une classe"
              style={{ width: 220 }}
              options={classOptions}
              value={classId}
              onChange={(value?: number) => {
                setClassEnrollments([]);
                setClassId(value);
              }}
            />
            {!classId && can(PERMISSIONS.PAYMENTS_CREATE) && (
              <Typography.Text type="secondary">Choisissez une classe pour enregistrer un paiement</Typography.Text>
            )}
          </>
        }
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
