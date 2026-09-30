"use client";

import { useEffect, useMemo, useState } from "react";
import { Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useMessage } from "@/hooks/useMessage";
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
import { useAuth } from "@/hooks/useAuth";
import { PERMISSIONS } from "@/lib/permissions";
import { getErrorMessage } from "@/lib/errors";
import { ASSESSMENT_TYPE_LABELS, ASSESSMENT_TYPE_OPTIONS } from "@/lib/assessments";

const TYPE_COLORS: Record<AssessmentType, string> = { DEVOIR: "blue", COMPOSITION: "purple" };

export default function AssessmentsPage() {
  const message = useMessage();
  const can = usePermission();
  const { user } = useAuth();
  const isTeacher = user?.Role?.name === "TEACHER";

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
    if (isTeacher) {
      // Un enseignant ne lit pas les listes générales de l'école : son espace
      // contient ses affectations, ses classes, ses matières et les périodes.
      teachersApi
        .myClasses()
        .then((workspace) => {
          setTeacherAssignments(workspace.assignments);
          setTeachers([workspace.teacher]);
          setClasses(workspace.classes);
          setSubjects(workspace.subjects);
          setPeriods(workspace.periods);
        })
        .catch((err) => message.error(getErrorMessage(err, "Échec du chargement de vos classes")));
    } else {
      teacherAssignmentsApi.list().then(setTeacherAssignments).catch(() => {});
      teachersApi.list().then(setTeachers).catch(() => {});
      classesApi.list().then(setClasses).catch(() => {});
      subjectsApi.list().then(setSubjects).catch(() => {});
      periodsApi.list().then(setPeriods).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadAssessments is a stable mount-time fetch, not meant to re-run when its own closure identity changes
  }, [isTeacher]);

  const teacherAssignmentLabel = (id: number) => {
    const ta = teacherAssignments.find((a) => a.id === id);
    if (!ta) return "—";
    const teacher = teachers.find((t) => t.id === ta.teacher_id);
    const teacherName = teacher?.User ? `${teacher.User.first_name} ${teacher.User.last_name}` : `#${ta.teacher_id}`;
    const className = classes.find((c) => c.id === ta.class_id)?.name ?? `#${ta.class_id}`;
    const subjectName = subjects.find((s) => s.id === ta.subject_id)?.name ?? `#${ta.subject_id}`;
    // L'enseignant connecté n'a pas besoin de relire son propre nom.
    return isTeacher ? `${className} — ${subjectName}` : `${teacherName} — ${className} — ${subjectName}`;
  };
  const periodLabel = (id: number) => periods.find((p) => p.id === id)?.label ?? "—";

  const teacherAssignmentOptions = useMemo(
    () => teacherAssignments.map((ta) => ({ label: teacherAssignmentLabel(ta.id), value: ta.id })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [teacherAssignments, teachers, classes, subjects, isTeacher]
  );
  const periodOptions = useMemo(() => periods.map((p) => ({ label: p.label, value: p.id })), [periods]);

  const fields: FormFieldSchema[] = useMemo(() => {
    const common: FormFieldSchema[] = [
      { name: "name", label: "Nom", type: "text", required: true, placeholder: "Contrôle continu 1" },
      { name: "type", label: "Type", type: "select", options: ASSESSMENT_TYPE_OPTIONS },
      { name: "coefficient", label: "Coefficient", type: "number" },
      { name: "max_score", label: "Note maximale", type: "number" },
      { name: "date", label: "Date", type: "date" },
    ];
    if (editing) return common;
    return [
      {
        name: "teacher_assignment_id",
        // L'enseignant connecté choisit parmi ses propres classes-matières :
        // inutile de lui faire relire son nom dans le libellé.
        label: isTeacher ? "Affectation (classe/matière)" : "Affectation (enseignant/classe/matière)",
        type: "select",
        required: true,
        options: teacherAssignmentOptions,
      },
      { name: "period_id", label: "Période", type: "select", required: true, options: periodOptions },
      ...common,
    ];
  }, [editing, teacherAssignmentOptions, periodOptions, isTeacher]);

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
    {
      title: "Type",
      dataIndex: "type",
      render: (v: AssessmentType) => <Tag color={TYPE_COLORS[v]}>{ASSESSMENT_TYPE_LABELS[v] ?? v}</Tag>,
    },
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
