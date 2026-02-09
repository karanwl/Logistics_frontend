"use client";

import AppShell from "@/components/layout/AppShell";
import SiteHeader from "@/components/layout/SiteHeader";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { getCookie } from "@/lib/api/client";

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
    const csrf = getCookie("csrf_token");
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
        cache: "no-store",
        redirect: "manual"
      });
      if (res.status >= 200 && res.status < 400) {
        window.location.href = "/schedule";
        return;
      }
      setError("Login failed. Check credentials.");
    } catch {
      setError("Login failed. Check credentials.");
    }
  };

  return (
    <AppShell
      header={
        <SiteHeader
          title="Logistics"
          subtitle="Sign In"
          links={[
            { href: "/planner", label: "Planner" },
            { href: "/auth/request-access", label: "Create Account" }
          ]}
        />
      }
    >
      <div className="max-w-lg">
        <div className="card">
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
          </CardHeader>
          <form className="space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
            <Input placeholder="Email" type="email" {...form.register("email")} />
            <Input placeholder="Password" type="password" {...form.register("password")} />
            {error && <div className="text-sm text-red-600">{error}</div>}
            <div className="page-actions">
              <Button type="submit">Sign In</Button>
              <a className="text-xs text-steel-500" href="/auth/request-access">Request access</a>
            </div>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
