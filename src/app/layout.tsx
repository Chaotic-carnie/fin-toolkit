import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";

import { Navbar } from "~/components/navbar";
import { Toaster } from "@/components/ui/sonner";

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
      {/* 1. h-[100dvh] locks the body to the exact visible browser window.
        2. overflow-hidden stops the body itself from scrolling. 
      */}
      <body className="bg-[#020617] h-[100dvh] flex flex-col overflow-hidden">
          <Navbar />
          
          {/* 3. flex-1 takes all remaining space.
            4. pt-16 pushes content down so it isn't hidden behind the Navbar.
            5. overflow-y-auto makes THIS the master scrollbar for the whole app.
          */}
          <main className="flex-1 w-full pt-16 flex flex-col overflow-y-auto dark-scrollbar"> 
            {children}
          </main>
          
          <Toaster />
      </body>
    </html>
  );
}