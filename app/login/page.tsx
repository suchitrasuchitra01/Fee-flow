"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Brand from "@/components/Brand";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }
    const { data } = await supabase.from("profiles").select("role").single();
    router.replace(data?.role === "admin" ? "/admin" : "/student");
    router.refresh();
  }

  return (
    <main className="auth-page">
      <section className="auth-intro">
        <Brand />
        <div className="intro-content">
          <p className="eyebrow">STUDENT FINANCE, SIMPLIFIED</p>
          <h1>Fees, made<br />clear.</h1>
          <p>View fee details, track payments, and settle your balance in one secure place.</p>
        </div>
        <p className="auth-footnote">A simple portal for students and administrators.</p>
      </section>
      <section className="login-panel">
        <form className="login-card" onSubmit={handleLogin}>
          <div className="mobile-brand"><Brand /></div>
          <p className="eyebrow">WELCOME BACK</p>
          <h2>Sign in to your account</h2>
          <p className="muted">Use the credentials provided by your institution.</p>
          <label>Email address<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></label>
          <label>Password<input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" /></label>
          {error && <p className="form-error">{error}</p>}
          <button className="primary-button" disabled={loading}>{loading ? "Signing in..." : "Sign in"}</button>
          <p className="help-text">Need access? Contact your fee administration office.</p>
        </form>
      </section>
    </main>
  );
}
