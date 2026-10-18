import { describe, expect, test } from "bun:test";

import { InvalidValueError } from "./errors";
import {
  bankName,
  formatMobilePaymentAmount,
  formatPagoMovilClipboard,
  isValidBankCode,
  isValidIdDocument,
  isValidMobilePhone,
  normalizeIdDocument,
  normalizeMobilePhone,
  VE_BANKS,
} from "./mobile-payment";

describe("banks", () => {
  test("knows the official codes and their names", () => {
    expect(isValidBankCode("0102")).toBe(true);
    expect(bankName("0102")).toBe("Banco de Venezuela");
    expect(bankName("0134")).toBe("Banesco");
  });

  test("rejects unknown codes", () => {
    expect(isValidBankCode("0999")).toBe(false);
    expect(isValidBankCode("102")).toBe(false);
    expect(bankName("0999")).toBeNull();
  });

  test("every code has 4 digits and appears once", () => {
    const codes = VE_BANKS.map((b) => b.code);
    expect(codes.every((c) => /^\d{4}$/.test(c))).toBe(true);
    expect(new Set(codes).size).toBe(codes.length);
  });
});

describe("normalizeMobilePhone", () => {
  test.each([
    ["04141234567", "04141234567"],
    ["0414-123.45.67", "04141234567"],
    ["(0414) 123 4567", "04141234567"],
    ["+58 414 1234567", "04141234567"],
    ["584141234567", "04141234567"],
  ])("%s → %s", (input, expected) => {
    expect(normalizeMobilePhone(input)).toBe(expected);
  });
});

describe("isValidMobilePhone", () => {
  test.each([
    "04121234567",
    "04141234567",
    "04161234567",
    "04221234567",
    "04241234567",
    "04261234567",
  ])("accepts %s", (phone) => {
    expect(isValidMobilePhone(phone)).toBe(true);
  });

  test.each([
    ["a landline", "02121234567"],
    ["10 digits", "0414123456"],
    ["12 digits", "041412345678"],
    ["separators (not normalized)", "0414-1234567"],
  ])("rejects %s", (_case, phone) => {
    expect(isValidMobilePhone(phone)).toBe(false);
  });
});

describe("normalizeIdDocument / isValidIdDocument", () => {
  test("removes dots, dashes and spaces and uppercases the letter", () => {
    expect(normalizeIdDocument("v-12.345.678")).toBe("V12345678");
    expect(normalizeIdDocument("J-40123456-7")).toBe("J401234567");
    expect(normalizeIdDocument(" E 8.123.456 ")).toBe("E8123456");
  });

  test.each(["V12345678", "E81234567", "J401234567", "G200000001", "P123456"])(
    "accepts %s",
    (value) => {
      expect(isValidIdDocument(value)).toBe(true);
    },
  );

  test.each([
    ["no letter", "12345678"],
    ["an unknown letter", "X12345678"],
    ["dots (not normalized)", "V12.345.678"],
    ["too few digits", "V1234"],
    ["too many digits", "V1234567890"],
  ])("rejects %s", (_case, value) => {
    expect(isValidIdDocument(value)).toBe(false);
  });
});

describe("formatMobilePaymentAmount", () => {
  test("comma decimal, 2 decimals, no thousands separator", () => {
    expect(formatMobilePaymentAmount("1234.56")).toBe("1234,56");
    expect(formatMobilePaymentAmount("1500")).toBe("1500,00");
    expect(formatMobilePaymentAmount("1234567.8")).toBe("1234567,80");
  });

  test("rounds half-up to 2 decimals", () => {
    expect(formatMobilePaymentAmount("1234.555")).toBe("1234,56");
    expect(formatMobilePaymentAmount("1234.5549")).toBe("1234,55");
  });

  test("rejects 0, negatives and text", () => {
    expect(() => formatMobilePaymentAmount("0")).toThrow(InvalidValueError);
    expect(() => formatMobilePaymentAmount("0.004")).toThrow(InvalidValueError);
    expect(() => formatMobilePaymentAmount("-5")).toThrow(InvalidValueError);
    expect(() => formatMobilePaymentAmount("abc")).toThrow(TypeError);
  });
});

describe("formatPagoMovilClipboard", () => {
  test("bank code, phone, cédula and amount, one per line with no labels", () => {
    expect(
      formatPagoMovilClipboard({
        bankCode: "0102",
        phone: "04141234567",
        idDocument: "V12345678",
        amountBs: "1234.56",
      }),
    ).toBe("0102\n04141234567\nV12345678\n1234,56");
  });

  test("normalizes the phone and the cédula as typed", () => {
    expect(
      formatPagoMovilClipboard({
        bankCode: "0134",
        phone: "0424-555.12.34",
        idDocument: "v-8.765.432",
        amountBs: "20155.5",
      }),
    ).toBe("0134\n04245551234\nV8765432\n20155,50");
  });

  test.each([
    ["an unknown bank", { bankCode: "0999" }],
    ["a landline", { phone: "02121234567" }],
    ["a cédula without letter", { idDocument: "12345678" }],
    ["nothing to pay", { amountBs: "0" }],
  ])("rejects %s", (_case, override) => {
    const input = {
      bankCode: "0102",
      phone: "04141234567",
      idDocument: "V12345678",
      amountBs: "10",
      ...override,
    };
    expect(() => formatPagoMovilClipboard(input)).toThrow(InvalidValueError);
  });
});
