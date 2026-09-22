"use client";

import { useAuth } from "@/context/AuthContext";
import { can, type PermissionName } from "@/lib/permissions";

export const usePermission = () => {
  const { user } = useAuth();
  return (permission: PermissionName) => can(user, permission);
};
