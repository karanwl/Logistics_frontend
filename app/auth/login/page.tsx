"use client";

import AppShell from "@/components/layout/AppShell";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { ensureCsrfCookie, getCookie } from "@/lib/api/client";

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
      const res = await fetch("/api-proxy/login", {
        method: "POST",
        body: body.toString(),
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          accept: "application/json",
          ...(csrf ? { "X-CSRF-Token": csrf } : {})
        },
        credentials: "include",
        cache: "no-store"
      });
      if (res.ok) {
        window.location.href = "/schedule";
        return;
      }
      const payload = await res.json().catch(() => ({}));
      setError(payload?.detail || "Login failed. Check credentials.");
    } catch {
      setError("Login failed. Check credentials.");
    }
  };

  return (
    <AppShell>
      <div className="auth-layout">
        <section className="auth-hero">
          <div className="auth-badge">Secure Access</div>
          <h1 className="auth-title">Logistics Planner</h1>
          <p className="auth-subtitle">
            Plan routes, balance schedules, and stay ahead of every delivery with a single control
            center.
          </p>
          <ul className="auth-list">
            <li>Live schedule visibility for dispatch and admin teams</li>
            <li>Route optimization views across planners and managers</li>
            <li>Centralized status tracking for every delivery</li>
          </ul>
          <div className="auth-cta">
            <span className="auth-cta-label">Need access?</span>
            <a className="auth-cta-link" href="/auth/request-access">
              Request an account
            </a>
          </div>
        </section>

        <section className="auth-card card">
          <CardHeader>
            <div>
              <CardTitle>Sign in</CardTitle>
              <div className="card-subtitle">Welcome back. Enter your details to continue.</div>
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
                Request access
              </a>
            </div>
          </form>
        </section>
      </div>
    </AppShell>
  );
}
