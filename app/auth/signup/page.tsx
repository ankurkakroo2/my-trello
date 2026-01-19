"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// Bold dark theme colors
const BLACK = "#000000";
const GRAY_800 = "#171717";
const GRAY_700 = "#262617";
const GRAY_400 = "#737373";
const GRAY_300 = "#a3a3a3";
const WHITE = "#ffffff";
const RED_500 = "#ef4444";
const RED_900 = "#7f1d1d";

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to create account");
        return;
      }

      router.push("/auth/signin");
    } catch {
      setError("Something went wrong");
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
            Create your account
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {error && (
              <div style={{
                padding: '12px',
                backgroundColor: RED_900,
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '10px',
                color: RED_500,
                fontSize: '13px',
                textAlign: 'left',
              }}>
                {error}
              </div>
            )}

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

            <div>
              <label htmlFor="confirmPassword" style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 500,
                marginBottom: '8px',
                color: GRAY_300,
                textAlign: 'left',
              }}>
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
              {isLoading ? "Creating account..." : "Sign up"}
            </button>
          </form>
        </div>

        <div style={{ textAlign: 'center' }}>
          <p style={{
            color: GRAY_400,
            fontSize: '13px',
          }}>
            Already have an account?{" "}
            <Link
              href="/auth/signin"
              style={{
                fontWeight: 500,
                color: WHITE,
                textDecoration: 'none',
              }}
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
