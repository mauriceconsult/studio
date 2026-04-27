import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@/app/globals.css";
import { NuqsAdapter } from "nuqs/adapters/next";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "@/components/ui/sonner";
import { TRPCReactProvider } from "@/trpc/client";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Studio",
    template: "%s | Studio",
  },
  description:
    "AI-powered text, image, video, and course generation for journalists, educators, and creators",
  keywords: [
    "AI content generation",
    "text to speech",
    "voice cloning",
    "course generator",
    "AI video",
    "image generation",
    "newsroom AI",
    "e-learning",
  ],
  authors: [{ name: "Maxnovate Limited" }],
  icons: {
    icon: "/logo.svg",
    shortcut: "/logo.svg",
    apple: "/logo.svg",
  },
  openGraph: {
    title: "Studio",
    description:
      "AI-powered text, image, video, and course generation for journalists, educators, and creators",
    type: "website",
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
          className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background font-sans`}
        >
          <TRPCReactProvider>
            <NuqsAdapter>{children}</NuqsAdapter>
          </TRPCReactProvider>
          <Toaster />
        </body>
      </html>
    </ClerkProvider>
  );
}
