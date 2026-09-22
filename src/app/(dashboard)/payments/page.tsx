import ModuleStub from "@/components/common/ModuleStub";
import { getNavItem } from "@/lib/navigation";

export default function PaymentsPage() {
  const item = getNavItem("payments");
  return <ModuleStub title={item.label} permission={item.permission} />;
}
