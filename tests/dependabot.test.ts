import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));

describe("Dependabot configuration", () => {
  const config = readFileSync(`${repoRoot}.github/dependabot.yml`, "utf8");

  it("is version 2 and covers both npm and GitHub Actions", () => {
    expect(config).toMatch(/^version:\s*2\s*$/m);
    expect(config).toMatch(/package-ecosystem:\s*npm\b/);
    expect(config).toMatch(/package-ecosystem:\s*github-actions\b/);
  });

  it("runs on a schedule for every ecosystem", () => {
    const ecosystems = [...config.matchAll(/package-ecosystem:\s*(\S+)/g)].map((m) => m[1]);
    expect(ecosystems.length).toBeGreaterThanOrEqual(2);
    const schedules = [...config.matchAll(/schedule:\s*\n\s*interval:\s*(\S+)/g)].map((m) => m[1]);
    expect(schedules.length).toBe(ecosystems.length);
    for (const interval of schedules) expect(interval).toMatch(/^(daily|weekly|monthly)$/);
  });
});
