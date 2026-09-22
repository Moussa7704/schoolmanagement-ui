"use client";

import { useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Avatar, Dropdown, Layout, Menu, Space, Typography, type MenuProps } from "antd";
import { DownOutlined, LogoutOutlined, UserOutlined } from "@ant-design/icons";
import { useAuth } from "@/hooks/useAuth";
import { usePermission } from "@/hooks/usePermission";
import { NAV_ITEMS } from "@/lib/navigation";

const { Sider, Header, Content } = Layout;

export default function DashboardShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const can = usePermission();

  const visibleItems = useMemo(
    () => NAV_ITEMS.filter((item) => item.permission === null || can(item.permission)),
    [can]
  );

  const menuItems: MenuProps["items"] = useMemo(
    () => visibleItems.map((item) => ({ key: item.path, icon: <item.icon />, label: item.label })),
    [visibleItems]
  );

  const selectedKey = useMemo(() => {
    const match = [...visibleItems]
      .filter((item) => pathname === item.path || (item.path !== "/" && pathname.startsWith(item.path)))
      .sort((a, b) => b.path.length - a.path.length)[0];
    return match ? match.path : "/";
  }, [pathname, visibleItems]);

  const userMenuItems: MenuProps["items"] = [
    { key: "profile", label: "Mon profil", icon: <UserOutlined /> },
    { type: "divider" },
    { key: "logout", label: "Déconnexion", icon: <LogoutOutlined /> },
  ];

  const handleUserMenuClick: MenuProps["onClick"] = async ({ key }) => {
    if (key === "profile") {
      router.push("/profile");
    } else if (key === "logout") {
      await logout();
      router.replace("/login");
    }
  };

  return (
    <Layout className="min-h-screen">
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed} theme="light" breakpoint="lg">
        <div className="h-16 flex items-center justify-center font-bold text-lg text-blue-600 overflow-hidden whitespace-nowrap">
          {collapsed ? "SM" : "SchoolManager"}
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => router.push(key)}
        />
      </Sider>
      <Layout>
        <Header className="!bg-white flex items-center justify-end px-6 shadow-sm">
          <Dropdown menu={{ items: userMenuItems, onClick: handleUserMenuClick }} trigger={["click"]}>
            <Space className="cursor-pointer select-none">
              <Avatar icon={<UserOutlined />} />
              <span>
                {user?.first_name} {user?.last_name}{" "}
                <Typography.Text type="secondary">({user?.Role?.name})</Typography.Text>
              </span>
              <DownOutlined className="text-xs" />
            </Space>
          </Dropdown>
        </Header>
        <Content className="m-6 p-6 bg-white rounded-lg">{children}</Content>
      </Layout>
    </Layout>
  );
}
