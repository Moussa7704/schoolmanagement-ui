import ModuleStub from "@/components/common/ModuleStub";
import { getNavItem } from "@/lib/navigation";

export default function GradesPage() {
  const item = getNavItem("grades");
  return <ModuleStub title={item.label} permission={item.permission} />;
}
