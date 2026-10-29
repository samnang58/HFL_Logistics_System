
import React, { useState } from "react";
import {
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ArrowRight,
  Globe2,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [loginId, setLoginId] = useState(
    "admin@hfl-logistics.com"
  );
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Keep the existing authentication behavior.
  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!loginId.trim()) {
      setError("Please enter your email or phone number.");
      return;
    }

    if (!password) {
      setError("Please enter your password.");
      return;
    }

    try {
      setSubmitting(true);
      await login(loginId.trim(), password);
      navigate("/home", { replace: true });
    } catch (err) {
      console.error(err);
      setError(
        err?.message || "Invalid email/phone or password."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-[#dbeafe]">
      <style>{`
        @keyframes hflBackground {
          0%, 100% {
            transform: scale(1.02) translateY(0);
          }
          50% {
            transform: scale(1.055) translateY(-5px);
          }
        }

        @keyframes hflCardEnter {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes hflFloat {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-8px);
          }
        }

        .hfl-bg-motion {
          animation: hflBackground 22s ease-in-out infinite;
        }

        .hfl-card-enter {
          animation: hflCardEnter .8s ease-out both;
        }

        .hfl-float {
          animation: hflFloat 7s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .hfl-bg-motion,
          .hfl-card-enter,
          .hfl-float {
            animation: none !important;
          }
        }
      `}</style>

      {/* Existing 3D logistics image */}
      <div
        aria-hidden="true"
        className="hfl-bg-motion pointer-events-none absolute inset-0 -z-20 bg-cover bg-center"
        style={{
          backgroundImage:
            "url('/img/login/logistics-3d.png')",
        }}
      />

      {/* Light overlay keeps the image visible */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-slate-900/25 via-blue-950/30 to-slate-950/40"
      />

      <main className="relative flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
        {/* Company identity on larger screens */}
        <div className="pointer-events-none absolute left-[4%] top-[8%] hidden max-w-[300px] text-center text-[#10365c] xl:block">
          <img
            src="/img/login/hfl-logo.png"
            alt="High Fast Logistics"
            className="hfl-float mx-auto h-32 w-32 object-contain drop-shadow-xl"
          />

          <h1 className="mt-2 text-2xl font-black tracking-tight">
            HIGH FAST LOGISTICS
          </h1>

          <p className="mt-1 text-sm font-semibold tracking-[.2em]">
            Fast · Safe · Worldwide
          </p>

          <div className="mt-6 grid grid-cols-3 gap-2">
            {[
              { Icon: Globe2, label: "Global Network" },
              { Icon: ShieldCheck, label: "Safe & Secure" },
              { Icon: Truck, label: "Fast Delivery" },
            ].map(({ Icon, label }) => (
              <div
                key={label}
                className="rounded-2xl border border-white/70 bg-white/65 px-2 py-4 shadow-md backdrop-blur-md"
              >
                <Icon
                  size={25}
                  className="mx-auto mb-2 text-blue-600"
                />
                <p className="text-xs font-semibold">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Centered login form */}
        <section className="hfl-card-enter w-full max-w-[430px]">
          <div className="rounded-[26px] border border-white/80 bg-white/90 px-7 py-8 shadow-[0_25px_80px_rgba(15,45,90,0.25)] backdrop-blur-xl sm:px-9 sm:py-10">
            {/* HFL logo */}
            <div className="mb-7 text-center">
              <img
                src="/img/login/hfl-logo.png"
                alt="High Fast Logistics logo"
                className="mx-auto h-24 w-24 object-contain"
              />

              <p className="mt-2 text-sm font-black tracking-wide text-[#12385c]">
                HIGH FAST LOGISTICS
              </p>

              <h2 className="mt-6 text-3xl font-bold tracking-tight text-[#102b50]">
                Welcome Back
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Sign in to your HFL Logistics account
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-5"
            >
              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                >
                  {error}
                </div>
              )}

              {/* Email or phone */}
              <div>
                <label
                  htmlFor="hfl-login-id"
                  className="mb-2 block text-sm font-semibold text-[#18385d]"
                >
                  Email or Phone
                </label>

                <div className="relative">
                  <Mail
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    id="hfl-login-id"
                    type="text"
                    value={loginId}
                    onChange={(e) =>
                      setLoginId(e.target.value)
                    }
                    placeholder="Enter email or phone number"
                    autoComplete="username"
                    className="h-12 w-full rounded-xl border border-slate-200 bg-white/90 pl-11 pr-4 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="hfl-password"
                  className="mb-2 block text-sm font-semibold text-[#18385d]"
                >
                  Password
                </label>

                <div className="relative">
                  <LockKeyhole
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    id="hfl-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) =>
                      setPassword(e.target.value)
                    }
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    className="h-12 w-full rounded-xl border border-slate-200 bg-white/90 pl-11 pr-12 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword((v) => !v)
                    }
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600"
                  >
                    {showPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>
              </div>

              {/* Sign in */}
              <button
                type="submit"
                disabled={submitting}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting
                  ? "Signing in..."
                  : "Sign In"}

                {!submitting && (
                  <ArrowRight size={18} />
                )}
              </button>
            </form>

            <p className="mt-7 border-t border-slate-200 pt-5 text-center text-xs text-slate-500">
              HFL Logistics ERP
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
