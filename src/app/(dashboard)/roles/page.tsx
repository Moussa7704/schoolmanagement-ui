import ModuleStub from "@/components/common/ModuleStub";
import { getNavItem } from "@/lib/navigation";

export default function RolesPage() {
  const item = getNavItem("roles");
  return <ModuleStub title={item.label} permission={item.permission} />;
}
