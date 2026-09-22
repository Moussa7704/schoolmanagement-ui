"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Popconfirm, Tag, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import CrudTable, { buildActionsColumn } from "@/components/common/CrudTable";
import CrudFormDrawer from "@/components/common/CrudFormDrawer";
import type { FormFieldSchema } from "@/components/common/form-field";
import {
  academicYearsApi,
  schoolsApi,
  type CreateAcademicYearPayload,
  type UpdateAcademicYearPayload,
} from "@/api/resources";
import type { AcademicYear, School } from "@/types/models";
import { useAuth } from "@/hooks/useAuth";
import { usePermission } from "@/hooks/usePermission";
import { PERMISSIONS } from "@/lib/permissions";
import { getErrorMessage } from "@/lib/errors";

export default function AcademicYearsPage() {
  const { user: currentUser } = useAuth();
  const can = usePermission();
  const isSuperAdmin = currentUser?.Role?.name === "SUPER_ADMIN";

  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<AcademicYear | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadAcademicYears = async () => {
    setLoading(true);
    try {
      setAcademicYears(await academicYearsApi.list());
    } catch (err) {
      message.error(getErrorMessage(err, "Échec du chargement des années scolaires"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch-on-mount, not a render-triggered cascade
    loadAcademicYears();
    if (isSuperAdmin) {
      schoolsApi.list().then(setSchools).catch(() => {});
    }
  }, [isSuperAdmin]);

  const schoolOptions = useMemo(() => schools.map((s) => ({ label: s.name, value: s.id })), [schools]);

  const fields: FormFieldSchema[] = useMemo(() => {
    const base: FormFieldSchema[] = [
      { name: "label", label: "Libellé", type: "text", required: true, placeholder: "2026-2027" },
      { name: "start_date", label: "Date de début", type: "date", required: true },
      { name: "end_date", label: "Date de fin", type: "date", required: true },
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

  const openEdit = (record: AcademicYear) => {
    setEditing(record);
    setDrawerOpen(true);
  };

  const handleSubmit = async (values: CreateAcademicYearPayload | UpdateAcademicYearPayload) => {
    setSubmitting(true);
    try {
      if (editing) {
        await academicYearsApi.update(editing.id, values as UpdateAcademicYearPayload);
        message.success("Année scolaire mise à jour");
      } else {
        await academicYearsApi.create(values as CreateAcademicYearPayload);
        message.success("Année scolaire créée");
      }
      setDrawerOpen(false);
      await loadAcademicYears();
    } catch (err) {
      message.error(getErrorMessage(err, "Échec de l'enregistrement"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (record: AcademicYear) => {
    try {
      await academicYearsApi.remove(record.id);
      message.success("Année scolaire supprimée");
      await loadAcademicYears();
    } catch (err) {
      message.error(getErrorMessage(err, "Échec de la suppression"));
    }
  };

  const handleSetCurrent = async (record: AcademicYear) => {
    try {
      await academicYearsApi.setCurrent(record.id);
      message.success("Année scolaire définie comme actuelle");
      await loadAcademicYears();
    } catch (err) {
      message.error(getErrorMessage(err, "Échec de l'opération"));
    }
  };

  const columns: ColumnsType<AcademicYear> = [
    { title: "Libellé", dataIndex: "label" },
    { title: "Début", dataIndex: "start_date" },
    { title: "Fin", dataIndex: "end_date" },
    {
      title: "Statut",
      dataIndex: "is_current",
      render: (isCurrent: boolean) => (isCurrent ? <Tag color="green">Actuelle</Tag> : <Tag>—</Tag>),
    },
    ...(isSuperAdmin
      ? [{ title: "École", key: "school", render: (_: unknown, record: AcademicYear) => record.School?.name ?? "—" }]
      : []),
    buildActionsColumn<AcademicYear>({
      onEdit: can(PERMISSIONS.ACADEMIC_YEARS_UPDATE) ? openEdit : undefined,
      onDelete: can(PERMISSIONS.ACADEMIC_YEARS_DELETE) ? handleDelete : undefined,
      extra: (record) =>
        !record.is_current && can(PERMISSIONS.ACADEMIC_YEARS_UPDATE) ? (
          <Popconfirm
            title="Définir cette année comme actuelle ?"
            okText="Oui"
            cancelText="Non"
            onConfirm={() => handleSetCurrent(record)}
          >
            <Button size="small">Définir actuelle</Button>
          </Popconfirm>
        ) : null,
    }),
  ];

  return (
    <>
      <CrudTable<AcademicYear>
        title="Années scolaires"
        data={academicYears}
        loading={loading}
        rowKey={(r) => r.id}
        columns={columns}
        onCreate={openCreate}
        canCreate={can(PERMISSIONS.ACADEMIC_YEARS_CREATE)}
      />

      <CrudFormDrawer<CreateAcademicYearPayload | UpdateAcademicYearPayload>
        open={drawerOpen}
        title={editing ? "Modifier l'année scolaire" : "Nouvelle année scolaire"}
        fields={fields}
        initialValues={editing ?? undefined}
        submitting={submitting}
        onClose={() => setDrawerOpen(false)}
        onSubmit={handleSubmit}
      />
    </>
  );
}
