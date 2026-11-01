"use client";
import { useEffect, useState } from "react";
import { api, message, ApiClientError } from "./api";
export function useResource<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null),
    [loading, setLoading] = useState(Boolean(path)),
    [error, setError] = useState(""),
    [status, setStatus] = useState(0),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!path) {
      setData(null);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setData(null);
    setLoading(true);
    setError("");
    setStatus(0);
    api<T>(path, { signal: controller.signal })
      .then((value) => {
        if (!controller.signal.aborted) {
          setData(value);
          setLoading(false);
        }
      })
      .catch((reason) => {
        if (!controller.signal.aborted) {
          setError(message(reason));
          setStatus(reason instanceof ApiClientError ? reason.status : 0);
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [path, revision]);
  return {
    data,
    loading,
    error,
    status,
    refresh: () => setRevision((n) => n + 1),
  };
}
