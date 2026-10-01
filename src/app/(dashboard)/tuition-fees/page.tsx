"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Select, Tag, Typography } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { useMessage } from "@/hooks/useMessage";
import CrudTable, { buildActionsColumn } from "@/components/common/CrudTable";
import CrudFormDrawer from "@/components/common/CrudFormDrawer";
import type { FormFieldSchema } from "@/components/common/form-field";
import {
  academicYearsApi,
  classesApi,
  enrollmentsApi,
  studentsApi,
  tuitionFeesApi,
  type CreateTuitionFeePayload,
  type UpdateTuitionFeePayload,
} from "@/api/resources";
import type { AcademicYear, Class, Enrollment, Student, TuitionFee, TuitionFeeStatus } from "@/types/models";
import { usePermission } from "@/hooks/usePermission";
import { PERMISSIONS } from "@/lib/permissions";
import { getErrorMessage } from "@/lib/errors";

const STATUS_LABELS: Record<TuitionFeeStatus, { label: string; color: string }> = {
  PAID: { label: "Payé", color: "green" },
  OVERDUE: { label: "En retard", color: "red" },
  PARTIAL: { label: "Partiel", color: "gold" },
  PENDING: { label: "En attente", color: "default" },
};

// Élèves réellement dans la classe : un redoublant y est inscrit comme les
// autres, un transféré ou un retiré n'y est plus.
const PRESENT_STATUSES: Enrollment["status"][] = ["ACTIVE", "REPEATING"];

