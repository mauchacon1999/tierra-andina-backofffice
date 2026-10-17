import type { ReactNode } from "react";
import { SWRConfig } from "swr";

import { swrConfig } from "@/lib/swr-config";
import { IntlTestWrapper } from "@/testing/intl-wrapper";

/** Test wrapper: the app's SWR config (fresh cache per test, no deduping) and the messages. */
export function SwrTestWrapper({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <IntlTestWrapper>
      <SWRConfig value={{ ...swrConfig, provider: () => new Map(), dedupingInterval: 0 }}>
        {children}
      </SWRConfig>
    </IntlTestWrapper>
  );
}
