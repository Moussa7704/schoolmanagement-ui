"use client";

import { useEffect, useMemo, useState } from "react";
import type { ColumnsType } from "antd/es/table";
import { useMessage } from "@/hooks/useMessage";
import CrudTable, { buildActionsColumn } from "@/components/common/CrudTable";
import CrudFormDrawer from "@/components/common/CrudFormDrawer";
import type { FormFieldSchema } from "@/components/common/form-field";
import { academicYearsApi, periodsApi, type CreatePeriodPayload, type UpdatePeriodPayload } from "@/api/resources";
import type { AcademicYear, Period } from "@/types/models";
import { usePermission } from "@/hooks/usePermission";
import { PERMISSIONS } from "@/lib/permissions";
import { getErrorMessage } from "@/lib/errors";

export default function PeriodsPage() {
  const message = useMessage();
  const can = usePermission();

  const [periods, setPeriods] = useState<Period[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Period | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadPeriods = async () => {
    setLoading(true);
    try {
      setPeriods(await periodsApi.list());
    } catch (err) {
      message.error(getErrorMessage(err, "Échec du chargement des périodes"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch-on-mount, not a render-triggered cascade
    loadPeriods();
    academicYearsApi.list().then(setAcademicYears).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadPeriods is a stable mount-time fetch, not meant to re-run when its own closure identity changes
  }, []);

  const academicYearOptions = useMemo(
    () => academicYears.map((a) => ({ label: a.label, value: a.id })),
    [academicYears]
  );

  const academicYearLabel = (id: number) => academicYears.find((a) => a.id === id)?.label ?? "—";

  const fields: FormFieldSchema[] = useMemo(
    () => [
      {
        name: "academic_year_id",
        label: "Année scolaire",
        type: "select",
        required: true,
        options: academicYearOptions,
      },
      { name: "label", label: "Libellé", type: "text", required: true, placeholder: "Trimestre 1" },
      { name: "start_date", label: "Date de début", type: "date", required: true },
      { name: "end_date", label: "Date de fin", type: "date", required: true },
      { name: "position", label: "Position", type: "number" },
    ],
    [academicYearOptions]
  );

  const openCreate = () => {
    setEditing(null);
    setDrawerOpen(true);
  };

  const openEdit = (record: Period) => {
    setEditing(record);
    setDrawerOpen(true);
  };

  const handleSubmit = async (values: CreatePeriodPayload | UpdatePeriodPayload) => {
    setSubmitting(true);
    try {
      if (editing) {
        await periodsApi.update(editing.id, values as UpdatePeriodPayload);
        message.success("Période mise à jour");
      } else {
        await periodsApi.create(values as CreatePeriodPayload);
        message.success("Période créée");
      }
      setDrawerOpen(false);
      await loadPeriods();
    } catch (err) {
      message.error(getErrorMessage(err, "Échec de l'enregistrement"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (record: Period) => {
    try {
      await periodsApi.remove(record.id);
      message.success("Période supprimée");
      await loadPeriods();
    } catch (err) {
      message.error(getErrorMessage(err, "Échec de la suppression"));
    }
  };

  const columns: ColumnsType<Period> = [
    { title: "Libellé", dataIndex: "label" },
    { title: "Année scolaire", key: "academic_year", render: (_, record) => academicYearLabel(record.academic_year_id) },
    { title: "Début", dataIndex: "start_date" },
    { title: "Fin", dataIndex: "end_date" },
    { title: "Position", dataIndex: "position" },
    buildActionsColumn<Period>({
      onEdit: can(PERMISSIONS.PERIODS_UPDATE) ? openEdit : undefined,
      onDelete: can(PERMISSIONS.PERIODS_DELETE) ? handleDelete : undefined,
    }),
  ];

  return (
    <>
      <CrudTable<Period>
        title="Périodes"
        data={periods}
        loading={loading}
        rowKey={(r) => r.id}
        columns={columns}
        onCreate={openCreate}
        canCreate={can(PERMISSIONS.PERIODS_CREATE)}
      />

      <CrudFormDrawer<CreatePeriodPayload | UpdatePeriodPayload>
        open={drawerOpen}
        title={editing ? "Modifier la période" : "Nouvelle période"}
        fields={fields}
        initialValues={editing ?? undefined}
        submitting={submitting}
        onClose={() => setDrawerOpen(false)}
        onSubmit={handleSubmit}
      />
    </>
  );
}
