"use client";

import { useEffect, useState } from "react";
import { Button, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useMessage } from "@/hooks/useMessage";
import CrudTable, { buildActionsColumn } from "@/components/common/CrudTable";
import CrudFormDrawer from "@/components/common/CrudFormDrawer";
import type { FormFieldSchema } from "@/components/common/form-field";
import { guardiansApi, type CreateGuardianPayload, type UpdateGuardianPayload } from "@/api/resources";
import type { Guardian, UserStatus } from "@/types/models";
import { usePermission } from "@/hooks/usePermission";
import { PERMISSIONS } from "@/lib/permissions";
import { getErrorMessage } from "@/lib/errors";

const FIELDS: FormFieldSchema[] = [
  { name: "first_name", label: "Prénom", type: "text", required: true },
  { name: "last_name", label: "Nom", type: "text", required: true },
  { name: "phone", label: "Téléphone", type: "text" },
  { name: "email", label: "Email", type: "email" },
  { name: "address", label: "Adresse", type: "text" },
];

interface GrantAccessValues {
  email: string;
  password: string;
}

const ACCOUNT_STATUS_COLORS: Record<UserStatus, string> = {
  active: "green",
  inactive: "default",
  suspended: "red",
  pending: "gold",
};

export default function GuardiansPage() {
  const message = useMessage();
  const can = usePermission();

  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Guardian | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [grantTarget, setGrantTarget] = useState<Guardian | null>(null);
  const [grantSubmitting, setGrantSubmitting] = useState(false);

  const loadGuardians = async () => {
    setLoading(true);
    try {
      setGuardians(await guardiansApi.list());
    } catch (err) {
      message.error(getErrorMessage(err, "Échec du chargement des tuteurs/parents"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch-on-mount, not a render-triggered cascade
    loadGuardians();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadGuardians is a stable mount-time fetch, not meant to re-run when its own closure identity changes
  }, []);

  const openCreate = () => {
    setEditing(null);
    setDrawerOpen(true);
  };

  const openEdit = (record: Guardian) => {
    setEditing(record);
    setDrawerOpen(true);
  };

  const handleSubmit = async (values: CreateGuardianPayload | UpdateGuardianPayload) => {
    setSubmitting(true);
    try {
      if (editing) {
        await guardiansApi.update(editing.id, values as UpdateGuardianPayload);
        message.success("Tuteur/parent mis à jour");
      } else {
        await guardiansApi.create(values as CreateGuardianPayload);
        message.success("Tuteur/parent créé");
      }
      setDrawerOpen(false);
      await loadGuardians();
    } catch (err) {
      message.error(getErrorMessage(err, "Échec de l'enregistrement"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (record: Guardian) => {
    try {
      await guardiansApi.remove(record.id);
      message.success("Tuteur/parent supprimé");
      await loadGuardians();
    } catch (err) {
      message.error(getErrorMessage(err, "Échec de la suppression"));
    }
  };

  const handleGrantAccess = async (values: GrantAccessValues) => {
    if (!grantTarget) return;
    setGrantSubmitting(true);
    try {
      await guardiansApi.grantAccess(grantTarget.id, values);
      message.success("Compte de connexion créé");
      setGrantTarget(null);
      await loadGuardians();
    } catch (err) {
      message.error(getErrorMessage(err, "Échec de la création du compte"));
    } finally {
      setGrantSubmitting(false);
    }
  };

  const columns: ColumnsType<Guardian> = [
    { title: "Nom", key: "name", render: (_, record) => `${record.first_name} ${record.last_name}` },
    { title: "Téléphone", dataIndex: "phone", render: (v) => v || "—" },
    { title: "Email", dataIndex: "email", render: (v) => v || "—" },
    { title: "Adresse", dataIndex: "address", render: (v) => v || "—" },
    {
      title: "Compte",
      key: "account",
      render: (_, record) =>
        record.User ? (
          <Tag color={ACCOUNT_STATUS_COLORS[record.User.status]}>{record.User.status}</Tag>
        ) : (
          <Tag>Aucun</Tag>
        ),
    },
    buildActionsColumn<Guardian>({
      onEdit: can(PERMISSIONS.GUARDIANS_UPDATE) ? openEdit : undefined,
      onDelete: can(PERMISSIONS.GUARDIANS_DELETE) ? handleDelete : undefined,
      extra: (record) =>
        !record.user_id && can(PERMISSIONS.GUARDIANS_GRANT_ACCESS) ? (
          <Button size="small" onClick={() => setGrantTarget(record)}>
            Créer un compte
          </Button>
        ) : null,
    }),
  ];

  return (
    <>
      <CrudTable<Guardian>
        title="Tuteurs / Parents"
        data={guardians}
        loading={loading}
        rowKey={(r) => r.id}
        columns={columns}
        onCreate={openCreate}
        canCreate={can(PERMISSIONS.GUARDIANS_CREATE)}
      />

      <CrudFormDrawer<CreateGuardianPayload | UpdateGuardianPayload>
        open={drawerOpen}
        title={editing ? "Modifier le tuteur/parent" : "Nouveau tuteur/parent"}
        fields={FIELDS}
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
