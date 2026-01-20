"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const C = {
  white: "#FFFFFF",
  offwhite: "#FAFAFA",
  gray50: "#F7F7F7",
  gray100: "#E8E8E8",
  gray200: "#D4D4D4",
  gray300: "#A3A3A3",
  gray400: "#737373",
  gray500: "#525252",
  gray600: "#404040",
  gray700: "#262626",
  gray800: "#171717",
  black: "#0A0A0A",
};

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

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
      background: C.offwhite,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: "'SF Pro Display', -apple-system, sans-serif",
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0)' : 'translateY(10px)',
        transition: 'all 0.3s ease',
      }}>
        {/* Logo/Brand */}
        <div style={{
          textAlign: 'center',
          marginBottom: '40px',
        }}>
          <h1 style={{
            fontSize: '28px',
            fontWeight: 700,
            color: C.black,
            letterSpacing: '-0.03em',
            marginBottom: '8px',
          }}>
            TicTac
          </h1>
          <p style={{
            fontSize: '14px',
            color: C.gray500,
            fontWeight: 500,
          }}>
            Create your account
          </p>
        </div>

        {/* Form Card */}
        <div style={{
          padding: '32px',
          background: C.white,
          borderRadius: '16px',
          border: `1px solid ${C.gray100}`,
          boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
        }}>
          {/* Error message */}
          {error && (
            <div style={{
              padding: '10px 12px',
              background: `${C.black}05`,
              border: `1px solid ${C.black}15`,
              borderRadius: '8px',
              color: C.gray800,
              fontSize: '13px',
              fontWeight: 500,
              marginBottom: '16px',
              textAlign: 'center',
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label htmlFor="email" style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                marginBottom: '6px',
                color: C.gray700,
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
                  backgroundColor: C.gray50,
                  border: `1px solid ${C.gray200}`,
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: C.black,
                  outline: 'none',
                  transition: 'all 0.2s ease',
                }}
                placeholder="you@example.com"
                required
                onFocus={(e) => Object.assign(e.currentTarget.style, {
                  borderColor: C.gray400,
                  backgroundColor: C.white,
                })}
                onBlur={(e) => Object.assign(e.currentTarget.style, {
                  borderColor: C.gray200,
                  backgroundColor: C.gray50,
                })}
              />
            </div>

            <div>
              <label htmlFor="password" style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                marginBottom: '6px',
                color: C.gray700,
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
                  backgroundColor: C.gray50,
                  border: `1px solid ${C.gray200}`,
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: C.black,
                  outline: 'none',
                  transition: 'all 0.2s ease',
                }}
                placeholder="••••••••"
                required
                minLength={6}
                onFocus={(e) => Object.assign(e.currentTarget.style, {
                  borderColor: C.gray400,
                  backgroundColor: C.white,
                })}
                onBlur={(e) => Object.assign(e.currentTarget.style, {
                  borderColor: C.gray200,
                  backgroundColor: C.gray50,
                })}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                marginBottom: '6px',
                color: C.gray700,
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
                  padding: '10px 12px',
                  backgroundColor: C.gray50,
                  border: `1px solid ${C.gray200}`,
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: C.black,
                  outline: 'none',
                  transition: 'all 0.2s ease',
                }}
                placeholder="••••••••"
                required
                minLength={6}
                onFocus={(e) => Object.assign(e.currentTarget.style, {
                  borderColor: C.gray400,
                  backgroundColor: C.white,
                })}
                onBlur={(e) => Object.assign(e.currentTarget.style, {
                  borderColor: C.gray200,
                  backgroundColor: C.gray50,
                })}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '12px',
                background: C.black,
                color: C.white,
                fontWeight: 600,
                fontSize: '14px',
                border: 'none',
                borderRadius: '8px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.6 : 1,
                transition: 'all 0.2s ease',
                marginTop: '8px',
              }}
              onMouseEnter={(e) => {
                if (!isLoading) {
                  Object.assign(e.currentTarget.style, {
                    background: C.gray800,
                    transform: 'translateY(-1px)',
                  });
                }
              }}
              onMouseLeave={(e) => {
                Object.assign(e.currentTarget.style, {
                  background: C.black,
                  transform: 'translateY(0)',
                });
              }}
            >
              {isLoading ? "Creating account..." : "Sign up"}
            </button>
          </form>

          {/* Sign in link */}
          <div style={{ textAlign: 'center', marginTop: '24px', paddingTop: '24px', borderTop: `1px solid ${C.gray100}` }}>
            <p style={{
              color: C.gray600,
              fontSize: '13px',
              fontWeight: 500,
            }}>
              Already have an account?{" "}
              <Link
                href="/auth/signin"
                style={{
                  fontWeight: 600,
                  color: C.black,
                  textDecoration: 'none',
                }}
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
