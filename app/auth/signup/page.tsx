"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// BOLD DRAMATIC PALETTE
const C = {
  // Neutrals
  white: "#ffffff",
  offwhite: "#fafafa",
  light: "#f8f9fa",

  // Greys - full spectrum
  gray50: "#f9fafb",
  gray100: "#f3f4f6",
  gray200: "#e5e7eb",
  gray300: "#d1d5db",
  gray400: "#9ca3af",
  gray500: "#6b7280",
  gray600: "#4b5563",
  gray700: "#374151",
  gray800: "#1f2937",
  gray900: "#111827",
  black: "#000000",

  // Bold accent colors
  purple: "#8b5cf6",
  pink: "#ec4899",
  red: "#ef4444",
  orange: "#f97316",
  amber: "#f59e0b",
  yellow: "#eab308",
  lime: "#84cc16",
  green: "#22c55e",
  emerald: "#10b981",
  teal: "#14b8a6",
  cyan: "#06b6d4",
  sky: "#0ea5e9",
  blue: "#3b82f6",
  indigo: "#6366f1",
  violet: "#8b5cf6",
  fuchsia: "#d946ef",
  rose: "#f43f5e",
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
      background: `linear-gradient(135deg, ${C.white} 0%, ${C.offwhite} 50%, ${C.light} 100%)`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Dramatic animated background */}
      <div style={{
        position: 'absolute',
        width: '700px',
        height: '700px',
        borderRadius: '50%',
        background: `radial-gradient(circle, ${C.gray200}20 0%, transparent 70%)`,
        animation: 'float1 14s ease-in-out infinite',
      }} />
      <div style={{
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: '600px',
        height: '600px',
        borderRadius: '50%',
        background: `radial-gradient(circle, ${C.gray300}20 0%, transparent 70%)`,
        animation: 'float2 18s ease-in-out infinite reverse',
      }} />
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '100%',
        height: '100%',
        background: 'repeating-linear-gradient(0deg, transparent, transparent 50px, rgba(0,0,0,0.02) 50px, rgba(0,0,0,0.02) 51px)',
        pointerEvents: 'none',
      }} />

      {/* Floating gradient orbs */}
      <div style={{
        position: 'absolute',
        top: '10%',
        left: '10%',
        width: '300px',
        height: '300px',
        borderRadius: '50%',
        background: `radial-gradient(circle, ${C.blue}10 0%, transparent 70%)`,
        animation: 'float3 12s ease-in-out infinite',
      }} />
      <div style={{
        position: 'absolute',
        bottom: '15%',
        left: '20%',
        width: '250px',
        height: '250px',
        borderRadius: '50%',
        background: `radial-gradient(circle, ${C.indigo}10 0%, transparent 70%)`,
        animation: 'float3 16s ease-in-out infinite reverse',
      }} />

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
              fontSize: '88px',
              fontWeight: 900,
              background: `linear-gradient(135deg, ${C.black} 0%, ${C.indigo} 25%, ${C.purple} 50%, ${C.pink} 75%, ${C.black} 100%)`,
              backgroundSize: '300% 300%',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              letterSpacing: '-0.08em',
              lineHeight: 0.95,
              marginBottom: '20px',
              textTransform: 'uppercase',
              animation: 'gradientShift 2.5s ease infinite',
              filter: 'drop-shadow(0 6px 16px rgba(0,0,0,0.3))',
            }}>
              TicTac
            </h1>
            <p style={{
              fontSize: '20px',
              background: `linear-gradient(135deg, ${C.gray800}, ${C.gray600})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              fontWeight: 800,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
            }}>
              Create Account
            </p>
          </div>

          {/* Error message - DRAMATIC */}
          {error && (
            <div style={{
              padding: '18px 24px',
              background: `linear-gradient(135deg, ${C.red}10, ${C.rose}10)`,
              border: `3px solid ${C.red}`,
              borderRadius: '16px',
              color: C.red,
              fontSize: '15px',
              fontWeight: 900,
              letterSpacing: '0.1em',
              marginBottom: '24px',
              textAlign: 'center',
              textTransform: 'uppercase',
              animation: 'shake 0.5s ease-out',
              boxShadow: `0 8px 30px ${C.red}20`,
            }}>
              ⚠️ {error}
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

            {/* Submit - MASSIVE BUTTON */}
            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '26px',
                background: `linear-gradient(135deg, ${C.black}, ${C.gray900})`,
                color: C.white,
                fontWeight: 900,
                fontSize: '18px',
                border: 'none',
                borderRadius: '20px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.6 : 1,
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                marginTop: '16px',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                boxShadow: '0 12px 50px rgba(0,0,0,0.25)',
                position: 'relative',
                overflow: 'hidden',
              }}
              onMouseEnter={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)';
                  e.currentTarget.style.background = `linear-gradient(135deg, ${C.pink}, ${C.rose})`;
                  e.currentTarget.style.boxShadow = `0 20px 70px ${C.pink}50`;
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.background = `linear-gradient(135deg, ${C.black}, ${C.gray900})`;
                e.currentTarget.style.boxShadow = '0 12px 50px rgba(0,0,0,0.25)';
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
