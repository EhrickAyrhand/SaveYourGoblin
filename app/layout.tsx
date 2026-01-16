import { Cinzel, Cinzel_Decorative, MedievalSharp } from "next/font/google";
import "./globals.css";
import { ThemeLoader } from "@/components/theme-loader";
import { ThemeSelector } from "@/components/ui/theme-selector";
import { RecoverySessionGuard } from "@/components/recovery-session-guard";

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

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html>
      <body
        className={`${cinzel.variable} ${cinzelDecorative.variable} ${medievalSharp.variable} antialiased`}
      >
        <RecoverySessionGuard />
        <ThemeLoader />
        {children}
        <ThemeSelector />
      </body>
    </html>
  )
}
