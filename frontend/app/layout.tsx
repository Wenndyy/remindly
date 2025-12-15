import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ClientSlideSidebar from "./components/ClientSlideSidebar";
import { UserProvider } from "../contexts/UserContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Remindly - Smart Task Reminder",
  description: "Remindly helps you manage your tasks and events with AI-powered reminders",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`} suppressHydrationWarning={true}>
        <UserProvider>
          <ClientSlideSidebar>{children}</ClientSlideSidebar>
        </UserProvider>
      </body>
    </html>
  );
}


