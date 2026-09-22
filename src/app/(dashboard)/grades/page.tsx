"use client";

import { useEffect, useMemo, useState } from "react";
import { message } from "antd";
import type { ColumnsType } from "antd/es/table";
import CrudTable, { buildActionsColumn } from "@/components/common/CrudTable";
import CrudFormDrawer from "@/components/common/CrudFormDrawer";
import type { FormFieldSchema } from "@/components/common/form-field";
import { assessmentsApi, gradesApi, studentsApi, type CreateGradePayload } from "@/api/resources";
import type { Assessment, Grade, Student } from "@/types/models";
import { usePermission } from "@/hooks/usePermission";
import { PERMISSIONS } from "@/lib/permissions";
import { getErrorMessage } from "@/lib/errors";

export default function GradesPage() {
  const can = usePermission();

  const [grades, setGrades] = useState<Grade[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Grade | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadGrades = async () => {
    setLoading(true);
    try {
      setGrades(await gradesApi.list());
    } catch (err) {
      message.error(getErrorMessage(err, "Échec du chargement des notes"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch-on-mount, not a render-triggered cascade
    loadGrades();
    assessmentsApi.list().then(setAssessments).catch(() => {});
    studentsApi.list().then(setStudents).catch(() => {});
  }, []);

  const assessmentOptions = useMemo(() => assessments.map((a) => ({ label: a.name, value: a.id })), [assessments]);
  const studentOptions = useMemo(
    () => students.map((s) => ({ label: `${s.first_name} ${s.last_name}`, value: s.id })),
    [students]
  );
  const assessmentLabel = (id: number) => assessments.find((a) => a.id === id);
  const studentLabel = (id: number) => {
    const s = students.find((s) => s.id === id);
    return s ? `${s.first_name} ${s.last_name}` : "—";
  };

  const fields: FormFieldSchema[] = useMemo(() => {
    if (editing) {
      return [{ name: "score", label: "Note", type: "number", required: true }];
    }
    return [
      { name: "assessment_id", label: "Évaluation", type: "select", required: true, options: assessmentOptions },
      { name: "student_id", label: "Élève", type: "select", required: true, options: studentOptions },
      { name: "score", label: "Note", type: "number", required: true },
    ];
  }, [editing, assessmentOptions, studentOptions]);

  const openCreate = () => {
    setEditing(null);
    setDrawerOpen(true);
  };

  const openEdit = (record: Grade) => {
    setEditing(record);
    setDrawerOpen(true);
  };

  const handleSubmit = async (values: CreateGradePayload | { score: number }) => {
    setSubmitting(true);
    try {
      if (editing) {
        await gradesApi.update(editing.id, values as { score: number });
        message.success("Note mise à jour");
      } else {
        await gradesApi.create(values as CreateGradePayload);
        message.success("Note créée");
      }
      setDrawerOpen(false);
      await loadGrades();
    } catch (err) {
      message.error(getErrorMessage(err, "Échec de l'enregistrement"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (record: Grade) => {
    try {
      await gradesApi.remove(record.id);
      message.success("Note supprimée");
      await loadGrades();
    } catch (err) {
      message.error(getErrorMessage(err, "Échec de la suppression"));
    }
  };

  const columns: ColumnsType<Grade> = [
    { title: "Élève", key: "student", render: (_, record) => studentLabel(record.student_id) },
    { title: "Évaluation", key: "assessment", render: (_, record) => assessmentLabel(record.assessment_id)?.name ?? "—" },
    {
      title: "Note",
      key: "score",
      render: (_, record) => {
        const assessment = assessmentLabel(record.assessment_id);
        return assessment ? `${record.score} / ${assessment.max_score}` : record.score;
      },
    },
    buildActionsColumn<Grade>({
      onEdit: can(PERMISSIONS.GRADES_UPDATE) ? openEdit : undefined,
      onDelete: can(PERMISSIONS.GRADES_DELETE) ? handleDelete : undefined,
    }),
  ];

  return (
    <>
      <CrudTable<Grade>
        title="Notes"
        data={grades}
        loading={loading}
        rowKey={(r) => r.id}
        columns={columns}
        onCreate={openCreate}
        canCreate={can(PERMISSIONS.GRADES_CREATE)}
      />

      <CrudFormDrawer<CreateGradePayload | { score: number }>
        open={drawerOpen}
        title={editing ? "Modifier la note" : "Nouvelle note"}
        fields={fields}
        initialValues={editing ?? undefined}
        submitting={submitting}
        onClose={() => setDrawerOpen(false)}
        onSubmit={handleSubmit}
      />
    </>
  );
}
