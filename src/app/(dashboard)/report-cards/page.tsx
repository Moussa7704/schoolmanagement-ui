"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Descriptions, Divider, Modal, Popconfirm, Space, Table, Tag, Typography } from "antd";
import { PrinterOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { useMessage } from "@/hooks/useMessage";
import CrudTable, { buildActionsColumn } from "@/components/common/CrudTable";
import CrudFormDrawer from "@/components/common/CrudFormDrawer";
import type { FormFieldSchema } from "@/components/common/form-field";
import {
  classesApi,
  periodsApi,
  reportCardsApi,
  schoolsApi,
  studentsApi,
  type CreateReportCardPayload,
} from "@/api/resources";
import type { Class, Period, ReportCard, ReportCardDetail, ReportCardStatus, School, Student } from "@/types/models";
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
  const [classes, setClasses] = useState<Class[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
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
    classesApi.list().then(setClasses).catch(() => {});
    schoolsApi.list().then(setSchools).catch(() => {});
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
  const classLabel = (id: number) => classes.find((c) => c.id === id)?.name ?? "—";
  const schoolLabel = (studentId: number) => {
    const student = students.find((s) => s.id === studentId);
    if (!student) return "—";
    return schools.find((sc) => sc.id === student.school_id)?.name ?? "—";
  };

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
        title="Bulletin scolaire"
        open={!!detail}
        onCancel={() => setDetail(null)}
        width={640}
        footer={
          <Button type="primary" icon={<PrinterOutlined />} onClick={() => window.print()}>
            Imprimer / Exporter en PDF
          </Button>
        }
      >
        {detail && (
          <div className="print-area">
            <div className="text-center mb-4">
              <Typography.Title level={4} className="!mb-0">
                {schoolLabel(detail.student_id)}
              </Typography.Title>
              <Typography.Text type="secondary">Bulletin scolaire</Typography.Text>
            </div>

            <Descriptions column={2} size="small" bordered>
              <Descriptions.Item label="Élève" span={2}>
                {studentLabel(detail.student_id)}
              </Descriptions.Item>
              <Descriptions.Item label="Classe">{classLabel(detail.class_id)}</Descriptions.Item>
              <Descriptions.Item label="Période">{periodLabel(detail.period_id)}</Descriptions.Item>
              <Descriptions.Item label="Statut">
                <Tag color={STATUS_COLORS[detail.status]}>{detail.status}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Généré le">
                {detail.generated_at ? new Date(detail.generated_at).toLocaleDateString("fr-FR") : "—"}
              </Descriptions.Item>
            </Descriptions>

            <Divider className="!my-4" />

            <Table<ReportCardDetail["subjects"][number]>
              rowKey={(s) => s.subject_id}
              dataSource={detail.subjects}
              pagination={false}
              size="small"
              columns={[
                { title: "Matière", dataIndex: "subject_name" },
                { title: "Moyenne / 20", dataIndex: "average", align: "right", render: (v) => (v ?? "—") },
              ]}
            />

            <div className="flex justify-between items-center mt-4 px-1">
              <Typography.Text strong>Moyenne générale</Typography.Text>
              <Typography.Title level={3} className="!mb-0">
                {detail.overall_average ?? "—"} / 20
              </Typography.Title>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
