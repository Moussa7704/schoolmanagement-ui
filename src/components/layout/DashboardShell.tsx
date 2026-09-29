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

  // SUPER_ADMIN n'est rattaché à aucune école (school_id null) : on garde le
  // nom générique dans ce cas, sinon on affiche l'école de l'utilisateur connecté.
  const schoolName = user?.School?.name;
  const sidebarLabel = schoolName ?? "SchoolManager";
  const sidebarLabelCollapsed = schoolName
    ? schoolName
        .split(/\s+/)
        .slice(0, 2)
        .map((word) => word[0]?.toUpperCase())
        .join("")
    : "SM";

  const visibleItems = useMemo(
    () =>
      NAV_ITEMS.filter((item) => {
        const roleName = user?.Role?.name;
        if (roleName && item.hideForRoles?.includes(roleName)) return false;
        if (item.onlyForRoles) return !!roleName && item.onlyForRoles.includes(roleName);
        return item.permission === null || can(item.permission);
      }),
    [can, user]
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
      {/* Sider collé à la hauteur de l'écran : il ne défile pas avec la page,
          seul le menu défile quand les modules dépassent la hauteur disponible.
          Le nom de l'école reste en haut, le bouton de repli en bas. */}
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        theme="light"
        breakpoint="lg"
        style={{ position: "sticky", top: 0, height: "100vh", overflow: "hidden" }}
      >
        <div className="flex h-full flex-col">
          <div className="h-16 shrink-0 flex items-center justify-center font-bold text-lg text-blue-600 overflow-hidden whitespace-nowrap px-2">
            {collapsed ? sidebarLabelCollapsed : sidebarLabel}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
            <Menu
              mode="inline"
              selectedKeys={[selectedKey]}
              items={menuItems}
              onClick={({ key }) => router.push(key)}
            />
          </div>
        </div>
      </Sider>
      <Layout>
        {/* En-tête collé en haut : reste visible pendant que le contenu défile.
            zIndex au-dessus du contenu (tableaux, graphiques) qui passe dessous. */}
        <Header
          className="!bg-white flex items-center justify-end px-6 shadow-sm"
          style={{ position: "sticky", top: 0, zIndex: 10, width: "100%" }}
        >
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
