import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import {
  ClerkProvider,
  SignInButton,
  SignedOut,
  SignedIn,
} from "@clerk/nextjs";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { Sidebar } from "@/components/sidebar";
import { Toaster } from "@/components/ui/sonner";
import Link from "next/link";
import "./globals.css";

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
                  <Link href="/" className="text-2xl font-bold hover:opacity-80 transition-opacity">
                    Tracify
                  </Link>
                  <div className="flex items-center gap-4">
                    <ThemeToggle />
                    <SignInButton mode="modal">
                      <button className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                        Sign In
                      </button>
                    </SignInButton>
                  </div>
                </div>
              </header>
              <main>{children}</main>
            </SignedOut>
            <SignedIn>
              <div className="flex h-screen overflow-hidden">
                <Sidebar />
                <main className="flex-1 overflow-y-auto">{children}</main>
              </div>
            </SignedIn>
          </ThemeProvider>
          <Toaster />
        </body>
      </html>
    </ClerkProvider>
  );
}
