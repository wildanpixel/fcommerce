import { createHash, randomBytes, scryptSync, timingSafeEqual, verify } from "node:crypto";
import { hostname } from "node:os";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { LicenseActivationPayload, LicenseStatusPayload } from "../../shared/contracts.js";

const LICENSE_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBojANBgkqhkiG9w0BAQEFAAOCAY8AMIIBigKCAYEAr00PyChcm0ijwUS69NRQ
J+P6g+7cZ63qn8nCebBSXNXQk6ILIFHmKU187IvZJ9jIDB4qrE/Tyf+HJq8Lf6+5
+Ut2eWDJyYxARy/ZRIO1ajLsq8E5+sdI8H7S4cxHdGt0FwUdO7vBwP0xpe+5lFYe
wg2babi4qS1idnKgKxZfsD+6Z1nrTMFE6JeDwkvjiIMbFQ0j8BaAnDAKLyNjyPZm
UDn2tqrtN9x67dofwLRsHF6VsetmsNs+wnZMVyT9NqYuhRzz3B+66a1lQYorokXd
aT5AUmi5ByddBT8fUFx5aLcKbP0cTFu5Sghljjh3sxSuCHBNvuFXs+2yMrTbz9Ix
Y41zFO8wVsDvd+sIofeegidINyP/6CqGOBGkRy0iB+qjoDCrn/Hj8geQSQHmzGo7
m/LN4Ze0GNYAtyztm2oHFOrKs/ki7ALDDrbyFGWm4JiQbh6JISpRyyG8dwHgSarT
b5I2WM5+l76uZRvgzoQMTr0B985AcapVK6rK9G+Ju8b5AgMBAAE=
-----END PUBLIC KEY-----`;

type LicenseClaims = {
  version: number;
  licenseId: string;
  email: string;
  passwordSalt: string;
  passwordHash: string;
  machineId?: string;
  issuedAt: string;
  expiresAt: string;
  product: string;
};

type StoredActivation = {
  email: string;
  license: string;
};

export class LicenseActivationService {
  private readonly activationPath: string;
  private readonly sessions = new Map<string, number>();
  readonly machineId = createHash("sha256")
    .update(`${hostname()}|${process.platform}|${process.arch}`)
    .digest("hex")
    .slice(0, 24)
    .toUpperCase();

  constructor(appDataDirectory: string, private readonly developmentBypass: boolean) {
    this.activationPath = join(appDataDirectory, "license-activation.json");
  }

  async status(): Promise<LicenseStatusPayload> {
    if (this.developmentBypass) {
      return {
        requiresActivation: false,
        authenticated: true,
        developmentBypass: true,
        machineId: this.machineId,
        sessionToken: this.createSession()
      };
    }
    const stored = await this.readStoredActivation();
    if (!stored) {
      return { requiresActivation: true, authenticated: false, machineId: this.machineId };
    }
    try {
      const claims = this.verifyLicense(stored.license);
      this.assertMachineAssignment(claims);
      return {
        requiresActivation: true,
        authenticated: true,
        machineId: this.machineId,
        email: claims.email,
        expiresAt: claims.expiresAt,
        sessionToken: this.createSession()
      };
    } catch {
      return { requiresActivation: true, authenticated: false, machineId: this.machineId };
    }
  }

  async activate(input: LicenseActivationPayload): Promise<LicenseStatusPayload> {
    const claims = this.verifyLicense(input.license);
    const normalizedEmail = input.email.trim().toLowerCase();
    if (normalizedEmail !== claims.email.toLowerCase()) throw new Error("Email does not match this license.");
    const submittedHash = scryptSync(input.password, claims.passwordSalt, 32);
    const expectedHash = Buffer.from(claims.passwordHash, "base64url");
    if (submittedHash.length !== expectedHash.length || !timingSafeEqual(submittedHash, expectedHash)) {
      throw new Error("Email, password, or license is invalid.");
    }
    this.assertMachineAssignment(claims);
    await writeFile(this.activationPath, JSON.stringify({ email: normalizedEmail, license: input.license } satisfies StoredActivation), {
      encoding: "utf8",
      mode: 0o600
    });
    return {
      requiresActivation: true,
      authenticated: true,
      machineId: this.machineId,
      email: claims.email,
      expiresAt: claims.expiresAt,
      sessionToken: this.createSession()
    };
  }

  hasValidSession(token: string | undefined): boolean {
    if (!token) return false;
    const expiresAt = this.sessions.get(token);
    if (!expiresAt || expiresAt <= Date.now()) {
      this.sessions.delete(token);
      return false;
    }
    return true;
  }

  private createSession(): string {
    const token = randomBytes(32).toString("base64url");
    this.sessions.set(token, Date.now() + 12 * 60 * 60 * 1000);
    return token;
  }

  private verifyLicense(license: string): LicenseClaims {
    const [encodedPayload, encodedSignature, extra] = license.trim().split(".");
    if (!encodedPayload || !encodedSignature || extra) throw new Error("License format is invalid.");
    const validSignature = verify(
      "RSA-SHA256",
      Buffer.from(encodedPayload),
      LICENSE_PUBLIC_KEY,
      Buffer.from(encodedSignature, "base64url")
    );
    if (!validSignature) throw new Error("License signature is invalid.");
    const claims = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as Partial<LicenseClaims>;
    if (
      claims.version !== 1 ||
      claims.product !== "research-product-market" ||
      !claims.email ||
      !claims.passwordSalt ||
      !claims.passwordHash ||
      !claims.expiresAt
    ) throw new Error("License claims are incomplete.");
    if (new Date(claims.expiresAt).getTime() <= Date.now()) throw new Error("License has expired.");
    return claims as LicenseClaims;
  }

  private assertMachineAssignment(claims: LicenseClaims): void {
    if (claims.machineId && claims.machineId.toUpperCase() !== this.machineId) {
      throw new Error(`This license is assigned to a different machine. Current machine ID: ${this.machineId}`);
    }
  }

  private async readStoredActivation(): Promise<StoredActivation | null> {
    try {
      return JSON.parse(await readFile(this.activationPath, "utf8")) as StoredActivation;
    } catch {
      return null;
    }
  }
}
