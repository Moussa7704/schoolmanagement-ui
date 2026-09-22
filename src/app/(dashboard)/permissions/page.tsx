import ModuleStub from "@/components/common/ModuleStub";
import { getNavItem } from "@/lib/navigation";

export default function PermissionsPage() {
  const item = getNavItem("permissions");
  return <ModuleStub title={item.label} permission={item.permission} />;
}
