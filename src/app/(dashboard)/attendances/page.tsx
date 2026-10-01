"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Descriptions, Form, Modal, Select, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useMessage } from "@/hooks/useMessage";
import CrudTable, { buildActionsColumn } from "@/components/common/CrudTable";
import CrudFormDrawer from "@/components/common/CrudFormDrawer";
import type { FormFieldSchema } from "@/components/common/form-field";
import {
  attendancesApi,
  classesApi,
  enrollmentsApi,
  periodsApi,
  studentsApi,
  teachersApi,
  type CreateAttendancePayload,
  type UpdateAttendancePayload,
} from "@/api/resources";
import type { Attendance, AttendanceStats, AttendanceStatus, Class, Enrollment, Period, Student } from "@/types/models";
import { usePermission } from "@/hooks/usePermission";
import { useAuth } from "@/hooks/useAuth";
import { PERMISSIONS } from "@/lib/permissions";
import { getErrorMessage } from "@/lib/errors";
import { CheckSquareOutlined } from "@ant-design/icons";
import RollCallModal from "@/components/attendance/RollCallModal";

const SESSION_OPTIONS = [
  { label: "Matin", value: "MORNING" },
  { label: "Après-midi", value: "AFTERNOON" },
];

const STATUS_LABELS: Record<AttendanceStatus, string> = { PRESENT: "Présent", ABSENT: "Absent", LATE: "Retard" };
const STATUS_OPTIONS = (Object.keys(STATUS_LABELS) as AttendanceStatus[]).map((value) => ({ label: STATUS_LABELS[value], value }));
const STATUS_COLORS: Record<AttendanceStatus, string> = { PRESENT: "green", ABSENT: "red", LATE: "gold" };

// Élèves réellement dans la classe : un redoublant y est inscrit comme les
// autres, un transféré ou un retiré n'y est plus.
const PRESENT_STATUSES: Enrollment["status"][] = ["ACTIVE", "REPEATING"];

