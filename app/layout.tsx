import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "next-auth/react";

export const metadata: Metadata = {
  title: "TicTac",
  description: "Task management",
};

// Bold dark theme styles
const DARK_STYLES = `
  *, *::before, *::after {
    box-sizing: border-box;
  }

  html {
    font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif;
  }

  body {
    margin: 0;
    padding: 0;
    background-color: #000000 !important;
    color: #ffffff !important;
    font-size: 15px;
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
  }

  h1, h2, h3, h4, h5, h6 {
    color: #ffffff !important;
    font-weight: 600;
    margin: 0;
  }

  input, textarea, select {
    font-family: inherit;
    background-color: #171717 !important;
    color: #ffffff !important;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
    border-radius: 8px !important;
  }

  input:focus, textarea:focus, select:focus {
    outline: none !important;
    border-color: rgba(255, 255, 255, 0.2) !important;
  }

  input::placeholder, textarea::placeholder {
    color: #737373 !important;
  }

  button {
    font-family: inherit;
    border-radius: 8px !important;
  }

  a {
    color: #ffffff !important;
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
        <style dangerouslySetInnerHTML={{ __html: DARK_STYLES }} />
      </head>
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
