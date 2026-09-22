"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Modal, Popconfirm, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useMessage } from "@/hooks/useMessage";
import CrudTable, { buildActionsColumn } from "@/components/common/CrudTable";
import CrudFormDrawer from "@/components/common/CrudFormDrawer";
import type { FormFieldSchema } from "@/components/common/form-field";
import {
  periodsApi,
  reportCardsApi,
  studentsApi,
  type CreateReportCardPayload,
} from "@/api/resources";
import type { Period, ReportCard, ReportCardDetail, ReportCardStatus, Student } from "@/types/models";
import { usePermission } from "@/hooks/usePermission";
import { PERMISSIONS } from "@/lib/permissions";
import { getErrorMessage } from "@/lib/errors";

const STATUS_COLORS: Record<ReportCardStatus, string> = { DRAFT: "gold", VALIDATED: "green" };

export default function ReportCardsPage() {
  const message = useMessage();
  const can = usePermission();

  const [reportCards, setReportCards] = useState<ReportCard[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [detail, setDetail] = useState<ReportCardDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadReportCards = async () => {
    setLoading(true);
    try {
      setReportCards(await reportCardsApi.list());
    } catch (err) {
      message.error(getErrorMessage(err, "Échec du chargement des bulletins"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch-on-mount, not a render-triggered cascade
    loadReportCards();
    studentsApi.list().then(setStudents).catch(() => {});
    periodsApi.list().then(setPeriods).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadReportCards is a stable mount-time fetch, not meant to re-run when its own closure identity changes
  }, []);

  const studentOptions = useMemo(
    () => students.map((s) => ({ label: `${s.first_name} ${s.last_name}`, value: s.id })),
    [students]
  );
  const periodOptions = useMemo(() => periods.map((p) => ({ label: p.label, value: p.id })), [periods]);
  const studentLabel = (id: number) => {
    const s = students.find((s) => s.id === id);
    return s ? `${s.first_name} ${s.last_name}` : "—";
  };
  const periodLabel = (id: number) => periods.find((p) => p.id === id)?.label ?? "—";

  const fields: FormFieldSchema[] = [
    { name: "student_id", label: "Élève", type: "select", required: true, options: studentOptions },
    { name: "period_id", label: "Période", type: "select", required: true, options: periodOptions },
  ];

  const handleSubmit = async (values: CreateReportCardPayload) => {
    setSubmitting(true);
    try {
      await reportCardsApi.create(values);
      message.success("Bulletin créé");
      setDrawerOpen(false);
      await loadReportCards();
    } catch (err) {
      message.error(getErrorMessage(err, "Échec de la création"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (record: ReportCard) => {
    try {
      await reportCardsApi.remove(record.id);
      message.success("Bulletin supprimé");
      await loadReportCards();
    } catch (err) {
      message.error(getErrorMessage(err, "Échec de la suppression"));
    }
  };

  const handleValidate = async (record: ReportCard) => {
    try {
      await reportCardsApi.validate(record.id);
      message.success("Bulletin validé");
      await loadReportCards();
    } catch (err) {
      message.error(getErrorMessage(err, "Échec de la validation"));
    }
  };

  const handleShowDetail = async (record: ReportCard) => {
    setDetailLoading(true);
    try {
      setDetail(await reportCardsApi.getDetail(record.id));
    } catch (err) {
      message.error(getErrorMessage(err, "Échec du chargement du détail"));
    } finally {
      setDetailLoading(false);
    }
  };

  const columns: ColumnsType<ReportCard> = [
    { title: "Élève", key: "student", render: (_, record) => studentLabel(record.student_id) },
    { title: "Période", key: "period", render: (_, record) => periodLabel(record.period_id) },
    { title: "Statut", dataIndex: "status", render: (v: ReportCardStatus) => <Tag color={STATUS_COLORS[v]}>{v}</Tag> },
    { title: "Généré le", dataIndex: "generated_at", render: (v) => (v ? new Date(v).toLocaleDateString("fr-FR") : "—") },
    buildActionsColumn<ReportCard>({
      onDelete: can(PERMISSIONS.REPORT_CARDS_DELETE) ? handleDelete : undefined,
      extra: (record) => (
        <Space size={4}>
          <Button size="small" loading={detailLoading} onClick={() => handleShowDetail(record)}>
            Détails
          </Button>
          {record.status === "DRAFT" && can(PERMISSIONS.REPORT_CARDS_VALIDATE) && (
            <Popconfirm title="Valider ce bulletin ?" okText="Oui" cancelText="Non" onConfirm={() => handleValidate(record)}>
              <Button size="small">Valider</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    }),
  ];

  return (
    <>
      <CrudTable<ReportCard>
        title="Bulletins"
        data={reportCards}
        loading={loading}
        rowKey={(r) => r.id}
        columns={columns}
        onCreate={() => setDrawerOpen(true)}
        canCreate={can(PERMISSIONS.REPORT_CARDS_CREATE)}
      />

      <CrudFormDrawer<CreateReportCardPayload>
        open={drawerOpen}
        title="Nouveau bulletin"
        fields={fields}
        submitting={submitting}
        onClose={() => setDrawerOpen(false)}
        onSubmit={handleSubmit}
      />

      <Modal
        title={detail ? `Bulletin — ${studentLabel(detail.student_id)}` : "Bulletin"}
        open={!!detail}
        onCancel={() => setDetail(null)}
        footer={null}
      >
        {detail && (
          <>
            <Table<ReportCardDetail["subjects"][number]>
              rowKey={(s) => s.subject_id}
              dataSource={detail.subjects}
              pagination={false}
              size="small"
              columns={[
                { title: "Matière", dataIndex: "subject_name" },
                { title: "Moyenne", dataIndex: "average", render: (v) => (v ?? "—") },
              ]}
            />
            <Typography.Paragraph className="mt-4 !mb-0">
              <strong>Moyenne générale :</strong> {detail.overall_average ?? "—"}
            </Typography.Paragraph>
          </>
        )}
      </Modal>
    </>
  );
}
