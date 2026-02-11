import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";

import { TRPCReactProvider } from "~/trpc/react";
import { Navbar } from "~/components/navbar";
import { Toaster } from "@/components/ui/sonner"; // Ensure you have the Toaster here!

export const metadata: Metadata = {
  title: "Peeyush Labs | Quant & Risk Analytics",
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
      <body className="bg-[#020617] min-h-screen flex flex-col">
        <TRPCReactProvider>
          <Navbar />
          {/* This padding exactly matches the h-16 navbar */}
          <div className="flex-1 pt-16"> 
            {children}
          </div>
          <Toaster /> {/* Add this so your toasts show up above everything */}
        </TRPCReactProvider>
      </body>
    </html>
  );
}