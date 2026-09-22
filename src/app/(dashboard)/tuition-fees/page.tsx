import ModuleStub from "@/components/common/ModuleStub";
import { getNavItem } from "@/lib/navigation";

export default function TuitionFeesPage() {
  const item = getNavItem("tuition-fees");
  return <ModuleStub title={item.label} permission={item.permission} />;
}
