#!/bin/bash
# ==============================================================================
# NBKRIST SMART DIGITAL NOTICE BOARD - KIOSK BOOT LAUNCHER
# ==============================================================================
# Launches Chromium in dedicated, fullscreen kiosk mode pointing to the NBKRIST
# Smart Notice Board web application with automatic self-recovery.
# ==============================================================================

# CONFIGURATION - UPDATE FOR YOUR CAMPUS INSTALLATION
APP_URL="${APP_URL:-https://YOUR_DEPLOYED_APP_URL}"
DEPARTMENT="${DEPARTMENT:-ECE}"
DEVICE_ID="${DEVICE_ID:-NBKR-ECE-01}"

# Export X11 display environment
export DISPLAY="${DISPLAY:-:0}"
export XAUTHORITY="${XAUTHORITY:-$HOME/.Xauthority}"

# Construct appliance URL
KIOSK_URL="${APP_URL}/?mode=kiosk&dept=${DEPARTMENT}&deviceId=${DEVICE_ID}"

echo "[+] Starting NBKRIST Smart Signage Display..."
echo "[+] Device ID: $DEVICE_ID"
echo "[+] Department: $DEPARTMENT"
echo "[+] Target URL: $KIOSK_URL"

# 1. Wait for network connectivity (max 30 seconds wait)
echo "[+] Checking network connectivity..."
MAX_WAIT=30
COUNTER=0
while ! ping -c 1 -W 1 8.8.8.8 >/dev/null 2>&1 && ! ping -c 1 -W 1 1.1.1.1 >/dev/null 2>&1; do
  echo "    Waiting for network... ($COUNTER/$MAX_WAIT seconds)"
  sleep 1
  COUNTER=$((COUNTER + 1))
  if [ "$COUNTER" -ge "$MAX_WAIT" ]; then
    echo "[!] Network wait timed out. Proceeding to launch (offline cache will display notices)."
    break
  fi
done

# 2. Configure X11 Display power management to prevent display sleep/blanking
if command -v xset >/dev/null 2>&1; then
  xset s off       # Don't activate screensaver
  xset -dpms       # Disable DPMS (Energy Star) features
  xset s noblank   # Don't blank the video device
fi

# 3. Hide mouse cursor automatically when idle
if command -v unclutter >/dev/null 2>&1; then
  pkill -x unclutter 2>/dev/null || true
  unclutter -idle 0.5 -root &
fi

# 4. Clean up any previous Chromium crash flags to eliminate "Restore pages" prompts
CHROMIUM_DIR="$HOME/.config/chromium/Default"
if [ -d "$CHROMIUM_DIR" ]; then
  PREFS_FILE="$CHROMIUM_DIR/Preferences"
  if [ -f "$PREFS_FILE" ]; then
    sed -i 's/"exit_type":"Crashed"/"exit_type":"Normal"/' "$PREFS_FILE" 2>/dev/null || true
    sed -i 's/"exited_cleanly":false/"exited_cleanly":true/' "$PREFS_FILE" 2>/dev/null || true
  fi
fi

# 5. Detect Chromium binary
CHROMIUM_CMD="chromium-browser"
if ! command -v "$CHROMIUM_CMD" >/dev/null 2>&1; then
  if command -v chromium >/dev/null 2>&1; then
    CHROMIUM_CMD="chromium"
  fi
fi

# 6. Launch Chromium in dedicated appliance Kiosk mode
echo "[+] Launching $CHROMIUM_CMD in appliance mode..."
exec "$CHROMIUM_CMD" \
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
