"use client";

import { useEffect, useState } from "react";
import { Button, Card, Descriptions, Empty, Select, Spin, Table, Tabs, Tag, Typography } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import { useMessage } from "@/hooks/useMessage";
import {
  attendancesApi,
  gradesApi,
  guardiansApi,
  paymentsApi,
  reportCardsApi,
  tuitionFeesApi,
  type ChildSummary,
} from "@/api/resources";
import type {
  Attendance,
  AttendanceStatus,
  Grade,
  Payment,
  ReportCard,
  ReportCardStatus,
  TuitionFee,
  TuitionFeeStatus,
} from "@/types/models";
import { getErrorMessage } from "@/lib/errors";

const ATTENDANCE_STATUS_COLORS: Record<AttendanceStatus, string> = {
  PRESENT: "green",
  ABSENT: "red",
  LATE: "gold",
};

const REPORT_CARD_STATUS_LABELS: Record<ReportCardStatus, { label: string; color: string }> = {
  DRAFT: { label: "Brouillon", color: "gold" },
  VALIDATED: { label: "Validé", color: "green" },
};

const TUITION_STATUS_LABELS: Record<TuitionFeeStatus, { label: string; color: string }> = {
  PAID: { label: "Payé", color: "green" },
  OVERDUE: { label: "En retard", color: "red" },
  PARTIAL: { label: "Partiel", color: "gold" },
  PENDING: { label: "En attente", color: "default" },
};

