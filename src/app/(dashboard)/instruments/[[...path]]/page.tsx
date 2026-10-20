import { InstrumentsPage } from "@/components/instruments/InstrumentsPage";

export const generateStaticParams = () => [{ path: [] }];

export default function InstrumentsRoute() {
  return <InstrumentsPage />;
}
