# NBKRIST Smart Digital Signage — Raspberry Pi Appliance Guide

This guide documents how to configure a Raspberry Pi into a dedicated, self-healing **Smart Digital Signage Appliance** for the **NBKR Institute of Science & Technology (NBKRIST)** Smart Digital Notice Board system.

---

## 📌 Architecture Overview

```
 ┌────────────────────────────────────────────────────────┐
 │          Administrator Device (Laptop / Mobile)        │
 │                                                        │
 │   URL: https://YOUR-NETLIFY-DOMAIN.netlify.app/        │
 │   • Admin Login ID & Password                          │
 │   • Google reCAPTCHA v2 Verification                   │
 │   • Firebase Authentication                            │
 │   • Manage Circulars, Marquee Alerts, TV Slates        │
 └──────────────────────────┬─────────────────────────────┘
                            │ Realtime Push
 ┌──────────────────────────▼─────────────────────────────┐
 │       NBKRIST Central Cloud & Backend Services         │
 │                                                        │
 │   • Firebase Firestore (Realtime Synchronized DB)      │
 │   • Express Backend (reCAPTCHA Verification, Telegram) │
 └──────────────────────────┬─────────────────────────────┘
                            │ Realtime Push (Live) + IndexedDB (Offline)
 ┌──────────────────────────▼─────────────────────────────┐
 │          Raspberry Pi Display Node (Campus TV)         │
 │                                                        │
 │   URL: https://YOUR-NETLIFY-DOMAIN.netlify.app/?mode=kiosk
 │   • Fullscreen Chromium Kiosk Mode (No Admin Access)   │
 │   • Auto-boots Directly into Notice Board TV Display   │
 │   • 30s Heartbeat & 90s Online/Offline Telemetry       │
 │   • Offline Fallback via IndexedDB Cache               │
 └────────────────────────────────────────────────────────┘
```

---

## 🛠️ Hardware Requirements

1. **Raspberry Pi**: Raspberry Pi 4 Model B (recommended), Raspberry Pi 5, or Raspberry Pi 3 Model B+.
2. **MicroSD Card**: 16GB or 32GB Class 10 MicroSD Card.
3. **Power Supply**: Official 5V 3A (USB-C) power adapter.
4. **Display**: Campus Department Hallway LED / LCD TV or Monitor connected via Micro-HDMI to HDMI.
5. **Network**: Campus Wi-Fi or Wired Ethernet RJ-45 cable.

---

## 🚀 Step-by-Step Installation

### Step 1: Prepare Raspberry Pi OS

1. Download and run the **Raspberry Pi Imager** on your computer: [https://www.raspberrypi.com/software/](https://www.raspberrypi.com/software/)
2. Choose OS: **Raspberry Pi OS with Desktop (32-bit or 64-bit)**.
3. In Raspberry Pi Imager Settings:
   - Set Hostname (e.g., `nbkrist-ece-pi`).
   - Set Username (e.g., `pi`) and password.
   - Configure campus Wi-Fi SSID and Password.
   - Enable **SSH**.
4. Write to the MicroSD card, insert it into the Raspberry Pi, and connect power and the TV HDMI cable.

---

### Step 2: Configure Desktop Auto-Login

Ensure the Raspberry Pi boots straight into the graphical desktop without prompting for a login password:

```bash
sudo raspi-config
```

- Navigate to: **System Options** -> **Boot / Auto Login** -> **Desktop Autologin (Desktop GUI, automatically logged in as 'pi')**.
- Select **Finish** and do not reboot yet.

---

### Step 3: Configure Kiosk URL & Department

Create the configuration file `/etc/nbkrist-kiosk.env`:

```bash
sudo nano /etc/nbkrist-kiosk.env
```

Add your deployed Netlify frontend URL and department:

```bash
# Deployed Netlify Frontend URL (without trailing slash)
APP_URL="https://YOUR-NETLIFY-DOMAIN.netlify.app"

# Physical department display location
# Choices: CSE, ECE, EEE, MECH, CIVIL, MBA, MCA, ALL
DEPARTMENT="ECE"

# Unique identifier for this physical TV display
DEVICE_ID="NBKR-ECE-01"

# Backend server URL for hardware diagnostics telemetry
BACKEND_URL="https://YOUR-BACKEND-DOMAIN"
```

Save and exit (`Ctrl+O`, `Enter`, `Ctrl+X`).

---

### Step 4: Run the Automated Setup Script

Run the kiosk setup script:

```bash
cd /home/pi
git clone https://github.com/veera-123-narayana/nbkrist_smart_notice_board.git
cd nbkrist_smart_notice_board/raspberry-pi
sudo bash setup-kiosk.sh
```

The script automatically:
- Installs `chromium-browser`, `unclutter` (hides mouse cursor), `xdotool`, and Python telemetry tools.
- Disables screen blanking, screensaver timeouts, and DPMS monitor power-saving.
- Configures desktop autostart to launch `kiosk-start.sh` on boot.
- Enables the self-healing watchdog daemon.

---

### Step 5: Test the Kiosk Launcher

You can test launching the kiosk display manually:

```bash
bash /home/pi/nbkrist_smart_notice_board/raspberry-pi/kiosk-start.sh
```

The screen will:
1. Prevent screen blanking and disable screensaver timeouts (`xset s off -dpms`).
2. Hide the mouse cursor after 0.5 seconds of inactivity.
3. Open Chromium in true edge-to-edge fullscreen kiosk mode with:
   `https://YOUR-NETLIFY-DOMAIN.netlify.app/?mode=kiosk&dept=ECE&deviceId=NBKR-ECE-01`
4. Automatically connect to Firebase real-time updates and start cycling through active campus notices and marquee alerts.
5. Fall back to local IndexedDB offline storage automatically if the network drops.

---

### Step 6: Reboot to Activate Appliance Mode

```bash
sudo reboot
```

Upon boot, the Raspberry Pi will automatically connect to Wi-Fi, launch the fullscreen display, and start broadcasting the notice board. **No admin login or keyboard interaction is required on the TV.**

---

## ⚡ Technical Features

### 1. Dedicated Kiosk Mode (`?mode=kiosk`)
- The Raspberry Pi opens `https://YOUR-NETLIFY-DOMAIN.netlify.app/?mode=kiosk`.
- Kiosk mode renders `KioskDisplay` directly.
- Admin controls and navigation menus are strictly disabled in kiosk mode.

### 2. 30-Second Heartbeat & 90-Second Online Detection
- Every 30 seconds, the kiosk sends a lightweight update to Firebase with `lastHeartbeat`.
- The Admin Portal evaluates the 90-second threshold:
  - **Online**: Heartbeat received within 90 seconds (emerald pulsating indicator).
  - **Offline**: No heartbeat for > 90 seconds.

### 3. Offline IndexedDB Cache
- All notices, circular PDFs, image banners, marquee alerts, and themes are automatically stored in browser **IndexedDB** (`nbkrist_signage_db`).
- If campus Wi-Fi drops, rotation continues seamlessly using cached notices.

### 4. Self-Healing Watchdog
- If Chromium crashes, the watchdog clears crash flags (`exit_type: Normal`) and relaunches Chromium automatically within 15 seconds.

### 5. Hardware Diagnostics Agent
- Reports CPU temperature, memory usage, uptime, and Wi-Fi signal to `${BACKEND_URL}/api/device/health`.

---

## 🔍 Management & Debugging Commands

Check the status of the watchdog service:
```bash
sudo systemctl status nbkrist-watchdog.service
```

Restart the kiosk without rebooting:
```bash
pkill -f chromium
```
