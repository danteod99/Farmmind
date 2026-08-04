import { NextResponse } from "next/server";

// TrustFarm latest version config
// Update these values when releasing a new version
const LATEST_VERSION = "2.22.0";
const RELEASE_NOTES = "AI Comment corregido (comenta en el video correcto) y 5x mas rapido; Detener confiable; Scrape Users";
const RELEASE_DATE = new Date().toISOString();

const DOWNLOAD_BASE = "https://github.com/danteod99/trustfarm-releases/releases/download";

// Platform-specific download URLs and signatures
const PLATFORMS: Record<string, { url: string; signature: string }> = {
  "windows-x86_64": {
    url: `${DOWNLOAD_BASE}/v${LATEST_VERSION}/TrustFarm_${LATEST_VERSION}_x64-setup.nsis.zip`,
    signature: "dW50cnVzdGVkIGNvbW1lbnQ6IHNpZ25hdHVyZSBmcm9tIHRhdXJpIHNlY3JldCBrZXkKUlVSUzhvNWFVVW00WlJoU1JFNkNObzkrTGY5anJmQnRLR21hZmVHcmVRUlgyZitjc3pIQ1JJcTQwNmVvN0pIcEdYbVh5MDNKalc4WERDUSs4TkpYMzEzSzdWemk2dkVhNVE0PQp0cnVzdGVkIGNvbW1lbnQ6IHRpbWVzdGFtcDoxNzg1ODY1MzM2CWZpbGU6VHJ1c3RGYXJtXzIuMjIuMF94NjQtc2V0dXAubnNpcy56aXAKMytiM3JtTnpmWEZpZCtoSVFTS3RpTG1Zd2J3YnpNekR2RFE5bnZ3clJBQkY2WWR0cGlGbWIrcHpXUWdIT1dFR2IvTU9DdVhPTU9pcS9ua3pqN1VFQWc9PQo=",
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
