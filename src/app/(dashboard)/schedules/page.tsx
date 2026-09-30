"use client";

import { useEffect, useMemo, useState } from "react";
import { Select, Space } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useMessage } from "@/hooks/useMessage";
import CrudTable, { buildActionsColumn } from "@/components/common/CrudTable";
import CrudFormDrawer from "@/components/common/CrudFormDrawer";
import type { FormFieldSchema } from "@/components/common/form-field";
import {
  classesApi,
  schedulesApi,
  subjectsApi,
  teacherAssignmentsApi,
  teachersApi,
  type CreateSchedulePayload,
  type UpdateSchedulePayload,
} from "@/api/resources";
import type { Class, DayOfWeek, Schedule, Subject, Teacher, TeacherAssignment } from "@/types/models";
import { usePermission } from "@/hooks/usePermission";
import { useAuth } from "@/hooks/useAuth";
import { PERMISSIONS } from "@/lib/permissions";
import { getErrorMessage } from "@/lib/errors";

const DAY_LABELS: Record<DayOfWeek, string> = {
  MONDAY: "Lundi",
  TUESDAY: "Mardi",
  WEDNESDAY: "Mercredi",
  THURSDAY: "Jeudi",
  FRIDAY: "Vendredi",
  SATURDAY: "Samedi",
  SUNDAY: "Dimanche",
};

const DAY_OPTIONS = (Object.keys(DAY_LABELS) as DayOfWeek[]).map((value) => ({ label: DAY_LABELS[value], value }));

