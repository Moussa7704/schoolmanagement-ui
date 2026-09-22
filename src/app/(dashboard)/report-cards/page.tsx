import ModuleStub from "@/components/common/ModuleStub";
import { getNavItem } from "@/lib/navigation";

export default function ReportCardsPage() {
  const item = getNavItem("report-cards");
  return <ModuleStub title={item.label} permission={item.permission} />;
}
