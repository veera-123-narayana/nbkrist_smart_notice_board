#!/usr/bin/env python3
"""
NBKRIST SMART DIGITAL NOTICE BOARD - HARDWARE HEALTH AGENT
==========================================================
Collects device hardware metrics (CPU temperature, CPU usage, RAM,
Disk, Wi-Fi connection, Uptime) on the Raspberry Pi and reports them
to the NBKRIST Smart Notice Board backend service.
"""

import os
import sys
import time
import json
import socket
import subprocess

try:
    import psutil
except ImportError:
    psutil = None

try:
    import requests
except ImportError:
    requests = None

# Configuration (can be overridden via environment variables)
APP_URL = os.environ.get("APP_URL", "https://YOUR_DEPLOYED_APP_URL").rstrip("/")
DEVICE_ID = os.environ.get("DEVICE_ID", "NBKR-ECE-01")
DEPARTMENT = os.environ.get("DEPARTMENT", "ECE")
REPORT_INTERVAL = int(os.environ.get("REPORT_INTERVAL", "60")) # seconds
APP_VERSION = "1.0.0"


def get_cpu_temp():
    """Reads Raspberry Pi CPU temperature in Celsius."""
    # Method 1: Sysfs thermal zone (standard Linux & Pi)
    try:
        with open("/sys/class/thermal/thermal_zone0/temp", "r") as f:
            temp_raw = f.read().strip()
            return round(float(temp_raw) / 1000.0, 1)
    except Exception:
        pass

    # Method 2: vcgencmd (VideoCore query tool on Raspberry Pi OS)
    try:
        out = subprocess.check_output(["vcgencmd", "measure_temp"]).decode("utf-8")
        # Output format: temp=48.5'C
        val = out.replace("temp=", "").replace("'C", "").strip()
        return round(float(val), 1)
    except Exception:
        pass

    return None


def get_uptime_str():
    """Returns human-readable system uptime."""
    try:
        with open("/proc/uptime", "r") as f:
            uptime_seconds = float(f.readline().split()[0])
            days = int(uptime_seconds // (24 * 3600))
            hours = int((uptime_seconds % (24 * 3600)) // 3600)
            mins = int((uptime_seconds % 3600) // 60)
            if days > 0:
                return f"{days}d {hours}h {mins}m"
            elif hours > 0:
                return f"{hours}h {mins}m"
            else:
                return f"{mins}m"
    except Exception:
        return "unknown"


def get_wifi_ssid():
    """Gets currently connected Wi-Fi SSID."""
    try:
        ssid = subprocess.check_output(["iwgetid", "-r"]).decode("utf-8").strip()
        if ssid:
            return ssid
    except Exception:
        pass

    try:
        out = subprocess.check_output(["nmcli", "-t", "-f", "active,ssid", "dev", "wifi"]).decode("utf-8")
        for line in out.splitlines():
            if line.startswith("yes:"):
                return line.split(":", 1)[1]
    except Exception:
        pass

    return "Connected / Ethernet"


def get_ip_address():
    """Discovers current local IP address."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
    except Exception:
        ip = "127.0.0.1"
    finally:
        s.close()
    return ip


def collect_metrics():
    """Gathers complete device telemetry."""
    cpu_usage = None
    ram_usage = None
    disk_usage = None

    if psutil:
        try:
            cpu_usage = psutil.cpu_percent(interval=1.0)
            ram_usage = psutil.virtual_memory().percent
            disk_usage = psutil.disk_usage("/").percent
        except Exception as e:
            print(f"[Agent] psutil read error: {e}", file=sys.stderr)

    return {
        "deviceId": DEVICE_ID,
        "department": DEPARTMENT,
        "cpuTemp": get_cpu_temp(),
        "cpuUsage": cpu_usage,
        "ramUsage": ram_usage,
        "diskUsage": disk_usage,
        "uptime": get_uptime_str(),
        "wifiSSID": get_wifi_ssid(),
        "ipAddress": get_ip_address(),
        "appVersion": APP_VERSION,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }


def send_telemetry(payload):
    """Sends telemetry payload to backend."""
    endpoint = f"{APP_URL}/api/device/health"
    if requests is None:
        print("[Agent] 'requests' module not installed, skipping network send.", file=sys.stderr)
        return False

    try:
        response = requests.post(endpoint, json=payload, timeout=8)
        if response.status_code == 200:
            print(f"[Agent] Health report delivered successfully: Temp={payload.get('cpuTemp')}C, CPU={payload.get('cpuUsage')}%, RAM={payload.get('ramUsage')}%")
            return True
        else:
            print(f"[Agent] Server returned HTTP {response.status_code}: {response.text}", file=sys.stderr)
            return False
    except Exception as err:
        print(f"[Agent] Failed to post telemetry (offline/unreachable): {err}", file=sys.stderr)
        return False


def main():
    print("==================================================")
    print(" NBKRIST Signage Device Health Agent Started")
    print(f" Device ID:   {DEVICE_ID}")
    print(f" Department:  {DEPARTMENT}")
    print(f" Target URL:  {APP_URL}")
    print(f" Interval:    {REPORT_INTERVAL}s")
    print("==================================================")

    while True:
        try:
            metrics = collect_metrics()
            send_telemetry(metrics)
        except Exception as e:
            print(f"[Agent] Unhandled error during metrics cycle: {e}", file=sys.stderr)

        time.sleep(REPORT_INTERVAL)


if __name__ == "__main__":
    main()
