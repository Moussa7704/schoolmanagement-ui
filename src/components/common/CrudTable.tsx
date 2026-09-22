"use client";

import type { Key, ReactNode } from "react";
import { Button, Popconfirm, Space, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";

interface CrudTableProps<T> {
  title: string;
  data: T[];
  loading: boolean;
  rowKey: (record: T) => Key;
  columns: ColumnsType<T>;
  onCreate?: () => void;
  createLabel?: string;
  canCreate?: boolean;
  extraActions?: ReactNode;
}

export default function CrudTable<T extends object>({
  title,
  data,
  loading,
  rowKey,
  columns,
  onCreate,
  createLabel = "Nouveau",
  canCreate = true,
  extraActions,
}: CrudTableProps<T>) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold m-0">{title}</h1>
        <Space>
          {extraActions}
          {onCreate && canCreate && (
            <Button type="primary" icon={<PlusOutlined />} onClick={onCreate}>
              {createLabel}
            </Button>
          )}
        </Space>
      </div>
      <Table<T>
        rowKey={rowKey}
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={{ pageSize: 10, showSizeChanger: false }}
        scroll={{ x: "max-content" }}
      />
    </div>
  );
}

interface ActionsColumnOptions<T> {
  onEdit?: (record: T) => void;
  onDelete?: (record: T) => void;
  canEdit?: boolean;
  canDelete?: boolean;
  extra?: (record: T) => ReactNode;
}

export function buildActionsColumn<T>({
  onEdit,
  onDelete,
  canEdit = true,
  canDelete = true,
  extra,
}: ActionsColumnOptions<T>): ColumnsType<T>[number] {
  return {
    title: "Actions",
    key: "actions",
    fixed: "right",
    width: 180,
    render: (_: unknown, record: T) => (
      <Space>
        {extra?.(record)}
        {onEdit && canEdit && (
          <Button size="small" icon={<EditOutlined />} onClick={() => onEdit(record)} />
        )}
        {onDelete && canDelete && (
          <Popconfirm
            title="Confirmer la suppression ?"
            okText="Oui"
            cancelText="Non"
            onConfirm={() => onDelete(record)}
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        )}
      </Space>
    ),
  };
}
