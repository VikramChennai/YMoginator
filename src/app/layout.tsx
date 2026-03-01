import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth/auth-provider";
import { Navbar } from "@/components/layout/navbar";
import { Toaster } from "@/components/ui/sonner";
import { Analytics } from "@vercel/analytics/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "YMoginator - Gym Accountability for YC Founders",
  description:
    "Book gym sessions, verify check-ins with AI, and compete on the streak leaderboard. Built for YC founders who ship reps.",
  openGraph: {
    title: "YMoginator",
    description: "Gym accountability for YC founders. Book sessions, verify check-ins with AI, and compete on the leaderboard.",
    images: [{ url: "/og-image.jpg", width: 300, height: 168 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "YMoginator",
    description: "Gym accountability for YC founders.",
    images: ["/og-image.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <Navbar />
          {children}
          <Toaster />
          <Analytics />
        </AuthProvider>
      </body>
    </html>
  );
}
