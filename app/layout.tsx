import type { Metadata } from "next";
import { Cinzel, Cinzel_Decorative, MedievalSharp } from "next/font/google";
import "./globals.css";

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
    <html lang="en" className="dark">
      {/* Dark mode is the default theme for all pages */}
      <body
        className={`${cinzel.variable} ${cinzelDecorative.variable} ${medievalSharp.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
