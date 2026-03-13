import { describe, expect, it } from "vitest";
import { buildShowProjectPermissions } from "@/lib/showProjects";

describe("show project collaborator permissions", () => {
  it("gives writers episode and scene access without publish rights", () => {
    const permissions = buildShowProjectPermissions(
      {
        role: "user",
        permissions: []
      },
      "WRITER"
    );

    expect(permissions.read).toBe(true);
    expect(permissions.editEpisodes).toBe(true);
    expect(permissions.editScenes).toBe(true);
    expect(permissions.editExtras).toBe(false);
    expect(permissions.publish).toBe(false);
    expect(permissions.manageCollaborators).toBe(false);
  });

  it("gives producers release-facing access without collaborator management", () => {
    const permissions = buildShowProjectPermissions(
      {
        role: "user",
        permissions: []
      },
      "PRODUCER"
    );

    expect(permissions.read).toBe(true);
    expect(permissions.editProject).toBe(true);
    expect(permissions.editEpisodes).toBe(true);
    expect(permissions.editExtras).toBe(true);
    expect(permissions.publish).toBe(true);
    expect(permissions.editScenes).toBe(false);
    expect(permissions.manageCollaborators).toBe(false);
  });

  it("preserves admin override", () => {
    const permissions = buildShowProjectPermissions(
      {
        role: "admin",
        permissions: []
      },
      null
    );

    expect(Object.values(permissions).every(Boolean)).toBe(true);
  });
});