export default function SchedulesPage() {
  const message = useMessage();
  const can = usePermission();
  const { user } = useAuth();
  const isTeacher = user?.Role?.name === "TEACHER";

  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Schedule | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [filterClassId, setFilterClassId] = useState<number | undefined>();
  const [filterTeacherId, setFilterTeacherId] = useState<number | undefined>();

  const loadSchedules = async () => {
    setLoading(true);
    try {
      setSchedules(await schedulesApi.list({ class_id: filterClassId, teacher_id: filterTeacherId }));
    } catch (err) {
      message.error(getErrorMessage(err, "Échec du chargement de l'emploi du temps"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isTeacher) {
      // Un enseignant ne lit pas les listes générales de l'école : son espace
      // contient ses affectations, ses classes et ses matières.
      teachersApi
        .myClasses()
        .then((workspace) => {
          setAssignments(workspace.assignments);
          setTeachers([workspace.teacher]);
          setClasses(workspace.classes);
          setSubjects(workspace.subjects);
        })
        .catch((err) => message.error(getErrorMessage(err, "Échec du chargement de vos classes")));
      return;
    }
    teacherAssignmentsApi.list().then(setAssignments).catch(() => {});
    teachersApi.list().then(setTeachers).catch(() => {});
    classesApi.list().then(setClasses).catch(() => {});
    subjectsApi.list().then(setSubjects).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetch-on-mount only
  }, [isTeacher]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- refetches from the backend whenever the filters change (including the initial mount, with both undefined)
    loadSchedules();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadSchedules is a stable closure re-created each render; re-running the effect on its identity would defeat the point of keying on the filters
  }, [filterClassId, filterTeacherId]);

  const teacherLabel = (id: number) => {
    const t = teachers.find((teacher) => teacher.id === id);
    return t?.User ? `${t.User.first_name} ${t.User.last_name}` : `#${id}`;
  };
  const classLabel = (id: number) => classes.find((c) => c.id === id)?.name ?? `#${id}`;
  const subjectLabel = (id: number) => subjects.find((s) => s.id === id)?.name ?? `#${id}`;

  // L'enseignant connecté n'a pas besoin de relire son propre nom.
  const assignmentLabel = (assignment: TeacherAssignment) =>
    isTeacher
      ? `${subjectLabel(assignment.subject_id)} — ${classLabel(assignment.class_id)}`
      : `${subjectLabel(assignment.subject_id)} — ${classLabel(assignment.class_id)} — ${teacherLabel(assignment.teacher_id)}`;

  // Libellés d'un créneau : d'abord les données jointes par l'API (elles couvrent
  // aussi les cours des collègues), sinon les listes chargées par la page.
  const slotSubject = (record: Schedule) =>
    record.TeacherAssignment?.Subject?.name ??
    (findAssignment(record.teacher_assignment_id) ? subjectLabel(findAssignment(record.teacher_assignment_id)!.subject_id) : "—");
  const slotClass = (record: Schedule) =>
    record.TeacherAssignment?.Class?.name ??
    (findAssignment(record.teacher_assignment_id) ? classLabel(findAssignment(record.teacher_assignment_id)!.class_id) : "—");
  const slotTeacher = (record: Schedule) => {
    const user = record.TeacherAssignment?.Teacher?.User;
    if (user) return `${user.first_name} ${user.last_name}`;
    const assignment = findAssignment(record.teacher_assignment_id);
    return assignment ? teacherLabel(assignment.teacher_id) : "—";
  };

  const assignmentOptions = useMemo(
    () => assignments.map((a) => ({ label: assignmentLabel(a), value: a.id })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [assignments, teachers, classes, subjects, isTeacher]
  );
  const classOptions = useMemo(() => classes.map((c) => ({ label: c.name, value: c.id })), [classes]);
  const teacherOptions = useMemo(
    () => teachers.map((t) => ({ label: t.User ? `${t.User.first_name} ${t.User.last_name}` : `#${t.id}`, value: t.id })),
    [teachers]
  );

  const findAssignment = (id: number) => assignments.find((a) => a.id === id);

  const fields: FormFieldSchema[] = [
    {
      name: "teacher_assignment_id",
      label: isTeacher ? "Affectation (matière — classe)" : "Affectation (matière — classe — enseignant)",
      type: "select",
      required: true,
      options: assignmentOptions,
    },
    { name: "day_of_week", label: "Jour", type: "select", required: true, options: DAY_OPTIONS },
    { name: "start_time", label: "Heure de début", type: "time", required: true },
    { name: "end_time", label: "Heure de fin", type: "time", required: true },
    { name: "room", label: "Salle", type: "text" },
  ];

  const openCreate = () => {
    setEditing(null);
    setDrawerOpen(true);
  };

  const openEdit = (record: Schedule) => {
    setEditing(record);
    setDrawerOpen(true);
  };

  const handleSubmit = async (values: CreateSchedulePayload | UpdateSchedulePayload) => {
    setSubmitting(true);
    try {
      if (editing) {
        await schedulesApi.update(editing.id, values as UpdateSchedulePayload);
        message.success("Créneau mis à jour");
      } else {
        await schedulesApi.create(values as CreateSchedulePayload);
        message.success("Créneau créé");
      }
      setDrawerOpen(false);
      await loadSchedules();
    } catch (err) {
      message.error(getErrorMessage(err, "Échec de l'enregistrement"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (record: Schedule) => {
    try {
      await schedulesApi.remove(record.id);
      message.success("Créneau supprimé");
      await loadSchedules();
    } catch (err) {
      message.error(getErrorMessage(err, "Échec de la suppression"));
    }
  };

  const columns: ColumnsType<Schedule> = [
    { title: "Jour", dataIndex: "day_of_week", render: (v: DayOfWeek) => DAY_LABELS[v] },
    {
      title: "Horaire",
      key: "time",
      render: (_, record) => `${record.start_time.slice(0, 5)} – ${record.end_time.slice(0, 5)}`,
    },
    { title: "Matière", key: "subject", render: (_, record) => slotSubject(record) },
    { title: "Classe", key: "class", render: (_, record) => slotClass(record) },
    { title: "Enseignant", key: "teacher", render: (_, record) => slotTeacher(record) },
    { title: "Salle", dataIndex: "room", render: (v) => v || "—" },
    buildActionsColumn<Schedule>({
      onEdit: can(PERMISSIONS.SCHEDULES_UPDATE) ? openEdit : undefined,
      onDelete: can(PERMISSIONS.SCHEDULES_DELETE) ? handleDelete : undefined,
    }),
  ];

  return (
    <>
      <CrudTable<Schedule>
        title="Emploi du temps"
        data={schedules}
        loading={loading}
        rowKey={(r) => r.id}
        columns={columns}
        onCreate={openCreate}
        canCreate={can(PERMISSIONS.SCHEDULES_CREATE)}
        extraActions={
          <Space>
            <Select
              allowClear
              placeholder="Filtrer par classe"
              style={{ width: 180 }}
              options={classOptions}
              value={filterClassId}
              onChange={setFilterClassId}
            />
            {/* Un enseignant voit par défaut son propre emploi du temps : le filtre
                par enseignant ne lui sert à rien. */}
            {!isTeacher && (
              <Select
                allowClear
                placeholder="Filtrer par enseignant"
                style={{ width: 200 }}
                options={teacherOptions}
                value={filterTeacherId}
                onChange={setFilterTeacherId}
              />
            )}
          </Space>
        }
      />

      <CrudFormDrawer<CreateSchedulePayload | UpdateSchedulePayload>
        open={drawerOpen}
        title={editing ? "Modifier le créneau" : "Nouveau créneau"}
        fields={fields}
        initialValues={editing ?? undefined}
        submitting={submitting}
        onClose={() => setDrawerOpen(false)}
        onSubmit={handleSubmit}
      />
    </>
  );
}
