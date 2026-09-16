import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";

const projectFilePath = path.join(process.cwd(), "institution-settings.json");
const tmpFilePath = path.join(os.tmpdir(), "feeflow-institution-settings.json");

let cachedSettings: { upi_id: string; payee_name: string } | null = null;

function getStoredSettings() {
  if (cachedSettings) return cachedSettings;

  // 1. Try writable temporary storage (works across serverless requests in same warm container)
  try {
    if (fs.existsSync(tmpFilePath)) {
      const content = fs.readFileSync(tmpFilePath, "utf-8");
      const parsed = JSON.parse(content);
      if (parsed.upi_id) {
        cachedSettings = {
          upi_id: String(parsed.upi_id).trim(),
          payee_name: String(parsed.payee_name || "SITS").trim(),
        };
        return cachedSettings;
      }
    }
  } catch {}

  // 2. Try project directory (works in local dev / bundled build)
  try {
    if (fs.existsSync(projectFilePath)) {
      const content = fs.readFileSync(projectFilePath, "utf-8");
      const parsed = JSON.parse(content);
      if (parsed.upi_id) {
        cachedSettings = {
          upi_id: String(parsed.upi_id).trim(),
          payee_name: String(parsed.payee_name || "SITS").trim(),
        };
        return cachedSettings;
      }
    }
  } catch {}

  // 3. Fallback to environment variables or defaults
  return {
    upi_id: process.env.NEXT_PUBLIC_UPI_ID || "8688099587@ybl",
    payee_name: process.env.NEXT_PUBLIC_PAYEE_NAME || "SITS",
  };
}

export async function GET() {
  const settings = getStoredSettings();
  return NextResponse.json(settings);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const upi_id = String(body.upi_id || "").trim();
    const payee_name = String(body.payee_name || "").trim() || "SITS";

    if (!upi_id || !upi_id.includes("@") || upi_id.length < 5) {
      return NextResponse.json(
        { error: "Please provide a valid UPI ID (e.g. 8688099587@ybl or college@sbi)." },
        { status: 400 }
      );
    }

    const newSettings = {
      upi_id,
      payee_name,
      updated_at: new Date().toISOString(),
    };

    // Update in-memory cache
    cachedSettings = { upi_id, payee_name };

    // 1. Write to /tmp (always writable in AWS Lambda / Vercel serverless)
    try {
      fs.writeFileSync(tmpFilePath, JSON.stringify(newSettings, null, 2), "utf-8");
    } catch (tmpErr) {
      console.warn("Could not write to tmpdir:", tmpErr);
    }

    // 2. Attempt to write to project root (succeeds locally, silently skipped on read-only serverless like Vercel)
    try {
      fs.writeFileSync(projectFilePath, JSON.stringify(newSettings, null, 2), "utf-8");
    } catch {
      // Gracefully ignore EROFS in serverless environments
    }

    // 3. Attempt to update .env.local if present and writable (local dev only)
    try {
      const envLocalPath = path.join(process.cwd(), ".env.local");
      if (fs.existsSync(envLocalPath)) {
        let envContent = fs.readFileSync(envLocalPath, "utf-8");
        if (envContent.includes("NEXT_PUBLIC_UPI_ID=")) {
          envContent = envContent.replace(/NEXT_PUBLIC_UPI_ID=.*/g, `NEXT_PUBLIC_UPI_ID=${upi_id}`);
        } else {
          envContent += `\nNEXT_PUBLIC_UPI_ID=${upi_id}`;
        }
        if (envContent.includes("NEXT_PUBLIC_PAYEE_NAME=")) {
          envContent = envContent.replace(/NEXT_PUBLIC_PAYEE_NAME=.*/g, `NEXT_PUBLIC_PAYEE_NAME=${payee_name}`);
        } else {
          envContent += `\nNEXT_PUBLIC_PAYEE_NAME=${payee_name}`;
        }
        fs.writeFileSync(envLocalPath, envContent, "utf-8");
      }
    } catch {
      // Gracefully ignore write error to .env.local in serverless
    }

    return NextResponse.json({
      success: true,
      settings: { upi_id, payee_name },
      message: "UPI ID and payee details updated successfully.",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update UPI settings." },
      { status: 500 }
    );
  }
}
