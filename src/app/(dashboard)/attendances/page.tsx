"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Descriptions, Form, Modal, Select, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useMessage } from "@/hooks/useMessage";
import CrudTable, { buildActionsColumn } from "@/components/common/CrudTable";
import CrudFormDrawer from "@/components/common/CrudFormDrawer";
import type { FormFieldSchema } from "@/components/common/form-field";
import {
  attendancesApi,
  classesApi,
  periodsApi,
  studentsApi,
  type CreateAttendancePayload,
  type UpdateAttendancePayload,
} from "@/api/resources";
import type { Attendance, AttendanceStats, AttendanceStatus, Class, Period, Student } from "@/types/models";
import { usePermission } from "@/hooks/usePermission";
import { PERMISSIONS } from "@/lib/permissions";
import { getErrorMessage } from "@/lib/errors";

const SESSION_OPTIONS = [
  { label: "Matin", value: "MORNING" },
  { label: "Après-midi", value: "AFTERNOON" },
];

const STATUS_OPTIONS = [
  { label: "Présent", value: "PRESENT" },
  { label: "Absent", value: "ABSENT" },
  { label: "Retard", value: "LATE" },
];

const STATUS_COLORS: Record<AttendanceStatus, string> = { PRESENT: "green", ABSENT: "red", LATE: "gold" };