export default function AttendancesPage() {
  const message = useMessage();
  const can = usePermission();
  const { user } = useAuth();
  const isTeacher = user?.Role?.name === "TEACHER";

  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [classId, setClassId] = useState<number | undefined>();
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Attendance | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [statsModalOpen, setStatsModalOpen] = useState(false);
  const [rollCallOpen, setRollCallOpen] = useState(false);
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
    if (isTeacher) {
      // Un enseignant ne lit pas les listes générales de l'école : son espace
      // contient ses classes, les élèves de ses classes et les périodes.
      teachersApi
        .myClasses()
        .then((workspace) => {
          setClasses(workspace.classes);
          setStudents(workspace.students);
          setPeriods(workspace.periods);
          setEnrollments(workspace.enrollments);
        })
        .catch((err) => message.error(getErrorMessage(err, "Échec du chargement de vos classes")));
    } else {
      studentsApi.list().then(setStudents).catch(() => {});
      classesApi.list().then(setClasses).catch(() => {});
      periodsApi.list().then(setPeriods).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadAttendances is a stable mount-time fetch, not meant to re-run when its own closure identity changes
  }, [isTeacher]);

  // Inscriptions de la classe choisie (un enseignant les a déjà reçues avec son espace).
  useEffect(() => {
    if (!classId || isTeacher) return;
    enrollmentsApi
      .list({ class_id: classId })
      .then(setEnrollments)
      .catch((err) => message.error(getErrorMessage(err, "Échec du chargement des élèves de la classe")));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `message` is a stable App.useApp() instance
  }, [classId, isTeacher]);

  const classOptions = useMemo(
    () => classes.map((c) => ({ label: c.name, value: c.id })).sort((a, b) => a.label.localeCompare(b.label, "fr")),
    [classes]
  );
  const periodOptions = useMemo(() => periods.map((p) => ({ label: p.label, value: p.id })), [periods]);

  // Élèves inscrits dans la classe choisie, triés par nom.
  const studentOptions = useMemo(() => {
    if (!classId) return [];
    const enrolledIds = new Set(
      enrollments.filter((e) => e.class_id === classId && PRESENT_STATUSES.includes(e.status)).map((e) => e.student_id)
    );
    return students
      .filter((s) => enrolledIds.has(s.id))
      .map((s) => ({ label: `${s.last_name} ${s.first_name}`, value: s.id }))
      .sort((a, b) => a.label.localeCompare(b.label, "fr"));
  }, [classId, enrollments, students]);

  // Liste stable pour la feuille d'appel : une nouvelle liste à chaque rendu
  // réinitialiserait la feuille et effacerait les saisies en cours.
  const rollCallStudents = useMemo(() => studentOptions.map((s) => ({ id: s.value, label: s.label })), [studentOptions]);

  // Tableau : seulement les présences de la classe choisie.
  const visibleAttendances = useMemo(
    () => (classId ? attendances.filter((a) => a.class_id === classId) : attendances),
    [attendances, classId]
  );

  const studentLabel = (id: number) => {
    const s = students.find((s) => s.id === id);
    return s ? `${s.last_name} ${s.first_name}` : "—";
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
      // Classe déjà choisie dans la barre d'outils : pré-remplie, une seule option.
      {
        name: "class_id",
        label: "Classe",
        type: "select",
        required: true,
        options: classOptions.filter((c) => c.value === classId),
      },
      { name: "student_id", label: "Élève", type: "select", required: true, options: studentOptions },
      { name: "date", label: "Date", type: "date", required: true },
      { name: "session", label: "Séance", type: "select", required: true, options: SESSION_OPTIONS },
      { name: "status", label: "Statut", type: "select", options: STATUS_OPTIONS },
      { name: "justified", label: "Justifiée", type: "switch" },
      { name: "reason", label: "Motif", type: "text" },
    ];
  }, [editing, studentOptions, classOptions, classId]);

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
    {
      title: "Statut",
      dataIndex: "status",
      render: (v: AttendanceStatus) => <Tag color={STATUS_COLORS[v]}>{STATUS_LABELS[v] ?? v}</Tag>,
    },
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
        data={visibleAttendances}
        loading={loading}
        rowKey={(r) => r.id}
        columns={columns}
        onCreate={openCreate}
        // La saisie commence par le choix de la classe : sans elle, on ne sait
        // pas quels élèves proposer.
        canCreate={can(PERMISSIONS.ATTENDANCES_CREATE) && !!classId}
        extraActions={
          <>
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="Choisir une classe"
              style={{ width: 220 }}
              options={classOptions}
              value={classId}
              onChange={(value: number) => {
                // Un enseignant garde les inscriptions reçues avec son espace.
                if (!isTeacher) setEnrollments([]);
                setClassId(value);
                statsForm.resetFields();
                setStats(null);
              }}
            />
            {!classId && can(PERMISSIONS.ATTENDANCES_CREATE) && (
              <Typography.Text type="secondary">Choisissez une classe pour saisir des présences</Typography.Text>
            )}
            {can(PERMISSIONS.ATTENDANCES_CREATE) && (
              <Button type="primary" icon={<CheckSquareOutlined />} disabled={!classId} onClick={() => setRollCallOpen(true)}>
                Faire l&apos;appel
              </Button>
            )}
            <Button
              disabled={!classId}
              onClick={() => {
                setStats(null);
                setStatsModalOpen(true);
              }}
            >
              Statistiques
            </Button>
          </>
        }
      />

      {classId && (
        <RollCallModal
          open={rollCallOpen}
          classId={classId}
          className={classLabel(classId)}
          students={rollCallStudents}
          attendances={attendances}
          onClose={() => setRollCallOpen(false)}
          onSaved={loadAttendances}
        />
      )}

      <CrudFormDrawer<CreateAttendancePayload | UpdateAttendancePayload>
        open={drawerOpen}
        title={editing ? "Modifier la présence" : "Nouvelle présence"}
        fields={fields}
        initialValues={editing ?? (classId ? { class_id: classId } : undefined)}
        submitting={submitting}
        onClose={() => setDrawerOpen(false)}
        onSubmit={handleSubmit}
      />

      {/* forceRender : le formulaire existe dès le chargement de la page, car
          il est réinitialisé à chaque changement de classe, même si la fenêtre
          n'a encore jamais été ouverte (sinon avertissement « useForm … not connected »). */}
      <Modal
        title="Statistiques de présence"
        forceRender
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
            <Select showSearch optionFilterProp="label" options={studentOptions} placeholder="Sélectionner un élève" />
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
