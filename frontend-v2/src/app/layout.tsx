import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ClientProviders from "@/components/ClientProviders";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Allow user zoom for accessibility (WCAG 1.4.4) — never lock at maximum-scale=1
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#05080f" },
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
  ],
  colorScheme: "dark light",
};

export const metadata: Metadata = {
  title: "TheoSphere OS | Plataforma de Exegese & Pesquisa Teológica",
  description: "O sistema operacional definitivo para pesquisadores, pastores e estudantes de teologia. Análise exegética avançada, Atlas 4D e IA agêntica integrada.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TheoSphere",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full" suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className={`${inter.variable} antialiased min-h-full flex flex-col bg-[#05080f]`}>
        <a href="#main" className="skip-link">Pular para o conteúdo</a>
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
