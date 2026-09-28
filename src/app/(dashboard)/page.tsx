"use client";

import { useEffect, useState } from "react";
import { Card, Col, Progress, Row, Statistic, Table, Tag, Typography } from "antd";
import {
  BankOutlined,
  BookOutlined,
  CheckSquareOutlined,
  ClusterOutlined,
  CreditCardOutlined,
  DollarOutlined,
  FileDoneOutlined,
  IdcardOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/hooks/useAuth";
import { useMessage } from "@/hooks/useMessage";
import { dashboardApi } from "@/api/resources";
import type { ClassBreakdown, CycleBreakdown, DashboardStats, PlatformSchoolBreakdown, TuitionSummary } from "@/types/models";
import { getErrorMessage } from "@/lib/errors";
import { CYCLE_LABELS } from "@/lib/cycles";
import BarChart from "@/components/common/BarChart";

const formatAmount = (v: number) => `${v.toLocaleString("fr-FR")} CFA`;
const formatRate = (v: number | null) => (v === null ? "—" : `${Math.round(v * 100)}%`);

function TuitionCards({ tuition }: { tuition: TuitionSummary }) {
  return (
    <Row gutter={16} className="mt-4">
      <Col xs={24} sm={8}>
        <Card size="small">
          <Statistic title="Montant collecté" value={tuition.total_paid} formatter={(v) => formatAmount(Number(v))} valueStyle={{ color: "#3f8600" }} />
          <Typography.Text type="secondary" className="text-xs">
            sur {formatAmount(tuition.total_due)} dus
          </Typography.Text>
        </Card>
      </Col>
      <Col xs={24} sm={8}>
        <Card size="small">
          <Statistic
            title="Échéances en retard"
            value={tuition.overdue_count}
            valueStyle={{ color: tuition.overdue_count > 0 ? "#cf1322" : undefined }}
          />
          <Typography.Text type="secondary" className="text-xs">
            {formatAmount(tuition.overdue_amount)}
          </Typography.Text>
        </Card>
      </Col>
      <Col xs={24} sm={8}>
        <Card size="small">
          <Statistic title="Échéances en attente" value={tuition.pending_count} />
        </Card>
      </Col>
    </Row>
  );
}

function SchoolBreakdownTable({ schools }: { schools: PlatformSchoolBreakdown[] }) {
  return (
    <Table<PlatformSchoolBreakdown>
      className="mt-4"
      rowKey="school_id"
      dataSource={schools}
      pagination={false}
      size="small"
      columns={[
        { title: "École", dataIndex: "school_name" },
        { title: "Élèves", dataIndex: "students_count" },
        { title: "Enseignants", dataIndex: "teachers_count" },
        { title: "Classes", dataIndex: "classes_count" },
        { title: "Présence", key: "attendance", render: (_, s) => formatRate(s.attendance_rate) },
        {
          title: "Retards de paiement",
          key: "overdue",
          render: (_, s) =>
            s.tuition.overdue_count > 0 ? (
              <Tag color="red">{s.tuition.overdue_count} — {formatAmount(s.tuition.overdue_amount)}</Tag>
            ) : (
              <Tag color="green">Aucun</Tag>
            ),
        },
      ]}
    />
  );
}

function ClassBreakdownTable({ classes }: { classes: ClassBreakdown[] }) {
  return (
    <Table<ClassBreakdown>
      className="mt-4"
      rowKey="class_id"
      dataSource={classes}
      pagination={false}
      size="small"
      columns={[
        { title: "Classe", dataIndex: "class_name" },
        { title: "Niveau", dataIndex: "level", render: (v) => v || "—" },
        { title: "Élèves", dataIndex: "students_count" },
        {
          title: "Présence",
          key: "attendance",
          render: (_, c) =>
            c.attendance_rate === null ? (
              <Typography.Text type="secondary">Aucune donnée</Typography.Text>
            ) : (
              <Tag color={c.attendance_rate < 0.8 ? "red" : "green"}>{formatRate(c.attendance_rate)}</Tag>
            ),
        },
        {
          title: "Bulletins",
          key: "report_cards",
          render: (_, c) => `${c.report_cards.validated_count} validé(s), ${c.report_cards.draft_count} brouillon(s)`,
        },
      ]}
    />
  );
}

function CycleCharts({ cycles }: { cycles: CycleBreakdown[] }) {
  if (cycles.length === 0) {
    return <Typography.Text type="secondary">Aucune classe pour l&apos;année scolaire courante.</Typography.Text>;
  }

  const cycleLabel = (c: CycleBreakdown) => (c.cycle ? CYCLE_LABELS[c.cycle] : "Non classé");

  const studentsData = cycles.map((c) => ({
    key: c.cycle ?? "none",
    label: cycleLabel(c),
    value: c.students_count,
    tooltip: `${cycleLabel(c)} : ${c.students_count} élève(s) sur ${c.classes_count} classe(s)`,
  }));

  const attendanceData = cycles
    .filter((c) => c.attendance_rate !== null)
    .map((c) => ({
      key: c.cycle ?? "none",
      label: cycleLabel(c),
      value: Math.round((c.attendance_rate ?? 0) * 100),
      tooltip: `${cycleLabel(c)} : ${Math.round((c.attendance_rate ?? 0) * 100)}% de présence`,
    }));

  return (
    <Row gutter={16} className="mt-4">
      <Col xs={24} sm={12}>
        <Card size="small" title="Élèves par cycle">
          <BarChart data={studentsData} />
        </Card>
      </Col>
      <Col xs={24} sm={12}>
        <Card size="small" title="Taux de présence par cycle">
          <BarChart data={attendanceData} valueFormatter={(v) => `${v}%`} emptyLabel="Aucune présence enregistrée" />
        </Card>
      </Col>
    </Row>
  );
}

export default function DashboardHomePage() {
  const { user } = useAuth();
  const message = useMessage();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi
      .getStats()
      .then(setStats)
      .catch((err) => message.error(getErrorMessage(err, "Échec du chargement des statistiques")))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetch-on-mount only
  }, []);

  return (
    <div>
      <Typography.Title level={3}>Bonjour {user?.first_name} 👋</Typography.Title>
      <Typography.Paragraph type="secondary">
        Bienvenue sur {user?.School?.name ?? "SchoolManager"}.
      </Typography.Paragraph>

      {!loading && stats?.scope === "platform" && (
        <>
          <Row gutter={16} className="mt-6">
            <Col xs={24} sm={6}>
              <Card>
                <Statistic title="Écoles" value={stats.schools_count} prefix={<BankOutlined />} />
              </Card>
            </Col>
            <Col xs={24} sm={6}>
              <Card>
                <Statistic title="Élèves" value={stats.students_count} prefix={<IdcardOutlined />} />
              </Card>
            </Col>
            <Col xs={24} sm={6}>
              <Card>
                <Statistic title="Enseignants" value={stats.teachers_count} prefix={<UserOutlined />} />
              </Card>
            </Col>
            <Col xs={24} sm={6}>
              <Card>
                <Statistic title="Classes" value={stats.classes_count} prefix={<ClusterOutlined />} />
              </Card>
            </Col>
          </Row>
          <TuitionCards tuition={{
            total_due: stats.total_due,
            total_paid: stats.total_paid,
            overdue_amount: stats.overdue_amount,
            overdue_count: stats.overdue_count,
            pending_count: stats.schools.reduce((sum, s) => sum + s.tuition.pending_count, 0),
          }} />
          <Typography.Title level={5} className="mt-6">Répartition par cycle (toutes écoles)</Typography.Title>
          <CycleCharts cycles={stats.cycles} />

          <Typography.Title level={5} className="mt-6">Détail par école</Typography.Title>
          <SchoolBreakdownTable schools={stats.schools} />
        </>
      )}

      {!loading && stats?.scope === "school" && (
        <>
          <Row gutter={16} className="mt-6">
            <Col xs={24} sm={6}>
              <Card>
                <Statistic title="Élèves" value={stats.students_count} prefix={<IdcardOutlined />} />
              </Card>
            </Col>
            <Col xs={24} sm={6}>
              <Card>
                <Statistic title="Enseignants" value={stats.teachers_count} prefix={<UserOutlined />} />
              </Card>
            </Col>
            <Col xs={24} sm={6}>
              <Card>
                <Statistic title="Classes" value={stats.classes_count} prefix={<ClusterOutlined />} />
              </Card>
            </Col>
            <Col xs={24} sm={6}>
              <Card>
                <Statistic title="Inscriptions actives" value={stats.active_enrollments_count} prefix={<TeamOutlined />} />
              </Card>
            </Col>
          </Row>

          <Row gutter={16} className="mt-4">
            <Col xs={24} sm={12}>
              <Card size="small" title="Taux de présence">
                {stats.attendance_rate === null ? (
                  <Typography.Text type="secondary">Aucune présence enregistrée</Typography.Text>
                ) : (
                  <Progress
                    percent={Math.round(stats.attendance_rate * 100)}
                    status={stats.attendance_rate < 0.8 ? "exception" : "success"}
                  />
                )}
              </Card>
            </Col>
            <Col xs={24} sm={12}>
              <Card size="small" title="Bulletins (période en cours)">
                <Statistic title="Validés" value={stats.report_cards.validated_count} prefix={<FileDoneOutlined />} className="!inline-block mr-8" />
                <Statistic title="Brouillons" value={stats.report_cards.draft_count} prefix={<BookOutlined />} className="!inline-block" />
              </Card>
            </Col>
          </Row>

          <Typography.Title level={5} className="mt-6">Scolarité{stats.academic_year ? ` — ${stats.academic_year.label}` : ""}</Typography.Title>
          <TuitionCards tuition={stats.tuition} />

          <Typography.Title level={5} className="mt-6">Répartition par cycle</Typography.Title>
          <CycleCharts cycles={stats.cycles} />

          <Typography.Title level={5} className="mt-6">Détail par classe</Typography.Title>
          {stats.classes.length === 0 ? (
            <Typography.Text type="secondary">Aucune classe pour l&apos;année scolaire courante.</Typography.Text>
          ) : (
            <ClassBreakdownTable classes={stats.classes} />
          )}
        </>
      )}

      {!loading && stats?.scope === "teacher" && (
        <>
          <Row gutter={16} className="mt-6">
            <Col xs={24} sm={6}>
              <Card>
                <Statistic title="Mes classes" value={stats.classes_count} prefix={<ClusterOutlined />} />
              </Card>
            </Col>
            <Col xs={24} sm={6}>
              <Card>
                <Statistic title="Mes élèves" value={stats.students_count} prefix={<IdcardOutlined />} />
              </Card>
            </Col>
            <Col xs={24} sm={6}>
              <Card>
                <Statistic title="Évaluations créées" value={stats.assessments_count} prefix={<CheckSquareOutlined />} />
              </Card>
            </Col>
            <Col xs={24} sm={6}>
              <Card>
                <Statistic title="Taux de présence" value={formatRate(stats.attendance_rate)} prefix={<TeamOutlined />} />
              </Card>
            </Col>
          </Row>

          <Typography.Title level={5} className="mt-6">Détail par classe</Typography.Title>
          {stats.classes.length === 0 ? (
            <Typography.Text type="secondary">Aucune classe affectée.</Typography.Text>
          ) : (
            <ClassBreakdownTable classes={stats.classes} />
          )}
        </>
      )}

      {!loading && stats?.scope === "parent" && (
        <Row gutter={16} className="mt-6">
          <Col xs={24} sm={8}>
            <Card>
              <Statistic title="Mes enfants" value={stats.children_count} prefix={<TeamOutlined />} />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="Solde restant dû"
                value={stats.total_balance_due}
                formatter={(v) => formatAmount(Number(v))}
                prefix={<DollarOutlined />}
                valueStyle={{ color: stats.total_balance_due > 0 ? "#cf1322" : "#3f8600" }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="Prochaine échéance"
                value={stats.next_due_date ?? "Aucune"}
                prefix={<CreditCardOutlined />}
              />
            </Card>
          </Col>
        </Row>
      )}

      {!loading && (!stats || stats.scope === "none") && (
        <Row gutter={16} className="mt-6">
          <Col xs={24} sm={8}>
            <Card>
              <Statistic title="Rôle" value={user?.Role?.name} prefix={<TeamOutlined />} />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic title="Statut du compte" value={user?.status} prefix={<IdcardOutlined />} />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic title="Permissions" value={user?.Role?.Permissions?.length ?? 0} prefix={<CreditCardOutlined />} />
            </Card>
          </Col>
        </Row>
      )}
    </div>
  );
}
