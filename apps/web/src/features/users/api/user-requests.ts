import {
  staffUserListSchema,
  staffUserSchema,
  type CreateStaffUser,
  type StaffUser,
  type UpdateStaffUser,
} from "@ta/validators";

import { api } from "@/lib/api";

export async function listUsers(): Promise<StaffUser[]> {
  const { data } = await api.get("/api/v1/users", { schema: staffUserListSchema });
  return data;
}

export function createUser(input: CreateStaffUser): Promise<StaffUser> {
  return api.post("/api/v1/users", input, { schema: staffUserSchema });
}

export function updateUser(id: string, patch: UpdateStaffUser): Promise<StaffUser> {
  return api.patch(`/api/v1/users/${id}`, patch, { schema: staffUserSchema });
}

/** 204 without a body: the owner set a new password and the user was signed out. */
export async function setUserPassword(id: string, password: string): Promise<void> {
  await api.post(`/api/v1/users/${id}/password`, { password });
}
