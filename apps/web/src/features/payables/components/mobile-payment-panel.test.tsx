import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getMobilePaymentData } from "@/features/payables/api/payable-requests";
import { MobilePaymentPanel } from "@/features/payables/components/mobile-payment-panel";
import { ApiError } from "@/lib/api";
import { BREAD_INVOICE, MOBILE_PAYMENT } from "@/testing/payable-fixtures";
import { SwrTestWrapper } from "@/testing/swr-wrapper";

vi.mock("@/features/payables/api/payable-requests", () => ({ getMobilePaymentData: vi.fn() }));

const writeText = vi.fn<(text: string) => Promise<void>>();

describe("MobilePaymentPanel", () => {
  beforeEach(() => {
    writeText.mockReset();
    writeText.mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
  });

  const renderPanel = () =>
    render(
      <MobilePaymentPanel payableId={BREAD_INVOICE.id} supplierId={BREAD_INVOICE.supplierId} />,
      {
        wrapper: SwrTestWrapper,
      },
    );

  it("shows today's amount with the BCV rate used and copies the bank's text", async () => {
    vi.mocked(getMobilePaymentData).mockResolvedValue(MOBILE_PAYMENT);
    renderPanel();

    expect(await screen.findByText("4.031,10 Bs")).toBeDefined();
    expect(screen.getByText("Saldo 20,00 $ a la tasa BCV de hoy (201,56)")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Copiar para pago móvil" }));

    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith("0102\n04141234567\nV12345678\n4031,10"),
    );
    expect(await screen.findByText("Copiado")).toBeDefined();
  });

  it("copies one value at a time for banks without «Pegar datos»", async () => {
    vi.mocked(getMobilePaymentData).mockResolvedValue(MOBILE_PAYMENT);
    renderPanel();

    fireEvent.click(await screen.findByRole("button", { name: "Copiar Teléfono" }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith("04141234567"));
  });

  it("asks for today's BCV rate when it is missing", async () => {
    vi.mocked(getMobilePaymentData).mockRejectedValue(
      new ApiError({
        status: 422,
        code: "BCV_RATE_MISSING",
        message: "Registra la tasa BCV de hoy",
      }),
    );
    renderPanel();

    expect(await screen.findByRole("link", { name: "Ir a Tasas del día" })).toBeDefined();
  });

  it("says when copying fails", async () => {
    vi.mocked(getMobilePaymentData).mockResolvedValue(MOBILE_PAYMENT);
    writeText.mockRejectedValue(new Error("denied"));
    renderPanel();

    fireEvent.click(await screen.findByRole("button", { name: "Copiar para pago móvil" }));

    expect(await screen.findByText("No se pudo copiar")).toBeDefined();
  });
});
