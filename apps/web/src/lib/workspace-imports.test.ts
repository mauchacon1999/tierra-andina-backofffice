import { expect, it } from "vitest";

import { sum } from "@ta/core";
import { amountSchema } from "@ta/validators";

// Guards that the web resolves the shared workspace packages.
it("imports @ta/core and @ta/validators", () => {
  expect(sum("0.1", "0.2")).toBe("0.3");
  expect(amountSchema.safeParse("-1").success).toBe(false);
});
