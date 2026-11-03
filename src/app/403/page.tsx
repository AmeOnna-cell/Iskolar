import { ForbiddenView } from "@/components/shell/forbidden-view";

// Middleware rewrites wrong-role requests here with status 403.
export const metadata = { title: "No access" };

export default function ForbiddenPage() {
  return <ForbiddenView />;
}
