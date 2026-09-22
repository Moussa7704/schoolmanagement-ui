import ModuleStub from "@/components/common/ModuleStub";
import { getNavItem } from "@/lib/navigation";

export default function TeacherAssignmentsPage() {
  const item = getNavItem("teacher-assignments");
  return <ModuleStub title={item.label} permission={item.permission} />;
}
