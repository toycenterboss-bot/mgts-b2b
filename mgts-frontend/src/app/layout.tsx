import type { Metadata } from "next";
import "./globals.css";
import "./light-theme.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { getFooter, getNavigation } from "@/lib/strapi";
import ThemeInit from "@/components/theme/ThemeInit";

export const metadata: Metadata = {
  title: "МГТС Бизнес",
  description: "B2B-портал МГТС",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [navigation, footer] = await Promise.all([getNavigation(), getFooter()]);

  return (
    <html lang="ru" className="dark">
      <head>
        <link rel="stylesheet" href="/assets/css/stitch-tailwind.css" />
        <link rel="stylesheet" href="/assets/fonts/material-symbols-outlined/material-symbols-outlined.css" />
        <link rel="stylesheet" href="/assets/fonts/google/73e5ac8a40/font.css" />
      </head>
      <body className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100">
        <ThemeInit />
        <div className="relative flex flex-col min-h-screen w-full">
          <Header navigation={navigation} />
          <main className="flex-1 site-main">{children}</main>
          <Footer footer={footer} />
        </div>
      </body>
    </html>
  );
}
