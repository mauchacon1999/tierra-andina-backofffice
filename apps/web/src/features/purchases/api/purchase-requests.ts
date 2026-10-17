import {
  supplierListSchema,
  supplierSchema,
  tripDetailSchema,
  tripListSchema,
  tripSchema,
  type CreateSupplier,
  type OpenTrip,
  type PurchaseLineFields,
  type Supplier,
  type Trip,
  type TripDetail,
  type TripList,
  type TripListQueryInput,
  type UpdatePurchaseLine,
} from "@ta/validators";

import { api } from "@/lib/api";

function query(params: TripListQueryInput): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

export function listTrips(params: TripListQueryInput): Promise<TripList> {
  return api.get(`/api/v1/purchase-trips${query(params)}`, { schema: tripListSchema });
}

export function getTrip(id: string): Promise<TripDetail> {
  return api.get(`/api/v1/purchase-trips/${id}`, { schema: tripDetailSchema });
}

export function openTrip(input: OpenTrip): Promise<Trip> {
  return api.post("/api/v1/purchase-trips", input, { schema: tripSchema });
}

export function closeTrip(id: string): Promise<TripDetail> {
  return api.post(`/api/v1/purchase-trips/${id}/close`, undefined, { schema: tripDetailSchema });
}

export function addLine(tripId: string, line: PurchaseLineFields): Promise<TripDetail> {
  return api.post(`/api/v1/purchase-trips/${tripId}/lines`, line, { schema: tripDetailSchema });
}

export function updateLine(
  tripId: string,
  lineId: string,
  patch: UpdatePurchaseLine,
): Promise<TripDetail> {
  return api.patch(`/api/v1/purchase-trips/${tripId}/lines/${lineId}`, patch, {
    schema: tripDetailSchema,
  });
}

export function deleteLine(tripId: string, lineId: string): Promise<TripDetail> {
  return api.delete(`/api/v1/purchase-trips/${tripId}/lines/${lineId}`, {
    schema: tripDetailSchema,
  });
}

export async function listSuppliers(): Promise<Supplier[]> {
  const { data } = await api.get("/api/v1/suppliers", { schema: supplierListSchema });
  return data;
}

export function createSupplier(input: CreateSupplier): Promise<Supplier> {
  return api.post("/api/v1/suppliers", input, { schema: supplierSchema });
}
