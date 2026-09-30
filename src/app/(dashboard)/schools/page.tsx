"use client";

import { useEffect, useState } from "react";
import { Button } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { useMessage } from "@/hooks/useMessage";
import CrudTable, { buildActionsColumn } from "@/components/common/CrudTable";
import CrudFormDrawer from "@/components/common/CrudFormDrawer";
import type { FormFieldSchema } from "@/components/common/form-field";
import { schoolsApi, type CreateSchoolPayload, type UpdateSchoolPayload } from "@/api/resources";
import type { School } from "@/types/models";
import { useAuth } from "@/hooks/useAuth";
import { usePermission } from "@/hooks/usePermission";
import { PERMISSIONS } from "@/lib/permissions";
import { getErrorMessage } from "@/lib/errors";

const FIELDS: FormFieldSchema[] = [
  { name: "name", label: "Nom", type: "text", required: true },
  // Imprimée dans l'en-tête officiel des bulletins, sous « Ministère de l'Éducation Nationale ».
  {
    name: "academy",
    label: "Académie d'enseignement",
    type: "text",
    placeholder: "Académie d'Enseignement de Bamako Rive Droite",
  },
  { name: "address", label: "Adresse", type: "text" },
  { name: "phone", label: "Téléphone", type: "text" },
  { name: "email", label: "Email", type: "email" },
];

export default function SchoolsPage() {
  const message = useMessage();
  const { user: currentUser } = useAuth();
  const can = usePermission();
  const isSuperAdmin = currentUser?.Role?.name === "SUPER_ADMIN";

  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<School | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [exportingId, setExportingId] = useState<number | null>(null);

  const loadSchools = async () => {
    setLoading(true);
    try {
      setSchools(await schoolsApi.list());
    } catch (err) {
      message.error(getErrorMessage(err, "Échec du chargement des écoles"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch-on-mount, not a render-triggered cascade
    loadSchools();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadSchools is a stable mount-time fetch, not meant to re-run when its own closure identity changes
  }, []);

  const openCreate = () => {
    setEditing(null);
    setDrawerOpen(true);
  };

  const openEdit = (record: School) => {
    setEditing(record);
    setDrawerOpen(true);
  };

  const handleSubmit = async (values: CreateSchoolPayload | UpdateSchoolPayload) => {
    setSubmitting(true);
    try {
      if (editing) {
        await schoolsApi.update(editing.id, values as UpdateSchoolPayload);
        message.success("École mise à jour");
      } else {
        await schoolsApi.create(values as CreateSchoolPayload);
        message.success("École créée");
      }
      setDrawerOpen(false);
      await loadSchools();
    } catch (err) {
      message.error(getErrorMessage(err, "Échec de l'enregistrement"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (record: School) => {
    try {
      await schoolsApi.remove(record.id);
      message.success("École supprimée");
      await loadSchools();
    } catch (err) {
      message.error(getErrorMessage(err, "Échec de la suppression"));
    }
  };

  const handleExport = async (record: School) => {
    setExportingId(record.id);
    try {
      await schoolsApi.exportData(record.id);
    } catch (err) {
      message.error(getErrorMessage(err, "Échec de l'export des données"));
    } finally {
      setExportingId(null);
    }
  };

  const columns: ColumnsType<School> = [
    { title: "Nom", dataIndex: "name" },
    { title: "Académie", dataIndex: "academy", render: (v) => v || "—" },
    { title: "Adresse", dataIndex: "address", render: (v) => v || "—" },
    { title: "Téléphone", dataIndex: "phone", render: (v) => v || "—" },
    { title: "Email", dataIndex: "email", render: (v) => v || "—" },
    buildActionsColumn<School>({
      onEdit: can(PERMISSIONS.SCHOOLS_UPDATE) ? openEdit : undefined,
      onDelete: can(PERMISSIONS.SCHOOLS_DELETE) ? handleDelete : undefined,
      extra: (record) =>
        isSuperAdmin ? (
          <Button
            size="small"
            icon={<DownloadOutlined />}
            loading={exportingId === record.id}
            onClick={() => handleExport(record)}
          >
            Exporter
          </Button>
        ) : null,
    }),
  ];

  return (
    <>
      <CrudTable<School>
        title="Écoles"
        data={schools}
        loading={loading}
        rowKey={(r) => r.id}
        columns={columns}
        onCreate={openCreate}
        canCreate={can(PERMISSIONS.SCHOOLS_CREATE)}
      />

      <CrudFormDrawer<CreateSchoolPayload | UpdateSchoolPayload>
        open={drawerOpen}
        title={editing ? "Modifier l'école" : "Nouvelle école"}
        fields={FIELDS}
        initialValues={editing ?? undefined}
        submitting={submitting}
        onClose={() => setDrawerOpen(false)}
        onSubmit={handleSubmit}
      />
    </>
  );
}
