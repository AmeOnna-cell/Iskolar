import { ForbiddenView } from "@/components/shell/forbidden-view";

export const metadata = { title: "No access" };

export default function Forbidden() {
  return <ForbiddenView />;
}
