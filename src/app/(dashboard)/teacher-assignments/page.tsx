"use client";

import { useEffect, useMemo, useState } from "react";
import type { ColumnsType } from "antd/es/table";
import { useMessage } from "@/hooks/useMessage";
import CrudTable, { buildActionsColumn } from "@/components/common/CrudTable";
import CrudFormDrawer from "@/components/common/CrudFormDrawer";
import type { FormFieldSchema } from "@/components/common/form-field";
import {
  classesApi,
  subjectsApi,
  teacherAssignmentsApi,
  teachersApi,
  type CreateTeacherAssignmentPayload,
} from "@/api/resources";
import type { Class, Subject, Teacher, TeacherAssignment } from "@/types/models";
import { usePermission } from "@/hooks/usePermission";
import { PERMISSIONS } from "@/lib/permissions";
import { getErrorMessage } from "@/lib/errors";

export default function TeacherAssignmentsPage() {
  const message = useMessage();
  const can = usePermission();

  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadAssignments = async () => {
    setLoading(true);
    try {
      setAssignments(await teacherAssignmentsApi.list());
    } catch (err) {
      message.error(getErrorMessage(err, "Échec du chargement des affectations"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch-on-mount, not a render-triggered cascade
    loadAssignments();
    teachersApi.list().then(setTeachers).catch(() => {});
    classesApi.list().then(setClasses).catch(() => {});
    subjectsApi.list().then(setSubjects).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadAssignments is a stable mount-time fetch, not meant to re-run when its own closure identity changes
  }, []);

  const teacherOptions = useMemo(
    () => teachers.map((t) => ({ label: t.User ? `${t.User.first_name} ${t.User.last_name}` : `#${t.id}`, value: t.id })),
    [teachers]
  );
  const classOptions = useMemo(() => classes.map((c) => ({ label: c.name, value: c.id })), [classes]);
  const subjectOptions = useMemo(() => subjects.map((s) => ({ label: s.name, value: s.id })), [subjects]);

  const teacherLabel = (id: number) => {
    const t = teachers.find((t) => t.id === id);
    return t?.User ? `${t.User.first_name} ${t.User.last_name}` : "—";
  };
  const classLabel = (id: number) => classes.find((c) => c.id === id)?.name ?? "—";
  const subjectLabel = (id: number) => subjects.find((s) => s.id === id)?.name ?? "—";

  const fields: FormFieldSchema[] = [
    { name: "teacher_id", label: "Enseignant", type: "select", required: true, options: teacherOptions },
    { name: "class_id", label: "Classe", type: "select", required: true, options: classOptions },
    { name: "subject_id", label: "Matière", type: "select", required: true, options: subjectOptions },
  ];

  const handleSubmit = async (values: CreateTeacherAssignmentPayload) => {
    setSubmitting(true);
    try {
      await teacherAssignmentsApi.create(values);
      message.success("Affectation créée");
      setDrawerOpen(false);
      await loadAssignments();
    } catch (err) {
      message.error(getErrorMessage(err, "Échec de l'enregistrement"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (record: TeacherAssignment) => {
    try {
      await teacherAssignmentsApi.remove(record.id);
      message.success("Affectation supprimée");
      await loadAssignments();
    } catch (err) {
      message.error(getErrorMessage(err, "Échec de la suppression"));
    }
  };

  const columns: ColumnsType<TeacherAssignment> = [
    { title: "Enseignant", key: "teacher", render: (_, record) => teacherLabel(record.teacher_id) },
    { title: "Classe", key: "class", render: (_, record) => classLabel(record.class_id) },
    { title: "Matière", key: "subject", render: (_, record) => subjectLabel(record.subject_id) },
    buildActionsColumn<TeacherAssignment>({
      onDelete: can(PERMISSIONS.TEACHER_ASSIGNMENTS_DELETE) ? handleDelete : undefined,
    }),
  ];

  return (
    <>
      <CrudTable<TeacherAssignment>
        title="Affectations enseignants"
        data={assignments}
        loading={loading}
        rowKey={(r) => r.id}
        columns={columns}
        onCreate={() => setDrawerOpen(true)}
        canCreate={can(PERMISSIONS.TEACHER_ASSIGNMENTS_CREATE)}
      />

      <CrudFormDrawer<CreateTeacherAssignmentPayload>
        open={drawerOpen}
        title="Nouvelle affectation"
        fields={fields}
        submitting={submitting}
        onClose={() => setDrawerOpen(false)}
        onSubmit={handleSubmit}
      />
    </>
  );
}
