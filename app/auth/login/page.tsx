"use client";

import AppShell from "@/components/layout/AppShell";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { ApiError, apiClient, ensureCsrfCookie, getCookie } from "@/lib/api/client";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const form = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormData) => {
    setError(null);
    let csrf = getCookie("csrf_token");
    if (!csrf) {
      csrf = await ensureCsrfCookie();
    }
    const body = new URLSearchParams();
    body.set("email", values.email);
    body.set("password", values.password);
    if (csrf) body.set("csrf_token", csrf);

    try {
      await apiClient("/login", {
        method: "POST",
        body: body.toString(),
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          ...(csrf ? { "X-CSRF-Token": csrf } : {})
        }
      });
      window.location.href = "/schedule";
    } catch (error) {
      if (error instanceof ApiError) {
        setError(error.message || "Sign in failed. Please check your email and password.");
        return;
      }
      setError("Sign in failed. Please check your email and password.");
    }
  };

  return (
    <AppShell>
      <div className="auth-layout">
        <section className="auth-hero">
          <div className="auth-badge">Secure Access</div>
          <h1 className="auth-title">Logistics Operations</h1>
          <p className="auth-subtitle">
            Plan daily delivery work, keep teams aligned, and track progress from one place.
          </p>
          <ul className="auth-list">
            <li>Clear daily view for operations and leadership teams</li>
            <li>Easy review of planned trips and driver workload</li>
            <li>Simple progress tracking for every customer delivery</li>
          </ul>
          <div className="auth-cta">
            <span className="auth-cta-label">Need an account?</span>
            <a className="auth-cta-link" href="/auth/request-access">
              Request access
            </a>
          </div>
        </section>

        <section className="auth-card card">
          <CardHeader>
            <div>
              <CardTitle>Sign in</CardTitle>
              <div className="card-subtitle">Welcome back. Sign in to continue.</div>
            </div>
          </CardHeader>
          <form className="space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-steel-500" htmlFor="email">
                Email
              </label>
              <Input id="email" placeholder="you@company.com" type="email" {...form.register("email")} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-steel-500" htmlFor="password">
                Password
              </label>
              <Input
                id="password"
                placeholder="Enter your password"
                type="password"
                {...form.register("password")}
              />
            </div>
            {error && <div className="text-sm text-red-600">{error}</div>}
            <div className="page-actions">
              <Button type="submit">Sign In</Button>
              <a className="text-xs text-steel-500" href="/auth/request-access">
                Request an account
              </a>
            </div>
          </form>
        </section>
      </div>
    </AppShell>
  );
}
