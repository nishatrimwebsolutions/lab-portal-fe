import { ReportWorkflow } from "@/components/laboratory/report-workflow";

export const generateStaticParams = () => [{ path: [] }];

export default function ReportsPage() {
  return <ReportWorkflow />;
}
