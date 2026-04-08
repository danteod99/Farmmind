import { NextResponse } from "next/server";

// TrustFarm latest version config
// Update these values when releasing a new version
const LATEST_VERSION = "1.0.9";
const RELEASE_NOTES = "Pagos NOWPayments, automatizaciones TikTok/Instagram/Facebook/Spotify, login TrustMind";
const RELEASE_DATE = new Date().toISOString();

const DOWNLOAD_BASE = "https://github.com/danteod99/trustfarm-releases/releases/download";

// Platform-specific download URLs and signatures
const PLATFORMS: Record<string, { url: string; signature: string }> = {
  "windows-x86_64": {
    url: `${DOWNLOAD_BASE}/v${LATEST_VERSION}/TrustFarm_${LATEST_VERSION}_x64-setup.nsis.zip`,
    signature: "dW50cnVzdGVkIGNvbW1lbnQ6IHNpZ25hdHVyZSBmcm9tIHRhdXJpIHNlY3JldCBrZXkKUlVUZGJoZFo0QjhreHQva0N6eWxXY2pxOVZtbmhwam9JOEJacDd2Um5kTFlPTTY0RW5SVEdOOUlqVVNBQzF4dFRZWDlkcm9DTTFOMmpWTkhFWEZTaHJ6ZHkvS3V6OGUzQ3dnPQp0cnVzdGVkIGNvbW1lbnQ6IHRpbWVzdGFtcDoxNzc1NTIwMDk4CWZpbGU6VHJ1c3RGYXJtXzEuMC45X3g2NC1zZXR1cC5uc2lzLnppcAo3YUY2elBSNGdxRWlsZmt5NVpWbW42UWFVZ0ludnhFMlNTVDlSbmdRNFQwdVM4VjB5WHNxYWsxYi9GRVZmdVlhYlBBdTQyTnJoYXJqTXlyWjR0QTdCdz09Cg==",
  },
  "darwin-aarch64": {
    url: `${DOWNLOAD_BASE}/v${LATEST_VERSION}/TrustFarm.app.tar.gz`,
    signature: "dW50cnVzdGVkIGNvbW1lbnQ6IHNpZ25hdHVyZSBmcm9tIHRhdXJpIHNlY3JldCBrZXkKUlVUZGJoZFo0QjhreHN5dG5BV0c0WGZ1Qno0Q25hVTBRT0RkK2pOd2xJSURqTHBlUUUwVGFzM0JEdTgzNWVIL01sNDVLdU50aHgxUllsL3lCdWdZQ3UrMG4rOFkvdE0zNWdVPQp0cnVzdGVkIGNvbW1lbnQ6IHRpbWVzdGFtcDoxNzc1NTE5ODQxCWZpbGU6VHJ1c3RGYXJtLmFwcC50YXIuZ3oKNTRaSkFrOW15SGllWGJYdVZDbmN6Nmw2ZUd1UmZORGIzSko3aS9oeEYvOUZ4aFdyWmFIdHYrY09mN2lSbkx1SlZ1UGRRU0ZaaERjaWVyZjRjMkZjQmc9PQo=",
  },
  "darwin-x86_64": {
    url: `${DOWNLOAD_BASE}/v${LATEST_VERSION}/TrustFarm.app.tar.gz`,
    signature: "dW50cnVzdGVkIGNvbW1lbnQ6IHNpZ25hdHVyZSBmcm9tIHRhdXJpIHNlY3JldCBrZXkKUlVUZGJoZFo0QjhreHN5dG5BV0c0WGZ1Qno0Q25hVTBRT0RkK2pOd2xJSURqTHBlUUUwVGFzM0JEdTgzNWVIL01sNDVLdU50aHgxUllsL3lCdWdZQ3UrMG4rOFkvdE0zNWdVPQp0cnVzdGVkIGNvbW1lbnQ6IHRpbWVzdGFtcDoxNzc1NTE5ODQxCWZpbGU6VHJ1c3RGYXJtLmFwcC50YXIuZ3oKNTRaSkFrOW15SGllWGJYdVZDbmN6Nmw2ZUd1UmZORGIzSko3aS9oeEYvOUZ4aFdyWmFIdHYrY09mN2lSbkx1SlZ1UGRRU0ZaaERjaWVyZjRjMkZjQmc9PQo=",
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
