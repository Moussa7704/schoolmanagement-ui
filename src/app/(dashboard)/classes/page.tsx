"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Modal, Select, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useMessage } from "@/hooks/useMessage";
import CrudTable, { buildActionsColumn } from "@/components/common/CrudTable";
import CrudFormDrawer from "@/components/common/CrudFormDrawer";
import type { FormFieldSchema } from "@/components/common/form-field";
import { academicYearsApi, classesApi, enrollmentsApi, studentsApi, type CreateClassPayload, type PromotionEntry, type UpdateClassPayload, } from "@/api/resources";
import type { AcademicYear, Class, EducationCycle, Enrollment, EnrollmentStatus, Student } from "@/types/models";
import { usePermission } from "@/hooks/usePermission";
import { PERMISSIONS } from "@/lib/permissions";
import { CYCLE_LABELS, CYCLE_OPTIONS } from "@/lib/cycles";
import { getErrorMessage } from "@/lib/errors";

type PromotionStatus = Extract<EnrollmentStatus, "ACTIVE" | "REPEATING">;

interface PromotionRowState {
  target_class_id?: number;
  status: PromotionStatus;
}

export default function ClassesPage() {
  const message = useMessage();
  const can = usePermission();

  const [classes, setClasses] = useState<Class[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Class | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [promoteTarget, setPromoteTarget] = useState<Class | null>(null);
  const [promoteLoading, setPromoteLoading] = useState(false);
  const [promoteSubmitting, setPromoteSubmitting] = useState(false);
  const [activeEnrollments, setActiveEnrollments] = useState<Enrollment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [defaultTargetClassId, setDefaultTargetClassId] = useState<number | undefined>();
  const [rowOverrides, setRowOverrides] = useState<Record<number, PromotionRowState>>({});

  const [rosterTarget, setRosterTarget] = useState<Class | null>(null);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterEnrollments, setRosterEnrollments] = useState<Enrollment[]>([]);
  const [rosterStudents, setRosterStudents] = useState<Student[]>([]);
  const [filterCycle, setFilterCycle] = useState<EducationCycle | undefined>();

  const loadClasses = async () => {
    setLoading(true);
    try {
      setClasses(await classesApi.list({ cycle: filterCycle }));
    } catch (err) {
      message.error(getErrorMessage(err, "Échec du chargement des classes"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    academicYearsApi.list().then(setAcademicYears).catch(() => { });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetch-on-mount only
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- refetches from the backend whenever the filter changes (including the initial mount, with it undefined)
    loadClasses();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadClasses is a stable closure re-created each render; re-running the effect on its identity would defeat the point of keying on the filter
  }, [filterCycle]);

  const academicYearOptions = useMemo(
    () => academicYears.map((a) => ({ label: a.label, value: a.id })),
    [academicYears]
  );
  const academicYearLabel = (id: number) => academicYears.find((a) => a.id === id)?.label ?? "—";

  const fields: FormFieldSchema[] = useMemo(() => {
    const base: FormFieldSchema[] = [
      { name: "name", label: "Nom", type: "text", required: true, placeholder: "6ème A" },
      { name: "level", label: "Niveau", type: "text", placeholder: "6ème" },
      { name: "cycle", label: "Cycle", type: "select", options: CYCLE_OPTIONS },
      { name: "capacity", label: "Capacité", type: "number" },
    ];
    if (!editing) {
      base.unshift({
        name: "academic_year_id",
        label: "Année scolaire",
        type: "select",
        required: true,
        options: academicYearOptions,
      });
    }
    return base;
  }, [editing, academicYearOptions]);

  const openCreate = () => {
    setEditing(null);
    setDrawerOpen(true);
  };

  const openEdit = (record: Class) => {
    setEditing(record);
    setDrawerOpen(true);
  };

  const handleSubmit = async (values: CreateClassPayload | UpdateClassPayload) => {
    setSubmitting(true);
    try {
      if (editing) {
        await classesApi.update(editing.id, values as UpdateClassPayload);
        message.success("Classe mise à jour");
      } else {
        await classesApi.create(values as CreateClassPayload);
        message.success("Classe créée");
      }
      setDrawerOpen(false);
      await loadClasses();
    } catch (err) {
      message.error(getErrorMessage(err, "Échec de l'enregistrement"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (record: Class) => {
    try {
      await classesApi.remove(record.id);
      message.success("Classe supprimée");
      await loadClasses();
    } catch (err) {
      message.error(getErrorMessage(err, "Échec de la suppression"));
    }
  };

  const openPromote = async (record: Class) => {
    setPromoteTarget(record);
    setDefaultTargetClassId(undefined);
    setRowOverrides({});
    setPromoteLoading(true);
    try {
      const [enrollments, studentsList] = await Promise.all([
        enrollmentsApi.list({ class_id: record.id }),
        studentsApi.list(),
      ]);
      setActiveEnrollments(enrollments.filter((e) => e.status === "ACTIVE"));
      setStudents(studentsList);
    } catch (err) {
      message.error(getErrorMessage(err, "Échec du chargement des élèves de la classe"));
    } finally {
      setPromoteLoading(false);
    }
  };

  const studentLabel = (id: number) => {
    const s = students.find((student) => student.id === id);
    return s ? `${s.first_name} ${s.last_name}` : "—";
  };

  const openRoster = async (record: Class) => {
    setRosterTarget(record);
    setRosterLoading(true);
    try {
      const [enrollments, studentsList] = await Promise.all([
        enrollmentsApi.list({ class_id: record.id }),
        studentsApi.list(),
      ]);
      setRosterEnrollments(enrollments.filter((e) => e.status === "ACTIVE"));
      setRosterStudents(studentsList);
    } catch (err) {
      message.error(getErrorMessage(err, "Échec du chargement des élèves de la classe"));
    } finally {
      setRosterLoading(false);
    }
  };

  const rosterStudent = (studentId: number) => rosterStudents.find((s) => s.id === studentId);

  const targetClassOptions = useMemo(
    () =>
      classes
        .filter((c) => c.id !== promoteTarget?.id)
        .map((c) => ({ label: `${c.name} (${academicYearLabel(c.academic_year_id)})`, value: c.id })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [classes, promoteTarget, academicYears]
  );

  const setRowOverride = (studentId: number, patch: Partial<PromotionRowState>) => {
    setRowOverrides((prev) => {
      const current: PromotionRowState = prev[studentId] ?? { status: "ACTIVE" };
      return { ...prev, [studentId]: { ...current, ...patch } };
    });
  };

  const handlePromoteSubmit = async () => {
    if (!promoteTarget) return;

    const promotions: PromotionEntry[] = [];
    let skipped = 0;
    for (const enrollment of activeEnrollments) {
      const override = rowOverrides[enrollment.student_id];
      const target_class_id = override?.target_class_id ?? defaultTargetClassId;
      if (!target_class_id) {
        skipped += 1;
        continue;
      }
      promotions.push({ student_id: enrollment.student_id, target_class_id, status: override?.status ?? "ACTIVE" });
    }

    if (promotions.length === 0) {
      message.error("Choisissez au moins une classe cible.");
      return;
    }
    if (skipped > 0) {
      message.warning(`${skipped} élève(s) sans classe cible ne seront pas promus.`);
    }

    setPromoteSubmitting(true);
    try {
      await classesApi.promote(promoteTarget.id, promotions);
      message.success("Élèves promus avec succès");
      setPromoteTarget(null);
    } catch (err) {
      message.error(getErrorMessage(err, "Échec de la promotion"));
    } finally {
      setPromoteSubmitting(false);
    }
  };

  const columns: ColumnsType<Class> = [
    { title: "Nom", dataIndex: "name" },
    { title: "Niveau", dataIndex: "level", render: (v) => v || "—" },
    { title: "Cycle", dataIndex: "cycle", render: (v: EducationCycle | null) => (v ? CYCLE_LABELS[v] : "—") },
    { title: "Capacité", dataIndex: "capacity", render: (v) => v ?? "—" },
    { title: "Effectif", dataIndex: "students_count", render: (v) => v ?? 0 },
    { title: "Garçons", dataIndex: "boys_count", render: (v) => v ?? 0 },
    { title: "Filles", dataIndex: "girls_count", render: (v) => v ?? 0 },
    { title: "Année scolaire", key: "academic_year", render: (_, record) => academicYearLabel(record.academic_year_id) },
    buildActionsColumn<Class>({
      onEdit: can(PERMISSIONS.CLASSES_UPDATE) ? openEdit : undefined,
      onDelete: can(PERMISSIONS.CLASSES_DELETE) ? handleDelete : undefined,
      extra: (record) => (
        <>
          {can(PERMISSIONS.STUDENTS_VIEW) && (
            <Button size="small" onClick={() => openRoster(record)}>
              Élèves
            </Button>
          )}
          {can(PERMISSIONS.ENROLLMENTS_CREATE) && (
            <Button size="small" onClick={() => openPromote(record)}>
              Promouvoir
            </Button>
          )}
        </>
      ),
    }),
  ];

  return (
    <>
      <CrudTable<Class>
        title="Classes"
        data={classes}
        loading={loading}
        rowKey={(r) => r.id}
        columns={columns}
        onCreate={openCreate}
        canCreate={can(PERMISSIONS.CLASSES_CREATE)}
        extraActions={
          <Select
            allowClear
            placeholder="Filtrer par cycle"
            style={{ width: 200 }}
            options={CYCLE_OPTIONS}
            value={filterCycle}
            onChange={setFilterCycle}
          />
        }
      />

      <CrudFormDrawer<CreateClassPayload | UpdateClassPayload>
        open={drawerOpen}
        title={editing ? "Modifier la classe" : "Nouvelle classe"}
        fields={fields}
        initialValues={editing ?? undefined}
        submitting={submitting}
        onClose={() => setDrawerOpen(false)}
        onSubmit={handleSubmit}
      />

      <Modal
        title={promoteTarget ? `Promouvoir les élèves de ${promoteTarget.name}` : "Promouvoir"}
        open={!!promoteTarget}
        onCancel={() => setPromoteTarget(null)}
        width={720}
        confirmLoading={promoteSubmitting}
        onOk={handlePromoteSubmit}
        okText="Promouvoir"
        okButtonProps={{ disabled: activeEnrollments.length === 0 }}
      >
        <div className="mb-4">
          <Typography.Text strong>Classe cible par défaut</Typography.Text>
          <Select
            className="block mt-1"
            style={{ width: "100%" }}
            placeholder="Choisir une classe cible pour tous les élèves"
            options={targetClassOptions}
            value={defaultTargetClassId}
            onChange={setDefaultTargetClassId}
            allowClear
          />
          <Typography.Text type="secondary" className="text-xs">
            Applique cette classe à tous les élèves ci-dessous ; utilisez la colonne &quot;Classe cible&quot;
            pour envoyer certains élèves ailleurs (redoublement, par exemple).
          </Typography.Text>
        </div>

        <Table<Enrollment>
          rowKey={(e) => e.student_id}
          size="small"
          loading={promoteLoading}
          dataSource={activeEnrollments}
          pagination={false}
          columns={[
            { title: "Élève", key: "student", render: (_, e) => studentLabel(e.student_id) },
            {
              title: "Classe cible",
              key: "target",
              render: (_, e) => (
                <Select
                  size="small"
                  style={{ width: 220 }}
                  placeholder="Classe par défaut"
                  allowClear
                  options={targetClassOptions}
                  value={rowOverrides[e.student_id]?.target_class_id}
                  onChange={(value) => setRowOverride(e.student_id, { target_class_id: value })}
                />
              ),
            },
            {
              title: "Statut",
              key: "status",
              render: (_, e) => (
                <Select<PromotionStatus>
                  size="small"
                  style={{ width: 130 }}
                  value={rowOverrides[e.student_id]?.status ?? "ACTIVE"}
                  options={[
                    { label: "Passage", value: "ACTIVE" },
                    { label: "Redouble", value: "REPEATING" },
                  ]}
                  onChange={(value) => setRowOverride(e.student_id, { status: value })}
                />
              ),
            },
          ]}
        />
      </Modal>

      <Modal
        title={rosterTarget ? `Élèves de ${rosterTarget.name}` : "Élèves"}
        open={!!rosterTarget}
        onCancel={() => setRosterTarget(null)}
        width={640}
        footer={
          <Button onClick={() => setRosterTarget(null)}>Fermer</Button>
        }
      >
        <Table<Enrollment>
          rowKey={(e) => e.student_id}
          size="small"
          loading={rosterLoading}
          dataSource={rosterEnrollments}
          pagination={false}
          columns={[
            {
              title: "Nom",
              key: "name",
              render: (_, e) => {
                const s = rosterStudent(e.student_id);
                return s ? `${s.first_name} ${s.last_name}` : "—";
              },
            },
            {
              title: "Matricule",
              key: "student_number",
              render: (_, e) => rosterStudent(e.student_id)?.student_number || "—",
            },
            {
              title: "Genre",
              key: "gender",
              render: (_, e) => rosterStudent(e.student_id)?.gender || "—",
            },
            {
              title: "Date de naissance",
              key: "date_of_birth",
              render: (_, e) => rosterStudent(e.student_id)?.date_of_birth || "—",
            },
            { title: "N° d'inscription", dataIndex: "registration_number", render: (v) => v || "—" },
          ]}
        />
        {!rosterLoading && (
          <Typography.Text type="secondary" className="text-xs">
            {rosterEnrollments.length} élève(s) activement inscrit(s)
          </Typography.Text>
        )}
      </Modal>
    </>
  );
}
