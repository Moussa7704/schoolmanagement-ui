"use client";

import { useEffect, useMemo, useState } from "react";
import type { ColumnsType } from "antd/es/table";
import { useMessage } from "@/hooks/useMessage";
import CrudTable, { buildActionsColumn } from "@/components/common/CrudTable";
import CrudFormDrawer from "@/components/common/CrudFormDrawer";
import type { FormFieldSchema } from "@/components/common/form-field";
import { schoolsApi, subjectsApi, type CreateSubjectPayload, type UpdateSubjectPayload } from "@/api/resources";
import type { School, Subject } from "@/types/models";
import { useAuth } from "@/hooks/useAuth";
import { usePermission } from "@/hooks/usePermission";
import { PERMISSIONS } from "@/lib/permissions";
import { getErrorMessage } from "@/lib/errors";

export default function SubjectsPage() {
  const message = useMessage();
  const { user: currentUser } = useAuth();
  const can = usePermission();
  const isSuperAdmin = currentUser?.Role?.name === "SUPER_ADMIN";

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadSubjects = async () => {
    setLoading(true);
    try {
      setSubjects(await subjectsApi.list());
    } catch (err) {
      message.error(getErrorMessage(err, "Échec du chargement des matières"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch-on-mount, not a render-triggered cascade
    loadSubjects();
    if (isSuperAdmin) {
      schoolsApi.list().then(setSchools).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadSubjects is a stable mount-time fetch, not meant to re-run when its own closure identity changes
  }, [isSuperAdmin]);

  const schoolOptions = useMemo(() => schools.map((s) => ({ label: s.name, value: s.id })), [schools]);

  const fields: FormFieldSchema[] = useMemo(() => {
    const base: FormFieldSchema[] = [
      { name: "name", label: "Nom", type: "text", required: true },
      { name: "coefficient_default", label: "Coefficient par défaut", type: "number" },
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

  const openEdit = (record: Subject) => {
    setEditing(record);
    setDrawerOpen(true);
  };

  const handleSubmit = async (values: CreateSubjectPayload | UpdateSubjectPayload) => {
    setSubmitting(true);
    try {
      if (editing) {
        await subjectsApi.update(editing.id, values as UpdateSubjectPayload);
        message.success("Matière mise à jour");
      } else {
        await subjectsApi.create(values as CreateSubjectPayload);
        message.success("Matière créée");
      }
      setDrawerOpen(false);
      await loadSubjects();
    } catch (err) {
      message.error(getErrorMessage(err, "Échec de l'enregistrement"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (record: Subject) => {
    try {
      await subjectsApi.remove(record.id);
      message.success("Matière supprimée");
      await loadSubjects();
    } catch (err) {
      message.error(getErrorMessage(err, "Échec de la suppression"));
    }
  };

  const columns: ColumnsType<Subject> = [
    { title: "Nom", dataIndex: "name" },
    { title: "Coefficient", dataIndex: "coefficient_default" },
    ...(isSuperAdmin
      ? [{ title: "École", key: "school", render: (_: unknown, record: Subject) => record.School?.name ?? "—" }]
      : []),
    buildActionsColumn<Subject>({
      onEdit: can(PERMISSIONS.SUBJECTS_UPDATE) ? openEdit : undefined,
      onDelete: can(PERMISSIONS.SUBJECTS_DELETE) ? handleDelete : undefined,
    }),
  ];

  return (
    <>
      <CrudTable<Subject>
        title="Matières"
        data={subjects}
        loading={loading}
        rowKey={(r) => r.id}
        columns={columns}
        onCreate={openCreate}
        canCreate={can(PERMISSIONS.SUBJECTS_CREATE)}
      />

      <CrudFormDrawer<CreateSubjectPayload | UpdateSubjectPayload>
        open={drawerOpen}
        title={editing ? "Modifier la matière" : "Nouvelle matière"}
        fields={fields}
        initialValues={editing ?? undefined}
        submitting={submitting}
        onClose={() => setDrawerOpen(false)}
        onSubmit={handleSubmit}
      />
    </>
  );
}
