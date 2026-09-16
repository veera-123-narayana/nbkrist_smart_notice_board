import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Anti-bot CAPTCHA cryptographic secret and replay protection store
const CAPTCHA_SECRET = process.env.CAPTCHA_SECRET || "nbkrist-smart-signage-captcha-key-2026";
const usedChallengeIds = new Set<string>();

// Periodic cleanup of used challenge IDs to avoid memory leaks
setInterval(() => {
  if (usedChallengeIds.size > 5000) {
    usedChallengeIds.clear();
  }
}, 300000);

// Generates an anti-bot distorted SVG challenge with noise lines, dots, and rotated glyphs
function generateCaptchaSvg(code: string): string {
  const width = 160;
  const height = 48;
  
  // Random noise lines across the canvas
  let lines = "";
  const lineColors = ["#6366f1", "#06b6d4", "#ec4899", "#10b981", "#f59e0b"];
  for (let i = 0; i < 4; i++) {
    const x1 = Math.floor(Math.random() * width);
    const y1 = Math.floor(Math.random() * height);
    const x2 = Math.floor(Math.random() * width);
    const y2 = Math.floor(Math.random() * height);
    lines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${lineColors[i % lineColors.length]}" stroke-width="1.5" opacity="0.65"/>`;
  }

  // Noise dots
  let dots = "";
  for (let i = 0; i < 30; i++) {
    const cx = Math.floor(Math.random() * width);
    const cy = Math.floor(Math.random() * height);
    const r = (Math.random() * 1.5 + 0.5).toFixed(1);
    dots += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#94a3b8" opacity="0.4"/>`;
  }

  // Distorted text characters with random rotation, color, and baseline offset
  let textElements = "";
  const chars = code.split("");
  const startX = 18;
  const charSpacing = 26;
  const charColors = ["#f8fafc", "#38bdf8", "#818cf8", "#34d399", "#f472b6"];

  chars.forEach((char, idx) => {
    const x = startX + idx * charSpacing;
    const y = 33 + Math.floor(Math.random() * 6 - 3);
    const rot = Math.floor(Math.random() * 22 - 11);
    const color = charColors[idx % charColors.length];
    textElements += `<text x="${x}" y="${y}" font-family="monospace, Courier, sans-serif" font-weight="900" font-size="24" fill="${color}" transform="rotate(${rot}, ${x}, ${y})">${char}</text>`;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="background-color: #0b0f19; border-radius: 6px; border: 1px solid #1e293b; user-select: none;">
    ${lines}
    ${dots}
    ${textElements}
  </svg>`;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "25mb" }));

  // In-memory registry for device health telemetry
  const deviceHealthRegistry = new Map<string, any>();

  // API Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", service: "NBKRIST Smart Digital Notice Board" });
  });

  // Anti-bot CAPTCHA: Generate new challenge with server-signed HMAC
  app.get("/api/auth/captcha", (req, res) => {
    // Alphanumeric chars excluding confusing symbols (0, O, 1, I, l)
    const charset = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
    let code = "";
    for (let i = 0; i < 5; i++) {
      code += charset.charAt(Math.floor(Math.random() * charset.length));
    }

    const challengeId = crypto.randomUUID();
    const timestamp = Date.now();

    // Server-signed HMAC hash of the answer (the client cannot read or tamper with this)
    const signature = crypto
      .createHmac("sha256", CAPTCHA_SECRET)
      .update(`${challengeId}:${code}:${timestamp}`)
      .digest("hex");

    const captchaToken = `${challengeId}.${timestamp}.${signature}`;
    const svgContent = generateCaptchaSvg(code);
    const svgBase64 = `data:image/svg+xml;base64,${Buffer.from(svgContent).toString("base64")}`;

    return res.json({
      challengeId,
      captchaToken,
      captchaImage: svgBase64,
      expiresInSeconds: 120,
    });
  });

  // Anti-bot CAPTCHA: Verify response against server signature
  app.post("/api/auth/captcha/verify", (req, res) => {
    const { captchaToken, userInput } = req.body;

    if (!captchaToken || !userInput) {
      return res.status(400).json({ success: false, error: "Please enter the CAPTCHA security code." });
    }

    const parts = captchaToken.split(".");
    if (parts.length !== 3) {
      return res.status(400).json({ success: false, error: "Invalid CAPTCHA challenge format." });
    }

    const [challengeId, timestampStr, signature] = parts;
    const timestamp = parseInt(timestampStr, 10);
    const now = Date.now();

    // Max 120 seconds validity window
    if (isNaN(timestamp) || now - timestamp > 120000 || now < timestamp - 5000) {
      return res.status(400).json({ success: false, error: "Security CAPTCHA expired. Please click refresh to get a new code." });
    }

    // Prevent replay
    if (usedChallengeIds.has(challengeId)) {
      return res.status(400).json({ success: false, error: "Security CAPTCHA already submitted. Please reload." });
    }

    // Recompute HMAC for user's candidate input
    const normalizedInput = String(userInput).trim().toUpperCase();
    const expectedSignature = crypto
      .createHmac("sha256", CAPTCHA_SECRET)
      .update(`${challengeId}:${normalizedInput}:${timestamp}`)
      .digest("hex");

    const sigBuf = Buffer.from(signature, "hex");
    const expectedBuf = Buffer.from(expectedSignature, "hex");

    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return res.status(400).json({ success: false, error: "Incorrect CAPTCHA code. Please check and try again." });
    }

    // Mark as consumed
    usedChallengeIds.add(challengeId);

    // Issue verified proof token valid for 90 seconds
    const verifyTimestamp = Date.now();
    const proof = crypto
      .createHmac("sha256", CAPTCHA_SECRET)
      .update(`verified:${challengeId}:${verifyTimestamp}`)
      .digest("hex");

    return res.json({
      success: true,
      verificationToken: `${challengeId}.${verifyTimestamp}.${proof}`,
    });
  });

  // Telemetry endpoint for Raspberry Pi Local Device Health Agent
  app.post("/api/device/health", (req, res) => {
    const { deviceId, department, cpuTemp, cpuUsage, ramUsage, diskUsage, uptime, wifiSSID, ipAddress, appVersion } = req.body;
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

  // Telegram Notice Bot Route
  app.post("/telegram/send", async (req, res) => {
    try {
      const { chatId, title, description, department, priority } = req.body;
      const botToken = process.env.BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;

      if (!botToken) {
        console.warn("Telegram BOT_TOKEN is not configured in environment variables.");
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
  if (process.env.NODE_ENV !== "production") {
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
    console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
