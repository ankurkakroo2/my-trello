import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "My Trello - Task Tracker",
  description: "Personal task management with Trello-style board interface",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-brutal-white">
        <SessionProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: "#ffffff",
                border: "3px solid #000000",
                boxShadow: "4px 4px 0px 0px #000000",
                borderRadius: "0px",
                padding: "12px 16px",
                fontSize: "16px",
                fontWeight: "600",
              },
              classNames: {
                error: "bg-[#FF6B9D]",
                success: "bg-[#6BCB77]",
              },
            }}
          />
        </SessionProvider>
      </body>
    </html>
  );
}
