"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Checkbox, Drawer, Space, Table, Tag, Typography, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { permissionsApi, rolesApi } from "@/api/resources";
import type { Permission, Role } from "@/types/models";
import { usePermission } from "@/hooks/usePermission";
import { PERMISSIONS } from "@/lib/permissions";
import { getErrorMessage } from "@/lib/errors";

const resourceOf = (permissionName: string) => permissionName.split(".")[0];

export default function RolesPage() {
  const can = usePermission();

  const [roles, setRoles] = useState<Role[]>([]);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Role | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const loadRoles = async () => {
    setLoading(true);
    try {
      setRoles(await rolesApi.list());
    } catch (err) {
      message.error(getErrorMessage(err, "Échec du chargement des rôles"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch-on-mount, not a render-triggered cascade
    loadRoles();
    permissionsApi.list().then(setAllPermissions).catch(() => {});
  }, []);

  const groups = useMemo(() => {
    const map = new Map<string, Permission[]>();
    for (const p of allPermissions) {
      const key = resourceOf(p.name);
      if (!map.has(key)) map.set(key, []);
      map.get(key)?.push(p);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [allPermissions]);

  const openEdit = (role: Role) => {
    setEditing(role);
    setSelectedIds((role.Permissions ?? []).map((p) => p.id));
  };

  const toggleGroup = (perms: Permission[], checked: boolean) => {
    const ids = perms.map((p) => p.id);
    setSelectedIds((prev) => (checked ? [...new Set([...prev, ...ids])] : prev.filter((id) => !ids.includes(id))));
  };

  const handleSave = async () => {
    if (!editing) return;
    setSubmitting(true);
    try {
      await rolesApi.updatePermissions(editing.id, selectedIds);
      message.success("Permissions mises à jour");
      setEditing(null);
      await loadRoles();
    } catch (err) {
      message.error(getErrorMessage(err, "Échec de la mise à jour"));
    } finally {
      setSubmitting(false);
    }
  };

  const columns: ColumnsType<Role> = [
    { title: "Rôle", dataIndex: "name", render: (v) => <Tag color="blue">{v}</Tag> },
    { title: "Description", dataIndex: "description", render: (v) => v || "—" },
    { title: "Permissions", key: "count", render: (_, record) => record.Permissions?.length ?? 0 },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) =>
        record.name === "SUPER_ADMIN" ? (
          <Typography.Text type="secondary">Contourne toujours les permissions</Typography.Text>
        ) : (
          can(PERMISSIONS.PERMISSIONS_MANAGE) && (
            <Button size="small" onClick={() => openEdit(record)}>
              Gérer les permissions
            </Button>
          )
        ),
    },
  ];

  return (
    <div>
      <Typography.Title level={4}>Rôles</Typography.Title>
      <Table<Role> rowKey={(r) => r.id} columns={columns} dataSource={roles} loading={loading} pagination={false} />

      <Drawer
        title={editing ? `Permissions — ${editing.name}` : ""}
        open={!!editing}
        onClose={() => setEditing(null)}
        width={480}
        destroyOnHidden
        extra={
          <Space>
            <Button onClick={() => setEditing(null)}>Annuler</Button>
            <Button type="primary" loading={submitting} onClick={handleSave}>
              Enregistrer
            </Button>
          </Space>
        }
      >
        {groups.map(([resource, perms]) => {
          const allChecked = perms.every((p) => selectedIds.includes(p.id));
          const someChecked = perms.some((p) => selectedIds.includes(p.id));
          return (
            <div key={resource} className="mb-4">
              <Checkbox
                indeterminate={someChecked && !allChecked}
                checked={allChecked}
                onChange={(e) => toggleGroup(perms, e.target.checked)}
              >
                <span className="font-medium">{resource}</span>
              </Checkbox>
              <div className="pl-6 mt-1 flex flex-col gap-1">
                {perms.map((p) => (
                  <Checkbox
                    key={p.id}
                    checked={selectedIds.includes(p.id)}
                    onChange={(e) =>
                      setSelectedIds((prev) => (e.target.checked ? [...prev, p.id] : prev.filter((id) => id !== p.id)))
                    }
                  >
                    {p.name}
                  </Checkbox>
                ))}
              </div>
            </div>
          );
        })}
      </Drawer>
    </div>
  );
}
