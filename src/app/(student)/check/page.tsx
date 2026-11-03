import { PlaceholderPage } from "@/components/shell/placeholder-page";
import { Notice } from "@/components/ui/notice";

export const metadata = { title: "Eligibility check" };

export default async function CheckPage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const { welcome } = await searchParams;
  return (
    <PlaceholderPage title="Eligibility check">
      {welcome ? <Notice tone="ok">Your email is confirmed. Welcome to Iskolar.</Notice> : null}
      <p>Answer a few questions about your studies, grades and family to see what you qualify for.</p>
    </PlaceholderPage>
  );
}
