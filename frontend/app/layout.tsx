import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AppProviders } from "@/components/AppProviders";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import "./globals.css";
import { ToastProvider } from "@/components/ToastProvider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CourseLens",
  description: "Find and review UMass courses",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="flex min-h-screen flex-col">
        <ToastProvider>
          <AppProviders>
            <SiteHeader />
            <div className="flex min-h-0 flex-1 flex-col">{children}</div>
            <SiteFooter />
          </AppProviders>
        </ToastProvider>
      </body>
    </html>
  );
}
