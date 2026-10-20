import { ResultsWorkbench } from "@/components/laboratory/ResultsWorkbench";

export const generateStaticParams = () => [{ path: [] }];

export default function ResultsRoute() {
  return <ResultsWorkbench />;
}
