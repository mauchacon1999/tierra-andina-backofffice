import { z } from "zod";

import { MEMBERSHIP_ROLES } from "./auth";
import { message } from "./messages";

/*
 * Users of the store (docs/plan.md phase 0): the owner creates the manager and the receiver,
 * changes their role, deactivates them and sets their password (only the owner manages
 * passwords — owner decision 2026-10-17; no emails).
 */

/** Roles the owner can give. Owners are not created from the app. */
export const STAFF_ROLES = ["manager", "receiver"] as const;
export const staffRoleSchema = z.enum(STAFF_ROLES, { error: message("user.roleRequired") });

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 72;

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN, message("user.passwordTooShort", { min: PASSWORD_MIN }))
  .max(PASSWORD_MAX, message("user.passwordTooLong", { max: PASSWORD_MAX }));

const userNameSchema = z
  .string()
  .transform((v) => v.trim().replace(/\s+/g, " "))
  .pipe(
    z
      .string()
      .min(1, { message: message("name.required"), abort: true })
      .min(2, message("name.tooShort", { min: 2 }))
      .max(60, message("name.tooLong", { max: 60 })),
  );

const emailSchema = z
  .string()
  .trim()
  .min(1, message("auth.emailRequired"))
  .pipe(z.email({ error: message("auth.emailInvalid") }))
  .transform((email) => email.toLowerCase());

/** POST /api/v1/users — a manager or receiver with the password the owner gives them. */
export const createStaffUserSchema = z.object({
  name: userNameSchema,
  email: emailSchema,
  password: passwordSchema,
  role: staffRoleSchema,
});

export type CreateStaffUserInput = z.input<typeof createStaffUserSchema>;
export type CreateStaffUser = z.output<typeof createStaffUserSchema>;

/** PATCH /api/v1/users/:id — name, role or access; at least one. */
export const updateStaffUserSchema = z
  .object({
    name: userNameSchema.optional(),
    role: staffRoleSchema.optional(),
    isActive: z.boolean().optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), {
    message: message("noChanges"),
  });

export type UpdateStaffUser = z.infer<typeof updateStaffUserSchema>;

/** POST /api/v1/users/:id/password — the owner sets a new password (the user is signed out). */
export const setUserPasswordSchema = z.object({ password: passwordSchema });
export type SetUserPassword = z.infer<typeof setUserPasswordSchema>;

/** Edit form (web): name and role (access has its own action). */
export const staffUserEditFormSchema = z.object({ name: userNameSchema, role: staffRoleSchema });
export type StaffUserEditFormValues = z.input<typeof staffUserEditFormSchema>;
export type StaffUserEdit = z.output<typeof staffUserEditFormSchema>;

export const staffUserSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.string(),
  role: z.enum(MEMBERSHIP_ROLES),
  isActive: z.boolean(),
  /** The signed-in owner: shown, but not editable from the list. */
  isSelf: z.boolean(),
  createdAt: z.iso.datetime({ offset: true }),
});

export type StaffUser = z.infer<typeof staffUserSchema>;
export const staffUserListSchema = z.object({ data: z.array(staffUserSchema) });
