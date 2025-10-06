import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "AI FAQ Chatbot",
  description: "Self-serve AI assistant for your product documentation and FAQs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased font-sans">
        <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
            <Link href="/" className="text-sm font-semibold text-slate-900">
              AI FAQ Chatbot
            </Link>
            <nav className="flex items-center gap-2">
              <Link
                href="/"
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Home
              </Link>
              <Link
                href="/demo"
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Demo
              </Link>
              <Link
                href="/admin"
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500"
              >
                Admin
              </Link>
            </nav>
          </div>
        </header>
        <Providers>
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}
