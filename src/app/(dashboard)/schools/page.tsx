import ModuleStub from "@/components/common/ModuleStub";
import { getNavItem } from "@/lib/navigation";

export default function SchoolsPage() {
  const item = getNavItem("schools");
  return <ModuleStub title={item.label} permission={item.permission} />;
}
