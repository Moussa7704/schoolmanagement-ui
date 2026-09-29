"use client";

import { useEffect, useState } from "react";
import { Result, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { permissionsApi } from "@/api/resources";
import type { Permission } from "@/types/models";
import { useMessage } from "@/hooks/useMessage";
import { getErrorMessage } from "@/lib/errors";
import { useAuth } from "@/hooks/useAuth";

const resourceOf = (permissionName: string) => permissionName.split(".")[0];

export default function PermissionsPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.Role?.name === "SUPER_ADMIN";
  const message = useMessage();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSuperAdmin) return;
    const load = async () => {
      setLoading(true);
      try {
        setPermissions(await permissionsApi.list());
      } catch (err) {
        message.error(getErrorMessage(err, "Échec du chargement des permissions"));
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-time fetch, `message` is a stable App.useApp() instance
  }, [isSuperAdmin]);

  const columns: ColumnsType<Permission> = [
    { title: "Ressource", key: "resource", render: (_, record) => <Tag>{resourceOf(record.name)}</Tag>, width: 180 },
    { title: "Permission", dataIndex: "name" },
    { title: "Description", dataIndex: "description", render: (v) => v || "—" },
  ];


  // Menu déjà masqué pour les autres rôles ; ceci couvre l'accès direct par l'URL.
  if (!isSuperAdmin) {
    return <Result status="403" title="Accès réservé" subTitle="Cette page est réservée au super administrateur." />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Typography.Title level={4} className="!mb-0">
          Permissions
        </Typography.Title>
      </div>
      <Typography.Paragraph type="secondary">
        Catalogue en lecture seule des permissions disponibles dans l&apos;application. Pour les attribuer à un rôle,
        rendez-vous dans le module Rôles.
      </Typography.Paragraph>
      <Table<Permission>
        rowKey={(r) => r.id}
        columns={columns}
        dataSource={permissions}
        loading={loading}
        pagination={{ pageSize: 20, showSizeChanger: false }}
      />
    </div>
  );
}
