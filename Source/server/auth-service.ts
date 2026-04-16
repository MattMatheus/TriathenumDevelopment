import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";

import type {
  AuthAccountProvisionRequest,
  AuthAccountSummary,
  AuthLoginRequest,
  AuthRole,
  AuthSessionPayload,
  EntityVisibility,
} from "../contracts/index.js";

const SESSION_COOKIE_NAME = "worldforge_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const OWNER_ROLE: AuthRole = "owner";
const COLLABORATOR_ROLE: AuthRole = "collaborator";
const DEFAULT_OWNER_EMAIL = "owner@worldforge.local";
const DEFAULT_OWNER_PASSWORD = "worldforge-owner";

type StoredAccount = AuthAccountSummary & {
  passwordHash: string;
  passwordSalt: string;
};

type StoredSession = {
  id: string;
  accountId: string;
  tokenHash: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
};

type StoredAuthState = {
  accounts: StoredAccount[];
  sessions: StoredSession[];
};

export type AuthenticatedViewer = AuthAccountSummary;

export class AuthError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

function isLocalBootstrapHost(host: string): boolean {
  return host === "127.0.0.1" || host === "localhost" || host === "::1";
}

export function assertSafeOwnerBootstrap(host: string): void {
  const ownerEmail = (process.env.WORLDFORGE_OWNER_EMAIL ?? DEFAULT_OWNER_EMAIL).trim().toLowerCase();
  const ownerPassword = (process.env.WORLDFORGE_OWNER_PASSWORD ?? DEFAULT_OWNER_PASSWORD).trim();

  if (!isLocalBootstrapHost(host) && ownerEmail === DEFAULT_OWNER_EMAIL && ownerPassword === DEFAULT_OWNER_PASSWORD) {
    throw new AuthError(
      503,
      "Configure WORLDFORGE_OWNER_EMAIL and WORLDFORGE_OWNER_PASSWORD before running WorldForge on a non-local host.",
    );
  }
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function derivePasswordHash(password: string, salt: string): string {
  return pbkdf2Sync(password, salt, 120_000, 64, "sha512").toString("hex");
}

function scrubAccount(account: StoredAccount): AuthAccountSummary {
  return {
    id: account.id,
    email: account.email,
    displayName: account.displayName,
    role: account.role,
    createdAt: account.createdAt,
  };
}

function allowedVisibilityOptions(viewer: AuthenticatedViewer): EntityVisibility[] {
  return viewer.role === OWNER_ROLE ? ["all_users", "owner_only", "hidden"] : ["all_users"];
}

function sessionCookie(token: string, expiresAt: Date): string {
  return `${SESSION_COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(
    (expiresAt.getTime() - Date.now()) / 1000,
  )}`;
}

function clearSessionCookie(): string {
  return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function getViewerVisibilityOptions(viewer: AuthenticatedViewer): EntityVisibility[] {
  return allowedVisibilityOptions(viewer);
}

export function canViewEntity(viewer: AuthenticatedViewer, visibility: EntityVisibility): boolean {
  if (viewer.role === OWNER_ROLE) {
    return true;
  }

  return visibility === "all_users";
}

export function canEditEntity(viewer: AuthenticatedViewer, visibility: EntityVisibility): boolean {
  if (viewer.role === OWNER_ROLE) {
    return true;
  }

  return visibility === "all_users";
}

export function canAssignVisibility(viewer: AuthenticatedViewer, visibility: EntityVisibility): boolean {
  return allowedVisibilityOptions(viewer).includes(visibility);
}

export class FileSystemAuthStore {
  private readonly authRoot: string;
  private readonly authStatePath: string;

  constructor(private readonly worldRoot: string) {
    const baseRoot = process.env.TRIATHENUM_AUTH_ROOT ?? path.join(worldRoot, ".worldforge");
    this.authRoot = baseRoot;
    this.authStatePath = path.join(this.authRoot, "auth-state.json");
  }

  async createOwnerManagedAccount(
    viewer: AuthenticatedViewer,
    request: AuthAccountProvisionRequest,
  ): Promise<AuthAccountSummary> {
    if (viewer.role !== OWNER_ROLE) {
      throw new AuthError(403, "Only the owner can provision collaborator accounts.");
    }

    const email = request.email.trim().toLowerCase();
    const displayName = request.displayName.trim();
    const password = request.password.trim();

    if (!email || !displayName || !password) {
      throw new AuthError(400, "Email, display name, and password are required.");
    }

    const state = await this.readState();
    if (state.accounts.some((account) => account.email === email)) {
      throw new AuthError(409, `An account already exists for ${email}.`);
    }

    const salt = randomBytes(16).toString("hex");
    const now = new Date().toISOString();
    const account: StoredAccount = {
      id: `account-${slugify(email) || randomBytes(4).toString("hex")}`,
      email,
      displayName,
      role: request.role ?? COLLABORATOR_ROLE,
      createdAt: now,
      passwordSalt: salt,
      passwordHash: derivePasswordHash(password, salt),
    };

    state.accounts.push(account);
    await this.writeState(state);

    return scrubAccount(account);
  }

  async listAccounts(viewer: AuthenticatedViewer): Promise<AuthAccountSummary[]> {
    if (viewer.role !== OWNER_ROLE) {
      throw new AuthError(403, "Only the owner can view account provisioning details.");
    }

    const state = await this.readState();
    return state.accounts.map(scrubAccount).sort((left, right) => left.email.localeCompare(right.email));
  }

  async createSession(login: AuthLoginRequest): Promise<{ cookie: string; payload: AuthSessionPayload }> {
    const email = login.email.trim().toLowerCase();
    const password = login.password.trim();

    if (!email || !password) {
      throw new AuthError(400, "Email and password are required.");
    }

    const state = await this.readState();
    const account = state.accounts.find((item) => item.email === email);
    if (!account) {
      throw new AuthError(401, "Invalid email or password.");
    }

    const candidateHash = derivePasswordHash(password, account.passwordSalt);
    if (!timingSafeEqual(Buffer.from(candidateHash, "hex"), Buffer.from(account.passwordHash, "hex"))) {
      throw new AuthError(401, "Invalid email or password.");
    }

    const token = randomBytes(24).toString("hex");
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
    state.sessions = state.sessions.filter((session) => new Date(session.expiresAt).getTime() > now.getTime());
    state.sessions.push({
      id: `session-${randomBytes(8).toString("hex")}`,
      accountId: account.id,
      tokenHash: derivePasswordHash(token, account.passwordSalt),
      createdAt: now.toISOString(),
      lastSeenAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    });
    await this.writeState(state);

    return {
      cookie: sessionCookie(token, expiresAt),
      payload: {
        viewer: scrubAccount(account),
        visibilityOptions: allowedVisibilityOptions(account),
        canManageAccounts: account.role === OWNER_ROLE,
      },
    };
  }

  async resolveSession(cookieHeader: string | undefined): Promise<{ cookie: string; payload: AuthSessionPayload } | null> {
    const token = parseSessionToken(cookieHeader);
    if (!token) {
      return null;
    }

    const state = await this.readState();
    const now = new Date();

    for (const account of state.accounts) {
      const session = state.sessions.find((candidate) => {
        if (candidate.accountId !== account.id) {
          return false;
        }

        if (new Date(candidate.expiresAt).getTime() <= now.getTime()) {
          return false;
        }

        const tokenHash = derivePasswordHash(token, account.passwordSalt);
        return timingSafeEqual(Buffer.from(tokenHash, "hex"), Buffer.from(candidate.tokenHash, "hex"));
      });

      if (!session) {
        continue;
      }

      session.lastSeenAt = now.toISOString();
      session.expiresAt = new Date(now.getTime() + SESSION_TTL_MS).toISOString();
      await this.writeState(state);

      const viewer = scrubAccount(account);
      return {
        cookie: sessionCookie(token, new Date(session.expiresAt)),
        payload: {
          viewer,
          visibilityOptions: allowedVisibilityOptions(viewer),
          canManageAccounts: viewer.role === OWNER_ROLE,
        },
      };
    }

    return null;
  }

  async destroySession(cookieHeader: string | undefined): Promise<string> {
    const token = parseSessionToken(cookieHeader);
    if (!token) {
      return clearSessionCookie();
    }

    const state = await this.readState();
    let changed = false;

    state.sessions = state.sessions.filter((session) => {
      for (const account of state.accounts) {
        if (session.accountId !== account.id) {
          continue;
        }

        const tokenHash = derivePasswordHash(token, account.passwordSalt);
        if (timingSafeEqual(Buffer.from(tokenHash, "hex"), Buffer.from(session.tokenHash, "hex"))) {
          changed = true;
          return false;
        }
      }

      return true;
    });

    if (changed) {
      await this.writeState(state);
    }

    return clearSessionCookie();
  }

  private async readState(): Promise<StoredAuthState> {
    await mkdir(this.authRoot, { recursive: true });

    try {
      const raw = await readFile(this.authStatePath, "utf8");
      const parsed = JSON.parse(raw) as StoredAuthState;
      return await this.ensureBootstrap(parsed);
    } catch {
      return this.ensureBootstrap({
        accounts: [],
        sessions: [],
      });
    }
  }

  private async ensureBootstrap(state: StoredAuthState): Promise<StoredAuthState> {
    if (state.accounts.some((account) => account.role === OWNER_ROLE)) {
      return state;
    }

    const ownerEmail = (process.env.WORLDFORGE_OWNER_EMAIL ?? DEFAULT_OWNER_EMAIL).trim().toLowerCase();
    const ownerPassword = (process.env.WORLDFORGE_OWNER_PASSWORD ?? DEFAULT_OWNER_PASSWORD).trim();
    const ownerDisplayName = (process.env.WORLDFORGE_OWNER_NAME ?? os.userInfo().username ?? "WorldForge Owner").trim();
    const salt = randomBytes(16).toString("hex");
    const now = new Date().toISOString();

    state.accounts.push({
      id: `account-${slugify(ownerEmail) || "owner"}`,
      email: ownerEmail,
      displayName: ownerDisplayName,
      role: OWNER_ROLE,
      createdAt: now,
      passwordSalt: salt,
      passwordHash: derivePasswordHash(ownerPassword, salt),
    });
    await this.writeState(state);

    return state;
  }

  private async writeState(state: StoredAuthState): Promise<void> {
    await mkdir(this.authRoot, { recursive: true });
    await writeFile(this.authStatePath, JSON.stringify(state, null, 2), "utf8");
  }
}

export function parseSessionToken(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(";").map((item) => item.trim());
  const sessionCookiePair = cookies.find((item) => item.startsWith(`${SESSION_COOKIE_NAME}=`));
  if (!sessionCookiePair) {
    return null;
  }

  return decodeURIComponent(sessionCookiePair.slice(`${SESSION_COOKIE_NAME}=`.length));
}
