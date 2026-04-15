import type { EntityVisibility } from "./world.js";

export type AuthRole = "owner" | "collaborator";

export type AuthAccountSummary = {
  id: string;
  email: string;
  displayName: string;
  role: AuthRole;
  createdAt: string;
};

export type AuthSessionPayload = {
  viewer: AuthAccountSummary;
  visibilityOptions: EntityVisibility[];
  canManageAccounts: boolean;
};

export type AuthLoginRequest = {
  email: string;
  password: string;
};

export type AuthAccountProvisionRequest = {
  email: string;
  displayName: string;
  password: string;
  role?: Exclude<AuthRole, "owner">;
};
