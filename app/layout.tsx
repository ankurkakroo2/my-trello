import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "next-auth/react";

export const metadata: Metadata = {
  title: "TicTac",
  description: "Task management",
};

// Clean theme colors
const CLEAN_STYLES = `
  /* CLEAN THEME CRITICAL STYLES */
  *, *::before, *::after {
    box-sizing: border-box;
  }

  html {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
  }

  body {
    margin: 0;
    padding: 0;
    background-color: #ffffff !important;
    color: #1a1a1a !important;
    font-size: 15px;
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  h1, h2, h3, h4, h5, h6 {
    color: #111111 !important;
    font-weight: 600;
    margin: 0;
  }

  p, span, div, label, a {
    color: #374151 !important;
  }

  /* Subtle borders */
  input, textarea, select {
    font-family: inherit;
    background-color: #ffffff !important;
    color: #1a1a1a !important;
    border: 1px solid #e5e7eb !important;
    border-radius: 6px !important;
  }

  input:focus, textarea:focus, select:focus {
    outline: none !important;
    border-color: #3b82f6 !important;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1) !important;
  }

  input::placeholder, textarea::placeholder {
    color: #9ca3af !important;
  }

  /* Clean buttons */
  button {
    font-family: inherit;
    cursor: pointer;
    border-radius: 6px !important;
    transition: all 0.15s ease;
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Link styles */
  a {
    color: #3b82f6 !important;
    text-decoration: none;
  }

  a:hover {
    text-decoration: underline;
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
        <style dangerouslySetInnerHTML={{ __html: CLEAN_STYLES }} />
      </head>
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
