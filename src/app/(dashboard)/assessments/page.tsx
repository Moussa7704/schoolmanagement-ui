import ModuleStub from "@/components/common/ModuleStub";
import { getNavItem } from "@/lib/navigation";

export default function AssessmentsPage() {
  const item = getNavItem("assessments");
  return <ModuleStub title={item.label} permission={item.permission} />;
}
