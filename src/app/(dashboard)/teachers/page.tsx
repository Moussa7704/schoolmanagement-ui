"use client";

import { useEffect, useMemo, useState } from "react";
import { message } from "antd";
import type { ColumnsType } from "antd/es/table";
import CrudTable, { buildActionsColumn } from "@/components/common/CrudTable";
import CrudFormDrawer from "@/components/common/CrudFormDrawer";
import type { FormFieldSchema } from "@/components/common/form-field";
import { schoolsApi, teachersApi, type CreateTeacherPayload, type UpdateTeacherPayload } from "@/api/resources";
import type { School, Teacher } from "@/types/models";
import { useAuth } from "@/hooks/useAuth";
import { usePermission } from "@/hooks/usePermission";
import { PERMISSIONS } from "@/lib/permissions";
import { getErrorMessage } from "@/lib/errors";

export default function TeachersPage() {
  const { user: currentUser } = useAuth();
  const can = usePermission();
  const isSuperAdmin = currentUser?.Role?.name === "SUPER_ADMIN";

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Teacher | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadTeachers = async () => {
    setLoading(true);
    try {
      setTeachers(await teachersApi.list());
    } catch (err) {
      message.error(getErrorMessage(err, "Échec du chargement des enseignants"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch-on-mount, not a render-triggered cascade
    loadTeachers();
    if (isSuperAdmin) {
      schoolsApi.list().then(setSchools).catch(() => {});
    }
  }, [isSuperAdmin]);

  const schoolOptions = useMemo(() => schools.map((s) => ({ label: s.name, value: s.id })), [schools]);

  // Édition : seuls specialty/hire_date/employee_number sont modifiables (voir
  // service/teacher.service.js#update) — nom/email/mot de passe passent par le
  // compte User sous-jacent, non exposé sur cette route.
  const fields: FormFieldSchema[] = useMemo(() => {
    if (editing) {
      return [
        { name: "specialty", label: "Spécialité", type: "text" },
        { name: "hire_date", label: "Date d'embauche", type: "date" },
        { name: "employee_number", label: "Matricule", type: "text" },
      ];
    }

    const base: FormFieldSchema[] = [
      { name: "first_name", label: "Prénom", type: "text", required: true },
      { name: "last_name", label: "Nom", type: "text", required: true },
      { name: "email", label: "Email", type: "email", required: true },
      { name: "password", label: "Mot de passe", type: "password", required: true },
      { name: "phone", label: "Téléphone", type: "text" },
      { name: "specialty", label: "Spécialité", type: "text" },
      { name: "hire_date", label: "Date d'embauche", type: "date" },
      { name: "employee_number", label: "Matricule", type: "text" },
    ];

    if (isSuperAdmin) {
      base.push({ name: "school_id", label: "École", type: "select", required: true, options: schoolOptions });
    }

    return base;
  }, [editing, isSuperAdmin, schoolOptions]);

  const openCreate = () => {
    setEditing(null);
    setDrawerOpen(true);
  };

  const openEdit = (record: Teacher) => {
    setEditing(record);
    setDrawerOpen(true);
  };

  const handleSubmit = async (values: CreateTeacherPayload | UpdateTeacherPayload) => {
    setSubmitting(true);
    try {
      if (editing) {
        await teachersApi.update(editing.id, values as UpdateTeacherPayload);
        message.success("Enseignant mis à jour");
      } else {
        await teachersApi.create(values as CreateTeacherPayload);
        message.success("Enseignant créé");
      }
      setDrawerOpen(false);
      await loadTeachers();
    } catch (err) {
      message.error(getErrorMessage(err, "Échec de l'enregistrement"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (record: Teacher) => {
    try {
      await teachersApi.remove(record.id);
      message.success("Enseignant supprimé");
      await loadTeachers();
    } catch (err) {
      message.error(getErrorMessage(err, "Échec de la suppression"));
    }
  };

  const columns: ColumnsType<Teacher> = [
    {
      title: "Nom",
      key: "name",
      render: (_, record) => (record.User ? `${record.User.first_name} ${record.User.last_name}` : "—"),
    },
    { title: "Email", key: "email", render: (_, record) => record.User?.email ?? "—" },
    { title: "Spécialité", dataIndex: "specialty", render: (v) => v || "—" },
    { title: "Date d'embauche", dataIndex: "hire_date", render: (v) => v || "—" },
    { title: "Matricule", dataIndex: "employee_number", render: (v) => v || "—" },
    ...(isSuperAdmin
      ? [{ title: "École", key: "school", render: (_: unknown, record: Teacher) => record.School?.name ?? "—" }]
      : []),
    buildActionsColumn<Teacher>({
      onEdit: can(PERMISSIONS.TEACHERS_UPDATE) ? openEdit : undefined,
      onDelete: can(PERMISSIONS.TEACHERS_DELETE) ? handleDelete : undefined,
    }),
  ];

  return (
    <>
      <CrudTable<Teacher>
        title="Enseignants"
        data={teachers}
        loading={loading}
        rowKey={(r) => r.id}
        columns={columns}
        onCreate={openCreate}
        canCreate={can(PERMISSIONS.TEACHERS_CREATE)}
      />

      <CrudFormDrawer<CreateTeacherPayload | UpdateTeacherPayload>
        open={drawerOpen}
        title={editing ? "Modifier l'enseignant" : "Nouvel enseignant"}
        fields={fields}
        initialValues={editing ?? undefined}
        submitting={submitting}
        onClose={() => setDrawerOpen(false)}
        onSubmit={handleSubmit}
      />
    </>
  );
}
