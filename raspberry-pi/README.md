# NBKRIST Smart Digital Signage — Raspberry Pi Appliance Guide

This guide documents how to turn a standard Raspberry Pi into a dedicated, self-healing **Smart Digital Signage Appliance** for the **NBKR Institute of Science & Technology (NBKRIST)** Smart Digital Notice Board system.

---

## 📌 Architecture Overview

```
 ┌────────────────────────────────────────────────────────┐
 │            NBKRIST Raspberry Pi Display Node           │
 │                                                        │
 │   ┌───────────────────────┐  ┌─────────────────────┐   │
 │   │  Chromium Fullscreen  │  │ Python Health Agent │   │
 │   │  Kiosk Appliance Mode │  │  (CPU, RAM, Temp)   │   │
 │   └──────────┬────────────┘  └──────────┬──────────┘   │
 │              │                          │              │
 │   ┌──────────▼────────────┐             │              │
 │   │ IndexedDB Offline     │             │              │
 │   │ Local Signage Cache   │             │              │
 │   └───────────────────────┘             │              │
 └──────────────┬──────────────────────────┼──────────────┘
                │                          │
        Realtime Sync & Heartbeat    Telemetry POST
                │                          │
 ┌──────────────▼──────────────────────────▼──────────────┐
 │    NBKRIST Central Cloud Deployment & Firebase Hub     │
 │                                                        │
 │   • Real-Time Firestore Sync       • Emergency Override │
 │   • 30s Heartbeat Monitoring       • Telegram Notifier │
 │   • 90s Online/Offline Detection   • College Admin Web │
 └────────────────────────────────────────────────────────┘
```

---

## 🛠️ Hardware Requirements

1. **Raspberry Pi**: Raspberry Pi 4 Model B (recommended, 2GB or 4GB), Raspberry Pi 5, Raspberry Pi 3 Model B+, or Raspberry Pi Zero 2 W.
2. **MicroSD Card**: 16GB or 32GB Class 10 / A1 MicroSD Card.
3. **Power Supply**: Official 5V 3A (USB-C for Pi 4/5) power adapter.
4. **Display**: Campus Department Hallway LED / LCD TV or Monitor connected via Micro-HDMI to HDMI.
5. **Network**: Campus Wi-Fi (NBKRIST_WIFI) or Wired Ethernet RJ-45 cable.

---

## 🚀 Step-by-Step Installation

### Step 1: Prepare Raspberry Pi OS

