import React, { useState } from "react";
import {
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ArrowRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState(
    "admin@hfl-logistics.com"
  );
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    setError("");

    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }

    if (!password) {
      setError("Please enter your password.");
      return;
    }

    try {
      setSubmitting(true);

      await login(
        email.trim(),
        password
      );

      navigate("/home", {
        replace: true,
      });
    } catch (err) {
      console.error(err);

      setError(
        err?.message ||
          "Invalid email or password."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">

      <div className="w-full max-w-md">

        <div className="bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">

          {/* Header */}
          <div className="bg-blue-600 px-8 py-8 text-white">

            <div className="flex items-center gap-3">

              <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center">
                <div className="w-8 h-8 rounded-lg bg-white text-blue-600 flex items-center justify-center font-bold">
                  H
                </div>
              </div>

              <div>
                <h1 className="text-2xl font-bold">
                  HFL Logistics
                </h1>

                <p className="text-blue-100 text-sm">
                  Fast · Safe · Worldwide
                </p>
              </div>

            </div>

            <div className="mt-7">

              <h2 className="text-xl font-semibold">
                Welcome back
              </h2>

              <p className="text-blue-100 text-sm mt-1">
                Sign in to your HFL Logistics account
              </p>

            </div>

          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            className="p-8 space-y-5"
          >

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Email */}
            <div>

              <label className="block text-sm font-medium text-slate-700 mb-2">
                Email
              </label>

              <div className="relative">

                <Mail
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="email"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  placeholder="admin@hfl-logistics.com"
                  className="w-full h-11 rounded-lg border border-slate-200 pl-10 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  autoComplete="email"
                />

              </div>

            </div>

            {/* Password */}
            <div>

              <label className="block text-sm font-medium text-slate-700 mb-2">
                Password
              </label>

              <div className="relative">

                <LockKeyhole
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  placeholder="Enter your password"
                  className="w-full h-11 rounded-lg border border-slate-200 pl-10 pr-11 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  autoComplete="current-password"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword((v) => !v)
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>

              </div>

            </div>

            {/* Sign In */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full h-11 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm flex items-center justify-center gap-2 transition"
            >

              {submitting
                ? "Signing in..."
                : "Sign In"}

              {!submitting && (
                <ArrowRight size={17} />
              )}

            </button>

            <p className="text-center text-xs text-slate-400 pt-2">
              HFL Logistics ERP
            </p>

          </form>

        </div>

      </div>

    </div>
  );
}
