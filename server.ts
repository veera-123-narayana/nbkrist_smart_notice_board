import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Google reCAPTCHA v2 Secret Key (Backend-Only, Never Expose to Client)
// In production, CAPTCHA_SECRET (or RECAPTCHA_SECRET_KEY) must be provided in the server environment
const CAPTCHA_SECRET = process.env.CAPTCHA_SECRET || process.env.RECAPTCHA_SECRET_KEY;
// Official Google reCAPTCHA v2 test secret key (always passes) for local development testing
const DEV_TEST_CAPTCHA_SECRET = "6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe";

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 10000;
  const isProduction = process.env.NODE_ENV === "production";

  // Parse allowed origins from FRONTEND_URL environment variable
  const allowedOrigins: string[] = [];
  if (process.env.FRONTEND_URL) {
    process.env.FRONTEND_URL.split(",")
      .map((url) => url.trim().replace(/\/+$/, ""))
      .filter(Boolean)
      .forEach((url) => allowedOrigins.push(url));
  }

  // Configure CORS for Netlify frontend integration
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl, Raspberry Pi telemetry agent)
        if (!origin) return callback(null, true);

        // Normalize origin without trailing slash
        const cleanOrigin = origin.replace(/\/+$/, "");

        // Match against explicitly configured FRONTEND_URL
        if (allowedOrigins.includes(cleanOrigin)) {
          return callback(null, true);
        }

        // In development mode, allow localhost, 127.0.0.1, and preview environments
        if (!isProduction) {
          if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(cleanOrigin)) {
            return callback(null, true);
          }
          if (cleanOrigin.endsWith(".run.app") || cleanOrigin.endsWith(".netlify.app")) {
            return callback(null, true);
          }
          if (allowedOrigins.length === 0) {
            return callback(null, true);
          }
        }

        return callback(new Error(`CORS blocked request from origin: ${origin}`));
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    })
  );

  app.use(express.json({ limit: "25mb" }));

  // In-memory registry for Raspberry Pi device health telemetry
  const deviceHealthRegistry = new Map<string, any>();

  // API Health Check
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      service: "NBKRIST Smart Digital Notice Board Backend",
      environment: process.env.NODE_ENV || "development",
      timestamp: new Date().toISOString(),
    });
  });

  // Google reCAPTCHA v2 Verification Endpoint
  app.post("/api/auth/captcha/verify", async (req, res) => {
    try {
      const recaptchaToken = req.body.recaptchaToken || req.body.token || req.body.captchaToken;

      if (!recaptchaToken || typeof recaptchaToken !== "string") {
        return res.status(400).json({
          success: false,
          error: "Missing reCAPTCHA verification token. Please complete the security checkbox.",
        });
      }

      // In production, enforce that the secret key is provided
      if (isProduction && !CAPTCHA_SECRET) {
        console.error("CRITICAL: CAPTCHA_SECRET is not configured in production backend environment.");
        return res.status(500).json({
          success: false,
          error: "Server configuration error: CAPTCHA_SECRET must be configured in environment variables.",
        });
      }

      const effectiveSecret = CAPTCHA_SECRET || DEV_TEST_CAPTCHA_SECRET;

      // Verify token with Google reCAPTCHA siteverify API
      const verifyUrl = "https://www.google.com/recaptcha/api/siteverify";
      const params = new URLSearchParams();
      params.append("secret", effectiveSecret);
      params.append("response", recaptchaToken.trim());

      const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
      if (typeof clientIp === "string") {
        params.append("remoteip", clientIp.split(",")[0].trim());
      }

      const googleResponse = await fetch(verifyUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });

      const verifyResult = await googleResponse.json();

      if (verifyResult.success) {
        return res.json({
          success: true,
          challenge_ts: verifyResult.challenge_ts,
          hostname: verifyResult.hostname,
        });
      } else {
        console.warn("Google reCAPTCHA verification rejected:", verifyResult["error-codes"]);
        return res.status(400).json({
          success: false,
          error: "Google reCAPTCHA verification failed. Please complete the security challenge again.",
          errorCodes: verifyResult["error-codes"],
        });
      }
    } catch (err: any) {
      console.error("reCAPTCHA verification exception:", err?.message || err);
      return res.status(500).json({
        success: false,
        error: "Internal server error verifying reCAPTCHA.",
      });
    }
  });

  // Telemetry endpoint for Raspberry Pi Local Device Health Agent
  app.post("/api/device/health", (req, res) => {
    const {
      deviceId,
      department,
      cpuTemp,
      cpuUsage,
      ramUsage,
      diskUsage,
      uptime,
      wifiSSID,
      ipAddress,
      appVersion,
    } = req.body;

    if (!deviceId) {
      return res.status(400).json({ error: "Missing deviceId in telemetry payload" });
    }

    const report = {
      deviceId,
      department: department || "ALL",
      cpuTemp: cpuTemp ?? null,
      cpuUsage: cpuUsage ?? null,
      ramUsage: ramUsage ?? null,
      diskUsage: diskUsage ?? null,
      uptime: uptime ?? "unknown",
      wifiSSID: wifiSSID ?? "connected",
      ipAddress: ipAddress ?? req.ip,
      appVersion: appVersion || "1.0.0",
      status: "online",
      lastReport: new Date().toISOString(),
    };

    deviceHealthRegistry.set(deviceId, report);
    return res.json({ success: true, timestamp: report.lastReport, deviceId });
  });

  // Query device health reports
  app.get("/api/device/health", (req, res) => {
    res.json(Array.from(deviceHealthRegistry.values()));
  });

  app.get("/api/device/health/:deviceId", (req, res) => {
    const report = deviceHealthRegistry.get(req.params.deviceId);
    if (!report) {
      return res.status(404).json({ error: "Device not found or no telemetry reported yet" });
    }
    return res.json(report);
  });

  // Telegram Notice Bot Route (Kept Backend-Only, Never Exposes BOT_TOKEN)
  app.post("/telegram/send", async (req, res) => {
    try {
      const { chatId, title, description, department, priority } = req.body;
      const botToken = process.env.BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;

      if (!botToken) {
        console.warn("Telegram BOT_TOKEN is not configured in backend environment.");
        return res.json({
          success: false,
          warning: "BOT_TOKEN not configured in environment variables",
        });
      }

      const message = `
📢 *NBKRIST Smart Notice Board*

🏫 Department: ${department || "ALL"}

📌 Title:
${title || "Announcement"}

📝 Description:
${description || title || "Notice published to campus displays."}

🚨 Priority:
${priority || "normal"}

━━━━━━━━━━━━━━━━━━
NBKRIST Automated Broadcast
`;

      const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;

      const response = await fetch(telegramUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: "Markdown",
        }),
      });

      const data = await response.json();
      return res.json(data);
    } catch (err: any) {
      console.error("Telegram notification delivery error:", err?.message || err);
      return res.status(500).json({
        success: false,
        error: err?.message || "Internal server error",
      });
    }
  });

  // Vite middleware in dev, static files in prod
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 NBKRIST Backend running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
