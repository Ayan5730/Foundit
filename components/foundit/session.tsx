"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Bootstrap } from "@/shared/api";
import { api, message } from "@/lib/client/api";
type Session = {
  data: Bootstrap | null;
  loading: boolean;
  error: string;
  refresh: () => void;
  signInHref: string;
  signOutHref: string;
};
const SessionContext = createContext<Session | null>(null);
export function SessionProvider({
  children,
  signInHref,
  signOutHref,
}: {
  children: ReactNode;
  signInHref: string;
  signOutHref: string;
}) {
  const [data, setData] = useState<Bootstrap | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    api<Bootstrap>("/bootstrap", { signal: controller.signal })
      .then((value) => {
        if (!controller.signal.aborted) {
          setData(value);
          setLoading(false);
        }
      })
      .catch((reason) => {
        if (!controller.signal.aborted) {
          setError(message(reason));
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [revision]);
  return (
    <SessionContext.Provider
      value={{
        data,
        loading,
        error,
        refresh: () => setRevision((n) => n + 1),
        signInHref,
        signOutHref,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}
export function useSession() {
  const session = useContext(SessionContext);
  if (!session) throw new Error("Session provider required.");
  return session;
}
export function AccountControls() {
  const { data, loading, signInHref, signOutHref } = useSession();
  if (loading) return <span className="account-label">Checking sign-in…</span>;
  if (!data?.user)
    return (
      <a href={signInHref} target="_top" className="account-link">
        Sign in
      </a>
    );
  return (
    <>
      <a href="/workspace">My reports</a>
      {data.capabilities.can_review ? <a href="/staff">Staff desk</a> : null}
      <a href={signOutHref} target="_top" className="account-link">
        Sign out
      </a>
    </>
  );
}
export function RequireSession({
  children,
  staff = false,
}: {
  children: ReactNode;
  staff?: boolean;
}) {
  const { data, loading, error, refresh, signInHref } = useSession();
  if (loading)
    return (
      <div className="service-state" role="status">
        Checking your account…
      </div>
    );
  if (error)
    return (
      <div className="service-state" role="alert">
        <h2>We couldn’t check your account.</h2>
        <p>{error}</p>
        <button className="button button-primary" onClick={refresh}>
          Try again
        </button>
      </div>
    );
  if (!data?.user)
    return (
      <div className="service-state">
        <h2>Sign in to continue.</h2>
        <p>
          Your reports and private recovery requests are linked to your account.
        </p>
        {!staff ? (
          <p>
            If the missing item was your sign-in device, use another device you
            can safely sign in on. If that is not possible, visit the help desk;
            online claims still require sign-in.
          </p>
        ) : null}
        <a className="button button-primary" href={signInHref} target="_top">
          Sign in with ChatGPT
        </a>
      </div>
    );
  if (staff && !data.capabilities.can_review)
    return (
      <div className="service-state">
        <h2>Staff access is required.</h2>
        <p>
          Your account can submit reports and claims. An authorized help-desk
          reviewer handles verification.
        </p>
        <a href="/workspace" className="text-action">
          Back to my reports
        </a>
      </div>
    );
  return children;
}
