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
    signature: "dW50cnVzdGVkIGNvbW1lbnQ6IHNpZ25hdHVyZSBmcm9tIHRhdXJpIHNlY3JldCBrZXkKUlVUZGJoZFo0QjhreHF3NTBOdmJFcmxxREsxbFJ3QS9tZ1hUUXBvL2I0b3JPTWJ3Ymg1aExNRGx5TFJNVjUwUGlrM0UxRWxlWC9XTUUyV2JYem9ZN3dobW5iNDU1MksvRFFzPQp0cnVzdGVkIGNvbW1lbnQ6IHRpbWVzdGFtcDoxNzc1NjE3MTk3CWZpbGU6VHJ1c3RGYXJtXzEuMS4xX3g2NC1zZXR1cC5uc2lzLnppcApDVVlEVlUxUmJMVVg3WXdWQ1p3a1h0emd4SGNDSnpEZWFidThQREhjdjcrdmM4bElFOG5nbis1ZUZBY2NZam5WNWptSllld0Q3RFpZUlFlRGtUWkREQT09Cg==",
  },
  "darwin-aarch64": {
    url: `${DOWNLOAD_BASE}/v${LATEST_VERSION}/TrustFarm.app.tar.gz`,
    signature: "dW50cnVzdGVkIGNvbW1lbnQ6IHNpZ25hdHVyZSBmcm9tIHRhdXJpIHNlY3JldCBrZXkKUlVUZGJoZFo0QjhreGkwSytpUC9kbTRkamh6UUU3V2J2bUcrZjg3MnR1TDJoR3FCOVIyVlpmWEpmNkRCWTlhTDA1cEFmdlpSUDJ2NHBmR2tCbmx2bmcrczd4aE1pZDlUdUFBPQp0cnVzdGVkIGNvbW1lbnQ6IHRpbWVzdGFtcDoxNzc1NjE2OTI1CWZpbGU6VHJ1c3RGYXJtLmFwcC50YXIuZ3oKeHJVM3BZcjNhUGFLaVRKTTYxcVh1ZFlTRDFoODFHZmlzbVlya2FGRDVBZDlxcTd4dTBOVythMDBPMDJYKzdFeThGREI2cjFvMzVvQzNNVnVIVG9mQnc9PQo=",
  },
  "darwin-x86_64": {
    url: `${DOWNLOAD_BASE}/v${LATEST_VERSION}/TrustFarm.app.tar.gz`,
    signature: "dW50cnVzdGVkIGNvbW1lbnQ6IHNpZ25hdHVyZSBmcm9tIHRhdXJpIHNlY3JldCBrZXkKUlVUZGJoZFo0QjhreGkwSytpUC9kbTRkamh6UUU3V2J2bUcrZjg3MnR1TDJoR3FCOVIyVlpmWEpmNkRCWTlhTDA1cEFmdlpSUDJ2NHBmR2tCbmx2bmcrczd4aE1pZDlUdUFBPQp0cnVzdGVkIGNvbW1lbnQ6IHRpbWVzdGFtcDoxNzc1NjE2OTI1CWZpbGU6VHJ1c3RGYXJtLmFwcC50YXIuZ3oKeHJVM3BZcjNhUGFLaVRKTTYxcVh1ZFlTRDFoODFHZmlzbVlya2FGRDVBZDlxcTd4dTBOVythMDBPMDJYKzdFeThGREI2cjFvMzVvQzNNVnVIVG9mQnc9PQo=",
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
