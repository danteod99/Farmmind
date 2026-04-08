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
    url: `${DOWNLOAD_BASE}/v${LATEST_VERSION}/TrustFarm_${LATEST_VERSION}_x64-setup.nsis.zip`,
    signature: "dW50cnVzdGVkIGNvbW1lbnQ6IHNpZ25hdHVyZSBmcm9tIHRhdXJpIHNlY3JldCBrZXkKUlVUZGJoZFo0QjhreG9qN1lFUHZXTzZrRW9TbXJpZmEyQ0R1eVRVYUljOWRvVjVRSjBzbVhTQlR4eGYyRHp1WlpMYXR5WkJOODVyNUJJamdUb2kxMDhHSWV6L0tzT3NBUmdJPQp0cnVzdGVkIGNvbW1lbnQ6IHRpbWVzdGFtcDoxNzc1NjE1NzUyCWZpbGU6VHJ1c3RGYXJtXzEuMS4xX3g2NC1zZXR1cC5uc2lzLnppcApFUklUd2RmTEJ5VEM3aGpyLzQ5djVlaldIbnA4UTBYc2xVQ2kxRTkvcHZBL1lkOC9jczJRaWM4blUvcjZ3ZHZsNEhidHVZdXBSMWJhcCtxUktIQXNBUT09Cg==",
  },
  "darwin-aarch64": {
    url: `${DOWNLOAD_BASE}/v${LATEST_VERSION}/TrustFarm.app.tar.gz`,
    signature: "dW50cnVzdGVkIGNvbW1lbnQ6IHNpZ25hdHVyZSBmcm9tIHRhdXJpIHNlY3JldCBrZXkKUlVUZGJoZFo0QjhreGpRcjNHWVZqZG5rdzdNZzdWZ3lUM0pwVzNZblp5NFBXYmZLZ1gwOXFOU1FmcW5oVU1tcGVvNElpUVMrRC91d2dUamlDZUQvU2tnUVZKd0xGRkhiZUFVPQp0cnVzdGVkIGNvbW1lbnQ6IHRpbWVzdGFtcDoxNzc1NjE1NDcxCWZpbGU6VHJ1c3RGYXJtLmFwcC50YXIuZ3oKUFVHdFpsVDRab005ZjVyUGs5bFEyRnZJMTBSUDVpcW8ycGlLVDlYRkk0cFR5UUVzNTJUUGtxdUJUK1VHcWpYcnJxVDFIRGlicjNYcWJFZ095MkZkQmc9PQo=",
  },
  "darwin-x86_64": {
    url: `${DOWNLOAD_BASE}/v${LATEST_VERSION}/TrustFarm.app.tar.gz`,
    signature: "dW50cnVzdGVkIGNvbW1lbnQ6IHNpZ25hdHVyZSBmcm9tIHRhdXJpIHNlY3JldCBrZXkKUlVUZGJoZFo0QjhreGpRcjNHWVZqZG5rdzdNZzdWZ3lUM0pwVzNZblp5NFBXYmZLZ1gwOXFOU1FmcW5oVU1tcGVvNElpUVMrRC91d2dUamlDZUQvU2tnUVZKd0xGRkhiZUFVPQp0cnVzdGVkIGNvbW1lbnQ6IHRpbWVzdGFtcDoxNzc1NjE1NDcxCWZpbGU6VHJ1c3RGYXJtLmFwcC50YXIuZ3oKUFVHdFpsVDRab005ZjVyUGs5bFEyRnZJMTBSUDVpcW8ycGlLVDlYRkk0cFR5UUVzNTJUUGtxdUJUK1VHcWpYcnJxVDFIRGlicjNYcWJFZ095MkZkQmc9PQo=",
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
