import { describe, expect, test } from "bun:test";

import { message } from "@ta/validators";

import { localizeDetails } from "@/lib/localize-details";

describe("localizeDetails", () => {
  test("formats the tokens of formErrors and fieldErrors in Spanish", () => {
    expect(
      localizeDetails({
        formErrors: [message("noChanges")],
        fieldErrors: {
          bcv: [message("decimal.positive", { subject: "rate" })],
          name: ["Ya existe un producto con ese nombre"],
        },
        missing: ["bcv"],
      }),
    ).toEqual({
      formErrors: ["No hay cambios que guardar"],
      fieldErrors: {
        bcv: ["La tasa debe ser mayor que 0"],
        name: ["Ya existe un producto con ese nombre"],
      },
      missing: ["bcv"],
    });
  });

  test.each([[undefined], [null], ["text"], [["a"]]])("leaves %p untouched", (details) => {
    expect(localizeDetails(details)).toEqual(details);
  });
});
