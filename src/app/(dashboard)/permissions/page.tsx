"use client";

import { useEffect, useState } from "react";
import { Table, Tag, Typography, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { permissionsApi } from "@/api/resources";
import type { Permission } from "@/types/models";
import { getErrorMessage } from "@/lib/errors";

const resourceOf = (permissionName: string) => permissionName.split(".")[0];

export default function PermissionsPage() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
  }, []);

  const columns: ColumnsType<Permission> = [
    { title: "Ressource", key: "resource", render: (_, record) => <Tag>{resourceOf(record.name)}</Tag>, width: 180 },
    { title: "Permission", dataIndex: "name" },
    { title: "Description", dataIndex: "description", render: (v) => v || "—" },
  ];

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
