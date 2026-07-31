import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "AI Agent Office",
  description: "Modular AI Agent management platform — companies, departments, workers, tasks.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-[100dvh] bg-[#07111F] text-[#F4F7FB] antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
