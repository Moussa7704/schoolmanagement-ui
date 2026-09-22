import ModuleStub from "@/components/common/ModuleStub";
import { getNavItem } from "@/lib/navigation";

export default function PeriodsPage() {
  const item = getNavItem("periods");
  return <ModuleStub title={item.label} permission={item.permission} />;
}
