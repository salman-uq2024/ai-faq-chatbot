const ADMIN_BEARER_PREFIX = "Bearer ";

export type AdminAuthResult = {
  success: boolean;
  error?: string;
};

function getExpectedToken(): string | null {
  const token = process.env.ADMIN_TOKEN;
  if (!token || token.trim() === "") {
    return null;
  }
  return token;
}

export function verifyAdminRequest(request: Request): AdminAuthResult {
  const expected = getExpectedToken();
  if (!expected) {
    // If no token configured, allow all requests (useful for local demos).
    return { success: true };
  }

  const header = request.headers.get("authorization");
  if (!header || !header.startsWith(ADMIN_BEARER_PREFIX)) {
    return { success: false, error: "Missing or invalid admin token" };
  }

  const provided = header.slice(ADMIN_BEARER_PREFIX.length).trim();
  if (provided !== expected) {
    return { success: false, error: "Invalid admin token" };
  }

  return { success: true };
}
