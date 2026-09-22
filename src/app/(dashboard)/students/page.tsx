"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useMessage } from "@/hooks/useMessage";
import CrudTable, { buildActionsColumn } from "@/components/common/CrudTable";
import CrudFormDrawer from "@/components/common/CrudFormDrawer";
import type { FormFieldSchema } from "@/components/common/form-field";
import { schoolsApi, studentsApi, type CreateStudentPayload, type UpdateStudentPayload } from "@/api/resources";
import type { School, Student } from "@/types/models";
import { useAuth } from "@/hooks/useAuth";
import { usePermission } from "@/hooks/usePermission";
import { PERMISSIONS } from "@/lib/permissions";
import { getErrorMessage } from "@/lib/errors";

const GENDER_OPTIONS = [
  { label: "Masculin", value: "M" },
  { label: "Féminin", value: "F" },
];

interface GrantAccessValues {
  email: string;
  password: string;
}

export default function StudentsPage() {
  const message = useMessage();
  const { user: currentUser } = useAuth();
  const can = usePermission();
  const isSuperAdmin = currentUser?.Role?.name === "SUPER_ADMIN";

  const [students, setStudents] = useState<Student[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [grantTarget, setGrantTarget] = useState<Student | null>(null);
  const [grantSubmitting, setGrantSubmitting] = useState(false);

  const loadStudents = async () => {
    setLoading(true);
    try {
      setStudents(await studentsApi.list());
    } catch (err) {
      message.error(getErrorMessage(err, "Échec du chargement des élèves"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch-on-mount, not a render-triggered cascade
    loadStudents();
    if (isSuperAdmin) {
      schoolsApi.list().then(setSchools).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadStudents is a stable mount-time fetch, not meant to re-run when its own closure identity changes
  }, [isSuperAdmin]);

  const schoolOptions = useMemo(() => schools.map((s) => ({ label: s.name, value: s.id })), [schools]);

  const fields: FormFieldSchema[] = useMemo(() => {
    const base: FormFieldSchema[] = [
      { name: "student_number", label: "Matricule", type: "text" },
      { name: "first_name", label: "Prénom", type: "text", required: true },
      { name: "last_name", label: "Nom", type: "text", required: true },
      { name: "date_of_birth", label: "Date de naissance", type: "date" },
      { name: "gender", label: "Genre", type: "select", options: GENDER_OPTIONS },
    ];

    if (!editing && isSuperAdmin) {
      base.push({ name: "school_id", label: "École", type: "select", required: true, options: schoolOptions });
    }

    return base;
  }, [editing, isSuperAdmin, schoolOptions]);

  const openCreate = () => {
    setEditing(null);
    setDrawerOpen(true);
  };

  const openEdit = (record: Student) => {
    setEditing(record);
    setDrawerOpen(true);
  };

  const handleSubmit = async (values: CreateStudentPayload | UpdateStudentPayload) => {
    setSubmitting(true);
    try {
      if (editing) {
        await studentsApi.update(editing.id, values as UpdateStudentPayload);
        message.success("Élève mis à jour");
      } else {
        await studentsApi.create(values as CreateStudentPayload);
        message.success("Élève créé");
      }
      setDrawerOpen(false);
      await loadStudents();
    } catch (err) {
      message.error(getErrorMessage(err, "Échec de l'enregistrement"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (record: Student) => {
    try {
      await studentsApi.remove(record.id);
      message.success("Élève supprimé");
      await loadStudents();
    } catch (err) {
      message.error(getErrorMessage(err, "Échec de la suppression"));
    }
  };

  const handleGrantAccess = async (values: GrantAccessValues) => {
    if (!grantTarget) return;
    setGrantSubmitting(true);
    try {
      await studentsApi.grantAccess(grantTarget.id, values);
      message.success("Compte de connexion créé");
      setGrantTarget(null);
      await loadStudents();
    } catch (err) {
      message.error(getErrorMessage(err, "Échec de la création du compte"));
    } finally {
      setGrantSubmitting(false);
    }
  };

  const columns: ColumnsType<Student> = [
    { title: "Matricule", dataIndex: "student_number", render: (v) => v || "—" },
    { title: "Nom", key: "name", render: (_, record) => `${record.first_name} ${record.last_name}` },
    { title: "Date de naissance", dataIndex: "date_of_birth", render: (v) => v || "—" },
    { title: "Genre", dataIndex: "gender", render: (v) => v || "—" },
    ...(isSuperAdmin
      ? [{ title: "École", key: "school", render: (_: unknown, record: Student) => record.School?.name ?? "—" }]
      : []),
    {
      title: "Compte",
      key: "account",
      render: (_, record) => (record.user_id ? <Tag color="green">Actif</Tag> : <Tag>Aucun</Tag>),
    },
    buildActionsColumn<Student>({
      onEdit: can(PERMISSIONS.STUDENTS_UPDATE) ? openEdit : undefined,
      onDelete: can(PERMISSIONS.STUDENTS_DELETE) ? handleDelete : undefined,
      extra: (record) =>
        !record.user_id && can(PERMISSIONS.STUDENTS_GRANT_ACCESS) ? (
          <Button size="small" onClick={() => setGrantTarget(record)}>
            Créer un compte
          </Button>
        ) : null,
    }),
  ];

  return (
    <>
      <CrudTable<Student>
        title="Élèves"
        data={students}
        loading={loading}
        rowKey={(r) => r.id}
        columns={columns}
        onCreate={openCreate}
        canCreate={can(PERMISSIONS.STUDENTS_CREATE)}
      />

      <CrudFormDrawer<CreateStudentPayload | UpdateStudentPayload>
        open={drawerOpen}
        title={editing ? "Modifier l'élève" : "Nouvel élève"}
        fields={fields}
        initialValues={editing ?? undefined}
        submitting={submitting}
        onClose={() => setDrawerOpen(false)}
        onSubmit={handleSubmit}
      />

      <CrudFormDrawer<GrantAccessValues>
        open={!!grantTarget}
        title="Créer un compte de connexion"
        fields={[
          { name: "email", label: "Email", type: "email", required: true },
          { name: "password", label: "Mot de passe", type: "password", required: true },
        ]}
        submitting={grantSubmitting}
        onClose={() => setGrantTarget(null)}
        onSubmit={handleGrantAccess}
      />
    </>
  );
}
