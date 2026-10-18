import { describe, expect, test } from "bun:test";

import { InvalidValueError } from "./errors";
import { parseBcvHomePage } from "./official-bcv";

/** The shape of the dollar block and the fecha valor on www.bcv.org.ve. */
const PAGE = `
<div id="dolar" class="col-sm-12 col-xs-12">
  <span> USD</span>
  <strong class="strong-tb">881,06640000</strong>
</div>
<div class="pull-right">
Fecha Valor: <span content="2026-10-19T00:00:00-04:00">Lunes, 19 Octubre  2026</span>
</div>
`;

describe("parseBcvHomePage", () => {
  test("reads the dollar block and the fecha valor from the BCV homepage", () => {
    expect(parseBcvHomePage(PAGE)).toEqual({
      usd: "881.0664",
      effectiveDate: "2026-10-19",
    });
  });

  test("rounds the published rate half-up to 4 places", () => {
    const page = PAGE.replace("881,06640000", "880,11595");
    expect(parseBcvHomePage(page)).toEqual({
      usd: "880.1160",
      effectiveDate: "2026-10-19",
    });
  });

  test("rejects a page without the dollar block, a zero rate or a date that is not a day", () => {
    expect(() => parseBcvHomePage("<html></html>")).toThrow(InvalidValueError);
    expect(() => parseBcvHomePage(PAGE.replace("881,06640000", "0"))).toThrow(InvalidValueError);
    expect(() => parseBcvHomePage(PAGE.replace("2026-10-19", "2026-02-30"))).toThrow(
      InvalidValueError,
    );
  });
});
