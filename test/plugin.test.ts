import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function readJSON(file: string) {
  return JSON.parse(readFileSync(resolve(root, file), "utf8"));
}

describe("openclaw plugin structure", () => {
  const pkg = readJSON("package.json");
  const manifest = readJSON("openclaw.plugin.json");

  describe("package.json", () => {
    it("has openclaw.extensions pointing to index.ts", () => {
      expect(pkg.openclaw).toBeDefined();
      expect(pkg.openclaw.extensions).toEqual(["./index.ts"]);
    });

    it("is type: module", () => {
      expect(pkg.type).toBe("module");
    });

    it("includes index.ts in files", () => {
      expect(pkg.files).toContain("index.ts");
    });

    it("includes openclaw.plugin.json in files", () => {
      expect(pkg.files).toContain("openclaw.plugin.json");
    });

    it("includes skills directory in files", () => {
      expect(pkg.files).toContain("skills");
    });

    it("depends on @lobsterkit/lobstermail", () => {
      expect(pkg.dependencies["@lobsterkit/lobstermail"]).toBeDefined();
    });

    it("depends on @sinclair/typebox", () => {
      expect(pkg.dependencies["@sinclair/typebox"]).toBeDefined();
    });

    it("has openclaw as peerDependency", () => {
      expect(pkg.peerDependencies.openclaw).toBeDefined();
    });
  });

  describe("openclaw.plugin.json", () => {
    it("has a valid id", () => {
      expect(manifest.id).toBe("lobstermail");
    });

    it("has name and description", () => {
      expect(manifest.name).toBe("LobsterMail");
      expect(manifest.description).toBeTruthy();
    });

    it("has a configSchema with type object", () => {
      expect(manifest.configSchema).toBeDefined();
      expect(manifest.configSchema.type).toBe("object");
      expect(manifest.configSchema.additionalProperties).toBe(false);
    });

    it("declares skills directory", () => {
      expect(manifest.skills).toContain("./skills");
    });

    it("version matches package.json", () => {
      expect(manifest.version).toBe(pkg.version);
    });
  });

  describe("skills/SKILL.md", () => {
    const skill = readFileSync(resolve(root, "skills/SKILL.md"), "utf8");

    it("exists and has content", () => {
      expect(skill.length).toBeGreaterThan(100);
    });

    it("has YAML frontmatter with name: lobstermail", () => {
      expect(skill).toMatch(/^---\n/);
      expect(skill).toMatch(/name:\s*lobstermail/);
    });

    it("has openclaw metadata in frontmatter", () => {
      expect(skill).toMatch(/openclaw/);
    });
  });

  describe("index.ts", () => {
    const entry = readFileSync(resolve(root, "index.ts"), "utf8");

    it("uses definePluginEntry from focused subpath", () => {
      expect(entry).toContain('from "openclaw/plugin-sdk/plugin-entry"');
    });

    it("does not use deprecated monolithic imports", () => {
      expect(entry).not.toMatch(/from ["']openclaw\/plugin-sdk["']/);
    });

    it("registers expected tools", () => {
      const tools = [
        "lobstermail_create_inbox",
        "lobstermail_check_inbox",
        "lobstermail_wait_for_email",
        "lobstermail_get_email",
        "lobstermail_send_email",
        "lobstermail_list_inboxes",
        "lobstermail_delete_inbox",
        "lobstermail_get_account",
      ];
      for (const tool of tools) {
        expect(entry).toContain(`"${tool}"`);
      }
    });

    it("exports default plugin entry", () => {
      expect(entry).toMatch(/export default definePluginEntry/);
    });
  });
});
