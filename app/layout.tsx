import type { Metadata } from "next";
import { Cinzel, Cinzel_Decorative, MedievalSharp } from "next/font/google";
import "./globals.css";
import { ThemeLoader } from "@/components/theme-loader";
import { ThemeSelector } from "@/components/ui/theme-selector";

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

export const metadata: Metadata = {
  title: "RPG Master's Assistant",
  description: "An AI-powered tool for RPG masters to generate characters, NPCs, missions, and environments on-the-fly when players go off-script",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {/* ThemeLoader will apply the user's preferred theme on mount */}
      <body
        className={`${cinzel.variable} ${cinzelDecorative.variable} ${medievalSharp.variable} antialiased`}
      >
        <ThemeLoader />
        {children}
        <ThemeSelector />
      </body>
    </html>
  );
}
