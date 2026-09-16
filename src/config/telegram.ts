// Telegram group configurations for department broadcasts
// Note: Bot secret token is stored exclusively backend-side in BOT_TOKEN environment variable.
export const TELEGRAM_CONFIG = {
  backendEndpoint: (import.meta.env.VITE_BACKEND_URL || "").replace(/\/+$/, "") + "/telegram/send",
};

export const TELEGRAM_GROUPS = {
  AIML: "-5281369270",
  CSE: "-5520023183",
  ECE: "-5494111938",
  EEE: "-5296368715",
  CIVIL: "-5278808277",
  MECHANICAL: "-5104471879",

  MBA: "",
  MCA: "",
};