1. Download and run the **Raspberry Pi Imager** on your computer: [https://www.raspberrypi.com/software/](https://www.raspberrypi.com/software/)
2. Choose OS: **Raspberry Pi OS (32-bit or 64-bit) with Desktop**.
3. Click the gear icon (**Settings**) in Raspberry Pi Imager:
   - Set Hostname (e.g., `nbkrist-ece-pi`).
   - Set Username (e.g., `pi`) and password.
   - Configure Wi-Fi SSID and Password for the campus network.
   - Enable **SSH**.
4. Write to the MicroSD card, insert it into the Raspberry Pi, and power on.

---

### Step 2: Configure Desktop Auto-Login

Ensure the Raspberry Pi automatically boots straight into the graphical desktop without prompting for a login password:

```bash
sudo raspi-config
```

- Navigate to: **System Options** -> **Boot / Auto Login** -> **Desktop Autologin (Desktop GUI, automatically logged in as 'pi')**.
- Select **Finish** and do not reboot yet.

---

### Step 3: Run the Automated Setup Script

Clone or copy the `raspberry-pi/` directory to the Raspberry Pi:

```bash
cd /home/pi
git clone https://github.com/veera-123-narayana/nbkrist_smart_notice_board.git
cd nbkrist_smart_notice_board/raspberry-pi
sudo bash setup-kiosk.sh
```

The script automatically:
- Installs `chromium-browser`, `unclutter` (cursor hider), `xdotool`, and Python diagnostic libraries.
- Disables screen blanking, screensaver timeouts, and DPMS monitor power-saving.
- Configures desktop autostart.
- Registers and enables the background self-healing watchdog and device health services.

---

### Step 4: Configure Department & Device Identity

Open the kiosk launcher configuration (`raspberry-pi/kiosk-start.sh`):

```bash
nano /home/pi/nbkrist-signage/raspberry-pi/kiosk-start.sh
```

Update the configuration variables at the top (or set them in `/etc/nbkrist-kiosk.env`):

```bash
# Set to your deployed application HTTPS URL (e.g. your custom domain or Firebase Hosting URL)
APP_URL="https://YOUR-DEPLOYED-DOMAIN.com"

# Set to the physical department location of this display
# Choices: CSE, ECE, EEE, MECH, CIVIL, MBA, MCA, ALL
DEPARTMENT="ECE"

# Unique hardware device identifier for this physical screen
DEVICE_ID="NBKR-ECE-01"
```

Save and exit (`Ctrl+O`, `Enter`, `Ctrl+X`).

---

### Step 5: Desktop Autostart Configuration

We provide an autostart template: `raspberry-pi/autostart-example.conf`.

1. **For standard Raspberry Pi OS (LXDE Desktop)**:
   ```bash
   mkdir -p ~/.config/lxsession/LXDE-pi
   cp raspberry-pi/autostart-example.conf ~/.config/lxsession/LXDE-pi/autostart
   ```

2. **For Raspberry Pi OS Bookworm (Wayland / Wayfire)**:
   Add the following to `~/.config/wayfire.ini` under `[autostart]`:
   ```ini
   [autostart]
   kiosk = /bin/bash /home/pi/nbkrist-signage/raspberry-pi/kiosk-start.sh
   screensaver = false
   dpms = false
   ```

---

### Step 6: Test the Kiosk Launcher

You can test launching the kiosk display manually:

```bash
bash /home/pi/nbkrist-signage/raspberry-pi/kiosk-start.sh
```

The screen will:
1. Prevent screen blanking and disable screensaver timeouts (`xset s off -dpms`).
2. Hide the mouse cursor after 0.5 seconds of inactivity via `unclutter`.
3. Open Chromium in true edge-to-edge fullscreen kiosk mode with `?mode=kiosk&dept=ECE&deviceId=NBKR-ECE-01`.
4. Connect to Firebase real-time updates and fall back to local IndexedDB offline storage automatically if the network drops.
3. Automatically load `https://YOUR_DEPLOYED_APP_URL/?mode=kiosk&dept=ECE&deviceId=NBKR-ECE-01`.
4. Register the device in Firebase and start emitting a 30-second heartbeat.
5. Cache all current circulars, posters, and alerts into IndexedDB.

---

### Step 6: Reboot to Activate Appliance Mode

```bash
sudo reboot
```

Upon boot, the Raspberry Pi will automatically connect to Wi-Fi, start the watchdog and health agent, and launch into the NBKRIST Smart Digital Notice Board.

---

## ⚡ Feature Implementation Details

### 1. Device Registration (FEATURE 2)
- Each Raspberry Pi identifies itself with a unique identifier (e.g. `NBKR-ECE-01`).
- The device is automatically registered in the Firebase Firestore `devices` collection.
- Fields stored:
  - `deviceId`: "NBKR-ECE-01"
  - `department`: "ECE"
  - `deviceName`: "NBKRIST ECE Smart TV Display (NBKR-ECE-01)"
  - `status`: "online"
  - `lastHeartbeat`: ISO timestamp
  - `lastSync`: ISO timestamp
  - `appVersion`: "1.0.0"
  - `screenResolution`: "1920x1080"

### 2. 30-Second Heartbeat & 90-Second Online Detection (FEATURES 3 & 4)
- Every 30 seconds, the kiosk sends a lightweight update to Firebase with `lastHeartbeat`.
- The Admin Portal evaluates the 90-second threshold:
  - **Online**: Heartbeat received within the last 90 seconds (emerald pulsating indicator on Admin Portal TV Monitor list).
  - **Offline**: No heartbeat for > 90 seconds (switches to offline status).
- Does NOT reload the browser page or disrupt the notice rotation.

### 3. Offline Display Cache (FEATURE 5)
- All notices, circular PDFs, image banners, marquee alerts, and themes are automatically stored in browser **IndexedDB** (`nbkrist_signage_db`).
- If campus Wi-Fi or Internet is disconnected:
  - The alert marquee displays `CACHED` (pulsing indicator).
  - The rotation engine seamlessly continues cycling through cached notices.
  - When connection is restored, the display reconnects, updates the cache, and switches back to `LIVE`.

### 4. Self-Healing Watchdog (FEATURE 6)
- The systemd watchdog daemon (`watchdog.sh`) runs every 15 seconds.
- If Chromium crashes, the watchdog:
  - Clears Chromium crash state flags (`exit_type: Normal`, `exited_cleanly: true`) to prevent "Restore pages" popups.
  - Relaunches Chromium into kiosk mode automatically.
- Re-enables display power state (`xset -dpms`) to guarantee the TV never sleeps.

### 5. Hardware Diagnostics Agent (FEATURE 7)
- `device-agent.py` runs in the background as `nbkrist-agent.service`.
- Reports hardware metrics to `/api/device/health` every 60 seconds:
  - CPU Temperature (`/sys/class/thermal/thermal_zone0/temp`)
  - CPU Usage % (`psutil.cpu_percent`)
  - RAM Usage % (`psutil.virtual_memory`)
  - Disk Usage % (`psutil.disk_usage`)
  - System Uptime
  - Connected Wi-Fi SSID
  - Local IP Address

### 6. Emergency & Priority Override (FEATURE 8)
- **Emergency Priority**: Immediately interrupts normal notice rotation and displays a full-screen emergency broadcast with college stamp, voice synthesis alert announcement, and QR verification.
- **Urgent Priority**: Placed at the front of the rotation queue and displayed for 35 seconds.
- **High Priority**: Displayed for 30 seconds.
- **Medium Priority**: Displayed for 15 seconds.
- **Normal Priority**: Displayed for 10 seconds.

### 7. Telegram Integration (FEATURE 9)
- Urgent and emergency notices published via the Admin Portal trigger the backend Telegram bot (`/telegram/send`).
- Verified ECE Department Telegram Chat ID: `-5494111938`.

---

## 🔍 Management & Debugging Commands

Check the status of the watchdog service:
```bash
sudo systemctl status nbkrist-watchdog.service
```

Check the status of the device telemetry agent:
```bash
sudo systemctl status nbkrist-agent.service
```

View live device telemetry logs:
```bash
journalctl -u nbkrist-agent.service -f
```

Query device health from any computer on the campus network:
```bash
curl http://YOUR_APP_URL/api/device/health/NBKR-ECE-01
```

Restart the kiosk without rebooting:
```bash
pkill -f chromium
```
(The watchdog will automatically relaunch it within 15 seconds).
