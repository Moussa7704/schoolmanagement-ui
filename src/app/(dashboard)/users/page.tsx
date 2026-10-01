"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Dropdown, Space, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useMessage } from "@/hooks/useMessage";
import CrudTable, { buildActionsColumn } from "@/components/common/CrudTable";
import CrudFormDrawer from "@/components/common/CrudFormDrawer";
import type { FormFieldSchema } from "@/components/common/form-field";
import { usersApi, schoolsApi, type CreateUserPayload, type UpdateUserPayload } from "@/api/resources";
import type { School, User, UserStatus } from "@/types/models";
import { useAuth } from "@/hooks/useAuth";
import { usePermission } from "@/hooks/usePermission";
import { PERMISSIONS } from "@/lib/permissions";
import { getErrorMessage } from "@/lib/errors";

// Matches backend MANAGEABLE_ROLES in service/user.service.js — TEACHER goes
// through /teachers, STUDENT/PARENT through grant-access, SUPER_ADMIN never
// created here.
const ROLE_OPTIONS = [
  { label: "Administrateur école", value: "SCHOOL_ADMIN" },
  { label: "Directeur", value: "DIRECTOR" },
  { label: "Comptable", value: "ACCOUNTANT" },
  { label: "Personnel", value: "STAFF" },
];

const STATUS_OPTIONS: UserStatus[] = ["active", "inactive", "suspended", "pending"];

const STATUS_COLORS: Record<UserStatus, string> = {
  active: "green",
  inactive: "default",
  suspended: "red",
  pending: "gold",
};

