import ModuleStub from "@/components/common/ModuleStub";
import { getNavItem } from "@/lib/navigation";

export default function StudentGuardiansPage() {
  const item = getNavItem("student-guardians");
  return <ModuleStub title={item.label} permission={item.permission} />;
}
