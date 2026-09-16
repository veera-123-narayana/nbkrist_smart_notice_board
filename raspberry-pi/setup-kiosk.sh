#!/bin/bash
# ==============================================================================
# NBKRIST SMART DIGITAL NOTICE BOARD - RASPBERRY PI APPLIANCE SETUP
# ==============================================================================
# Automates the complete setup of Raspberry Pi OS into a dedicated, self-healing
# smart digital signage appliance for NBKRIST departments.
# ==============================================================================

set -e

echo "========================================================"
echo " 🎓 NBKR Institute of Science & Technology"
echo " 📺 Smart Digital Signage - Raspberry Pi Setup Utility"
echo "========================================================"

# Check root privileges
if [ "$EUID" -ne 0 ]; then
  echo "[-] Please run this script with sudo: sudo bash setup-kiosk.sh"
  exit 1
fi

PI_USER="${SUDO_USER:-pi}"
PI_HOME=$(getent passwd "$PI_USER" | cut -d: -f6)
INSTALL_DIR="$PI_HOME/nbkrist-signage"

echo "[+] Target User: $PI_USER"
echo "[+] Home Directory: $PI_HOME"
echo "[+] Target Install Directory: $INSTALL_DIR"

# 1. Update package lists and install required tools
echo "[1/6] Updating APT repositories and installing dependencies..."
apt-get update -y
apt-get install -y \
  chromium-browser \
  unclutter \
  xdotool \
  curl \
  wget \
  python3 \
  python3-pip \
  python3-psutil \
  python3-requests \
  x11-xserver-utils

# 2. Prepare directory structure
echo "[2/6] Setting up signage directory structure..."
mkdir -p "$INSTALL_DIR"
mkdir -p "$PI_HOME/.config/autostart"

# Copy scripts to user home
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cp "$SCRIPT_DIR/start-kiosk.sh" "$INSTALL_DIR/"
cp "$SCRIPT_DIR/watchdog.sh" "$INSTALL_DIR/"
cp "$SCRIPT_DIR/device-agent.py" "$INSTALL_DIR/"

chmod +x "$INSTALL_DIR/start-kiosk.sh"
chmod +x "$INSTALL_DIR/watchdog.sh"
chmod +x "$INSTALL_DIR/device-agent.py"
chown -R "$PI_USER:$PI_USER" "$INSTALL_DIR"

# 3. Disable Screen Blanking, Screensaver, and DPMS Power Saving
echo "[3/6] Disabling screen blanking and power management..."

# LightDM X11 config
LIGHTDM_CONF="/etc/lightdm/lightdm.conf"
if [ -f "$LIGHTDM_CONF" ]; then
  if grep -q "xserver-command=X -s 0 -dpms" "$LIGHTDM_CONF"; then
    echo "    LightDM power savings already disabled."
  else
    sed -i 's/^#xserver-command=X/xserver-command=X -s 0 -dpms/' "$LIGHTDM_CONF" || \
    echo "xserver-command=X -s 0 -dpms" >> "$LIGHTDM_CONF"
  fi
fi

# Wayland / Wayfire config (Raspberry Pi OS Bookworm)
WAYFIRE_INI="$PI_HOME/.config/wayfire.ini"
if [ -f "$WAYFIRE_INI" ]; then
  if ! grep -q "idle_time = -1" "$WAYFIRE_INI"; then
    cat <<EOT >> "$WAYFIRE_INI"

[idle]
toggle = none
dpms_timeout = -1
screensaver_timeout = -1
EOT
  fi
  chown "$PI_USER:$PI_USER" "$WAYFIRE_INI"
fi

# 4. Configure Autostart desktop entry
echo "[4/6] Configuring desktop autostart entry..."
cat <<EOT > "$PI_HOME/.config/autostart/nbkrist-kiosk.desktop"
[Desktop Entry]
Type=Application
Name=NBKRIST Smart Signage Kiosk
Exec=$INSTALL_DIR/start-kiosk.sh
Hidden=false
NoDisplay=false
X-GNOME-Autostart-enabled=true
EOT
chown "$PI_USER:$PI_USER" "$PI_HOME/.config/autostart/nbkrist-kiosk.desktop"

# 5. Setup Watchdog and Health Agent Systemd Services
echo "[5/6] Registering systemd background services..."

# Watchdog Service
cat <<EOT > /etc/systemd/system/nbkrist-watchdog.service
[Unit]
Description=NBKRIST Smart Signage Kiosk Watchdog
After=network-online.target graphical.target
Wants=network-online.target

[Service]
Type=simple
User=$PI_USER
Environment=DISPLAY=:0
Environment=XAUTHORITY=$PI_HOME/.Xauthority
ExecStart=/bin/bash $INSTALL_DIR/watchdog.sh
Restart=always
RestartSec=10

[Install]
WantedBy=graphical.target
EOT

# Hardware Telemetry Agent Service
cat <<EOT > /etc/systemd/system/nbkrist-agent.service
[Unit]
Description=NBKRIST Signage Device Health Agent
After=network.target

[Service]
Type=simple
User=$PI_USER
ExecStart=/usr/bin/python3 $INSTALL_DIR/device-agent.py
Restart=always
RestartSec=15

[Install]
WantedBy=multi-user.target
EOT

systemctl daemon-reload
systemctl enable nbkrist-watchdog.service
systemctl enable nbkrist-agent.service

echo "[6/6] Configuration completed successfully!"
echo "========================================================"
echo " ✅ NBKRIST Smart Digital Signage installation complete!"
echo " "
echo " Edit '$INSTALL_DIR/start-kiosk.sh' to set your deployed app URL & department:"
echo "   APP_URL=\"https://YOUR_DEPLOYED_APP_URL\""
echo "   DEPARTMENT=\"ECE\""
echo "   DEVICE_ID=\"NBKR-ECE-01\""
echo " "
echo " Reboot now with: sudo reboot"
echo "========================================================"
