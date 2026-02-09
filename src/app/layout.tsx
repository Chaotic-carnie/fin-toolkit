import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";

import { TRPCReactProvider } from "~/trpc/react";
import { Navbar } from "~/components/navbar"; //

export const metadata: Metadata = {
  title: "Peeyush Labs | Quant & Risk Analytics", //
  description: "High-performance financial toolkit",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable}`}>
      <body className="bg-[#020617]"> {/* Match your homepage background */}
        <TRPCReactProvider>
          <Navbar /> {/* This is now persistent */}
          <div className="pt-16"> {/* Add padding so content isn't hidden under the nav */}
            {children}
          </div>
        </TRPCReactProvider>
      </body>
    </html>
  );
} 