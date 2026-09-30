"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Descriptions, Divider, Modal, Popconfirm, Select, Space, Table, Tag, Tooltip, Typography } from "antd";
import { FilePdfOutlined } from "@ant-design/icons";
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

// 12.666 -> "12,67" comme sur le bulletin papier ; vide -> "—"
const formatGrade = (value: number | null | undefined) =>
  value === null || value === undefined ? "—" : value.toFixed(2).replace(".", ",");

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
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [classPdfLoading, setClassPdfLoading] = useState(false);
  const [filterPeriodId, setFilterPeriodId] = useState<number | undefined>();
  const [filterClassId, setFilterClassId] = useState<number | undefined>();

  const loadReportCards = async () => {
    setLoading(true);
    try {
      setReportCards(await reportCardsApi.list({ period_id: filterPeriodId, class_id: filterClassId }));
    } catch (err) {
      message.error(getErrorMessage(err, "Échec du chargement des bulletins"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    studentsApi.list().then(setStudents).catch(() => {});
    periodsApi.list().then(setPeriods).catch(() => {});
    classesApi.list().then(setClasses).catch(() => {});
    schoolsApi.list().then(setSchools).catch(() => {});
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- refetches from the backend whenever the period/class filters change (including the initial mount, with both undefined)
    loadReportCards();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadReportCards is a stable closure re-created each render; re-running the effect on its identity would defeat the point of keying on the filters
  }, [filterPeriodId, filterClassId]);

  const studentOptions = useMemo(
    () => students.map((s) => ({ label: `${s.first_name} ${s.last_name}`, value: s.id })),
    [students]
  );
  const periodOptions = useMemo(() => periods.map((p) => ({ label: p.label, value: p.id })), [periods]);
  const classOptions = useMemo(() => classes.map((c) => ({ label: c.name, value: c.id })), [classes]);
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

  const handleDownloadPdf = async (record: ReportCard) => {
    setDownloadingId(record.id);
    try {
      const slug = (v: string) =>
        v.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      await reportCardsApi.downloadPdf(
        record.id,
        `bulletin-${slug(studentLabel(record.student_id))}-${slug(periodLabel(record.period_id))}.pdf`
      );
    } catch (err) {
      message.error(getErrorMessage(err, "Échec du téléchargement du bulletin"));
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadClassPdf = async () => {
    if (!filterClassId || !filterPeriodId) return;
    setClassPdfLoading(true);
    try {
      const slug = (v: string) =>
        v.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      await reportCardsApi.downloadClassPdf(
        filterClassId,
        filterPeriodId,
        `bulletins-${slug(classLabel(filterClassId))}-${slug(periodLabel(filterPeriodId))}.pdf`
      );
    } catch (err) {
      message.error(getErrorMessage(err, "Échec de l'impression des bulletins de la classe"));
    } finally {
      setClassPdfLoading(false);
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
    { title: "Classe", key: "class", render: (_, record) => classLabel(record.class_id) },
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
          <Tooltip title="Télécharger le bulletin (PDF)">
            <Button
              size="small"
              icon={<FilePdfOutlined />}
              loading={downloadingId === record.id}
              onClick={() => handleDownloadPdf(record)}
              aria-label="Télécharger le bulletin en PDF"
            />
          </Tooltip>
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
        extraActions={
          <Space>
            <Select
              allowClear
              placeholder="Filtrer par période"
              style={{ width: 180 }}
              options={periodOptions}
              value={filterPeriodId}
              onChange={setFilterPeriodId}
            />
            <Select
              allowClear
              placeholder="Filtrer par classe"
              style={{ width: 180 }}
              options={classOptions}
              value={filterClassId}
              onChange={setFilterClassId}
            />
            <Tooltip
              title={
                filterClassId && filterPeriodId
                  ? "Tous les bulletins de la classe, deux par feuille A4 (à découper)"
                  : "Choisissez d'abord une période et une classe"
              }
            >
              <Button
                icon={<FilePdfOutlined />}
                disabled={!filterClassId || !filterPeriodId}
                loading={classPdfLoading}
                onClick={handleDownloadClassPdf}
              >
                Imprimer la classe
              </Button>
            </Tooltip>
          </Space>
        }
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
        width={820}
        footer={
          detail && (
            <Button
              type="primary"
              icon={<FilePdfOutlined />}
              loading={downloadingId === detail.id}
              onClick={() => handleDownloadPdf(detail)}
            >
              Télécharger le bulletin (PDF)
            </Button>
          )
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
                { title: "Matières", dataIndex: "subject_name" },
                { title: "Devoir", dataIndex: "devoir_average", align: "right", render: formatGrade },
                { title: "Comp", dataIndex: "composition_average", align: "right", render: formatGrade },
                { title: "Moy/20", dataIndex: "average", align: "right", render: formatGrade },
                { title: "Coeff", dataIndex: "coefficient", align: "right" },
                { title: "Moy Gen", dataIndex: "weighted_average", align: "right", render: formatGrade },
                { title: "Appréciations", dataIndex: "appreciation", render: (v) => v ?? "—" },
              ]}
              summary={() => (
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={4}>
                    <Typography.Text strong>TOTAL</Typography.Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={4} align="right">
                    <Typography.Text strong>{detail.total_coefficient}</Typography.Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={5} align="right">
                    <Typography.Text strong>{formatGrade(detail.total_weighted)}</Typography.Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={6} />
                </Table.Summary.Row>
              )}
            />

            <div className="flex justify-between items-center mt-4 px-1">
              <div>
                <Typography.Text strong>Moyenne</Typography.Text>
                <br />
                <Typography.Text type="secondary" className="text-xs">
                  Total Moy Gen ÷ total des coefficients
                </Typography.Text>
              </div>
              <Typography.Title level={3} className="!mb-0">
                {formatGrade(detail.overall_average)} / 20
              </Typography.Title>
            </div>

            <div className="flex justify-end gap-6 mt-1 px-1">
              <Typography.Text type="secondary">
                Rang : {detail.rank ? `${detail.rank} / ${detail.total_students}` : "Non classé"}
              </Typography.Text>
              <Typography.Text type="secondary">Retards : {detail.late_count}</Typography.Text>
              <Typography.Text type="secondary">Absences : {detail.absence_count}</Typography.Text>
            </div>

            <div className="flex justify-end gap-6 mt-1 px-1">
              <Typography.Text type="secondary">Appréciation : {detail.work_appreciation ?? "—"}</Typography.Text>
              <Typography.Text type="secondary">Distinction : {detail.distinction ?? "—"}</Typography.Text>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
