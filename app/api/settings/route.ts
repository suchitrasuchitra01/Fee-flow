import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const settingsFilePath = path.join(process.cwd(), "institution-settings.json");

let cachedSettings: { upi_id: string; payee_name: string } | null = null;

function getStoredSettings() {
  if (cachedSettings) return cachedSettings;
  try {
    if (fs.existsSync(settingsFilePath)) {
      const content = fs.readFileSync(settingsFilePath, "utf-8");
      const parsed = JSON.parse(content);
      if (parsed.upi_id) {
        cachedSettings = {
          upi_id: String(parsed.upi_id).trim(),
          payee_name: String(parsed.payee_name || "SITS").trim(),
        };
        return cachedSettings;
      }
    }
  } catch (err) {
    console.error("Error reading institution-settings.json:", err);
  }

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

    fs.writeFileSync(settingsFilePath, JSON.stringify(newSettings, null, 2), "utf-8");

    // Update in-memory cache
    cachedSettings = { upi_id, payee_name };

    // Update .env.local if present
    const envLocalPath = path.join(process.cwd(), ".env.local");
    if (fs.existsSync(envLocalPath)) {
      try {
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
      } catch (err) {
        console.warn("Could not sync to .env.local:", err);
      }
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
