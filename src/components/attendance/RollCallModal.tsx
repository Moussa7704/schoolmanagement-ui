"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Checkbox, DatePicker, Input, Modal, Popconfirm, Radio, Select, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs, { type Dayjs } from "dayjs";
import { useMessage } from "@/hooks/useMessage";
import { attendancesApi } from "@/api/resources";
import type { Attendance, AttendanceSession, AttendanceStatus } from "@/types/models";
import { getErrorMessage } from "@/lib/errors";

interface RollCallStudent {
  id: number;
  label: string;
}

interface RollCallRow {
  status: AttendanceStatus;
  justified: boolean;
  reason: string;
}

interface RollCallModalProps {
  open: boolean;
  classId: number;
  className: string;
  students: RollCallStudent[];
  /** Présences déjà chargées par la page : servent à reprendre un appel déjà fait. */
  attendances: Attendance[];
  /** Autorise la suppression de l'appel d'un créneau (permission attendances.delete). */
  canDelete?: boolean;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}

const SESSION_OPTIONS = [
  { label: "Matin", value: "MORNING" },
  { label: "Après-midi", value: "AFTERNOON" },
];

const SESSION_WORDING: Record<AttendanceSession, string> = {
  MORNING: "du matin",
  AFTERNOON: "de l'après-midi",
};

const STATUS_CHOICES: { label: string; value: AttendanceStatus }[] = [
  { label: "Présent", value: "PRESENT" },
  { label: "Absent", value: "ABSENT" },
  { label: "Retard", value: "LATE" },
];

