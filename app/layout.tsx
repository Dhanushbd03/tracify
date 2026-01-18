import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import {
  ClerkProvider,
  SignedOut,
  SignedIn,
} from "@clerk/nextjs";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { Sidebar } from "@/components/sidebar";
import { MobileSidebar } from "@/components/mobile-sidebar";
import { Toaster } from "@/components/ui/sonner";
import Link from "next/link";
import "./globals.css";
import Image from "next/image";
import Logo from "@/public/logo.png";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tracify",
  description: "A personal expense tracker.",
  icons: {
    icon: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <SignedOut>
              <header className="border-b">
                <div className="max-w-screen-2xl mx-auto px-4 py-4 flex justify-between items-center">
                  <Link href="/" className="text-2xl font-bold hover:opacity-80 transition-opacity h-20">
                    <Image src={Logo} alt="Logo" className="h-full w-60" />
                  </Link>
                  <div className="flex items-center gap-4">
                    <ThemeToggle />
                  </div>
                </div>
              </header>
              <main>{children}</main>
            </SignedOut>
            <SignedIn>
              <div className="flex h-screen overflow-hidden">
                <Sidebar className="hidden md:flex" />
                <div className="flex flex-1 flex-col overflow-hidden">
                  <header className="flex h-16 items-center shrink-0 border-b px-4 md:hidden">
                    <MobileSidebar />
                    <div className="flex-1 flex justify-center">
                      <Image src={Logo} alt="Logo" className="h-10 w-auto" />
                    </div>
                    <div className="flex items-center gap-2">
                      <ThemeToggle />
                    </div>
                  </header>
                  <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
                </div>
              </div>
            </SignedIn>
          </ThemeProvider>
          <Toaster />
        </body>
      </html>
    </ClerkProvider>
  );
}
