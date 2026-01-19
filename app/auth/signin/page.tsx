"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        // Silent error - show inline error
      } else {
        router.push("/");
        router.refresh();
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#ffffff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif'
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{
          backgroundColor: '#ffffff',
          padding: '40px 0',
          textAlign: 'center'
        }}>
          <h1 style={{
            fontSize: '28px',
            fontWeight: 600,
            color: '#111827',
            marginBottom: '8px',
            fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif'
          }}>
            TicTac
          </h1>
          <p style={{
            fontSize: '15px',
            color: '#6b7280',
            marginBottom: '40px',
            fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif'
          }}>
            Sign in to manage your tasks
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label htmlFor="email" style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 500,
                marginBottom: '6px',
                color: '#374151',
                fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
                textAlign: 'left',
              }}>
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '15px',
                  color: '#111827',
                  fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
                  outline: 'none',
                }}
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label htmlFor="password" style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 500,
                marginBottom: '6px',
                color: '#374151',
                fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
                textAlign: 'left',
              }}>
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '15px',
                  color: '#111827',
                  fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
                  outline: 'none',
                }}
                placeholder="•••••••••"
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: '#111827',
                color: '#ffffff',
                fontWeight: 500,
                fontSize: '15px',
                border: 'none',
                borderRadius: '8px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.5 : 1,
                transition: 'all 0.15s',
                fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
              }}
              onMouseEnter={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.backgroundColor = '#374151';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#111827';
              }}
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>

        <div style={{ textAlign: 'center' }}>
          <p style={{
            color: '#6b7280',
            fontSize: '14px',
            fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
          }}>
            Don't have an account?{" "}
            <Link
              href="/auth/signup"
              style={{
                fontWeight: 500,
                color: '#3b82f6',
                textDecoration: 'none',
                fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
              }}
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
