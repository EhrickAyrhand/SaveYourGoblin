import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMessages } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import { routing } from "@/i18n/routing";
import { LanguageSelector } from "@/components/ui/language-selector";
import { BackgroundImageWrapper } from "@/components/ui/background-image-wrapper";

export const metadata: Metadata = {
  title: "SaveYourGoblin",
  description: "An AI-powered tool for RPG masters to generate characters, NPCs, missions, and environments on-the-fly when players go off-script",
};

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  
  // Ensure that the incoming `locale` is valid
  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  // Providing all messages to the client
  // side is the easiest way to get started
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <BackgroundImageWrapper
        imagePath="/background.png"
        overlayIntensity="medium"
        className="min-h-screen"
      >
        {children}
        <LanguageSelector />
      </BackgroundImageWrapper>
    </NextIntlClientProvider>
  );
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
