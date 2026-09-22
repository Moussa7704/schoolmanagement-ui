"use client";

import { Card, Col, Row, Statistic, Typography } from "antd";
import { CreditCardOutlined, IdcardOutlined, TeamOutlined } from "@ant-design/icons";
import { useAuth } from "@/hooks/useAuth";

export default function DashboardHomePage() {
  const { user } = useAuth();

  return (
    <div>
      <Typography.Title level={3}>Bonjour {user?.first_name} 👋</Typography.Title>
      <Typography.Paragraph type="secondary">
        Bienvenue sur SchoolManager{user?.School ? ` — ${user.School.name}` : ""}.
      </Typography.Paragraph>

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
    </div>
  );
}
