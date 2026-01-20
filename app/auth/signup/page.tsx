"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// REFINED PALETTE
const C = {
  white: "#FFFFFF",
  offwhite: "#FAFAF9",
  cream: "#FFFBF7",

  gray50: "#FAFAF9",
  gray100: "#F5F5F4",
  gray200: "#E7E5E4",
  gray300: "#D6D3D1",
  gray400: "#A8A29E",
  gray500: "#78716C",
  gray600: "#57534E",
  gray700: "#44403C",
  gray800: "#292524",
  gray900: "#1C1917",
  black: "#0C0A09",

  indigo: "#6366F1",
  violet: "#8B5CF6",
  rose: "#E11D48",
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
      setError("PASSWORDS DO NOT MATCH");
      return;
    }

    if (password.length < 6) {
      setError("PASSWORD MUST BE AT LEAST 6 CHARACTERS");
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
        setError(data.error || "FAILED TO CREATE ACCOUNT");
        return;
      }

      router.push("/auth/signin");
    } catch {
      setError("SOMETHING WENT WRONG");
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
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
    }}>

      <div style={{
        width: '100%',
        maxWidth: '520px',
        position: 'relative',
        zIndex: 1,
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0)' : 'translateY(30px)',
        transition: 'all 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}>
        <div style={{
          padding: '64px',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRadius: '40px',
          boxShadow: '0 40px 100px rgba(0,0,0,0.15)',
          border: `4px solid ${C.black}`,
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Gradient accent line */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '6px',
            background: `linear-gradient(90deg, ${C.black}, ${C.gray800}, ${C.gray700}, ${C.gray600}, ${C.black})`,
          }} />

          {/* MASSIVE Logo */}
          <div style={{
            textAlign: 'center',
            marginBottom: '48px',
          }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100px',
              height: '100px',
              background: `linear-gradient(135deg, ${C.gray800}, ${C.black})`,
              borderRadius: '30px',
              marginBottom: '24px',
              boxShadow: '0 15px 50px rgba(0,0,0,0.3)',
              animation: 'logoFloat 4s ease-in-out infinite',
              position: 'relative',
            }}>
              <div style={{
                position: 'absolute',
                inset: -6,
                borderRadius: '36px',
                background: `linear-gradient(135deg, ${C.gray700}, ${C.black})`,
                opacity: 0.3,
                animation: 'pulseRing 2.5s ease-out infinite',
              }} />
              <span style={{
                fontSize: '48px',
                fontWeight: 900,
                color: C.white,
                textShadow: '0 2px 8px rgba(0,0,0,0.3)',
              }}>✨</span>
            </div>

            <h1 style={{
              fontSize: '36px',
              fontWeight: 600,
              color: C.gray900,
              letterSpacing: '-0.04em',
              lineHeight: 1.1,
              marginBottom: '8px',
            }}>
              TicTac
            </h1>
            <p style={{
              fontSize: '15px',
              color: C.gray500,
              fontWeight: 500,
              letterSpacing: '0.02em',
            }}>
              Create your account
            </p>
          </div>

          {/* Error message - Refined */}
          {error && (
            <div style={{
              padding: '12px 16px',
              background: `${C.rose}10`,
              border: `1px solid ${C.rose}30`,
              borderRadius: '8px',
              color: C.rose,
              fontSize: '14px',
              fontWeight: 500,
              marginBottom: '16px',
              textAlign: 'center',
            }}>
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Email - DRAMATIC */}
            <div>
              <label htmlFor="email" style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 900,
                marginBottom: '12px',
                color: C.gray700,
                textAlign: 'left',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
              }}>
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '22px 28px',
                  backgroundColor: C.gray50,
                  border: `3px solid ${C.gray300}`,
                  borderRadius: '20px',
                  fontSize: '18px',
                  fontWeight: 700,
                  color: C.black,
                  outline: 'none',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  letterSpacing: '0.02em',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                }}
                placeholder="you@example.com"
                required
                onFocus={(e) => Object.assign(e.currentTarget.style, {
                  borderColor: C.black,
                  backgroundColor: C.white,
                  boxShadow: '0 0 0 5px rgba(0,0,0,0.1), 0 10px 40px rgba(0,0,0,0.15)',
                  transform: 'scale(1.02)',
                })}
                onBlur={(e) => Object.assign(e.currentTarget.style, {
                  borderColor: C.gray300,
                  backgroundColor: C.gray50,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                  transform: 'scale(1)',
                })}
              />
            </div>

            {/* Password - DRAMATIC */}
            <div>
              <label htmlFor="password" style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 900,
                marginBottom: '12px',
                color: C.gray700,
                textAlign: 'left',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
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
                  padding: '22px 28px',
                  backgroundColor: C.gray50,
                  border: `3px solid ${C.gray300}`,
                  borderRadius: '20px',
                  fontSize: '18px',
                  fontWeight: 700,
                  color: C.black,
                  outline: 'none',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  letterSpacing: '0.02em',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                }}
                placeholder="•••••••••"
                required
                minLength={6}
                onFocus={(e) => Object.assign(e.currentTarget.style, {
                  borderColor: C.black,
                  backgroundColor: C.white,
                  boxShadow: '0 0 0 5px rgba(0,0,0,0.1), 0 10px 40px rgba(0,0,0,0.15)',
                  transform: 'scale(1.02)',
                })}
                onBlur={(e) => Object.assign(e.currentTarget.style, {
                  borderColor: C.gray300,
                  backgroundColor: C.gray50,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                  transform: 'scale(1)',
                })}
              />
            </div>

            {/* Confirm Password - DRAMATIC */}
            <div>
              <label htmlFor="confirmPassword" style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 900,
                marginBottom: '12px',
                color: C.gray700,
                textAlign: 'left',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
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
                  padding: '22px 28px',
                  backgroundColor: C.gray50,
                  border: `3px solid ${C.gray300}`,
                  borderRadius: '20px',
                  fontSize: '18px',
                  fontWeight: 700,
                  color: C.black,
                  outline: 'none',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  letterSpacing: '0.02em',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                }}
                placeholder="•••••••••"
                required
                minLength={6}
                onFocus={(e) => Object.assign(e.currentTarget.style, {
                  borderColor: C.black,
                  backgroundColor: C.white,
                  boxShadow: '0 0 0 5px rgba(0,0,0,0.1), 0 10px 40px rgba(0,0,0,0.15)',
                  transform: 'scale(1.02)',
                })}
                onBlur={(e) => Object.assign(e.currentTarget.style, {
                  borderColor: C.gray300,
                  backgroundColor: C.gray50,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                  transform: 'scale(1)',
                })}
              />
            </div>

            {/* Submit - Refined button */}
            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '12px 20px',
                background: `linear-gradient(135deg, ${C.gray900}, ${C.black})`,
                color: C.white,
                fontWeight: 500,
                fontSize: '15px',
                border: 'none',
                borderRadius: '8px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.6 : 1,
                transition: 'all 0.2s ease',
                marginTop: '8px',
                letterSpacing: '0.02em',
                boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
              }}
              onMouseEnter={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.background = C.violet;
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.background = `linear-gradient(135deg, ${C.gray900}, ${C.black})`;
                e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.08)';
              }}
            >
              {isLoading ? "Creating..." : "Sign Up"}
            </button>
          </form>

          {/* Sign in link */}
          <div style={{ textAlign: 'center', marginTop: '40px', paddingTop: '40px', borderTop: `3px solid ${C.gray200}` }}>
            <p style={{
              color: C.gray700,
              fontSize: '16px',
              fontWeight: 700,
              letterSpacing: '0.05em',
            }}>
              Already have an account?{" "}
              <Link
                href="/auth/signin"
                style={{
                  fontWeight: 900,
                  color: C.black,
                  textDecoration: 'none',
                }}
              >
                SIGN IN
              </Link>
            </p>
          </div>
        </div>

        {/* Footer tagline */}
        <p style={{
          textAlign: 'center',
          color: C.gray600,
          fontSize: '14px',
          marginTop: '40px',
          fontWeight: 700,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
        }}>
          ✨ Bold Task Management ✨
        </p>
      </div>

      <style>{`
        @keyframes float1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(50px, -50px) scale(1.2); }
          66% { transform: translate(-30px, 30px) scale(0.9); }
        }
        @keyframes float2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-40px, 40px) scale(1.15); }
          66% { transform: translate(30px, -20px) scale(0.95); }
        }
        @keyframes float3 {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          50% { transform: translate(20px, -20px) rotate(180deg); }
        }
        @keyframes logoFloat {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-8px) rotate(5deg); }
        }
        @keyframes pulseRing {
          0% { transform: scale(1); opacity: 0.5; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-10px); }
          40% { transform: translateX(10px); }
          60% { transform: translateX(-5px); }
          80% { transform: translateX(5px); }
        }
      `}</style>
    </div>
  );
}
