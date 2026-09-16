export async function sendTelegramNotice(data: any) {
  try {
    const rawBackend = import.meta.env.VITE_BACKEND_URL || "";
    const backendUrl = rawBackend.replace(/\/+$/, "");
    const endpoint = backendUrl ? `${backendUrl}/telegram/send` : "/telegram/send";

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.warn("Telegram API returned non-OK status:", response.status, result);
    }
    return result;
  } catch (err) {
    console.warn("Telegram notice dispatch failed or server offline:", err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}