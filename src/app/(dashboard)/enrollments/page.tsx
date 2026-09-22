"use client";

import { useEffect, useMemo, useState } from "react";
import { Tag, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import CrudTable, { buildActionsColumn } from "@/components/common/CrudTable";
import CrudFormDrawer from "@/components/common/CrudFormDrawer";
import type { FormFieldSchema } from "@/components/common/form-field";
import {
  classesApi,
  enrollmentsApi,
  studentsApi,
  type CreateEnrollmentPayload,
  type UpdateEnrollmentPayload,
} from "@/api/resources";
import type { Class, Enrollment, EnrollmentStatus, Student } from "@/types/models";
import { usePermission } from "@/hooks/usePermission";
import { PERMISSIONS } from "@/lib/permissions";
import { getErrorMessage } from "@/lib/errors";

const STATUS_OPTIONS = [
  { label: "Active", value: "ACTIVE" },
  { label: "Transférée", value: "TRANSFERRED" },
  { label: "Redoublement", value: "REPEATING" },
  { label: "Retirée", value: "WITHDRAWN" },
];

const STATUS_COLORS: Record<EnrollmentStatus, string> = {
  ACTIVE: "green",
  TRANSFERRED: "blue",
  REPEATING: "gold",
  WITHDRAWN: "red",
};

export default function EnrollmentsPage() {
  const can = usePermission();

  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Enrollment | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadEnrollments = async () => {
    setLoading(true);
    try {
      setEnrollments(await enrollmentsApi.list());
    } catch (err) {
      message.error(getErrorMessage(err, "Échec du chargement des inscriptions"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch-on-mount, not a render-triggered cascade
    loadEnrollments();
    studentsApi.list().then(setStudents).catch(() => {});
    classesApi.list().then(setClasses).catch(() => {});
  }, []);

  const studentOptions = useMemo(
    () => students.map((s) => ({ label: `${s.first_name} ${s.last_name}`, value: s.id })),
    [students]
  );
  const classOptions = useMemo(() => classes.map((c) => ({ label: c.name, value: c.id })), [classes]);
  const studentLabel = (id: number) => {
    const s = students.find((s) => s.id === id);
    return s ? `${s.first_name} ${s.last_name}` : "—";
  };
  const classLabel = (id: number) => classes.find((c) => c.id === id)?.name ?? "—";

  const fields: FormFieldSchema[] = useMemo(() => {
    if (editing) {
      return [
        { name: "status", label: "Statut", type: "select", options: STATUS_OPTIONS },
        { name: "enrollment_date", label: "Date d'inscription", type: "date" },
        { name: "registration_number", label: "Matricule", type: "text" },
      ];
    }
    return [
      { name: "student_id", label: "Élève", type: "select", required: true, options: studentOptions },
      { name: "class_id", label: "Classe", type: "select", required: true, options: classOptions },
      { name: "status", label: "Statut", type: "select", options: STATUS_OPTIONS },
      { name: "enrollment_date", label: "Date d'inscription", type: "date" },
      { name: "registration_number", label: "Matricule", type: "text" },
    ];
  }, [editing, studentOptions, classOptions]);

  const openCreate = () => {
    setEditing(null);
    setDrawerOpen(true);
  };

  const openEdit = (record: Enrollment) => {
    setEditing(record);
    setDrawerOpen(true);
  };

  const handleSubmit = async (values: CreateEnrollmentPayload | UpdateEnrollmentPayload) => {
    setSubmitting(true);
    try {
      if (editing) {
        await enrollmentsApi.update(editing.id, values as UpdateEnrollmentPayload);
        message.success("Inscription mise à jour");
      } else {
        await enrollmentsApi.create(values as CreateEnrollmentPayload);
        message.success("Inscription créée");
      }
      setDrawerOpen(false);
      await loadEnrollments();
    } catch (err) {
      message.error(getErrorMessage(err, "Échec de l'enregistrement"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (record: Enrollment) => {
    try {
      await enrollmentsApi.remove(record.id);
      message.success("Inscription supprimée");
      await loadEnrollments();
    } catch (err) {
      message.error(getErrorMessage(err, "Échec de la suppression"));
    }
  };

  const columns: ColumnsType<Enrollment> = [
    { title: "Élève", key: "student", render: (_, record) => studentLabel(record.student_id) },
    { title: "Classe", key: "class", render: (_, record) => classLabel(record.class_id) },
    { title: "Statut", dataIndex: "status", render: (v: EnrollmentStatus) => <Tag color={STATUS_COLORS[v]}>{v}</Tag> },
    { title: "Date d'inscription", dataIndex: "enrollment_date", render: (v) => v || "—" },
    { title: "Matricule", dataIndex: "registration_number", render: (v) => v || "—" },
    buildActionsColumn<Enrollment>({
      onEdit: can(PERMISSIONS.ENROLLMENTS_UPDATE) ? openEdit : undefined,
      onDelete: can(PERMISSIONS.ENROLLMENTS_DELETE) ? handleDelete : undefined,
    }),
  ];

  return (
    <>
      <CrudTable<Enrollment>
        title="Inscriptions"
        data={enrollments}
        loading={loading}
        rowKey={(r) => r.id}
        columns={columns}
        onCreate={openCreate}
        canCreate={can(PERMISSIONS.ENROLLMENTS_CREATE)}
      />

      <CrudFormDrawer<CreateEnrollmentPayload | UpdateEnrollmentPayload>
        open={drawerOpen}
        title={editing ? "Modifier l'inscription" : "Nouvelle inscription"}
        fields={fields}
        initialValues={editing ?? undefined}
        submitting={submitting}
        onClose={() => setDrawerOpen(false)}
        onSubmit={handleSubmit}
      />
    </>
  );
}
