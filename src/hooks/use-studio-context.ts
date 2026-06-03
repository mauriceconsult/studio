// lib/hooks/useStudioContext.ts

import { useEffect, useState } from "react";

export function useStudioContext() {
  const [data, setData] = useState({
    hasData: false,
    connectedApps: [],
    dataScore: 0,
    loading: true,
  });

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_ZURIA_API_URL}/api/studio/context/summary`)
      .then((res) => res.json())
      .then((res) =>
        setData({
          ...res,
          loading: false,
        }),
      )
      .catch(() => setData((prev) => ({ ...prev, loading: false })));
  }, []);

  return data;
}
