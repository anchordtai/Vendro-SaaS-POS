import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AuthInitializer from "@/components/AuthInitializer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Onyxx Nightlife POS",
  description: "Point of Sale System for Nightlife Venues",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthInitializer />
        {children}
      </body>
    </html>
  );
}
