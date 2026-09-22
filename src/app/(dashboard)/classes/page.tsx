"use client";

import { useEffect, useMemo, useState } from "react";
import { message } from "antd";
import type { ColumnsType } from "antd/es/table";
import CrudTable, { buildActionsColumn } from "@/components/common/CrudTable";
import CrudFormDrawer from "@/components/common/CrudFormDrawer";
import type { FormFieldSchema } from "@/components/common/form-field";
import { academicYearsApi, classesApi, type CreateClassPayload, type UpdateClassPayload } from "@/api/resources";
import type { AcademicYear, Class } from "@/types/models";
import { usePermission } from "@/hooks/usePermission";
import { PERMISSIONS } from "@/lib/permissions";
import { getErrorMessage } from "@/lib/errors";

export default function ClassesPage() {
  const can = usePermission();

  const [classes, setClasses] = useState<Class[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Class | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadClasses = async () => {
    setLoading(true);
    try {
      setClasses(await classesApi.list());
    } catch (err) {
      message.error(getErrorMessage(err, "Échec du chargement des classes"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch-on-mount, not a render-triggered cascade
    loadClasses();
    academicYearsApi.list().then(setAcademicYears).catch(() => {});
  }, []);

  const academicYearOptions = useMemo(
    () => academicYears.map((a) => ({ label: a.label, value: a.id })),
    [academicYears]
  );
  const academicYearLabel = (id: number) => academicYears.find((a) => a.id === id)?.label ?? "—";

  const fields: FormFieldSchema[] = useMemo(() => {
    const base: FormFieldSchema[] = [
      { name: "name", label: "Nom", type: "text", required: true, placeholder: "6ème A" },
      { name: "level", label: "Niveau", type: "text" },
      { name: "capacity", label: "Capacité", type: "number" },
    ];
    if (!editing) {
      base.unshift({
        name: "academic_year_id",
        label: "Année scolaire",
        type: "select",
        required: true,
        options: academicYearOptions,
      });
    }
    return base;
  }, [editing, academicYearOptions]);

  const openCreate = () => {
    setEditing(null);
    setDrawerOpen(true);
  };

  const openEdit = (record: Class) => {
    setEditing(record);
    setDrawerOpen(true);
  };

  const handleSubmit = async (values: CreateClassPayload | UpdateClassPayload) => {
    setSubmitting(true);
    try {
      if (editing) {
        await classesApi.update(editing.id, values as UpdateClassPayload);
        message.success("Classe mise à jour");
      } else {
        await classesApi.create(values as CreateClassPayload);
        message.success("Classe créée");
      }
      setDrawerOpen(false);
      await loadClasses();
    } catch (err) {
      message.error(getErrorMessage(err, "Échec de l'enregistrement"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (record: Class) => {
    try {
      await classesApi.remove(record.id);
      message.success("Classe supprimée");
      await loadClasses();
    } catch (err) {
      message.error(getErrorMessage(err, "Échec de la suppression"));
    }
  };

  const columns: ColumnsType<Class> = [
    { title: "Nom", dataIndex: "name" },
    { title: "Niveau", dataIndex: "level", render: (v) => v || "—" },
    { title: "Capacité", dataIndex: "capacity", render: (v) => v ?? "—" },
    { title: "Effectif", dataIndex: "students_count", render: (v) => v ?? 0 },
    { title: "Garçons", dataIndex: "boys_count", render: (v) => v ?? 0 },
    { title: "Filles", dataIndex: "girls_count", render: (v) => v ?? 0 },
    { title: "Année scolaire", key: "academic_year", render: (_, record) => academicYearLabel(record.academic_year_id) },
    buildActionsColumn<Class>({
      onEdit: can(PERMISSIONS.CLASSES_UPDATE) ? openEdit : undefined,
      onDelete: can(PERMISSIONS.CLASSES_DELETE) ? handleDelete : undefined,
    }),
  ];

  return (
    <>
      <CrudTable<Class>
        title="Classes"
        data={classes}
        loading={loading}
        rowKey={(r) => r.id}
        columns={columns}
        onCreate={openCreate}
        canCreate={can(PERMISSIONS.CLASSES_CREATE)}
      />

      <CrudFormDrawer<CreateClassPayload | UpdateClassPayload>
        open={drawerOpen}
        title={editing ? "Modifier la classe" : "Nouvelle classe"}
        fields={fields}
        initialValues={editing ?? undefined}
        submitting={submitting}
        onClose={() => setDrawerOpen(false)}
        onSubmit={handleSubmit}
      />
    </>
  );
}
