import { describe, expect, it } from "vitest";
import { getAdminTokenFromRequest } from "./routers/adminAuth";

describe("adminAuth token source", () => {
  it("prefers a valid bearer token over the cookie fallback", () => {
    const token = getAdminTokenFromRequest({
      headers: { authorization: "Bearer header-token" },
      cookies: { pibb_admin_session: "cookie-token" },
    });

    expect(token).toBe("header-token");
  });

  it("falls back to the admin cookie when no bearer token is present", () => {
    const token = getAdminTokenFromRequest({
      headers: {},
      cookies: { pibb_admin_session: "cookie-token" },
    });

    expect(token).toBe("cookie-token");
  });
});
