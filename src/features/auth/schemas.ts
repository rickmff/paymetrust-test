import { z } from "zod";

type Resource = "transaction" | "payout";
type Action = "read" | "create" | "approve";

/**
 * Template literal type: every valid "resource:action" pair, and nothing else.
 * `can("payout:aprove")` is a compile error, not a button that silently never shows.
 */
export type Permission = `${Resource}:${Action}`;

export const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.email(),
  role: z.string(),
  // Plain strings on purpose: if the backend ships a permission this build
  // doesn't know yet, login must keep working. Strictness lives in `can()`.
  permissions: z.array(z.string()),
});
export type User = z.infer<typeof UserSchema>;

export const CredentialsSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});
export type Credentials = z.infer<typeof CredentialsSchema>;
