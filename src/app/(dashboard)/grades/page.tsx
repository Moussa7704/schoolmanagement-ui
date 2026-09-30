"use client";

import { useEffect, useMemo, useState } from "react";
import { Select, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useMessage } from "@/hooks/useMessage";
import CrudTable, { buildActionsColumn } from "@/components/common/CrudTable";
import CrudFormDrawer from "@/components/common/CrudFormDrawer";
import type { FormFieldSchema } from "@/components/common/form-field";
import {
  assessmentsApi,
  classesApi,
  enrollmentsApi,
  gradesApi,
  studentsApi,
  subjectsApi,
  teacherAssignmentsApi,
  type CreateGradePayload,
} from "@/api/resources";
import type { Assessment, Class, Enrollment, Grade, Student, Subject, TeacherAssignment } from "@/types/models";
import { usePermission } from "@/hooks/usePermission";
import { PERMISSIONS } from "@/lib/permissions";
import { getErrorMessage } from "@/lib/errors";
import { ASSESSMENT_TYPE_LABELS } from "@/lib/assessments";

// Élèves réellement dans la classe : un redoublant y est inscrit comme les
// autres, un transféré ou un retiré n'y est plus.
const PRESENT_STATUSES: Enrollment["status"][] = ["ACTIVE", "REPEATING"];

export default function GradesPage() {
  const message = useMessage();
  const can = usePermission();

  const [grades, setGrades] = useState<Grade[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classEnrollments, setClassEnrollments] = useState<Enrollment[]>([]);
  const [classId, setClassId] = useState<number | undefined>();
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
    classesApi.list().then(setClasses).catch(() => {});
    teacherAssignmentsApi.list().then(setAssignments).catch(() => {});
    subjectsApi.list().then(setSubjects).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadGrades is a stable mount-time fetch, not meant to re-run when its own closure identity changes
  }, []);

  // Élèves inscrits dans la classe choisie, rechargés à chaque changement de classe.
  useEffect(() => {
    if (!classId) return;
    enrollmentsApi
      .list({ class_id: classId })
      .then(setClassEnrollments)
      .catch((err) => message.error(getErrorMessage(err, "Échec du chargement des élèves de la classe")));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `message` is a stable App.useApp() instance
  }, [classId]);

  // Classes proposées : celles qui ont au moins une matière affectée (un
  // enseignant ne reçoit que ses propres affectations, donc ses classes).
  const classOptions = useMemo(() => {
    const ids = new Set(assignments.map((a) => a.class_id));
    return classes
      .filter((c) => ids.has(c.id))
      .map((c) => ({ label: c.name, value: c.id }))
      .sort((a, b) => a.label.localeCompare(b.label, "fr"));
  }, [assignments, classes]);

  const subjectName = (assignmentId: number) => {
    const assignment = assignments.find((a) => a.id === assignmentId);
    return subjects.find((s) => s.id === assignment?.subject_id)?.name;
  };

  // Évaluations de la classe choisie (via l'affectation enseignant — matière).
  const classAssessments = useMemo(() => {
    if (!classId) return [];
    const assignmentIds = new Set(assignments.filter((a) => a.class_id === classId).map((a) => a.id));
    return assessments.filter((a) => assignmentIds.has(a.teacher_assignment_id));
  }, [assessments, assignments, classId]);

  const assessmentText = (assessment: Assessment) => {
    const subject = subjectName(assessment.teacher_assignment_id);
    return `${subject ? `${subject} — ` : ""}${assessment.name} (${ASSESSMENT_TYPE_LABELS[assessment.type] ?? assessment.type})`;
  };

  const assessmentOptions = useMemo(
    () =>
      classAssessments
        .map((a) => ({ label: assessmentText(a), value: a.id }))
        .sort((x, y) => x.label.localeCompare(y.label, "fr")),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- assessmentText ne dépend que de assignments/subjects, déjà listés
    [classAssessments, assignments, subjects]
  );

  const studentOptions = useMemo(() => {
    if (!classId) return [];
    const enrolledIds = new Set(
      classEnrollments.filter((e) => e.class_id === classId && PRESENT_STATUSES.includes(e.status)).map((e) => e.student_id)
    );
    return students
      .filter((s) => enrolledIds.has(s.id))
      .map((s) => ({ label: `${s.last_name} ${s.first_name}`, value: s.id }))
      .sort((a, b) => a.label.localeCompare(b.label, "fr"));
  }, [classEnrollments, classId, students]);

  // Tableau : seulement les notes des évaluations de la classe choisie.
  const visibleGrades = useMemo(() => {
    if (!classId) return grades;
    const ids = new Set(classAssessments.map((a) => a.id));
    return grades.filter((g) => ids.has(g.assessment_id));
  }, [classAssessments, classId, grades]);

  const assessmentOf = (id: number) => assessments.find((a) => a.id === id);
  const studentLabel = (id: number) => {
    const s = students.find((s) => s.id === id);
    return s ? `${s.last_name} ${s.first_name}` : "—";
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
    {
      title: "Évaluation",
      key: "assessment",
      render: (_, record) => {
        const assessment = assessmentOf(record.assessment_id);
        return assessment ? assessmentText(assessment) : "—";
      },
    },
    {
      title: "Note",
      key: "score",
      render: (_, record) => {
        const assessment = assessmentOf(record.assessment_id);
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
        data={visibleGrades}
        loading={loading}
        rowKey={(r) => r.id}
        columns={columns}
        onCreate={openCreate}
        // La saisie commence par le choix de la classe : sans elle, on ne sait
        // pas quels élèves ni quelles évaluations proposer.
        canCreate={can(PERMISSIONS.GRADES_CREATE) && !!classId}
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
                setClassEnrollments([]);
                setClassId(value);
              }}
            />
            {!classId && can(PERMISSIONS.GRADES_CREATE) && (
              <Typography.Text type="secondary">Choisissez une classe pour saisir des notes</Typography.Text>
            )}
          </>
        }
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
