"use client";

import { useEffect, useMemo, useState } from "react";
import { Tag, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import CrudTable, { buildActionsColumn } from "@/components/common/CrudTable";
import CrudFormDrawer from "@/components/common/CrudFormDrawer";
import type { FormFieldSchema } from "@/components/common/form-field";
import {
  assessmentsApi,
  classesApi,
  periodsApi,
  subjectsApi,
  teacherAssignmentsApi,
  teachersApi,
  type CreateAssessmentPayload,
  type UpdateAssessmentPayload,
} from "@/api/resources";
import type { Assessment, AssessmentType, Class, Period, Subject, Teacher, TeacherAssignment } from "@/types/models";
import { usePermission } from "@/hooks/usePermission";
import { PERMISSIONS } from "@/lib/permissions";
import { getErrorMessage } from "@/lib/errors";

const TYPE_OPTIONS = [
  { label: "Devoir", value: "DEVOIR" },
  { label: "Examen", value: "EXAMEN" },
];

const TYPE_COLORS: Record<AssessmentType, string> = { DEVOIR: "blue", EXAMEN: "red" };

export default function AssessmentsPage() {
  const can = usePermission();

  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [teacherAssignments, setTeacherAssignments] = useState<TeacherAssignment[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Assessment | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadAssessments = async () => {
    setLoading(true);
    try {
      setAssessments(await assessmentsApi.list());
    } catch (err) {
      message.error(getErrorMessage(err, "Échec du chargement des évaluations"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch-on-mount, not a render-triggered cascade
    loadAssessments();
    teacherAssignmentsApi.list().then(setTeacherAssignments).catch(() => {});
    teachersApi.list().then(setTeachers).catch(() => {});
    classesApi.list().then(setClasses).catch(() => {});
    subjectsApi.list().then(setSubjects).catch(() => {});
    periodsApi.list().then(setPeriods).catch(() => {});
  }, []);

  const teacherAssignmentLabel = (id: number) => {
    const ta = teacherAssignments.find((a) => a.id === id);
    if (!ta) return "—";
    const teacher = teachers.find((t) => t.id === ta.teacher_id);
    const teacherName = teacher?.User ? `${teacher.User.first_name} ${teacher.User.last_name}` : `#${ta.teacher_id}`;
    const className = classes.find((c) => c.id === ta.class_id)?.name ?? `#${ta.class_id}`;
    const subjectName = subjects.find((s) => s.id === ta.subject_id)?.name ?? `#${ta.subject_id}`;
    return `${teacherName} — ${className} — ${subjectName}`;
  };
  const periodLabel = (id: number) => periods.find((p) => p.id === id)?.label ?? "—";

  const teacherAssignmentOptions = useMemo(
    () => teacherAssignments.map((ta) => ({ label: teacherAssignmentLabel(ta.id), value: ta.id })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [teacherAssignments, teachers, classes, subjects]
  );
  const periodOptions = useMemo(() => periods.map((p) => ({ label: p.label, value: p.id })), [periods]);

  const fields: FormFieldSchema[] = useMemo(() => {
    const common: FormFieldSchema[] = [
      { name: "name", label: "Nom", type: "text", required: true, placeholder: "Contrôle continu 1" },
      { name: "type", label: "Type", type: "select", options: TYPE_OPTIONS },
      { name: "coefficient", label: "Coefficient", type: "number" },
      { name: "max_score", label: "Note maximale", type: "number" },
      { name: "date", label: "Date", type: "date" },
    ];
    if (editing) return common;
    return [
      {
        name: "teacher_assignment_id",
        label: "Affectation (enseignant/classe/matière)",
        type: "select",
        required: true,
        options: teacherAssignmentOptions,
      },
      { name: "period_id", label: "Période", type: "select", required: true, options: periodOptions },
      ...common,
    ];
  }, [editing, teacherAssignmentOptions, periodOptions]);

  const openCreate = () => {
    setEditing(null);
    setDrawerOpen(true);
  };

  const openEdit = (record: Assessment) => {
    setEditing(record);
    setDrawerOpen(true);
  };

  const handleSubmit = async (values: CreateAssessmentPayload | UpdateAssessmentPayload) => {
    setSubmitting(true);
    try {
      if (editing) {
        await assessmentsApi.update(editing.id, values as UpdateAssessmentPayload);
        message.success("Évaluation mise à jour");
      } else {
        await assessmentsApi.create(values as CreateAssessmentPayload);
        message.success("Évaluation créée");
      }
      setDrawerOpen(false);
      await loadAssessments();
    } catch (err) {
      message.error(getErrorMessage(err, "Échec de l'enregistrement"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (record: Assessment) => {
    try {
      await assessmentsApi.remove(record.id);
      message.success("Évaluation supprimée");
      await loadAssessments();
    } catch (err) {
      message.error(getErrorMessage(err, "Échec de la suppression"));
    }
  };

  const columns: ColumnsType<Assessment> = [
    { title: "Nom", dataIndex: "name" },
    { title: "Type", dataIndex: "type", render: (v: AssessmentType) => <Tag color={TYPE_COLORS[v]}>{v}</Tag> },
    {
      title: "Affectation",
      key: "teacher_assignment",
      render: (_, record) => teacherAssignmentLabel(record.teacher_assignment_id),
    },
    { title: "Période", key: "period", render: (_, record) => periodLabel(record.period_id) },
    { title: "Coefficient", dataIndex: "coefficient" },
    { title: "Note max", dataIndex: "max_score" },
    { title: "Date", dataIndex: "date", render: (v) => v || "—" },
    buildActionsColumn<Assessment>({
      onEdit: can(PERMISSIONS.ASSESSMENTS_UPDATE) ? openEdit : undefined,
      onDelete: can(PERMISSIONS.ASSESSMENTS_DELETE) ? handleDelete : undefined,
    }),
  ];

  return (
    <>
      <CrudTable<Assessment>
        title="Évaluations"
        data={assessments}
        loading={loading}
        rowKey={(r) => r.id}
        columns={columns}
        onCreate={openCreate}
        canCreate={can(PERMISSIONS.ASSESSMENTS_CREATE)}
      />

      <CrudFormDrawer<CreateAssessmentPayload | UpdateAssessmentPayload>
        open={drawerOpen}
        title={editing ? "Modifier l'évaluation" : "Nouvelle évaluation"}
        fields={fields}
        initialValues={editing ?? undefined}
        submitting={submitting}
        onClose={() => setDrawerOpen(false)}
        onSubmit={handleSubmit}
      />
    </>
  );
}