export default function AttendancesPage() {
  const message = useMessage();
  const can = usePermission();

  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Attendance | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [statsModalOpen, setStatsModalOpen] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [statsForm] = Form.useForm<{ student_id: number; period_id: number }>();

  const loadAttendances = async () => {
    setLoading(true);
    try {
      setAttendances(await attendancesApi.list());
    } catch (err) {
      message.error(getErrorMessage(err, "Échec du chargement des présences"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch-on-mount, not a render-triggered cascade
    loadAttendances();
    studentsApi.list().then(setStudents).catch(() => {});
    classesApi.list().then(setClasses).catch(() => {});
    periodsApi.list().then(setPeriods).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadAttendances is a stable mount-time fetch, not meant to re-run when its own closure identity changes
  }, []);

  const studentOptions = useMemo(
    () => students.map((s) => ({ label: `${s.first_name} ${s.last_name}`, value: s.id })),
    [students]
  );
  const classOptions = useMemo(() => classes.map((c) => ({ label: c.name, value: c.id })), [classes]);
  const periodOptions = useMemo(() => periods.map((p) => ({ label: p.label, value: p.id })), [periods]);
  const studentLabel = (id: number) => {
    const s = students.find((s) => s.id === id);
    return s ? `${s.first_name} ${s.last_name}` : "—";
  };
  const classLabel = (id: number) => classes.find((c) => c.id === id)?.name ?? "—";

  const fields: FormFieldSchema[] = useMemo(() => {
    if (editing) {
      return [
        { name: "status", label: "Statut", type: "select", options: STATUS_OPTIONS },
        { name: "justified", label: "Justifiée", type: "switch" },
        { name: "reason", label: "Motif", type: "text" },
      ];
    }
    return [
      { name: "student_id", label: "Élève", type: "select", required: true, options: studentOptions },
      { name: "class_id", label: "Classe", type: "select", required: true, options: classOptions },
      { name: "date", label: "Date", type: "date", required: true },
      { name: "session", label: "Séance", type: "select", required: true, options: SESSION_OPTIONS },
      { name: "status", label: "Statut", type: "select", options: STATUS_OPTIONS },
      { name: "justified", label: "Justifiée", type: "switch" },
      { name: "reason", label: "Motif", type: "text" },
    ];
  }, [editing, studentOptions, classOptions]);

  const openCreate = () => {
    setEditing(null);
    setDrawerOpen(true);
  };

  const openEdit = (record: Attendance) => {
    setEditing(record);
    setDrawerOpen(true);
  };

  const handleSubmit = async (values: CreateAttendancePayload | UpdateAttendancePayload) => {
    setSubmitting(true);
    try {
      if (editing) {
        await attendancesApi.update(editing.id, values as UpdateAttendancePayload);
        message.success("Présence mise à jour");
      } else {
        await attendancesApi.create(values as CreateAttendancePayload);
        message.success("Présence enregistrée");
      }
      setDrawerOpen(false);
      await loadAttendances();
    } catch (err) {
      message.error(getErrorMessage(err, "Échec de l'enregistrement"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (record: Attendance) => {
    try {
      await attendancesApi.remove(record.id);
      message.success("Présence supprimée");
      await loadAttendances();
    } catch (err) {
      message.error(getErrorMessage(err, "Échec de la suppression"));
    }
  };

  const handleFetchStats = async () => {
    try {
      const values = await statsForm.validateFields();
      setStatsLoading(true);
      setStats(await attendancesApi.stats(values.student_id, values.period_id));
    } catch (err) {
      if (err instanceof Error) {
        message.error(getErrorMessage(err, "Échec du calcul des statistiques"));
      }
    } finally {
      setStatsLoading(false);
    }
  };

  const columns: ColumnsType<Attendance> = [
    { title: "Élève", key: "student", render: (_, record) => studentLabel(record.student_id) },
    { title: "Classe", key: "class", render: (_, record) => classLabel(record.class_id) },
    { title: "Date", dataIndex: "date" },
    {
      title: "Séance",
      dataIndex: "session",
      render: (v) => (v === "MORNING" ? "Matin" : "Après-midi"),
    },
    { title: "Statut", dataIndex: "status", render: (v: AttendanceStatus) => <Tag color={STATUS_COLORS[v]}>{v}</Tag> },
    { title: "Justifiée", dataIndex: "justified", render: (v: boolean) => (v ? "Oui" : "Non") },
    { title: "Motif", dataIndex: "reason", render: (v) => v || "—" },
    buildActionsColumn<Attendance>({
      onEdit: can(PERMISSIONS.ATTENDANCES_UPDATE) ? openEdit : undefined,
      onDelete: can(PERMISSIONS.ATTENDANCES_DELETE) ? handleDelete : undefined,
    }),
  ];

  return (
    <>
      <CrudTable<Attendance>
        title="Présences"
        data={attendances}
        loading={loading}
        rowKey={(r) => r.id}
        columns={columns}
        onCreate={openCreate}
        canCreate={can(PERMISSIONS.ATTENDANCES_CREATE)}
        extraActions={
          <Button
            onClick={() => {
              setStats(null);
              setStatsModalOpen(true);
            }}
          >
            Statistiques
          </Button>
        }
      />

      <CrudFormDrawer<CreateAttendancePayload | UpdateAttendancePayload>
        open={drawerOpen}
        title={editing ? "Modifier la présence" : "Nouvelle présence"}
        fields={fields}
        initialValues={editing ?? undefined}
        submitting={submitting}
        onClose={() => setDrawerOpen(false)}
        onSubmit={handleSubmit}
      />

      <Modal
        title="Statistiques de présence"
        open={statsModalOpen}
        onCancel={() => setStatsModalOpen(false)}
        footer={
          <Button type="primary" loading={statsLoading} onClick={handleFetchStats}>
            Calculer
          </Button>
        }
      >
        <Form form={statsForm} layout="vertical">
          <Form.Item name="student_id" label="Élève" rules={[{ required: true, message: "Élève requis" }]}>
            <Select options={studentOptions} placeholder="Sélectionner un élève" />
          </Form.Item>
          <Form.Item name="period_id" label="Période" rules={[{ required: true, message: "Période requise" }]}>
            <Select options={periodOptions} placeholder="Sélectionner une période" />
          </Form.Item>
        </Form>
        {stats && (
          <Descriptions column={1} bordered size="small" className="mt-4">
            <Descriptions.Item label="Séances totales">{stats.total_sessions}</Descriptions.Item>
            <Descriptions.Item label="Présences">{stats.present_count}</Descriptions.Item>
            <Descriptions.Item label="Absences">{stats.absent_count}</Descriptions.Item>
            <Descriptions.Item label="Retards">{stats.late_count}</Descriptions.Item>
            <Descriptions.Item label="Taux d'absentéisme">
              {stats.absenteeism_rate !== null ? `${(stats.absenteeism_rate * 100).toFixed(0)}%` : "—"}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </>
  );
}
