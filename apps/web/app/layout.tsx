import type { Metadata, Viewport } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"
import "./globals.css"
import { QueryProvider } from "@/components/providers/query-provider"
import { CommandPalette } from "@/components/command-palette"
import { auth } from "@/lib/auth"

// ---- Fonts ----
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
})

// ---- Metadata ----
const appUrlString =
  process.env.NEXT_PUBLIC_APP_URL?.trim() ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://novacp.app")

export const metadata: Metadata = {
  title: {
    default: "NovaCP — The OS for Competitive Programmers",
    template: "%s | NovaCP",
  },
  description:
    "NovaCP tells you exactly why you're stuck and exactly what to solve next. Performance analytics, AI recommendations, and contest aggregation — all in one platform.",
  keywords: [
    "competitive programming",
    "codeforces",
    "analytics",
    "AI recommendations",
    "contest aggregator",
    "CP training",
    "algorithm practice",
  ],
  authors: [{ name: "NovaCP Team" }],
  creator: "NovaCP",
  metadataBase: new URL(appUrlString),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: appUrlString,
    siteName: "NovaCP",
    title: "NovaCP — The OS for Competitive Programmers",
    description:
      "Performance analytics, AI recommendations, and contest aggregation for competitive programmers.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "NovaCP — The OS for Competitive Programmers",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "NovaCP — The OS for Competitive Programmers",
    description:
      "Performance analytics, AI recommendations, and contest aggregation for competitive programmers.",
    images: ["/og-image.png"],
    creator: "@novacp",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
}

export const viewport: Viewport = {
  themeColor: "#0A0A0F",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
}

// ---- Root Layout ----
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} dark`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background font-sans antialiased" suppressHydrationWarning>
        <QueryProvider>
          {children}
          <CommandPalette session={session} />
        </QueryProvider>
      </body>
    </html>
  )
}
