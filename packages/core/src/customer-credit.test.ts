import { describe, expect, test } from "bun:test";

import { customerCreditBalance } from "./customer-credit";
import { InvalidValueError } from "./errors";

describe("customerCreditBalance", () => {
  test("credits minus payments, per currency", () => {
    expect(
      customerCreditBalance([
        { kind: "credit", amount: "1200", currency: "VES" },
        { kind: "credit", amount: "300", currency: "VES" },
        { kind: "payment", amount: "500", currency: "VES" },
        { kind: "credit", amount: "5", currency: "USD" },
      ]),
    ).toEqual({ VES: "1000.0000", USD: "5.0000" });
  });

  test("a payment in the other currency does not touch the first balance: it is in favor", () => {
    expect(
      customerCreditBalance([
        { kind: "credit", amount: "1200", currency: "VES" },
        { kind: "payment", amount: "3", currency: "USD" },
      ]),
    ).toEqual({ VES: "1200.0000", USD: "-3.0000" });
  });

  test("nothing owed without entries", () => {
    expect(customerCreditBalance([])).toEqual({ VES: "0.0000", USD: "0.0000" });
  });

  test("rejects a negative amount", () => {
    expect(() =>
      customerCreditBalance([{ kind: "credit", amount: "-1", currency: "VES" }]),
    ).toThrow(InvalidValueError);
  });
});
