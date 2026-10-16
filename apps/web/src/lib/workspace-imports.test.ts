import { expect, test } from "bun:test";

import { sumar } from "@ta/core";
import { montoSchema } from "@ta/validators";

// Garantiza que la web resuelve los paquetes compartidos del workspace.
test("la web importa @ta/core y @ta/validators", () => {
  expect(sumar("0.1", "0.2")).toBe("0.3");
  expect(montoSchema.safeParse("-1").success).toBe(false);
});
