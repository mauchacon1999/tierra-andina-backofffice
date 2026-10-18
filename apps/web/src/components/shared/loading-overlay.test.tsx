import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LoadingOverlay } from "@/components/shared/loading-overlay";
import { IntlTestWrapper } from "@/testing/intl-wrapper";

describe("LoadingOverlay", () => {
  it("covers the page with the isotype and the loading status", () => {
    render(<LoadingOverlay />, { wrapper: IntlTestWrapper });

    const status = screen.getByRole("status");
    expect(status.textContent).toContain("Cargando…");
    expect(status.className).toContain("fixed");
    expect(status.className).toContain("inset-0");
    expect(status.querySelector("img")?.getAttribute("src")).toBe("/brand/isotype.png");
  });
});
