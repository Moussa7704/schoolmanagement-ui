"use client";

import { useEffect, useMemo, useState } from "react";
import { Checkbox, DatePicker, Input, Modal, Radio, Select, Space, Table, Tag, Typography } from "antd";
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
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}

const SESSION_OPTIONS = [
  { label: "Matin", value: "MORNING" },
  { label: "Après-midi", value: "AFTERNOON" },
];

const STATUS_CHOICES: { label: string; value: AttendanceStatus }[] = [
  { label: "Présent", value: "PRESENT" },
  { label: "Absent", value: "ABSENT" },
  { label: "Retard", value: "LATE" },
];

// Appel d'une classe : tous les élèves sont « Présent » par défaut, l'enseignant
// ne touche qu'aux absents et aux retardataires, puis enregistre tout d'un coup.
// Si l'appel de cette date et de cette séance existe déjà, il est repris tel
// quel pour être corrigé.
export default function RollCallModal({
  open,
  classId,
  className,
  students,
  attendances,
  onClose,
  onSaved,
}: RollCallModalProps) {
  const message = useMessage();
  const [date, setDate] = useState<Dayjs>(dayjs());
  const [session, setSession] = useState<AttendanceSession>(dayjs().hour() < 13 ? "MORNING" : "AFTERNOON");
  const [rows, setRows] = useState<Record<number, RollCallRow>>({});
  const [saving, setSaving] = useState(false);

  const dateKey = date.format("YYYY-MM-DD");

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
      okText="Enregistrer l'appel"
      cancelText="Annuler"
      confirmLoading={saving}
      okButtonProps={{ disabled: students.length === 0 }}
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
        <Select<AttendanceSession> value={session} options={SESSION_OPTIONS} style={{ width: 140 }} onChange={setSession} />
        {existing.size > 0 && <Tag color="blue">Appel déjà fait pour ce créneau : modification</Tag>}
      </Space>

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
