"use client";

import { useEffect, useState } from "react";
import { getTmdbConfiguration, tmdbClientGet } from "@/lib/tmdb-client";

export function useTmdbConfiguration() {
  const [state, setState] = useState({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    getTmdbConfiguration()
      .then((data) => {
        if (!cancelled) {
          setState({ data, loading: false, error: null });
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setState({ data: null, loading: false, error });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

export function useTmdbQuery(path, params = {}, options = {}) {
  const [state, setState] = useState({
    data: null,
    loading: options.enabled === false ? false : true,
    error: null,
  });

  const requestKey = JSON.stringify({
    path,
    params,
    enabled: options.enabled,
    ttl: options.ttl,
    forceFresh: options.forceFresh,
  });

  useEffect(() => {
    const request = JSON.parse(requestKey);

    if (request.enabled === false) {
      setState({ data: null, loading: false, error: null });
      return undefined;
    }

    let cancelled = false;
    setState((current) => ({ ...current, loading: true, error: null }));

    tmdbClientGet(request.path, request.params, {
      ttl: request.ttl,
      forceFresh: request.forceFresh,
    })
      .then((data) => {
        if (!cancelled) {
          setState({ data, loading: false, error: null });
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setState({ data: null, loading: false, error });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [requestKey]);

  return state;
}
