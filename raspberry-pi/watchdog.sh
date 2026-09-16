#!/bin/bash
# ==============================================================================
# NBKRIST SMART DIGITAL NOTICE BOARD - KIOSK SELF-HEALING WATCHDOG
# ==============================================================================
# Monitors the signage kiosk process, handles automatic recovery from crashes,
# prevents screen sleeping, and maintains 24/7 uptime without user intervention.
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
START_SCRIPT="$SCRIPT_DIR/start-kiosk.sh"
CHECK_INTERVAL=15
CRASH_COUNT=0
MAX_RAPID_CRASHES=5

export DISPLAY="${DISPLAY:-:0}"
export XAUTHORITY="${XAUTHORITY:-$HOME/.Xauthority}"

echo "[Watchdog] NBKRIST Signage Watchdog started. Polling every ${CHECK_INTERVAL}s..."

while true; do
  sleep "$CHECK_INTERVAL"

  # 1. Check if Chromium / Chromium-browser is running
  if ! pgrep -f "chromium.*--kiosk" >/dev/null 2>&1; then
    echo "[Watchdog] ALERT: Chromium kiosk process not detected! Restarting..."
    
    CRASH_COUNT=$((CRASH_COUNT + 1))
    if [ "$CRASH_COUNT" -gt "$MAX_RAPID_CRASHES" ]; then
      echo "[Watchdog] Warning: Frequent restarts detected. Pausing 30 seconds before retry..."
      sleep 30
      CRASH_COUNT=0
    fi

    # Clean crash state if any
    CHROMIUM_DIR="$HOME/.config/chromium/Default"
    if [ -d "$CHROMIUM_DIR" ]; then
      PREFS_FILE="$CHROMIUM_DIR/Preferences"
      if [ -f "$PREFS_FILE" ]; then
        sed -i 's/"exit_type":"Crashed"/"exit_type":"Normal"/' "$PREFS_FILE" 2>/dev/null || true
        sed -i 's/"exited_cleanly":false/"exited_cleanly":true/' "$PREFS_FILE" 2>/dev/null || true
      fi
    fi

    # Start the kiosk process in background
    if [ -x "$START_SCRIPT" ]; then
      /bin/bash "$START_SCRIPT" &
    else
      echo "[Watchdog] Error: Cannot execute $START_SCRIPT"
    fi
  else
    # Process is running normally; reset rapid crash counter
    CRASH_COUNT=0
  fi

  # 2. Maintain display wakefulness (disable screensaver & DPMS power management)
  if command -v xset >/dev/null 2>&1; then
    xset s off 2>/dev/null || true
    xset -dpms 2>/dev/null || true
    xset s noblank 2>/dev/null || true
  fi

  # 3. Ensure unclutter cursor-hiding daemon is alive
  if command -v unclutter >/dev/null 2>&1; then
    if ! pgrep -x unclutter >/dev/null 2>&1; then
      unclutter -idle 0.5 -root &
    fi
  fi
done
