import type { Metadata } from "next";
import type { ReactNode } from "react";
// AntD v5 officially supports React 16-18; this patch silences the React 19
// compat warning and fixes the few internals that actually break otherwise.
import "@ant-design/v5-patch-for-react-19";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { App, ConfigProvider } from "antd";
import frFR from "antd/locale/fr_FR";
import { AuthProvider } from "@/context/AuthContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "SchoolManager",
  description: "Plateforme de gestion scolaire",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <AntdRegistry>
          <ConfigProvider
            locale={frFR}
            theme={{
              token: {
                colorPrimary: "#1677ff",
                borderRadius: 6,
              },
            }}
          >
            <App>
              <AuthProvider>{children}</AuthProvider>
            </App>
          </ConfigProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
