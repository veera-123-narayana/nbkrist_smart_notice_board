#!/bin/bash
# ==============================================================================
# NBKRIST SMART DIGITAL NOTICE BOARD - RASPBERRY PI KIOSK LAUNCHER
# ==============================================================================
# Dedicated launcher for Chromium fullscreen kiosk mode.
# Directly opens the deployed Netlify frontend in Kiosk Appliance mode (?mode=kiosk).
# Requires NO admin login or user interaction.
# ==============================================================================

# 1. Configuration (Set your Netlify URL or configure in /etc/nbkrist-kiosk.env)
APP_URL="${APP_URL:-https://YOUR-NETLIFY-DOMAIN.netlify.app}"
DEPARTMENT="${DEPARTMENT:-ALL}"
DEVICE_ID="${DEVICE_ID:-NBKR-PI-01}"

# Read environment file if present
if [ -f "/etc/nbkrist-kiosk.env" ]; then
  # shellcheck disable=SC1091
  source "/etc/nbkrist-kiosk.env"
fi

if [ -f "$HOME/.nbkrist-kiosk.env" ]; then
  # shellcheck disable=SC1091
  source "$HOME/.nbkrist-kiosk.env"
fi

# Construct production Kiosk appliance URL
# Normal devices open: https://YOUR-NETLIFY-DOMAIN.netlify.app/
# Raspberry Pi opens:   https://YOUR-NETLIFY-DOMAIN.netlify.app/?mode=kiosk
KIOSK_URL="${APP_URL}/?mode=kiosk&dept=${DEPARTMENT}&deviceId=${DEVICE_ID}"

echo "[+] ========================================================"
echo "[+] Starting NBKRIST Smart Digital Notice Board (Kiosk Mode)"
echo "[+] Device ID   : $DEVICE_ID"
echo "[+] Department  : $DEPARTMENT"
echo "[+] Target URL  : $KIOSK_URL"
echo "[+] ========================================================"

# 2. Prevent screen blanking and disable monitor power saving
export DISPLAY="${DISPLAY:-:0}"
export XAUTHORITY="${XAUTHORITY:-$HOME/.Xauthority}"

if command -v xset >/dev/null 2>&1; then
  xset s off
  xset -dpms
  xset s noblank
fi

# 3. Hide mouse cursor when idle
if command -v unclutter >/dev/null 2>&1; then
  pkill -x unclutter 2>/dev/null || true
  unclutter -idle 0.5 -root &
fi

# 4. Clear previous crash flags to avoid 'Restore pages' prompt
CHROMIUM_PREFS="$HOME/.config/chromium/Default/Preferences"
if [ -f "$CHROMIUM_PREFS" ]; then
  sed -i 's/"exit_type":"Crashed"/"exit_type":"Normal"/' "$CHROMIUM_PREFS" 2>/dev/null || true
  sed -i 's/"exited_cleanly":false/"exited_cleanly":true/' "$CHROMIUM_PREFS" 2>/dev/null || true
fi

# 5. Wait for network connectivity (max 20 seconds, proceed to offline cache if offline)
echo "[+] Checking campus network connectivity..."
COUNTER=0
while ! ping -c 1 -W 1 8.8.8.8 >/dev/null 2>&1 && ! ping -c 1 -W 1 1.1.1.1 >/dev/null 2>&1; do
  sleep 1
  COUNTER=$((COUNTER + 1))
  if [ "$COUNTER" -ge 20 ]; then
    echo "[!] Network wait timed out. Launching kiosk (IndexedDB offline cache will load)."
    break
  fi
done

# 6. Locate Chromium binary
BROWSER="chromium-browser"
if ! command -v "$BROWSER" >/dev/null 2>&1; then
  BROWSER="chromium"
fi

# 7. Launch Chromium in dedicated fullscreen appliance Kiosk mode
# Disables info bars, translate prompts, crash bubbles, pinch-zoom, and context menus
exec "$BROWSER" \
  --kiosk \
  --noerrdialogs \
  --disable-infobars \
  --check-for-update-interval=31536000 \
  --disable-pinch \
  --overscroll-history-navigation=0 \
  --disable-features=TranslateUI \
  --disable-session-crashed-bubble \
  --no-first-run \
  --fast \
  --fast-start \
  --disable-default-apps \
  --autoplay-policy=no-user-gesture-required \
  "$KIOSK_URL"
