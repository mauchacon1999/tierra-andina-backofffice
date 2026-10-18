import { describe, expect, test } from "bun:test";

import { readOfficialBcvRate } from "./official-bcv";

const PAGE = `
<div id="dolar"><strong>881,06640000</strong></div>
Fecha Valor: <span content="2026-10-19T00:00:00-04:00">Lunes, 19 Octubre 2026</span>
`;

const htmlResponse = (body: string, status = 200): Response =>
  new Response(body, { status, headers: { "Content-Type": "text/html" } });

describe("readOfficialBcvRate", () => {
  test("returns the USD rate and the fecha valor from the BCV homepage", async () => {
    const rate = await readOfficialBcvRate(
      async () => htmlResponse(PAGE),
      "https://www.bcv.org.ve/",
    );

    expect(rate).toEqual({ usd: "881.0664", effectiveDate: "2026-10-19" });
  });

  test("a network failure or a page without the dollar rate is unavailable", async () => {
    await expect(
      readOfficialBcvRate(async () => {
        throw new Error("offline");
      }),
    ).rejects.toMatchObject({
      code: "OFFICIAL_RATE_UNAVAILABLE",
    });
    await expect(readOfficialBcvRate(async () => htmlResponse("", 404))).rejects.toMatchObject({
      code: "OFFICIAL_RATE_UNAVAILABLE",
    });
    await expect(
      readOfficialBcvRate(async () => htmlResponse("<html></html>")),
    ).rejects.toMatchObject({
      code: "OFFICIAL_RATE_UNAVAILABLE",
    });
  });
});
