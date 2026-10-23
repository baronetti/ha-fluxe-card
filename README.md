# ⚡ Fluxe Card (`fluxe-card`)

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-41BDF5.svg)](https://github.com/hacs/default)
[![GitHub Release](https://img.shields.io/github/v/release/baronetti/ha-fluxe-card?color=41BDF5&style=flat-square)](https://github.com/baronetti/ha-fluxe-card/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/baronetti/ha-fluxe-card/blob/main/LICENSE)

A sleek and lightweight energy flow card for Home Assistant Lovelace UI. It visualizes real-time power distribution with smooth bezier curves, interactive hover effects, and a fully native visual editor.

<p align="center">
  <img src="https://raw.githubusercontent.com/baronetti/ha-fluxe-card/main/assets/FluxeCardDemo.gif" alt="Fluxe Card Demo" width="400">
</p>

---

## Features

- **High Performance:** DOM-preserving architecture for ultra-smooth 60 FPS animations.
- **Fully Customizable:** Custom icons, custom labels, and personalized color coding for every load.
- **Dynamic Flow Lines:** Line thickness automatically scales according to actual power consumption.
- **Native UI Editor:** Seamless integration with Home Assistant's card editor (no manual YAML required).
- **Active Filter Toggle:** Toggle between showing all entities or only active loads (> 2W) with a single tap.
- **Automatic Unmonitored Calculation:** Automatically calculates and displays residual/unmonitored house load.

---

## Installation

### Method 1: HACS (Recommended)

1. Open **HACS** in your Home Assistant instance.
2. Search for **Fluxe Card**.
3. Click **Download**.
4. Refresh your browser page.

> **Note:** If the card is not yet listed in the default catalog, you can temporarily add it as a custom repository: open **HACS**, click the 3 dots in the top right corner, select **Custom repositories**, add `https://github.com/baronetti/ha-fluxe-card` as category **Dashboard**, and click **Add**.

### Method 2: Manual Installation

1. Download `fluxe-card.js` from the [latest release](https://github.com/baronetti/ha-fluxe-card/releases).
2. Copy `fluxe-card.js` into your `/config/www/` directory.
3. Go to **Settings > Dashboards > 3 dots (top right) > Resources**.
4. Add a new resource:
   - **Url:** `/local/fluxe-card.js`
   - **Resource Type:** `JavaScript Module`
5. Refresh your browser page.

---

## Configuration

You can fully configure the card using the visual card editor in Dashboard edit mode.

### YAML Example

```yaml
type: custom:fluxe-card
title: Instant Energy Flow
main_entity: sensor.grid_power
main_name: Grid
main_icon: mdi:transmission-tower
max_power: 3000
other_name: Other
other_color: '#64748b'
devices:
  - entity: sensor.lights_power
    name: Lights
    icon: mdi:lightbulb-group
    color: '#f1c40f'
  - entity: sensor.workstation_power
    name: Workstation
    icon: mdi:desktop-tower-monitor
    color: '#3498db'
show_toggle_button: true
show_other: true
other_mode: difference
default_view: active
```
