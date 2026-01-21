import { Cinzel, Cinzel_Decorative, MedievalSharp } from "next/font/google";
import "@/app/globals.css";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { ThemeLoader } from "@/components/theme-loader";
import { ThemeSelector } from "@/components/ui/theme-selector";
import { RecoverySessionGuard } from "@/components/recovery-session-guard";
import { BackgroundImageWrapper } from "@/components/ui/background-image-wrapper";
import { LanguageSelector } from "@/components/ui/language-selector";

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const cinzelDecorative = Cinzel_Decorative({
  variable: "--font-cinzel-decorative",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const medievalSharp = MedievalSharp({
  variable: "--font-medieval",
  subsets: ["latin"],
  weight: ["400"],
});

export default async function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  const messages = await getMessages();

  return (
    <html>
      <body
        className={`${cinzel.variable} ${cinzelDecorative.variable} ${medievalSharp.variable} antialiased`}
      >
        <NextIntlClientProvider messages={messages}>
          <BackgroundImageWrapper
            imagePath="/background.png"
            overlayIntensity="medium"
            className="min-h-screen"
          >
            <RecoverySessionGuard />
            <ThemeLoader />
            {children}
            <ThemeSelector />
            <LanguageSelector />
          </BackgroundImageWrapper>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
