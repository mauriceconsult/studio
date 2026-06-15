"use client";

import { useEffect, useState } from "react";

export type EcosystemApp = "instaskul" | "vendly" | "dukaboda" | "blog";

interface StudioContextState {
  hasData: boolean;
  connectedApps: EcosystemApp[];
  dataScore: number;
  loading: boolean;
}

const DEFAULT_STATE: StudioContextState = {
  hasData: false,
  connectedApps: [],
  dataScore: 0,
  loading: true,
};

export function useStudioContext(): StudioContextState {
  const [state, setState] = useState<StudioContextState>(DEFAULT_STATE);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_ZURIA_API_URL}/api/studio/context/summary`)
      .then((res) => {
        if (!res.ok) throw new Error(`Context fetch failed: ${res.status}`);
        return res.json();
      })
      .then((res: Omit<StudioContextState, "loading">) =>
        setState({ ...res, loading: false }),
      )
      .catch(() => setState((prev) => ({ ...prev, loading: false })));
  }, []);

  return state;
}
