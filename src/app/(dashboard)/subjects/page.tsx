import ModuleStub from "@/components/common/ModuleStub";
import { getNavItem } from "@/lib/navigation";

export default function SubjectsPage() {
  const item = getNavItem("subjects");
  return <ModuleStub title={item.label} permission={item.permission} />;
}
