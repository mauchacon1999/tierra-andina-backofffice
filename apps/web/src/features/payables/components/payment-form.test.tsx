import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getDailyRates } from "@/features/exchange-rates/api/exchange-rates-requests";
import { recordPayment } from "@/features/payables/api/payable-requests";
import { PaymentForm } from "@/features/payables/components/payment-form";
import { getSupplier } from "@/features/suppliers/api/supplier-requests";
import { BAKERY_DETAIL, BREAD_INVOICE } from "@/testing/payable-fixtures";
import { SwrTestWrapper } from "@/testing/swr-wrapper";

vi.mock("@/features/exchange-rates/api/exchange-rates-requests", () => ({
  getDailyRates: vi.fn(),
}));
vi.mock("@/features/payables/api/payable-requests", () => ({ recordPayment: vi.fn() }));
vi.mock("@/features/suppliers/api/supplier-requests", () => ({ getSupplier: vi.fn() }));

const rates = (bcv: string | null) => ({
  businessDate: "2026-10-18",
  bcv,
  market: null,
  sale: null,
});

describe("PaymentForm", () => {
  beforeEach(() => {
    vi.mocked(getDailyRates).mockResolvedValue(rates("201.5550"));
    vi.mocked(getSupplier).mockResolvedValue(BAKERY_DETAIL);
    vi.mocked(recordPayment).mockReset();
  });

  it("suggests the day's BCV rate; paying everything in Bs settles the invoice", async () => {
    vi.mocked(recordPayment).mockResolvedValue(BREAD_INVOICE);
    const onDone = vi.fn();
    render(<PaymentForm payable={BREAD_INVOICE} onDone={onDone} />, { wrapper: SwrTestWrapper });

    const rate = (await screen.findByLabelText(/^Tasa BCV/)) as HTMLInputElement;
    await waitFor(() => expect(rate.value).toBe("201.555"));
    fireEvent.click(screen.getByRole("button", { name: "Pagar todo (4.031,10 Bs)" }));
    expect(await screen.findByText("Con esto la factura queda pagada")).toBeDefined();
    fireEvent.change(screen.getByLabelText(/^Cuenta destino/), {
      target: { value: BAKERY_DETAIL.accounts[0]!.id },
    });
    fireEvent.change(screen.getByLabelText(/^Referencia/), { target: { value: "001234" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar abono" }));

    await waitFor(() =>
      expect(recordPayment).toHaveBeenCalledWith(
        BREAD_INVOICE.id,
        expect.objectContaining({
          method: "mobile_payment",
          amount: "4031.1",
          rate: "201.555",
          reference: "001234",
          accountId: BAKERY_DETAIL.accounts[0]!.id,
        }),
      ),
    );
    expect(onDone).toHaveBeenCalled();
  });

  it("divisa pays in dollars: a part shows what it takes off", async () => {
    render(<PaymentForm payable={BREAD_INVOICE} onDone={vi.fn()} />, { wrapper: SwrTestWrapper });

    fireEvent.change(await screen.findByLabelText(/^Cómo se pagó/), {
      target: { value: "cash_usd" },
    });
    fireEvent.change(screen.getByLabelText(/^Monto/), { target: { value: "5" } });

    expect(await screen.findByText("Descuenta 5,00 $ del saldo")).toBeDefined();
    expect(screen.getByRole("button", { name: "Pagar todo (20,00 $)" })).toBeDefined();
  });

  it("asks to type the rate when the day has none", async () => {
    vi.mocked(getDailyRates).mockResolvedValue(rates(null));
    render(<PaymentForm payable={BREAD_INVOICE} onDone={vi.fn()} />, { wrapper: SwrTestWrapper });

    expect(
      await screen.findByText("No hay tasa BCV registrada para ese día: escríbela"),
    ).toBeDefined();
  });

  it("shows the API's answer on the amount (more than the balance)", async () => {
    const { ApiError } = await import("@/lib/api");
    vi.mocked(recordPayment).mockRejectedValue(
      new ApiError({
        status: 422,
        code: "PAYMENT_EXCEEDS_BALANCE",
        message: "El abono es mayor que el saldo (4031.10 Bs)",
        details: { fieldErrors: { amount: ["El saldo es 4031.10 Bs"] } },
      }),
    );
    render(<PaymentForm payable={BREAD_INVOICE} onDone={vi.fn()} />, { wrapper: SwrTestWrapper });
    const rate = (await screen.findByLabelText(/^Tasa BCV/)) as HTMLInputElement;
    await waitFor(() => expect(rate.value).toBe("201.555"));

    fireEvent.change(screen.getByLabelText(/^Monto/), { target: { value: "4031.10" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar abono" }));

    expect(await screen.findByText("El saldo es 4031.10 Bs")).toBeDefined();
  });
});

describe("PaymentForm (Marcar como pagada)", () => {
  beforeEach(() => {
    vi.mocked(getDailyRates).mockResolvedValue(rates("201.5550"));
    vi.mocked(getSupplier).mockResolvedValue(BAKERY_DETAIL);
    vi.mocked(recordPayment).mockReset();
  });

  it("pays the whole balance in the method's currency without typing the amount", async () => {
    vi.mocked(recordPayment).mockResolvedValue({ ...BREAD_INVOICE, status: "paid" });
    const onDone = vi.fn();
    render(<PaymentForm payable={BREAD_INVOICE} onDone={onDone} settle />, {
      wrapper: SwrTestWrapper,
    });

    expect(
      await screen.findByText("Se registra un abono por todo el saldo: 4.031,10 Bs"),
    ).toBeDefined();
    expect(screen.queryByLabelText(/^Monto/)).toBeNull();
    fireEvent.change(screen.getByLabelText(/^Cómo se pagó/), { target: { value: "cash_usd" } });
    expect(
      await screen.findByText("Se registra un abono por todo el saldo: 20,00 $"),
    ).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Marcar como pagada" }));

    await waitFor(() =>
      expect(recordPayment).toHaveBeenCalledWith(
        BREAD_INVOICE.id,
        expect.objectContaining({ method: "cash_usd", amount: "20", rate: "201.555" }),
      ),
    );
    expect(onDone).toHaveBeenCalled();
  });

  it("the button shows it is saving until the payment is recorded", async () => {
    let finish: (value: typeof BREAD_INVOICE) => void = () => undefined;
    vi.mocked(recordPayment).mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    render(<PaymentForm payable={BREAD_INVOICE} onDone={vi.fn()} settle />, {
      wrapper: SwrTestWrapper,
    });
    await screen.findByText("Se registra un abono por todo el saldo: 4.031,10 Bs");

    fireEvent.click(screen.getByRole("button", { name: "Marcar como pagada" }));

    const busy = await screen.findByRole("button", { name: "Guardando…" });
    expect(busy.getAttribute("aria-busy")).toBe("true");
    finish(BREAD_INVOICE);
    await waitFor(() => expect(screen.queryByRole("button", { name: "Guardando…" })).toBeNull());
  });
});
