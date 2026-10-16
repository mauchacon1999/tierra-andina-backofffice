import { expect, test } from "bun:test";

import { sumar } from "@ta/core";
import { montoSchema } from "@ta/validators";

// Garantiza que la API resuelve los paquetes compartidos del workspace.
test("la API importa @ta/core y @ta/validators", () => {
  expect(sumar("0.1", "0.2")).toBe("0.3");
  expect(montoSchema.parse("10.25")).toBe("10.25");
});
