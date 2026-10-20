import { OperationsManager } from "@/components/operations/operations-manager";

// The section reads its sub-path from the URL (useCatchAllPath), so only the section root is pre-rendered.
export const generateStaticParams = () => [{ path: [] }];

export default function BillingPage() {
  return <OperationsManager kind="billing" />;
}
