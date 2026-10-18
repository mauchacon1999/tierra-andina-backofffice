import type { PayableDetail } from "@ta/validators";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getMobilePaymentData,
  getPayable,
  listPayables,
  voidPayable,
} from "@/features/payables/api/payable-requests";
import { PayableDetailScreen } from "@/features/payables/components/payable-detail-screen";
import { PayablesScreen } from "@/features/payables/components/payables-screen";
import { setDesktop } from "@/testing/media";
import { BREAD_INVOICE, MOBILE_PAYMENT } from "@/testing/payable-fixtures";
import { SwrTestWrapper } from "@/testing/swr-wrapper";

vi.mock("@/features/payables/api/payable-requests", () => ({
  listPayables: vi.fn(),
  getPayable: vi.fn(),
  getMobilePaymentData: vi.fn(),
  voidPayable: vi.fn(),
  recordPayment: vi.fn(),
  deletePayment: vi.fn(),
  setPayableTerms: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useParams: () => ({ id: BREAD_INVOICE.id }),
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/payables",
}));

const {
  lines: _lines,
  payments: _payments,
  note: _note,
  voidedAt: _voided,
  ...SUMMARY
} = BREAD_INVOICE;

describe("PayablesScreen", () => {
  beforeEach(() => {
    setDesktop(true);
    vi.mocked(listPayables).mockResolvedValue({
      data: [SUMMARY],
      total: 1,
      page: 1,
      pageSize: 20,
      balance: { USD: "20.0000", VES: "1500.0000" },
    });
  });

  it("lists the invoices with their balance and status, and what is still owed", async () => {
    render(<PayablesScreen />, { wrapper: SwrTestWrapper });

    const table = await screen.findByRole("table", { name: "Facturas por pagar" });
    const [, row] = within(table).getAllByRole("row");
    expect(within(row!).getByText("CXP-000007")).toBeDefined();
    expect(within(row!).getByText("Parcial")).toBeDefined();
    expect(within(row!).getAllByText("20,00 $").length).toBeGreaterThan(0);
    expect(screen.getByText("1.500,00 Bs")).toBeDefined();
  });

  it("filters by status from the first page", async () => {
    render(<PayablesScreen />, { wrapper: SwrTestWrapper });
    await screen.findByRole("table", { name: "Facturas por pagar" });

    fireEvent.change(screen.getByLabelText("Estatus"), { target: { value: "overdue" } });

    await waitFor(() =>
      expect(listPayables).toHaveBeenLastCalledWith({ status: "overdue", page: 1, pageSize: 20 }),
    );
  });
});

describe("PayableDetailScreen", () => {
  beforeEach(() => {
    vi.mocked(getMobilePaymentData).mockResolvedValue(MOBILE_PAYMENT);
    vi.mocked(voidPayable).mockReset();
  });

  it("a supplies invoice without payments: pay, edit, void, and the pago móvil panel", async () => {
    vi.mocked(getPayable).mockResolvedValue(BREAD_INVOICE);
    vi.mocked(voidPayable).mockResolvedValue({ ...BREAD_INVOICE, status: "voided" });
    render(<PayableDetailScreen />, { wrapper: SwrTestWrapper });

    expect(await screen.findByRole("heading", { name: "CXP-000007" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Registrar abono" })).toBeDefined();
    expect(screen.getByRole("link", { name: "Editar" })).toBeDefined();
    expect(await screen.findByRole("button", { name: "Copiar para pago móvil" })).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Anular" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    await waitFor(() => expect(voidPayable).toHaveBeenCalledWith(BREAD_INVOICE.id));
  });

  it("merchandise from a purchase cannot be edited here", async () => {
    const merchandise: PayableDetail = {
      ...BREAD_INVOICE,
      tripId: "0199f000-0000-7000-8000-0000000000f1",
      lines: [
        {
          ...BREAD_INVOICE.lines[0]!,
          description: null,
          expenseCategoryId: null,
          expenseCategoryName: null,
          quantity: null,
          unit: null,
          unitPrice: null,
          purchaseLine: {
            id: "0199f000-0000-7000-8000-0000000000f2",
            productId: "0199f000-0000-7000-8000-0000000000f3",
            productName: "Cambur",
            purchaseUnit: "kg",
            packs: null,
            grossQuantity: "40.0000",
          },
        },
      ],
    };
    vi.mocked(getPayable).mockResolvedValue(merchandise);
    render(<PayableDetailScreen />, { wrapper: SwrTestWrapper });

    expect(await screen.findByText(/^Cambur ·/)).toBeDefined();
    expect(
      screen.getByText("Viene de una compra: para corregirla, corrige la compra."),
    ).toBeDefined();
    expect(screen.queryByRole("link", { name: "Editar" })).toBeNull();
  });

  it("a paid invoice takes no more payments and shows no pago móvil panel", async () => {
    vi.mocked(getPayable).mockResolvedValue({
      ...BREAD_INVOICE,
      status: "paid",
      balance: "0.0000",
    });
    render(<PayableDetailScreen />, { wrapper: SwrTestWrapper });

    expect(await screen.findByText("Pagada")).toBeDefined();
    expect(screen.queryByRole("button", { name: "Registrar abono" })).toBeNull();
    expect(getMobilePaymentData).not.toHaveBeenCalled();
  });
});
