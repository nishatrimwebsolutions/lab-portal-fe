import { EntityManager } from "@/components/forms/entity-manager";

// The section reads its sub-path from the URL (useCatchAllPath), so only the section root is pre-rendered.
export const generateStaticParams = () => [{ path: [] }];

export default function PatientsPage() {
  return <EntityManager kind="patients" />;
}
