import { NextResponse } from "next/server";

// TrustFarm latest version config
// Update these values when releasing a new version
const LATEST_VERSION = "1.1.1";
const RELEASE_NOTES = "Fix pantallas en blanco, scrcpy video streaming, agent estable";
const RELEASE_DATE = new Date().toISOString();

const DOWNLOAD_BASE = "https://github.com/danteod99/trustfarm-releases/releases/download";

// Platform-specific download URLs and signatures
const PLATFORMS: Record<string, { url: string; signature: string }> = {
  "windows-x86_64": {
    url: `${DOWNLOAD_BASE}/v${LATEST_VERSION}/TrustFarm_1.0.9_x64-setup.nsis.zip`,
    signature: "dW50cnVzdGVkIGNvbW1lbnQ6IHNpZ25hdHVyZSBmcm9tIHRhdXJpIHNlY3JldCBrZXkKUlVUZGJoZFo0QjhreHJNTXJ1Vml5L2dvN25zZExJNU1yWXYzZFIyUTk2NmZmKzhlMHg3Z0ZUUy9PQkQ0dFR6WUFoa2Nld2FBb241djF4RHlwUlJQOG1UM28vbDVBaGFFdlFzPQp0cnVzdGVkIGNvbW1lbnQ6IHRpbWVzdGFtcDoxNzc1NjAzMzQzCWZpbGU6VHJ1c3RGYXJtXzEuMC45X3g2NC1zZXR1cC5uc2lzLnppcAprZ2w2VUZ5VmVQOVF6WDVJUkJMUVBCSUl3VFBkRHVZQVBKaEx3SHNnbG5KTXZBWHVFdUVEdk5jNFF6Vi9KLzNIbHJ5N255YlBtcnluMkhBZGtlOGREQT09Cg==",
  },
  "darwin-aarch64": {
    url: `${DOWNLOAD_BASE}/v${LATEST_VERSION}/TrustFarm.app.tar.gz`,
    signature: "dW50cnVzdGVkIGNvbW1lbnQ6IHNpZ25hdHVyZSBmcm9tIHRhdXJpIHNlY3JldCBrZXkKUlVUZGJoZFo0QjhreHJrQUFWYlRrSW9VUVR6b2xvT0h0VEJySFJXN3Y5cy80REZFV2JqSXY1d0tQeDBmOHQxQmxidnRVR1VYMHZuYkpaL0RzWEhqL3VtWEIzL1MwazlCcFFzPQp0cnVzdGVkIGNvbW1lbnQ6IHRpbWVzdGFtcDoxNzc1NjAzMDM4CWZpbGU6VHJ1c3RGYXJtLmFwcC50YXIuZ3oKRHVya0Rka3BjR3Jma05GdFhIcko3NWxQb3dxWm1jcFoyQmYrK3ltYTkzNGRaMUxITitZZC96cHNtaG82b0ZHellUaldsb1BOMFE3R044OGV3OEF6Qnc9PQo=",
  },
  "darwin-x86_64": {
    url: `${DOWNLOAD_BASE}/v${LATEST_VERSION}/TrustFarm.app.tar.gz`,
    signature: "dW50cnVzdGVkIGNvbW1lbnQ6IHNpZ25hdHVyZSBmcm9tIHRhdXJpIHNlY3JldCBrZXkKUlVUZGJoZFo0QjhreHJrQUFWYlRrSW9VUVR6b2xvT0h0VEJySFJXN3Y5cy80REZFV2JqSXY1d0tQeDBmOHQxQmxidnRVR1VYMHZuYkpaL0RzWEhqL3VtWEIzL1MwazlCcFFzPQp0cnVzdGVkIGNvbW1lbnQ6IHRpbWVzdGFtcDoxNzc1NjAzMDM4CWZpbGU6VHJ1c3RGYXJtLmFwcC50YXIuZ3oKRHVya0Rka3BjR3Jma05GdFhIcko3NWxQb3dxWm1jcFoyQmYrK3ltYTkzNGRaMUxITitZZC96cHNtaG82b0ZHellUaldsb1BOMFE3R044OGV3OEF6Qnc9PQo=",
  },
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ target: string; current_version: string }> }
) {
  const { target, current_version } = await params;

  // Check if current version is already latest
  if (current_version === LATEST_VERSION) {
    return new NextResponse(null, { status: 204 }); // No update available
  }

  const platform = PLATFORMS[target];
  if (!platform) {
    return new NextResponse(null, { status: 204 }); // Unknown platform, no update
  }

  // If no signature yet (first release), skip signature validation
  const response = {
    version: `v${LATEST_VERSION}`,
    notes: RELEASE_NOTES,
    pub_date: RELEASE_DATE,
    platforms: {
      [target]: {
        url: platform.url,
        signature: platform.signature || "no-signature",
      },
    },
  };

  return NextResponse.json(response);
}
