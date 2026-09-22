"use client";

import { Empty, Tag, Typography } from "antd";

interface ModuleStubProps {
  title: string;
  permission: string | null;
}

export default function ModuleStub({ title, permission }: ModuleStubProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24">
      <Empty
        description={
          <div className="text-center">
            <Typography.Title level={4} className="!mb-1">
              {title}
            </Typography.Title>
            <Typography.Paragraph type="secondary" className="!mb-2">
              Module à venir
            </Typography.Paragraph>
            {permission && <Tag>{permission}</Tag>}
          </div>
        }
      />
    </div>
  );
}