export default function TuitionFeesPage() {
  const message = useMessage();
  const can = usePermission();

  const [tuitionFees, setTuitionFees] = useState<TuitionFee[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<TuitionFee | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [classes, setClasses] = useState<Class[]>([]);
  const [classEnrollments, setClassEnrollments] = useState<Enrollment[]>([]);
  const [classId, setClassId] = useState<number | undefined>();

  const loadTuitionFees = async () => {
    setLoading(true);
    try {
      setTuitionFees(await tuitionFeesApi.list());
    } catch (err) {
      message.error(getErrorMessage(err, "Échec du chargement des frais de scolarité"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch-on-mount, not a render-triggered cascade
    loadTuitionFees();
    studentsApi.list().then(setStudents).catch(() => {});
    academicYearsApi.list().then(setAcademicYears).catch(() => {});
    classesApi.list().then(setClasses).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadTuitionFees is a stable mount-time fetch, not meant to re-run when its own closure identity changes
  }, []);

  // Inscriptions de la classe choisie, rechargées à chaque changement de classe.
  useEffect(() => {
    if (!classId) return;
    enrollmentsApi
      .list({ class_id: classId })
      .then(setClassEnrollments)
      .catch((err) => message.error(getErrorMessage(err, "Échec du chargement des élèves de la classe")));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `message` is a stable App.useApp() instance
  }, [classId]);

  const selectedClass = classes.find((c) => c.id === classId);

  const classOptions = useMemo(
    () => classes.map((c) => ({ label: c.name, value: c.id })).sort((a, b) => a.label.localeCompare(b.label, "fr")),
    [classes]
  );

  // Formulaire : seulement les élèves actuellement dans la classe (actifs ou redoublants).
  const studentOptions = useMemo(() => {
    if (!classId) return [];
    const enrolledIds = new Set(
      classEnrollments
        .filter((e) => e.class_id === classId && PRESENT_STATUSES.includes(e.status))
        .map((e) => e.student_id)
    );
    return students
      .filter((s) => enrolledIds.has(s.id))
      .map((s) => ({ label: `${s.last_name} ${s.first_name}`, value: s.id }))
      .sort((a, b) => a.label.localeCompare(b.label, "fr"));
  }, [classEnrollments, classId, students]);

  // L'année scolaire est celle de la classe choisie : une seule option, pré-remplie.
  const academicYearOptions = useMemo(
    () =>
      academicYears
        .filter((a) => !selectedClass || a.id === selectedClass.academic_year_id)
        .map((a) => ({ label: a.label, value: a.id })),
    [academicYears, selectedClass]
  );

  // Tableau : échéances des élèves inscrits dans la classe, pour l'année de la classe
  // (y compris un élève transféré en cours d'année, qui peut encore devoir de l'argent).
  const visibleTuitionFees = useMemo(() => {
    if (!classId || !selectedClass) return tuitionFees;
    const classStudentIds = new Set(classEnrollments.filter((e) => e.class_id === classId).map((e) => e.student_id));
    return tuitionFees.filter(
      (tf) => classStudentIds.has(tf.student_id) && tf.academic_year_id === selectedClass.academic_year_id
    );
  }, [classEnrollments, classId, selectedClass, tuitionFees]);
  const studentLabel = (id: number) => {
    const s = students.find((s) => s.id === id);
    return s ? `${s.last_name} ${s.first_name}` : "—";
  };
  const academicYearLabel = (id: number) => academicYears.find((a) => a.id === id)?.label ?? "—";

  const fields: FormFieldSchema[] = useMemo(() => {
    const common: FormFieldSchema[] = [
      { name: "label", label: "Libellé", type: "text", required: true, placeholder: "1ère tranche" },
      { name: "amount", label: "Montant", type: "number", required: true },
      { name: "due_date", label: "Date d'échéance", type: "date" },
    ];
    if (editing) return common;
    return [
      { name: "student_id", label: "Élève", type: "select", required: true, options: studentOptions },
      { name: "academic_year_id", label: "Année scolaire", type: "select", required: true, options: academicYearOptions },
      ...common,
    ];
  }, [editing, studentOptions, academicYearOptions]);

  const openCreate = () => {
    setEditing(null);
    setDrawerOpen(true);
  };

  const openEdit = (record: TuitionFee) => {
    setEditing(record);
    setDrawerOpen(true);
  };

  const handleSubmit = async (values: CreateTuitionFeePayload | UpdateTuitionFeePayload) => {
    setSubmitting(true);
    try {
      if (editing) {
        await tuitionFeesApi.update(editing.id, values as UpdateTuitionFeePayload);
        message.success("Échéance mise à jour");
      } else {
        await tuitionFeesApi.create(values as CreateTuitionFeePayload);
        message.success("Échéance créée");
      }
      setDrawerOpen(false);
      await loadTuitionFees();
    } catch (err) {
      message.error(getErrorMessage(err, "Échec de l'enregistrement"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadInvoice = async (record: TuitionFee) => {
    setDownloadingId(record.id);
    try {
      await tuitionFeesApi.downloadInvoice(record.id);
    } catch (err) {
      message.error(getErrorMessage(err, "Échec du téléchargement de la facture"));
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (record: TuitionFee) => {
    try {
      await tuitionFeesApi.remove(record.id);
      message.success("Échéance supprimée");
      await loadTuitionFees();
    } catch (err) {
      message.error(getErrorMessage(err, "Échec de la suppression"));
    }
  };

  const columns: ColumnsType<TuitionFee> = [
    { title: "Élève", key: "student", render: (_, record) => studentLabel(record.student_id) },
    { title: "Année scolaire", key: "academic_year", render: (_, record) => academicYearLabel(record.academic_year_id) },
    { title: "Libellé", dataIndex: "label" },
    { title: "Montant", dataIndex: "amount" },
    { title: "Payé", dataIndex: "paid_amount" },
    { title: "Solde", dataIndex: "balance" },
    {
      title: "Statut",
      dataIndex: "status",
      render: (v: TuitionFeeStatus) => <Tag color={STATUS_LABELS[v].color}>{STATUS_LABELS[v].label}</Tag>,
    },
    buildActionsColumn<TuitionFee>({
      onEdit: can(PERMISSIONS.TUITION_FEES_UPDATE) ? openEdit : undefined,
      onDelete: can(PERMISSIONS.TUITION_FEES_DELETE) ? handleDelete : undefined,
      extra: (record) => (
        <Button
          size="small"
          icon={<DownloadOutlined />}
          loading={downloadingId === record.id}
          onClick={() => handleDownloadInvoice(record)}
        >
          Facture
        </Button>
      ),
    }),
  ];

  return (
    <>
      <CrudTable<TuitionFee>
        title="Frais de scolarité"
        data={visibleTuitionFees}
        loading={loading}
        rowKey={(r) => r.id}
        columns={columns}
        onCreate={openCreate}
        // La création commence par le choix de la classe : sans elle, on ne sait
        // pas quels élèves proposer.
        canCreate={can(PERMISSIONS.TUITION_FEES_CREATE) && !!classId}
        extraActions={
          <>
            <Select
              showSearch
              allowClear
              optionFilterProp="label"
              placeholder="Choisir une classe"
              style={{ width: 220 }}
              options={classOptions}
              value={classId}
              onChange={(value?: number) => {
                setClassEnrollments([]);
                setClassId(value);
              }}
            />
            {!classId && can(PERMISSIONS.TUITION_FEES_CREATE) && (
              <Typography.Text type="secondary">Choisissez une classe pour créer une échéance</Typography.Text>
            )}
          </>
        }
      />

      <CrudFormDrawer<CreateTuitionFeePayload | UpdateTuitionFeePayload>
        open={drawerOpen}
        title={editing ? "Modifier l'échéance" : "Nouvelle échéance"}
        fields={fields}
        initialValues={
          editing ?? (selectedClass ? { academic_year_id: selectedClass.academic_year_id } : undefined)
        }
        submitting={submitting}
        onClose={() => setDrawerOpen(false)}
        onSubmit={handleSubmit}
      />
    </>
  );
}
