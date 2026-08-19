import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";
import "./light-theme.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { getFooter, getNavigation } from "@/lib/strapi";
import ThemeInit from "@/components/theme/ThemeInit";
import Analytics from "@/components/analytics/Analytics";

/**
 * Ф1, дефект Д-05: гарнитура объявлялась девятью разными строками, подключалась
 * ссылкой на fonts.googleapis.com и держалась двумя `font-family: inherit !important`.
 * Теперь одно объявление через next/font: шрифт хостится вместе с приложением,
 * подставляется переменной и не требует внешнего запроса при первой отрисовке.
 *
 * Стек намеренно оставлен прежним: Space Grotesk → sans-serif. Соблазн добавить
 * сюда Noto Sans был проверен замером — и отвергнут: кириллица переезжала с
 * системного шрифта на Noto, текст перетекал, и эталон геометрии показал сдвиг
 * на 19 326 элементах и 100 страницах из 100. Способ доставки шрифта меняется,
 * рисунок страницы — нет. Что именно рисует кириллицу, вынесено в Д-34.
 */
const display = Space_Grotesk({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});
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
    <html lang="ru" className={`dark ${display.variable}`}>
      <head>
        <link rel="stylesheet" href="/assets/css/stitch-tailwind.css" />
        <link rel="stylesheet" href="/assets/fonts/material-symbols-outlined/material-symbols-outlined.css" />
      </head>
      <body className="bg-background-light dark:bg-background-dark text-fg dark:text-fg">
        <ThemeInit />
        <Analytics />
        <div className="relative flex flex-col min-h-screen w-full">
          <Header navigation={navigation} />
          <main className="flex-1 site-main">{children}</main>
          <Footer footer={footer} logo={(navigation as any)?.logo} logoAlt={(navigation as any)?.logoAlt} />
        </div>
      </body>
    </html>
  );
}
