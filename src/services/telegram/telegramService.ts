const API = "http://localhost:5000";

export async function sendTelegramNotice(data: any) {
  const response = await fetch(`${API}/telegram/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  return await response.json();
}