import type { Metadata } from "next";
import { Inter, Lexend_Exa } from "next/font/google";
import { AppFooter } from "@/components/brand/app-footer";
import { AppTooltipProvider } from "@/components/providers/app-tooltip-provider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const lexendExa = Lexend_Exa({
  variable: "--font-lexend-exa",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Sophos Firewall Sizer",
  description:
    "Customer firewall sizing questionnaire and presales recommendation dashboard for Sophos XGS appliances.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${lexendExa.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background">
        <AppTooltipProvider>{children}</AppTooltipProvider>
        <AppFooter />
      </body>
    </html>
  );
}
