"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// Clean white theme
const WHITE = "#ffffff";
const GRAY_100 = "#f5f5f5";
const GRAY_200 = "#e5e5e5";
const GRAY_300 = "#d4d4d4";
const GRAY_400 = "#a3a3a3";
const GRAY_500 = "#737373";
const GRAY_600 = "#525252";
const GRAY_700 = "#404040";
const BLACK = "#000000";

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
      backgroundColor: WHITE,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{
          padding: '48px 0',
          textAlign: 'center'
        }}>
          <h1 style={{
            fontSize: '36px',
            fontWeight: 700,
            color: BLACK,
            marginBottom: '8px',
            letterSpacing: '-0.03em',
          }}>
            TicTac
          </h1>
          <p style={{
            fontSize: '15px',
            color: GRAY_500,
            marginBottom: '48px',
          }}>
            Sign in to manage your tasks
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label htmlFor="email" style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 500,
                marginBottom: '8px',
                color: GRAY_700,
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
                  padding: '14px 16px',
                  backgroundColor: GRAY_100,
                  border: '2px solid transparent',
                  borderRadius: '12px',
                  fontSize: '15px',
                  color: BLACK,
                  outline: 'none',
                  transition: 'all 0.2s',
                }}
                placeholder="you@example.com"
                required
                onFocus={(e) => Object.assign(e.currentTarget.style, { borderColor: GRAY_300, backgroundColor: WHITE })}
                onBlur={(e) => Object.assign(e.currentTarget.style, { borderColor: 'transparent', backgroundColor: GRAY_100 })}
              />
            </div>

            <div>
              <label htmlFor="password" style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 500,
                marginBottom: '8px',
                color: GRAY_700,
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
                  padding: '14px 16px',
                  backgroundColor: GRAY_100,
                  border: '2px solid transparent',
                  borderRadius: '12px',
                  fontSize: '15px',
                  color: BLACK,
                  outline: 'none',
                  transition: 'all 0.2s',
                }}
                placeholder="•••••••••"
                required
                minLength={6}
                onFocus={(e) => Object.assign(e.currentTarget.style, { borderColor: GRAY_300, backgroundColor: WHITE })}
                onBlur={(e) => Object.assign(e.currentTarget.style, { borderColor: 'transparent', backgroundColor: GRAY_100 })}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '16px',
                backgroundColor: BLACK,
                color: WHITE,
                fontWeight: 600,
                fontSize: '15px',
                border: 'none',
                borderRadius: '12px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.6 : 1,
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.15)';
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
            color: GRAY_500,
            fontSize: '14px',
          }}>
            Don&apos;t have an account?{" "}
            <Link
              href="/auth/signup"
              style={{
                fontWeight: 600,
                color: BLACK,
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