export default function MyChildrenPage() {
  const message = useMessage();

  const [children, setChildren] = useState<ChildSummary[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);
  const [loadingChildren, setLoadingChildren] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [grades, setGrades] = useState<Grade[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [reportCards, setReportCards] = useState<ReportCard[]>([]);
  const [tuitionFees, setTuitionFees] = useState<TuitionFee[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);

  const handleDownloadInvoice = async (tuitionFee: TuitionFee) => {
    setDownloadingKey(`invoice-${tuitionFee.id}`);
    try {
      await tuitionFeesApi.downloadInvoice(tuitionFee.id);
    } catch (err) {
      message.error(getErrorMessage(err, "Échec du téléchargement de la facture"));
    } finally {
      setDownloadingKey(null);
    }
  };

  const handleDownloadReceipt = async (payment: Payment) => {
    setDownloadingKey(`receipt-${payment.id}`);
    try {
      await paymentsApi.downloadReceipt(payment.id);
    } catch (err) {
      message.error(getErrorMessage(err, "Échec du téléchargement du reçu"));
    } finally {
      setDownloadingKey(null);
    }
  };

  useEffect(() => {
    guardiansApi
      .getMyChildren()
      .then((data) => {
        setChildren(data);
        if (data.length > 0) {
          setSelectedChildId(data[0].student_id);
        }
      })
      .catch((err) => message.error(getErrorMessage(err, "Échec du chargement de vos enfants")))
      .finally(() => setLoadingChildren(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetch-on-mount only
  }, []);

  useEffect(() => {
    if (!selectedChildId) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- refetches from the backend whenever the selected child changes
    setLoadingDetail(true);
    Promise.all([
      gradesApi.list({ student_id: selectedChildId }),
      attendancesApi.list({ student_id: selectedChildId }),
      reportCardsApi.list({ student_id: selectedChildId }),
      tuitionFeesApi.list({ student_id: selectedChildId }),
      paymentsApi.list({ student_id: selectedChildId }),
    ])
      .then(([g, a, rc, tf, p]) => {
        setGrades(g);
        setAttendances(a);
        setReportCards(rc);
        setTuitionFees(tf);
        setPayments(p);
      })
      .catch((err) => message.error(getErrorMessage(err, "Échec du chargement des informations de l'élève")))
      .finally(() => setLoadingDetail(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetches only when the selected child changes
  }, [selectedChildId]);

  const selectedChild = children.find((c) => c.student_id === selectedChildId) ?? null;
  const tuitionFeeLabel = (id: number) => tuitionFees.find((tf) => tf.id === id)?.label ?? "—";

  if (loadingChildren) {
    return <Spin />;
  }

  if (children.length === 0) {
    return <Empty description="Aucun enfant n'est rattaché à votre compte." />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Typography.Title level={4} className="!mb-0">
          Suivi des enfants
        </Typography.Title>
        <Select
          style={{ width: 280 }}
          value={selectedChildId ?? undefined}
          onChange={setSelectedChildId}
          options={children.map((c) => ({
            label: `${c.first_name} ${c.last_name}${c.class_name ? ` — ${c.class_name}` : ""}`,
            value: c.student_id,
          }))}
        />
      </div>

      {selectedChild && (
        <Card size="small" className="mb-4">
          <Descriptions column={3} size="small">
            <Descriptions.Item label="Élève">
              {selectedChild.first_name} {selectedChild.last_name}
            </Descriptions.Item>
            <Descriptions.Item label="Matricule">{selectedChild.student_number ?? "—"}</Descriptions.Item>
            <Descriptions.Item label="Classe">{selectedChild.class_name ?? "Non inscrit"}</Descriptions.Item>
          </Descriptions>
        </Card>
      )}

      <Tabs
        items={[
          {
            key: "grades",
            label: "Notes",
            children: (
              <Table<Grade>
                rowKey="id"
                loading={loadingDetail}
                dataSource={grades}
                pagination={false}
                columns={[
                  {
                    title: "Matière",
                    key: "subject",
                    render: (_, r) => r.Assessment?.TeacherAssignment?.Subject?.name ?? "—",
                  },
                  { title: "Évaluation", key: "assessment", render: (_, r) => r.Assessment?.name ?? "—" },
                  {
                    title: "Note",
                    key: "score",
                    render: (_, r) => `${r.score} / ${r.Assessment?.max_score ?? 20}`,
                  },
                  {
                    title: "Date",
                    key: "date",
                    render: (_, r) =>
                      r.Assessment?.date ? new Date(r.Assessment.date).toLocaleDateString("fr-FR") : "—",
                  },
                ]}
              />
            ),
          },
          {
            key: "attendances",
            label: "Présences",
            children: (
              <Table<Attendance>
                rowKey="id"
                loading={loadingDetail}
                dataSource={attendances}
                pagination={false}
                columns={[
                  { title: "Date", dataIndex: "date" },
                  {
                    title: "Séance",
                    dataIndex: "session",
                    render: (v) => (v === "MORNING" ? "Matin" : "Après-midi"),
                  },
                  {
                    title: "Statut",
                    dataIndex: "status",
                    render: (v: AttendanceStatus) => <Tag color={ATTENDANCE_STATUS_COLORS[v]}>{v}</Tag>,
                  },
                  { title: "Justifié", dataIndex: "justified", render: (v: boolean) => (v ? "Oui" : "Non") },
                  { title: "Motif", dataIndex: "reason", render: (v) => v || "—" },
                ]}
              />
            ),
          },
          {
            key: "report-cards",
            label: "Bulletins",
            children: (
              <Table<ReportCard>
                rowKey="id"
                loading={loadingDetail}
                dataSource={reportCards}
                pagination={false}
                columns={[
                  {
                    title: "Statut",
                    dataIndex: "status",
                    render: (v: ReportCardStatus) => (
                      <Tag color={REPORT_CARD_STATUS_LABELS[v].color}>{REPORT_CARD_STATUS_LABELS[v].label}</Tag>
                    ),
                  },
                  {
                    title: "Généré le",
                    dataIndex: "generated_at",
                    render: (v) => (v ? new Date(v).toLocaleDateString("fr-FR") : "—"),
                  },
                  {
                    title: "Validé le",
                    dataIndex: "validated_at",
                    render: (v) => (v ? new Date(v).toLocaleDateString("fr-FR") : "—"),
                  },
                ]}
              />
            ),
          },
          {
            key: "tuition",
            label: "Scolarité",
            children: (
              <>
                <Table<TuitionFee>
                  rowKey="id"
                  loading={loadingDetail}
                  dataSource={tuitionFees}
                  pagination={false}
                  className="mb-6"
                  columns={[
                    { title: "Échéance", dataIndex: "label" },
                    { title: "Montant", dataIndex: "amount" },
                    { title: "Payé", dataIndex: "paid_amount" },
                    { title: "Solde", dataIndex: "balance" },
                    {
                      title: "Statut",
                      dataIndex: "status",
                      render: (v: TuitionFeeStatus) => (
                        <Tag color={TUITION_STATUS_LABELS[v].color}>{TUITION_STATUS_LABELS[v].label}</Tag>
                      ),
                    },
                    { title: "Échéance le", dataIndex: "due_date" },
                    {
                      title: "",
                      key: "invoice",
                      render: (_, r) => (
                        <Button
                          size="small"
                          icon={<DownloadOutlined />}
                          loading={downloadingKey === `invoice-${r.id}`}
                          onClick={() => handleDownloadInvoice(r)}
                        >
                          Facture
                        </Button>
                      ),
                    },
                  ]}
                />
                <Typography.Title level={5}>Paiements</Typography.Title>
                <Table<Payment>
                  rowKey="id"
                  loading={loadingDetail}
                  dataSource={payments}
                  pagination={false}
                  columns={[
                    { title: "Échéance", key: "tuition_fee", render: (_, r) => tuitionFeeLabel(r.tuition_fee_id) },
                    { title: "Montant", dataIndex: "amount" },
                    { title: "Date", dataIndex: "payment_date" },
                    { title: "Méthode", dataIndex: "method" },
                    { title: "Référence", dataIndex: "reference", render: (v) => v || "—" },
                    {
                      title: "",
                      key: "receipt",
                      render: (_, r) => (
                        <Button
                          size="small"
                          icon={<DownloadOutlined />}
                          loading={downloadingKey === `receipt-${r.id}`}
                          onClick={() => handleDownloadReceipt(r)}
                        >
                          Reçu
                        </Button>
                      ),
                    },
                  ]}
                />
              </>
            ),
          },
        ]}
      />
    </div>
  );
}
