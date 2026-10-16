import type { ReactNode } from "react";
import { SWRConfig } from "swr";

import { swrConfig } from "@/lib/swr-config";

/** Test wrapper: the app's SWR config with a fresh cache per test and no deduping. */
export function SwrTestWrapper({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <SWRConfig value={{ ...swrConfig, provider: () => new Map(), dedupingInterval: 0 }}>
      {children}
    </SWRConfig>
  );
}
