import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { LicenseActivationService } from "./LicenseActivationService.js";

const SIGNED_TEST_LICENSE = "eyJ2ZXJzaW9uIjoxLCJsaWNlbnNlSWQiOiJ0ZXN0LTMwZjcyODA4NmRkNyIsImVtYWlsIjoid2lsZGFuQGV4YW1wbGUuY29tIiwicGFzc3dvcmRTYWx0IjoiYlNJY2RLU1otSTYweWUwU2NrZldvZyIsInBhc3N3b3JkSGFzaCI6ImxkUmx5LWx3NXNtSTREWnc2RExsV1ZmbXAwaWtSVkYxNUFpdmhMWUdaVjgiLCJpc3N1ZWRBdCI6IjIwMjYtMDgtMDhUMDA6MDA6MDAuMDAwWiIsImV4cGlyZXNBdCI6IjIwOTktMTItMzFUMDA6MDA6MDAuMDAwWiIsInByb2R1Y3QiOiJyZXNlYXJjaC1wcm9kdWN0LW1hcmtldCJ9.LOAaWjRTemLeJUtaGW3MjT-yKhCdI3A3Dw6_g1ifHJO6lh2QbrG0-VjCO4YaF0i5x0ZRilvB-uuROstMhuh5iyHFWJwXlmma3m1jSTYU6VvUbH7TxMRcuMSyp6zfHc5lz_NDlKl0qgxfSUpdc1f0b7CvCHC4tEnbW_dP6Xg_U7adv7Dd6njWjjriot88vlpA4TZaHkDjyTapKhkxtTo_oh2PFydojExbq_gjrvEgjQfaQXue-sh2fZrDfNTf8V6t9d0U1XAZmr33VIKusy0vFoc2h04Qk3eHY-aqIt9K582kD3155b6vl50VflevW_mloJ4uYm8TITaZN8PsOStESlXx1TiVDbSjhWZwxj9fs6HpGjo2-zxzhKim8mwYg_f0y5UY2WslKBSmdQCJ2ArxHiSKYqiPVcEEg2-yDHGHuJpGnvF0sMBNaXbH0bgi468WQLnIwg8jRx-33l1NIr5NYA6nem40k6uwxlUFVuAh7CwtbMCGES2Xhhnq_WR-4OCa";

describe("LicenseActivationService", () => {
  it("creates an authenticated development session without weakening packaged enforcement", async () => {
    const directory = await mkdtemp(join(tmpdir(), "rpm-license-"));
    const service = new LicenseActivationService(directory, true);
    const status = await service.status();
    expect(status.developmentBypass).toBe(true);
    expect(status.authenticated).toBe(true);
    expect(service.hasValidSession(status.sessionToken)).toBe(true);
  });

  it("does not authenticate an unactivated production installation", async () => {
    const directory = await mkdtemp(join(tmpdir(), "rpm-license-"));
    const service = new LicenseActivationService(directory, false);
    const status = await service.status();
    expect(status.requiresActivation).toBe(true);
    expect(status.authenticated).toBe(false);
    expect(service.hasValidSession(undefined)).toBe(false);
  });

  it("restores an authenticated production session from a saved activation", async () => {
    const directory = await mkdtemp(join(tmpdir(), "rpm-license-"));
    const service = new LicenseActivationService(directory, false);
    const activated = await service.activate({
      email: "wildan@example.com",
      password: "valid-password",
      license: SIGNED_TEST_LICENSE
    });
    expect(activated.authenticated).toBe(true);
    expect(service.hasValidSession(activated.sessionToken)).toBe(true);

    const restartedService = new LicenseActivationService(directory, false);
    const restored = await restartedService.status();
    expect(restored.authenticated).toBe(true);
    expect(restored.email).toBe("wildan@example.com");
    expect(restartedService.hasValidSession(restored.sessionToken)).toBe(true);
  });
});