// Appel d'une classe : tous les élèves sont « Présent » par défaut, l'enseignant
// ne touche qu'aux absents et aux retardataires, puis enregistre tout d'un coup.
// Si l'appel de cette date et de cette séance existe déjà, il est repris tel
// quel pour être corrigé. La séance n'est jamais devinée : l'enseignant doit
// la choisir, sinon un appel du matin fait l'après-midi part dans la mauvaise.
export default function RollCallModal({
  open,
  classId,
  className,
  students,
  attendances,
  canDelete = false,
  onClose,
  onSaved,
}: RollCallModalProps) {
  const message = useMessage();
  const [date, setDate] = useState<Dayjs>(dayjs());
  const [session, setSession] = useState<AttendanceSession>();
  const [rows, setRows] = useState<Record<number, RollCallRow>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const dateKey = date.format("YYYY-MM-DD");

  // À chaque ouverture, la séance est à choisir de nouveau.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- remise à zéro à l'ouverture
    if (open) setSession(undefined);
  }, [open]);

  // Présences déjà saisies pour ce créneau (classe + date + séance).
  const existing = useMemo(
    () =>
      new Map(
        attendances
          .filter((a) => a.class_id === classId && a.date === dateKey && a.session === session)
          .map((a) => [a.student_id, a])
      ),
    [attendances, classId, dateKey, session]
  );

  // (Ré)initialise la feuille d'appel à l'ouverture et à chaque changement de créneau.
  useEffect(() => {
    if (!open) return;
    const initial: Record<number, RollCallRow> = {};
    for (const student of students) {
      const saved = existing.get(student.id);
      initial[student.id] = saved
        ? { status: saved.status, justified: saved.justified, reason: saved.reason ?? "" }
        : { status: "PRESENT", justified: false, reason: "" };
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- la feuille d'appel dépend du créneau choisi
    setRows(initial);
  }, [open, students, existing]);

  const update = (studentId: number, patch: Partial<RollCallRow>) =>
    setRows((prev) => ({ ...prev, [studentId]: { ...prev[studentId], ...patch } }));

  const counts = useMemo(() => {
    const values = Object.values(rows);
    return {
      present: values.filter((r) => r.status === "PRESENT").length,
      absent: values.filter((r) => r.status === "ABSENT").length,
      late: values.filter((r) => r.status === "LATE").length,
    };
  }, [rows]);

  const handleSave = async () => {
    if (!session) return;
    setSaving(true);
    try {
      const result = await attendancesApi.rollCall({
        class_id: classId,
        date: dateKey,
        session,
        entries: students.map((s) => ({
          student_id: s.id,
          status: rows[s.id]?.status ?? "PRESENT",
          justified: rows[s.id]?.justified ?? false,
          reason: rows[s.id]?.reason || undefined,
        })),
      });
      message.success(
        result.updated
          ? `Appel corrigé : ${result.updated} présence(s) mise(s) à jour${result.created ? `, ${result.created} ajoutée(s)` : ""}`
          : `Appel enregistré pour ${result.created} élève(s)`
      );
      await onSaved();
      onClose();
    } catch (err) {
      message.error(getErrorMessage(err, "Échec de l'enregistrement de l'appel"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!session) return;
    setDeleting(true);
    try {
      const result = await attendancesApi.deleteRollCall({ class_id: classId, date: dateKey, session });
      message.success(`Appel ${SESSION_WORDING[session]} supprimé : ${result.deleted} présence(s) retirée(s)`);
      await onSaved();
    } catch (err) {
      message.error(getErrorMessage(err, "Échec de la suppression de l'appel"));
    } finally {
      setDeleting(false);
    }
  };

  const columns: ColumnsType<RollCallStudent> = [
    { title: "N°", key: "rank", width: 50, render: (_, __, index) => index + 1 },
    { title: "Élève", dataIndex: "label" },
    {
      title: "Statut",
      key: "status",
      render: (_, student) => (
        <Radio.Group
          optionType="button"
          buttonStyle="solid"
          size="small"
          options={STATUS_CHOICES}
          value={rows[student.id]?.status ?? "PRESENT"}
          onChange={(e) =>
            update(student.id, {
              status: e.target.value,
              // Un élève présent n'a ni absence justifiée ni motif.
              ...(e.target.value === "PRESENT" ? { justified: false, reason: "" } : {}),
            })
          }
        />
      ),
    },
    {
      title: "Justifiée",
      key: "justified",
      width: 90,
      render: (_, student) => (
        <Checkbox
          disabled={(rows[student.id]?.status ?? "PRESENT") === "PRESENT"}
          checked={rows[student.id]?.justified ?? false}
          onChange={(e) => update(student.id, { justified: e.target.checked })}
        />
      ),
    },
    {
      title: "Motif",
      key: "reason",
      render: (_, student) => (
        <Input
          size="small"
          placeholder="Malade, rendez-vous…"
          disabled={(rows[student.id]?.status ?? "PRESENT") === "PRESENT"}
          value={rows[student.id]?.reason ?? ""}
          onChange={(e) => update(student.id, { reason: e.target.value })}
        />
      ),
    },
  ];

  return (
    <Modal
      title={`Faire l'appel — ${className}`}
      open={open}
      onCancel={onClose}
      onOk={handleSave}
      okText={session ? `Enregistrer l'appel ${SESSION_WORDING[session]}` : "Enregistrer l'appel"}
      cancelText="Annuler"
      confirmLoading={saving}
      okButtonProps={{ disabled: students.length === 0 || !session || deleting }}
      width={860}
      destroyOnHidden
    >
      <Space wrap className="mb-3">
        <DatePicker
          value={date}
          format="DD/MM/YYYY"
          allowClear={false}
          disabledDate={(d) => d.isAfter(dayjs(), "day")}
          onChange={(value) => value && setDate(value)}
        />
        <Select<AttendanceSession>
          value={session}
          options={SESSION_OPTIONS}
          placeholder="Choisir la séance"
          status={session ? undefined : "warning"}
          style={{ width: 160 }}
          onChange={setSession}
        />
        {existing.size > 0 && <Tag color="blue">Appel déjà fait pour ce créneau : modification</Tag>}
        {session && existing.size > 0 && canDelete && (
          <Popconfirm
            title={`Supprimer l'appel ${SESSION_WORDING[session]} du ${date.format("DD/MM/YYYY")} ?`}
            description="Toutes les présences de ce créneau seront retirées."
            okText="Supprimer"
            okButtonProps={{ danger: true }}
            cancelText="Annuler"
            onConfirm={handleDelete}
          >
            <Button danger size="small" loading={deleting}>
              Supprimer cet appel
            </Button>
          </Popconfirm>
        )}
      </Space>

      {!session && (
        <Typography.Text type="warning" className="mb-2 block">
          Choisissez la séance (matin ou après-midi) avant d&apos;enregistrer l&apos;appel.
        </Typography.Text>
      )}

      <div className="mb-2">
        <Space size="large">
          <Typography.Text>
            <Tag color="green">{counts.present}</Tag>présent(s)
          </Typography.Text>
          <Typography.Text>
            <Tag color="red">{counts.absent}</Tag>absent(s)
          </Typography.Text>
          <Typography.Text>
            <Tag color="gold">{counts.late}</Tag>retard(s)
          </Typography.Text>
        </Space>
      </div>

      <Table<RollCallStudent>
        rowKey={(s) => s.id}
        dataSource={students}
        columns={columns}
        pagination={false}
        size="small"
        scroll={{ y: 420 }}
        locale={{ emptyText: "Aucun élève inscrit dans cette classe" }}
      />
    </Modal>
  );
}