export default function UsersPage() {
  const message = useMessage();
  const { user: currentUser } = useAuth();
  const can = usePermission();
  const isSuperAdmin = currentUser?.Role?.name === "SUPER_ADMIN";

  const [users, setUsers] = useState<User[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [passwordTarget, setPasswordTarget] = useState<User | null>(null);
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    try {
      setUsers(await usersApi.list());
    } catch (err) {
      message.error(getErrorMessage(err, "Échec du chargement des utilisateurs"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch-on-mount, not a render-triggered cascade
    loadUsers();
    if (isSuperAdmin) {
      schoolsApi.list().then(setSchools).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadUsers is a stable mount-time fetch, not meant to re-run when its own closure identity changes
  }, [isSuperAdmin]);

  const schoolOptions = useMemo(() => schools.map((s) => ({ label: s.name, value: s.id })), [schools]);

  const fields: FormFieldSchema[] = useMemo(() => {
    if (editing) {
      return [
        { name: "first_name", label: "Prénom", type: "text", required: true },
        { name: "last_name", label: "Nom", type: "text", required: true },
        { name: "phone", label: "Téléphone", type: "text" },
        { name: "email", label: "Email", type: "email", required: true },
      ];
    }

    const base: FormFieldSchema[] = [
      { name: "first_name", label: "Prénom", type: "text", required: true },
      { name: "last_name", label: "Nom", type: "text", required: true },
      { name: "email", label: "Email", type: "email", required: true },
      { name: "password", label: "Mot de passe", type: "password", required: true },
      { name: "phone", label: "Téléphone", type: "text" },
      { name: "role", label: "Rôle", type: "select", required: true, options: ROLE_OPTIONS },
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

  const openEdit = (record: User) => {
    setEditing(record);
    setDrawerOpen(true);
  };

  const handleSubmit = async (values: CreateUserPayload | UpdateUserPayload) => {
    setSubmitting(true);
    try {
      if (editing) {
        await usersApi.update(editing.id, values as UpdateUserPayload);
        message.success("Utilisateur mis à jour");
      } else {
        await usersApi.create(values as CreateUserPayload);
        message.success("Utilisateur créé");
      }
      setDrawerOpen(false);
      await loadUsers();
    } catch (err) {
      message.error(getErrorMessage(err, "Échec de l'enregistrement"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (record: User) => {
    try {
      await usersApi.remove(record.id);
      message.success("Utilisateur supprimé");
      await loadUsers();
    } catch (err) {
      message.error(getErrorMessage(err, "Échec de la suppression"));
    }
  };

  const handleChangeStatus = async (record: User, status: UserStatus) => {
    try {
      await usersApi.changeStatus(record.id, status as "active" | "inactive" | "suspended");
      message.success("Statut mis à jour");
      await loadUsers();
    } catch (err) {
      message.error(getErrorMessage(err, "Échec du changement de statut"));
    }
  };

  const handlePasswordSubmit = async (values: { new_password: string }) => {
    if (!passwordTarget) return;
    setPasswordSubmitting(true);
    try {
      await usersApi.changePassword(passwordTarget.id, values.new_password);
      message.success("Mot de passe réinitialisé");
      setPasswordTarget(null);
    } catch (err) {
      message.error(getErrorMessage(err, "Échec de la réinitialisation"));
    } finally {
      setPasswordSubmitting(false);
    }
  };

  const columns: ColumnsType<User> = [
    { title: "Nom", key: "name", render: (_, record) => `${record.first_name} ${record.last_name}` },
    { title: "Email", dataIndex: "email" },
    { title: "Téléphone", dataIndex: "phone", render: (v) => v || "—" },
    { title: "Rôle", key: "role", render: (_, record) => record.Role?.name },
    // Seul le SUPER_ADMIN voit plusieurs écoles : pour les autres rôles, tous les
    // utilisateurs listés sont de leur propre école, la colonne serait inutile.
    ...(isSuperAdmin
      ? [
          {
            title: "École",
            key: "school",
            // Un SUPER_ADMIN n'est rattaché à aucune école : il gère toute la plateforme.
            render: (_: unknown, record: User) =>
              record.School?.name ?? (record.Role?.name === "SUPER_ADMIN" ? "Toutes (plateforme)" : "—"),
          },
        ]
      : []),
    {
      title: "Statut",
      dataIndex: "status",
      render: (status: UserStatus) => <Tag color={STATUS_COLORS[status]}>{status}</Tag>,
    },
    buildActionsColumn<User>({
      onEdit: can(PERMISSIONS.USERS_UPDATE) ? openEdit : undefined,
      onDelete: can(PERMISSIONS.USERS_DELETE) ? handleDelete : undefined,
      extra: (record) => (
        <Space size={4}>
          {can(PERMISSIONS.USERS_CHANGE_STATUS) && (
            <Dropdown
              menu={{
                items: STATUS_OPTIONS.map((s) => ({ key: s, label: s })),
                onClick: ({ key }) => handleChangeStatus(record, key as UserStatus),
              }}
            >
              <Button size="small">Statut</Button>
            </Dropdown>
          )}
          {can(PERMISSIONS.USERS_CHANGE_PASSWORD) && (
            <Button size="small" onClick={() => setPasswordTarget(record)}>
              Mot de passe
            </Button>
          )}
        </Space>
      ),
    }),
  ];

  return (
    <>
      <CrudTable<User>
        title="Utilisateurs"
        data={users}
        loading={loading}
        rowKey={(r) => r.id}
        columns={columns}
        onCreate={openCreate}
        canCreate={can(PERMISSIONS.USERS_CREATE)}
      />

      <CrudFormDrawer<CreateUserPayload | UpdateUserPayload>
        open={drawerOpen}
        title={editing ? "Modifier l'utilisateur" : "Nouvel utilisateur"}
        fields={fields}
        initialValues={editing ?? undefined}
        submitting={submitting}
        onClose={() => setDrawerOpen(false)}
        onSubmit={handleSubmit}
      />

      <CrudFormDrawer<{ new_password: string }>
        open={!!passwordTarget}
        title="Réinitialiser le mot de passe"
        fields={[{ name: "new_password", label: "Nouveau mot de passe", type: "password", required: true }]}
        submitting={passwordSubmitting}
        onClose={() => setPasswordTarget(null)}
        onSubmit={handlePasswordSubmit}
      />
    </>
  );
}
