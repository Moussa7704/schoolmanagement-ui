import ModuleStub from "@/components/common/ModuleStub";
import { getNavItem } from "@/lib/navigation";

export default function GuardiansPage() {
  const item = getNavItem("guardians");
  return <ModuleStub title={item.label} permission={item.permission} />;
}
