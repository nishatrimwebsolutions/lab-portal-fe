import { LabManager } from "@/components/laboratory/lab-manager";

// The section reads its sub-path from the URL (useCatchAllPath), so only the section root is pre-rendered.
export const generateStaticParams = () => [{ path: [] }];

export default function TestsPage() {
  return <LabManager kind="tests" />;
}
