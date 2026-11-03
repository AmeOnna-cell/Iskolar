import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Footer } from "@/components/shell/footer";
import { Header } from "@/components/shell/header";
import { TabBar } from "@/components/shell/nav-links";
import { themeInitScript } from "@/components/shell/theme-toggle";
import { primaryNav, type Viewer } from "@/lib/nav";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Iskolar: scholarships for Filipino college students", template: "%s | Iskolar" },
  description:
    "Find government, private and school scholarships in one place, check if you qualify, and get reminders before deadlines.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#171b24" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // ponytail: viewer is wired to the Supabase session in Phase 3 (auth).
  const viewer: Viewer = null;
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="flex min-h-dvh flex-col pb-[calc(64px+env(safe-area-inset-bottom))] nav:pb-0">
        <a
          href="#main"
          className="absolute -top-16 left-3 z-50 rounded-md bg-surface px-4 py-2 font-semibold shadow-overlay focus:top-3"
        >
          Skip to content
        </a>
        <Header viewer={viewer} />
        <main id="main" tabIndex={-1} className="flex-1">
          {children}
        </main>
        <Footer />
        <TabBar items={primaryNav(viewer)} />
      </body>
    </html>
  );
}
