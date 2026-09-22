import ModuleStub from "@/components/common/ModuleStub";
import { getNavItem } from "@/lib/navigation";

export default function EnrollmentsPage() {
  const item = getNavItem("enrollments");
  return <ModuleStub title={item.label} permission={item.permission} />;
}
