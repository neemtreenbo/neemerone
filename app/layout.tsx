import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { HeaderWrapper } from "@/components/header-wrapper";
import { UserProvider } from "@/lib/contexts/user-context";
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Neem Tree - Advisor Performance Portal",
  description: "Sun Life of Canada Philippines - New Business Office advisor performance monitoring portal",
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.className} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <UserProvider>
            <HeaderWrapper>
              {children}
            </HeaderWrapper>
          </UserProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
