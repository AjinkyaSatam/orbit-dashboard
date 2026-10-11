# EnviroHub – ESP32 Hardware Integration Guide

This guide details how to flash the ESP32 microcontroller, wire the 6 environmental sensors and 3 hardware actuators, and connect it with the **EnviroHub Web Dashboard** via HiveMQ MQTT.

---

## 1. Hardware Pinout & Wiring Diagram

| Component | Sensor / Actuator | ESP32 GPIO Pin | Type / Details |
|---|---|---|---|
| **MQ-135** | Gas & Air Quality Sensor | **GPIO 34** (ADC1) | Analog Output (`A0`) |
| **Flame Sensor** | Infrared Fire Detector | **GPIO 18** (Digital), **GPIO 35** (Analog) | `D0` to Pin 18, `A0` to Pin 35 |
| **Rain Sensor** | Moisture / Rain Detector | **GPIO 19** (Digital), **GPIO 32** (Analog) | `D0` to Pin 19, `A0` to Pin 32 |
| **Sound Sensor** | Microphone Acoustic Sensor | **GPIO 33** (ADC1) | `A0` to Pin 33 |
| **PIR Sensor** | Passive Infrared Motion | **GPIO 27** | `OUT` to Pin 27 |
| **DHT11** | Temp & Humidity Sensor | **GPIO 4** | `DATA` to Pin 4 (Pull-up resistor 10k recommended) |
| **Buzzer** | Active Piezo Siren | **GPIO 25** | `+` to Pin 25, `-` to GND |
| **Red LED** | Visual Alert Hazard Light | **GPIO 26** | Anode to Pin 26 (with 220Ω resistor) |
| **Blue LED** | Network & Telemetry Light | **GPIO 14** | Anode to Pin 14 (with 220Ω resistor) |

*Power:* Connect all sensor `VCC` pins to ESP32 `3.3V` (or `5V` for MQ-135 heating coil) and all `GND` pins to ESP32 `GND`.

---

## 2. Arduino IDE Setup & Libraries

In the Arduino IDE:
1. Under **File > Preferences > Additional Boards Manager URLs**, add:
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
2. Under **Tools > Board > Boards Manager**, install `esp32` by Espressif Systems.
3. Under **Sketch > Include Library > Manage Libraries**, install:
   - **PubSubClient** by Nick O'Leary
   - **DHT sensor library** by Adafruit (and Adafruit Unified Sensor)
   - **ArduinoJson** by Benoît Blanchon (version 6 or 7)

---

## 3. Configuration & Flashing

1. Open `esp32/envirohub_esp32.ino` in Arduino IDE.
2. Update your WiFi credentials at lines 47–48:
   ```cpp
   const char* WIFI_SSID     = "YOUR_WIFI_SSID";
   const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
   ```
3. Connect your ESP32 via USB and select the COM port in **Tools > Port**.
4. Set upload speed to `921600` or `115200` and click **Upload**.
5. Open the **Serial Monitor** at baud rate `115200` to verify:
   - WiFi connection established
   - MQTT connected to `broker.hivemq.com:1883`
   - Subscriptions to all 9 control topics verified
   - Telemetry streaming every 2000ms

---

## 4. MQTT Control Architecture

The web dashboard and the ESP32 communicate over the public HiveMQ MQTT broker:
- **Browser Client:** Connects via Secure WebSockets (`wss://broker.hivemq.com:8884/mqtt`).
- **ESP32 Client:** Connects via standard TCP MQTT (`broker.hivemq.com:1883`).

### Command Topics:
* `iot-hub/control/mq135` (`ON` / `OFF`)
* `iot-hub/control/flame` (`ON` / `OFF`)
* `iot-hub/control/rain` (`ON` / `OFF`)
* `iot-hub/control/sound` (`ON` / `OFF`)
* `iot-hub/control/motion` (`ON` / `OFF`)
* `iot-hub/control/dht11` (`ON` / `OFF`)
* `iot-hub/control/buzzer` (`ON` / `OFF`)
* `iot-hub/control/red-led` (`ON` / `OFF`)
* `iot-hub/control/blue-led` (`ON` / `OFF`)

### Telemetry & Status Topics:
* `iot-hub/telemetry`: JSON payload streaming live readings.
* `iot-hub/status`: Publishes `online` (with retain) and `offline` (via MQTT LWT).
* `iot-hub/alerts`: JSON alerts for emergency events.

---

## 5. Safety Override Behavior

- When a sensor is disabled via the dashboard, the ESP32 suppresses normal telemetry updates and standard alerts for that sensor.
- However, when **Critical Safety Override** is active (default), the firmware monitors the flame sensor and MQ-135 sensor in a 200ms rapid loop and triggers critical audible and visual alerts if fire or toxic gas leaks occur.
