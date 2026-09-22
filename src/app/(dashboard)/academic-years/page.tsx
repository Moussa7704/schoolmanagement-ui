import ModuleStub from "@/components/common/ModuleStub";
import { getNavItem } from "@/lib/navigation";

export default function AcademicYearsPage() {
  const item = getNavItem("academic-years");
  return <ModuleStub title={item.label} permission={item.permission} />;
}
