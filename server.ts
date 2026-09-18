import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import multer from "multer";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

dotenv.config();

const currentFilename = typeof import.meta !== "undefined" && import.meta.url ? fileURLToPath(import.meta.url) : (typeof __filename !== "undefined" ? __filename : "");
const currentDirname = currentFilename ? path.dirname(currentFilename) : process.cwd();

// Google reCAPTCHA v2 Secret Key (Backend-Only, Never Expose to Client)
// In production, CAPTCHA_SECRET (or RECAPTCHA_SECRET_KEY) must be provided in the server environment
const CAPTCHA_SECRET = process.env.CAPTCHA_SECRET || process.env.RECAPTCHA_SECRET_KEY;
// Official Google reCAPTCHA v2 test secret key (always passes) for local development testing
const DEV_TEST_CAPTCHA_SECRET = "6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe";

// Lazy Supabase Client Initialization (Render Backend-Only, Never Expose to Client)
let supabaseClient: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error(
        "Supabase credentials not configured. Please ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in Render backend environment variables."
      );
    }
    supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return supabaseClient;
}

// Configure multer for in-memory multipart upload handling with 50 MB limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB maximum
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimeTypes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/svg+xml",
    ];
    if (allowedMimeTypes.includes(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error("INVALID_MIME_TYPE"));
    }
  },
});

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const isProduction = process.env.NODE_ENV === "production";

  // Parse allowed origins from FRONTEND_URL environment variable and include Netlify frontend & Render backend
  const allowedOrigins: string[] = [
    "https://nbkristnoticeboard.netlify.app",
    "https://nbkrist-smart-notice-board.onrender.com",
  ];
  if (process.env.FRONTEND_URL) {
    process.env.FRONTEND_URL.split(",")
      .map((url) => url.trim().replace(/\/+$/, ""))
      .filter(Boolean)
      .forEach((url) => {
        if (!allowedOrigins.includes(url)) {
          allowedOrigins.push(url);
        }
      });
  }

  // Configure CORS for Netlify frontend and Render backend integration
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl, Raspberry Pi telemetry agent)
        if (!origin) return callback(null, true);

        // Normalize origin without trailing slash
        const cleanOrigin = origin.replace(/\/+$/, "");

        // Match against explicitly configured FRONTEND_URL or default Netlify / Render domains
        if (allowedOrigins.includes(cleanOrigin)) {
          return callback(null, true);
        }

        // Allow any netlify.app, onrender.com, or run.app preview deployments
        if (
          cleanOrigin.endsWith(".netlify.app") ||
          cleanOrigin.endsWith(".onrender.com") ||
          cleanOrigin.endsWith(".run.app")
        ) {
          return callback(null, true);
        }

        // In development mode, allow localhost, 127.0.0.1, and preview environments
        if (!isProduction) {
          if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(cleanOrigin)) {
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
      allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "x-admin-role", "x-admin-email"],
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
      const recaptchaToken =
        req.body.recaptchaToken ||
        req.body.token ||
        req.body.captchaToken ||
        req.body["g-recaptcha-response"];

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

  // TEMPORARY DIAGNOSTIC ENDPOINT: GET /api/storage/diagnostics
  // Purpose: Diagnose Supabase Storage latency, connectivity, and bucket existence without exposing secrets.
  app.get("/api/storage/diagnostics", async (_req, res) => {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

    const supabaseUrlConfigured = Boolean(supabaseUrl && supabaseUrl.trim().length > 0);
    const serviceRoleKeyConfigured = Boolean(serviceRoleKey && serviceRoleKey.trim().length > 0);

    if (!supabaseUrlConfigured || !serviceRoleKeyConfigured) {
      return res.status(500).json({
        supabaseUrlConfigured,
        serviceRoleKeyConfigured,
        bucket: "notice-files",
        bucketAccessible: false,
        supabaseRequestTimeMs: 0,
        error: "Supabase credentials not configured. Please ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in Render backend environment variables.",
      });
    }

    const startTime = Date.now();
    try {
      const supabase = getSupabaseClient();
      const { data: bucket, error: bucketError } = await supabase.storage.getBucket("notice-files");
      const supabaseRequestTimeMs = Date.now() - startTime;

      if (bucketError) {
        return res.status(502).json({
          supabaseUrlConfigured: true,
          serviceRoleKeyConfigured: true,
          bucket: "notice-files",
          bucketAccessible: false,
          supabaseRequestTimeMs,
          error: bucketError.message || "Failed to retrieve notice-files bucket from Supabase Storage.",
        });
      }

      return res.json({
        supabaseUrlConfigured: true,
        serviceRoleKeyConfigured: true,
        bucket: "notice-files",
        bucketAccessible: !!bucket,
        supabaseRequestTimeMs,
        error: null,
      });
    } catch (err: any) {
      const supabaseRequestTimeMs = Date.now() - startTime;
      return res.status(500).json({
        supabaseUrlConfigured: true,
        serviceRoleKeyConfigured: true,
        bucket: "notice-files",
        bucketAccessible: false,
        supabaseRequestTimeMs,
        error: err?.message || "Internal exception during Supabase Storage diagnostics.",
      });
    }
  });

  // Supabase Storage Upload Endpoint for PDF documents and poster images
  // Storage bucket: "notice-files"
  app.post("/api/storage/upload", (req, res) => {
    upload.single("file")(req, res, async (err: any) => {
      if (err) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            success: false,
            error: "File size exceeds 50 MB maximum limit.",
          });
        }
        if (err.message === "INVALID_MIME_TYPE") {
          return res.status(400).json({
            success: false,
            error: "Invalid file type. Only PDF documents and image files (PNG, JPG, WEBP, GIF, SVG) are allowed.",
          });
        }
        return res.status(400).json({
          success: false,
          error: err.message || "File upload processing error.",
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: "No file provided. Please attach a file under the 'file' field.",
        });
      }

      // Backend admin security verification
      const authHeader = req.headers.authorization;
      const adminRole = (req.headers["x-admin-role"] as string) || "";
      const isAuthorizedRole = adminRole === "super-admin" || adminRole === "dept-admin";
      const hasBearerToken = !!(authHeader && authHeader.startsWith("Bearer ") && authHeader.length > 10);

      if (!isAuthorizedRole && !hasBearerToken) {
        return res.status(403).json({
          success: false,
          error: "Unauthorized: Admin privileges required to upload files to notice storage.",
        });
      }

      try {
        const supabase = getSupabaseClient();
        const file = req.file;
        const originalName = file.originalname || (file.mimetype === "application/pdf" ? "circular.pdf" : "poster.jpg");
        const cleanName = originalName.replace(/[^a-zA-Z0-9.-]/g, "_");
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(2, 9);
        const folder = file.mimetype === "application/pdf" ? "circulars" : "posters";
        const storagePath = `${folder}/${timestamp}_${randomSuffix}_${cleanName}`;

        const bucketName = "notice-files";

        // Upload to Supabase Storage bucket 'notice-files' preserving Content-Type
        const { error: uploadError } = await supabase.storage
          .from(bucketName)
          .upload(storagePath, file.buffer, {
            contentType: file.mimetype,
            upsert: false,
          });

        if (uploadError) {
          console.error("Supabase Storage upload error:", uploadError);
          return res.status(500).json({
            success: false,
            error: uploadError.message || "Failed to upload file to Supabase Storage bucket 'notice-files'.",
          });
        }

        // Retrieve public URL from Supabase Storage
        const { data: publicUrlData } = supabase.storage
          .from(bucketName)
          .getPublicUrl(storagePath);

        const publicUrl = publicUrlData?.publicUrl;

        if (!publicUrl) {
          return res.status(500).json({
            success: false,
            error: "Failed to generate public URL for uploaded file from Supabase Storage.",
          });
        }

        return res.json({
          success: true,
          publicUrl,
          path: storagePath,
        });
      } catch (uploadErr: any) {
        console.error("Supabase storage upload exception:", uploadErr?.message || uploadErr);
        return res.status(500).json({
          success: false,
          error: uploadErr?.message || "Internal server error during storage upload.",
        });
      }
    });
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
