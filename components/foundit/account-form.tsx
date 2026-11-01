"use client";
import { useEffect, useState, type FormEvent } from "react";
import type { AuthProvider, Settings } from "@netlify/identity";

export type AccountMode = "login" | "signup" | "signout" | "recovery" | "password";
export function AccountForm({ initialMode = "login" }: { initialMode?: AccountMode }) {
  const [mode, setMode] = useState<AccountMode>(initialMode);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [email, setEmail] = useState(""), [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [notice, setNotice] = useState("");
  useEffect(() => {
    let active = true;
    import("@netlify/identity").then(identity => identity.getSettings())
      .then(value => { if (active) setSettings(value); })
      .catch(() => { if (active) setError("Sign-in is currently unavailable. Please try again later or visit the help desk."); });
    return () => { active = false; };
  }, []);
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const identity = await import("@netlify/identity");
      if (mode === "signout") { await identity.logout(); window.location.assign("/"); return; }
      if (mode === "recovery") {
        await identity.requestPasswordRecovery(email.trim());
        setNotice("If this address has an account, check your inbox for a password reset link."); return;
      }
      if (mode === "password") {
        await identity.hydrateSession(); await identity.updateUser({ password });
      } else if (mode === "signup") {
        if (!settings || settings.disableSignup) throw new Error("Registration is unavailable.");
        await identity.signup(email.trim(), password);
        if (!settings.autoconfirm) { setPassword(""); setNotice("Check your inbox to confirm your email address, then sign in."); return; }
      } else await identity.login(email.trim(), password);
      window.location.assign("/workspace");
    } catch {
      setError(mode === "login" ? "Sign-in failed. Check your email and password, and confirm your email if you just registered."
        : "We could not complete that request. Please try again or visit the help desk.");
    } finally { setBusy(false); }
  }
  async function external(provider: AuthProvider) {
    setBusy(true); setError("");
    try { const identity = await import("@netlify/identity"); await identity.oauthLogin(provider); }
    catch { setError("This sign-in provider is currently unavailable."); setBusy(false); }
  }
  function change(next: AccountMode) { setMode(next); setPassword(""); setError(""); setNotice(""); }
  const titles = { login: "Welcome back", signup: "Create your account", signout: "Sign out of FoundIt", recovery: "Reset your password", password: "Choose a new password" };
  const buttons = { login: "Sign in", signup: "Create account", signout: "Sign out", recovery: "Send reset link", password: "Save password" };
  const providers = settings ? (Object.entries(settings.providers).filter(([name, enabled]) => enabled && name !== "email") as [AuthProvider, boolean][]) : [];
  const emailForm = settings?.providers.email && (mode !== "signup" || !settings.disableSignup);
  return <section className="account-card">
    <p className="eyebrow">Your FoundIt account</p><h1>{titles[mode]}</h1>
    <p>Your reports and private recovery requests stay connected to your account.</p>
    {!settings && !error ? <p role="status">Loading sign-in options…</p> : null}
    {error ? <p role="alert" className="field-error">{error}</p> : null}
    {notice ? <p role="status">{notice}</p> : null}
    {(emailForm || mode === "signout" || mode === "password") ? <form onSubmit={submit}>
      {mode !== "signout" && mode !== "password" ? <label htmlFor="account-email">Email address
        <input id="account-email" name="email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} disabled={busy} />
      </label> : null}
      {mode !== "signout" && mode !== "recovery" ? <label htmlFor="account-password">Password
        <input id="account-password" name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={mode === "login" ? 1 : 12} maxLength={256} value={password} onChange={event => setPassword(event.target.value)} disabled={busy} />
      </label> : null}
      {mode === "signup" || mode === "password" ? <p>Use at least 12 characters.</p> : null}
      <button type="submit" className="button button-primary" disabled={busy || !settings}>{busy ? "Please wait…" : buttons[mode]}</button>
    </form> : null}
    {mode === "login" || mode === "signup" ? providers.map(([provider]) => <button className="button button-secondary" key={provider} disabled={busy} onClick={() => external(provider)}>Continue with {provider}</button>) : null}
    <div className="account-actions">
      {mode === "login" && settings?.providers.email ? <>
        {!settings.disableSignup ? <button type="button" className="text-action" disabled={busy} onClick={() => change("signup")}>Create an account</button> : null}
        <button type="button" className="text-action" disabled={busy} onClick={() => change("recovery")}>Forgot password?</button>
      </> : null}
      {mode !== "login" ? <button type="button" className="text-action" disabled={busy} onClick={() => change("login")}>Back to sign in</button> : null}
      <a href="/">Back to FoundIt</a>
    </div>
  </section>;
}
