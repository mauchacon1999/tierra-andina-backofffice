import { describe, expect, test } from "bun:test";

import { AppError, ERROR_STATUS, ErrorCode } from "@/lib/errors";

describe("AppError.httpStatus", () => {
  test("comes from the code table, so services never pass HTTP statuses", () => {
    expect(new AppError(ErrorCode.PRODUCT_NAME_TAKEN, "x").httpStatus).toBe(409);
    expect(new AppError(ErrorCode.INVALID_UNIT_COMBINATION, "x").httpStatus).toBe(422);
    expect(new AppError(ErrorCode.PRODUCT_NOT_FOUND, "x").httpStatus).toBe(404);
  });

  test("an explicit status wins", () => {
    expect(new AppError(ErrorCode.NOT_FOUND, "x", 410).httpStatus).toBe(410);
  });

  test("unknown codes default to 400", () => {
    expect(new AppError("SOMETHING_ELSE", "x").httpStatus).toBe(400);
  });

  test("every code has a status", () => {
    for (const code of Object.values(ErrorCode)) expect(ERROR_STATUS[code]).toBeNumber();
  });
});
