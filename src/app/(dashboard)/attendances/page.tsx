import ModuleStub from "@/components/common/ModuleStub";
import { getNavItem } from "@/lib/navigation";

export default function AttendancesPage() {
  const item = getNavItem("attendances");
  return <ModuleStub title={item.label} permission={item.permission} />;
}
