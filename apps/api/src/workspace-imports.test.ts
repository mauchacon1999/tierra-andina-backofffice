import { expect, test } from "bun:test";

import { sum } from "@ta/core";
import { amountSchema } from "@ta/validators";

// Guards that the API resolves the shared workspace packages.
test("the API imports @ta/core and @ta/validators", () => {
  expect(sum("0.1", "0.2")).toBe("0.3");
  expect(amountSchema.parse("10.25")).toBe("10.25");
});
