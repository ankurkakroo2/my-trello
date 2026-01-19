import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "next-auth/react";

export const metadata: Metadata = {
  title: "TicTac",
  description: "Task management",
};

const LIGHT_STYLES = `
  *, *::before, *::after {
    box-sizing: border-box;
  }

  html {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif;
  }

  body {
    margin: 0;
    padding: 0;
    background-color: #ffffff !important;
    color: #000000 !important;
    font-size: 15px;
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
  }

  h1, h2, h3, h4, h5, h6 {
    color: #000000 !important;
    font-weight: 600;
    margin: 0;
  }

  input, textarea, select {
    font-family: inherit;
  }

  button {
    font-family: inherit;
  }

  a {
    color: #000000 !important;
    text-decoration: none;
  }
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <style dangerouslySetInnerHTML={{ __html: LIGHT_STYLES }} />
      </head>
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
