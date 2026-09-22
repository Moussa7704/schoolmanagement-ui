"use client";

import { useEffect, useMemo, useState } from "react";
import { Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useMessage } from "@/hooks/useMessage";
import CrudTable, { buildActionsColumn } from "@/components/common/CrudTable";
import CrudFormDrawer from "@/components/common/CrudFormDrawer";
import type { FormFieldSchema } from "@/components/common/form-field";
import {
  guardiansApi,
  studentGuardiansApi,
  studentsApi,
  type CreateStudentGuardianPayload,
} from "@/api/resources";
import type { Guardian, Student, StudentGuardian } from "@/types/models";
import { usePermission } from "@/hooks/usePermission";
import { PERMISSIONS } from "@/lib/permissions";
import { getErrorMessage } from "@/lib/errors";

const RELATIONSHIP_OPTIONS = [
  { label: "Père", value: "PERE" },
  { label: "Mère", value: "MERE" },
  { label: "Tuteur", value: "TUTEUR" },
  { label: "Autre", value: "AUTRE" },
];

export default function StudentGuardiansPage() {
  const message = useMessage();
  const can = usePermission();

  const [links, setLinks] = useState<StudentGuardian[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadLinks = async () => {
    setLoading(true);
    try {
      setLinks(await studentGuardiansApi.list());
    } catch (err) {
      message.error(getErrorMessage(err, "Échec du chargement des liens élève-tuteur"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch-on-mount, not a render-triggered cascade
    loadLinks();
    studentsApi.list().then(setStudents).catch(() => {});
    guardiansApi.list().then(setGuardians).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadLinks is a stable mount-time fetch, not meant to re-run when its own closure identity changes
  }, []);

  const studentOptions = useMemo(
    () => students.map((s) => ({ label: `${s.first_name} ${s.last_name}`, value: s.id })),
    [students]
  );
  const guardianOptions = useMemo(
    () => guardians.map((g) => ({ label: `${g.first_name} ${g.last_name}`, value: g.id })),
    [guardians]
  );

  const fields: FormFieldSchema[] = [
    { name: "student_id", label: "Élève", type: "select", required: true, options: studentOptions },
    { name: "guardian_id", label: "Tuteur/Parent", type: "select", required: true, options: guardianOptions },
    { name: "relationship", label: "Lien de parenté", type: "select", required: true, options: RELATIONSHIP_OPTIONS },
    { name: "is_primary_contact", label: "Contact principal", type: "switch" },
  ];

  const handleSubmit = async (values: CreateStudentGuardianPayload) => {
    setSubmitting(true);
    try {
      await studentGuardiansApi.attach(values);
      message.success("Tuteur/parent rattaché à l'élève");
      setDrawerOpen(false);
      await loadLinks();
    } catch (err) {
      message.error(getErrorMessage(err, "Échec du rattachement"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDetach = async (record: StudentGuardian) => {
    try {
      await studentGuardiansApi.detach(record.id);
      message.success("Lien supprimé");
      await loadLinks();
    } catch (err) {
      message.error(getErrorMessage(err, "Échec de la suppression"));
    }
  };

  const columns: ColumnsType<StudentGuardian> = [
    {
      title: "Élève",
      key: "student",
      render: (_, record) => (record.Student ? `${record.Student.first_name} ${record.Student.last_name}` : "—"),
    },
    {
      title: "Tuteur/Parent",
      key: "guardian",
      render: (_, record) => (record.Guardian ? `${record.Guardian.first_name} ${record.Guardian.last_name}` : "—"),
    },
    { title: "Lien", dataIndex: "relationship" },
    {
      title: "Contact principal",
      dataIndex: "is_primary_contact",
      render: (v: boolean) => (v ? <Tag color="green">Oui</Tag> : <Tag>Non</Tag>),
    },
    buildActionsColumn<StudentGuardian>({
      onDelete: can(PERMISSIONS.STUDENT_GUARDIANS_DELETE) ? handleDetach : undefined,
    }),
  ];

  return (
    <>
      <CrudTable<StudentGuardian>
        title="Liens élève-tuteur"
        data={links}
        loading={loading}
        rowKey={(r) => r.id}
        columns={columns}
        onCreate={() => setDrawerOpen(true)}
        createLabel="Rattacher un tuteur"
        canCreate={can(PERMISSIONS.STUDENT_GUARDIANS_CREATE)}
      />

      <CrudFormDrawer<CreateStudentGuardianPayload>
        open={drawerOpen}
        title="Rattacher un tuteur/parent à un élève"
        fields={fields}
        submitting={submitting}
        onClose={() => setDrawerOpen(false)}
        onSubmit={handleSubmit}
      />
    </>
  );
}
