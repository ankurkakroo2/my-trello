"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// Bold dark theme colors
const BLACK = "#000000";
const GRAY_900 = "#0a0a0a";
const GRAY_800 = "#171717";
const GRAY_700 = "#262626";
const GRAY_600 = "#404040";
const GRAY_400 = "#737373";
const GRAY_300 = "#a3a3a3";
const WHITE = "#ffffff";

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
        // Silent error
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
      backgroundColor: BLACK,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", sans-serif'
    }}>
      <div style={{ width: '100%', maxWidth: '380px' }}>
        <div style={{
          padding: '40px 0',
          textAlign: 'center'
        }}>
          <h1 style={{
            fontSize: '32px',
            fontWeight: 700,
            color: WHITE,
            marginBottom: '8px',
            letterSpacing: '-0.02em',
          }}>
            TicTac
          </h1>
          <p style={{
            fontSize: '14px',
            color: GRAY_400,
            marginBottom: '40px',
          }}>
            Sign in to manage your tasks
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label htmlFor="email" style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 500,
                marginBottom: '8px',
                color: GRAY_300,
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
                  padding: '12px',
                  backgroundColor: GRAY_800,
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '10px',
                  fontSize: '14px',
                  color: WHITE,
                  outline: 'none',
                  transition: 'all 0.2s ease',
                }}
                placeholder="you@example.com"
                required
                onFocus={(e) => Object.assign(e.currentTarget.style, { borderColor: 'rgba(255, 255, 255, 0.15)', backgroundColor: GRAY_700 })}
                onBlur={(e) => Object.assign(e.currentTarget.style, { borderColor: 'rgba(255, 255, 255, 0.08)', backgroundColor: GRAY_800 })}
              />
            </div>

            <div>
              <label htmlFor="password" style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 500,
                marginBottom: '8px',
                color: GRAY_300,
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
                  padding: '12px',
                  backgroundColor: GRAY_800,
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '10px',
                  fontSize: '14px',
                  color: WHITE,
                  outline: 'none',
                  transition: 'all 0.2s ease',
                }}
                placeholder="•••••••••"
                required
                minLength={6}
                onFocus={(e) => Object.assign(e.currentTarget.style, { borderColor: 'rgba(255, 255, 255, 0.15)', backgroundColor: GRAY_700 })}
                onBlur={(e) => Object.assign(e.currentTarget.style, { borderColor: 'rgba(255, 255, 255, 0.08)', backgroundColor: GRAY_800 })}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: WHITE,
                color: BLACK,
                fontWeight: 600,
                fontSize: '14px',
                border: 'none',
                borderRadius: '10px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.5 : 1,
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
              onMouseEnter={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(255, 255, 255, 0.15)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>

        <div style={{ textAlign: 'center' }}>
          <p style={{
            color: GRAY_400,
            fontSize: '13px',
          }}>
            Don&apos;t have an account?{" "}
            <Link
              href="/auth/signup"
              style={{
                fontWeight: 500,
                color: WHITE,
                textDecoration: 'none',
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
