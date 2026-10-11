/*
 * ==============================================================================
 * EnviroHub – Smart Environmental Monitoring System
 * ESP32 Production Firmware with Dual Communication Engine:
 *   Mode 0: Standard HiveMQ Cloud MQTT Mode (Production / Default)
 *   Mode 1: Direct Local Wi-Fi HTTP REST Mode (Demo / Local Network Mode)
 * ==============================================================================
 * 
 * Hardware & Sensors Monitored:
 *   1. MQ-135 Gas & Air Quality Sensor (Analog GPIO 34)
 *   2. Flame Infrared Sensor (Digital GPIO 18, Analog GPIO 35)
 *   3. Rain / Moisture Sensor (Digital GPIO 19, Analog GPIO 32)
 *   4. Sound / Acoustic Sensor (Analog GPIO 33)
 *   5. PIR Motion Sensor (Digital GPIO 27)
 *   6. DHT11 Temperature & Humidity Sensor (GPIO 4)
 * 
 * Actuators & Outputs:
 *   - Active Buzzer (GPIO 25)
 *   - Red Alert LED (GPIO 26)
 *   - Blue Status LED (GPIO 14)
 * 
 * Direct Local HTTP Endpoints (Port 80 with CORS):
 *   - GET  /api/telemetry     => Real-time sensor readings JSON
 *   - POST /api/control       => Toggle sensor / actuator switches (JSON or Query)
 *   - POST /api/control/sync  => Synchronize all switch states
 *   - GET  /api/status        => System metadata, mode, IP, RSSI, controls
 *   - POST /api/mode          => Switch between MQTT and Direct Wi-Fi HTTP mode
 * 
 * Cloud MQTT Broker (Port 1883):
 *   - Host: broker.hivemq.com (Port: 1883)
 *   - Command Topics:   iot-hub/control/<sensor>
 *   - Telemetry Topic:  iot-hub/telemetry
 *   - Status Topic:     iot-hub/status (online/offline with LWT)
 *   - Alerts Topic:     iot-hub/alerts
 * 
 * Non-blocking architecture using millis() timers.
 * ==============================================================================
 */

#include <WiFi.h>
#include <WebServer.h>
#include <PubSubClient.h>
#include <DHT.h>
#include <ArduinoJson.h>

// ══════════════════════════════════════════════════════════════════════════════
// 1. COMMUNICATION MODE DEFINITION & SELECTION
// ══════════════════════════════════════════════════════════════════════════════
#define MODE_MQTT 0  // Standard Cloud MQTT via HiveMQ (Default)
#define MODE_HTTP 1  // Direct Local Wi-Fi HTTP REST Mode

// Configurable default mode: Keep MQTT as default as per specification
#ifndef ACTIVE_COMM_MODE
#define ACTIVE_COMM_MODE MODE_MQTT
#endif

int commMode = ACTIVE_COMM_MODE;

// ══════════════════════════════════════════════════════════════════════════════
// 2. NETWORK & MQTT CONFIGURATION
// ══════════════════════════════════════════════════════════════════════════════
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// Direct Wi-Fi Access Point Configuration
const char* AP_SSID       = "EnviroHub-ESP32";
const char* AP_PASSWORD   = "Enviro123";

const char* MQTT_BROKER   = "broker.hivemq.com";
const int   MQTT_PORT     = 1883;

// Topic configurations (matching EnviroHub Web Dashboard)
const char* TOPIC_PREFIX       = "iot-hub";
const char* TOPIC_STATUS       = "iot-hub/status";
const char* TOPIC_TELEMETRY    = "iot-hub/telemetry";
const char* TOPIC_ALERTS       = "iot-hub/alerts";

// Command topics subscribed to by ESP32 in MQTT mode
const char* TOPIC_CTRL_MQ135   = "iot-hub/control/mq135";
const char* TOPIC_CTRL_FLAME   = "iot-hub/control/flame";
const char* TOPIC_CTRL_RAIN    = "iot-hub/control/rain";
const char* TOPIC_CTRL_SOUND   = "iot-hub/control/sound";
const char* TOPIC_CTRL_MOTION  = "iot-hub/control/motion";
const char* TOPIC_CTRL_DHT11   = "iot-hub/control/dht11";
const char* TOPIC_CTRL_BUZZER  = "iot-hub/control/buzzer";
const char* TOPIC_CTRL_RED_LED = "iot-hub/control/red-led";
const char* TOPIC_CTRL_BLUE_LED= "iot-hub/control/blue-led";

// ══════════════════════════════════════════════════════════════════════════════
// 3. PIN DEFINITIONS
// ══════════════════════════════════════════════════════════════════════════════
#define PIN_DHT11     4    // DHT11 Data Pin
#define PIN_MQ135     34   // MQ-135 Gas Sensor Analog (ADC1)
#define PIN_FLAME_D   18   // Flame Digital Pin (LOW = flame detected on most modules)
#define PIN_FLAME_A   35   // Flame Analog Pin (optional ADC1)
#define PIN_RAIN_D    19   // Rain Digital Pin (LOW = wet on most modules)
#define PIN_RAIN_A    32   // Rain Analog Pin (ADC1)
#define PIN_SOUND_A   33   // Sound Sensor Analog (ADC1)
#define PIN_PIR       27   // PIR Motion Digital Pin (HIGH = motion)

#define PIN_BUZZER    25   // Piezo Buzzer Pin
#define PIN_RED_LED   26   // Red Alert LED
#define PIN_BLUE_LED  14   // Blue Status / Network LED

#define DHTTYPE DHT11
DHT dht(PIN_DHT11, DHTTYPE);

// Network Clients
WiFiClient espClient;
PubSubClient mqttClient(espClient);
WebServer server(80);

// ══════════════════════════════════════════════════════════════════════════════
// 4. SENSOR & ACTUATOR STATES (Synchronized via MQTT or HTTP)
// ══════════════════════════════════════════════════════════════════════════════
bool enable_mq135  = true;
bool enable_flame  = true;
bool enable_rain   = true;
bool enable_sound  = true;
bool enable_motion = true;
bool enable_dht11  = true;

bool state_buzzer   = false;
bool state_red_led  = false;
bool state_blue_led = false;

// CRITICAL SAFETY REQUIREMENT:
// If ALWAYS_ALERT_SAFETY is true, emergency flame and dangerous gas conditions
// will ALWAYS trigger alerts, even if dashboard telemetry updates for those
// sensors are disabled by the user!
const bool ALWAYS_ALERT_SAFETY = true;

// In-memory latest emergency alert for HTTP polling responses
struct EmergencyAlert {
  bool active;
  String type;
  String sensor;
  String message;
  unsigned long ts;
} latestAlert = { false, "", "", "", 0 };

// Non-blocking timing variables
unsigned long lastTelemetryTime = 0;
const unsigned long TELEMETRY_INTERVAL = 2000; // 2 seconds

unsigned long lastMqttRetry = 0;
const unsigned long MQTT_RETRY_INTERVAL = 4000; // 4 seconds

unsigned long lastWiFiRetry = 0;
const unsigned long WIFI_RETRY_INTERVAL = 5000; // 5 seconds

unsigned long lastSafetyCheck = 0;
const unsigned long SAFETY_CHECK_INTERVAL = 200; // 200ms rapid safety scan

// ══════════════════════════════════════════════════════════════════════════════
// 5. UNIFIED ACTUATOR & SENSOR SWITCH DISPATCHER
// ══════════════════════════════════════════════════════════════════════════════
void applyControl(String key, bool turnOn) {
  key.toLowerCase();
  key.replace("-", "");
  key.replace("_", "");

  if (key == "mq135" || key == "gas") {
    enable_mq135 = turnOn;
    Serial.printf("[CONTROL] MQ-135 Gas Sensor: %s\n", enable_mq135 ? "ENABLED" : "DISABLED");
  } else if (key == "flame") {
    enable_flame = turnOn;
    Serial.printf("[CONTROL] Flame Sensor: %s\n", enable_flame ? "ENABLED" : "DISABLED");
  } else if (key == "rain") {
    enable_rain = turnOn;
    Serial.printf("[CONTROL] Rain Sensor: %s\n", enable_rain ? "ENABLED" : "DISABLED");
  } else if (key == "sound") {
    enable_sound = turnOn;
    Serial.printf("[CONTROL] Sound Sensor: %s\n", enable_sound ? "ENABLED" : "DISABLED");
  } else if (key == "motion" || key == "pir") {
    enable_motion = turnOn;
    Serial.printf("[CONTROL] PIR Motion Sensor: %s\n", enable_motion ? "ENABLED" : "DISABLED");
  } else if (key == "dht11" || key == "temp" || key == "hum") {
    enable_dht11 = turnOn;
    Serial.printf("[CONTROL] DHT11 Sensor: %s\n", enable_dht11 ? "ENABLED" : "DISABLED");
  } else if (key == "buzzer") {
    state_buzzer = turnOn;
    digitalWrite(PIN_BUZZER, state_buzzer ? HIGH : LOW);
    Serial.printf("[CONTROL] Buzzer Siren: %s\n", state_buzzer ? "SOUNDING" : "SILENT");
  } else if (key == "redled") {
    state_red_led = turnOn;
    digitalWrite(PIN_RED_LED, state_red_led ? HIGH : LOW);
    Serial.printf("[CONTROL] Red Alert LED: %s\n", state_red_led ? "ON" : "OFF");
  } else if (key == "blueled") {
    state_blue_led = turnOn;
    digitalWrite(PIN_BLUE_LED, state_blue_led ? HIGH : LOW);
    Serial.printf("[CONTROL] Blue Status LED: %s\n", state_blue_led ? "ON" : "OFF");
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 6. SENSOR READINGS TELEMETRY BUILDER (SHARED BETWEEN MQTT & HTTP)
// ══════════════════════════════════════════════════════════════════════════════
void buildTelemetryDoc(StaticJsonDocument<512>& doc) {
  // 1. DHT11 Sensor
  if (enable_dht11) {
    float t = dht.readTemperature();
    float h = dht.readHumidity();
    doc["temp"] = isnan(t) ? 0.0 : round(t * 10.0) / 10.0;
    doc["hum"]  = isnan(h) ? 0.0 : round(h * 10.0) / 10.0;
  } else {
    doc["temp"] = nullptr;
    doc["hum"]  = nullptr;
  }

  // 2. MQ-135 Gas Sensor
  if (enable_mq135) {
    int gasRaw = analogRead(PIN_MQ135);
    float ppm = map(gasRaw, 300, 4095, 50, 800);
    if (ppm < 10) ppm = 10;
    doc["gas"]    = (int)ppm;
    doc["gasRaw"] = gasRaw;
  } else {
    doc["gas"]    = nullptr;
    doc["gasRaw"] = nullptr;
  }

  // 3. Flame Sensor
  int flameDigital = digitalRead(PIN_FLAME_D);
  int flameDetected = (flameDigital == LOW) ? 1 : 0; // Active LOW
  int flameRaw = analogRead(PIN_FLAME_A);

  if (enable_flame) {
    doc["flame"]    = flameDetected;
    doc["flameRaw"] = flameRaw;
  } else {
    doc["flame"]    = nullptr;
    doc["flameRaw"] = nullptr;
  }

  // 4. Rain Sensor
  if (enable_rain) {
    int rainDigital = digitalRead(PIN_RAIN_D);
    int isRain = (rainDigital == LOW) ? 1 : 0;
    int rainRaw = analogRead(PIN_RAIN_A);
    doc["rain"]    = isRain;
    doc["rainRaw"] = rainRaw;
  } else {
    doc["rain"]    = nullptr;
    doc["rainRaw"] = nullptr;
  }

  // 5. Sound Sensor
  if (enable_sound) {
    int soundVal = analogRead(PIN_SOUND_A);
    doc["sound"] = soundVal;
  } else {
    doc["sound"] = nullptr;
  }

  // 6. PIR Motion Sensor
  if (enable_motion) {
    int motionVal = digitalRead(PIN_PIR);
    doc["motion"] = (motionVal == HIGH) ? 1 : 0;
  } else {
    doc["motion"] = nullptr;
  }

  doc["ts"] = (unsigned long)(millis() / 1000);

  // If in HTTP mode, embed recent safety alert if active
  if (commMode == MODE_HTTP && latestAlert.active) {
    JsonObject alertObj = doc.createNestedObject("alert");
    alertObj["type"]    = latestAlert.type;
    alertObj["sensor"]  = latestAlert.sensor;
    alertObj["message"] = latestAlert.message;
    alertObj["ts"]      = latestAlert.ts;
    // Clear once consumed after 5 seconds
    if (millis() / 1000 - latestAlert.ts > 5) {
      latestAlert.active = false;
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 7. DIRECT WI-FI HTTP REST SERVER HANDLERS (WITH FULL CORS SUPPORT)
// ══════════════════════════════════════════════════════════════════════════════
void sendCorsHeaders() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
}

void handleHttpOptions() {
  sendCorsHeaders();
  server.send(204);
}

// GET /api/sensors - Direct contract: temperature, humidity, gasRaw, gasAlarm, rainRaw, flameDetected, soundDetected, motionDetected
void handleHttpSensors() {
  sendCorsHeaders();
  StaticJsonDocument<512> doc;

  // 1. Temperature & Humidity (DHT11)
  if (enable_dht11) {
    float t = dht.readTemperature();
    float h = dht.readHumidity();
    doc["temperature"] = isnan(t) ? 0.0 : round(t * 10.0) / 10.0;
    doc["humidity"]    = isnan(h) ? 0.0 : round(h * 10.0) / 10.0;
  } else {
    doc["temperature"] = 0.0;
    doc["humidity"]    = 0.0;
  }

  // 2. Gas (MQ-135)
  int gasRaw = analogRead(PIN_MQ135);
  doc["gasRaw"]   = gasRaw;
  doc["gasAlarm"] = (gasRaw > 2800);

  // 3. Rain Sensor
  doc["rainRaw"]  = analogRead(PIN_RAIN_A);

  // 4. Flame Sensor (Active LOW on optical IR sensor)
  doc["flameDetected"] = (digitalRead(PIN_FLAME_D) == LOW);

  // 5. Sound Sensor
  doc["soundDetected"] = (analogRead(PIN_SOUND_A) > 700);

  // 6. PIR Motion Sensor (Active HIGH)
  doc["motionDetected"] = (digitalRead(PIN_PIR) == HIGH);

  String response;
  serializeJson(doc, response);
  server.send(200, "application/json", response);
}

// GET /api/telemetry - Returns real-time sensor readings (backward compatible)
void handleHttpTelemetry() {
  sendCorsHeaders();
  StaticJsonDocument<512> doc;
  buildTelemetryDoc(doc);

  String response;
  serializeJson(doc, response);
  server.send(200, "application/json", response);
}

// GET /api/status - Returns system metadata, mode, and switch states
void handleHttpStatus() {
  sendCorsHeaders();
  StaticJsonDocument<512> doc;
  doc["status"] = "online";
  doc["mode"]   = (commMode == MODE_HTTP) ? "http" : "mqtt";
  doc["ip"]     = (WiFi.getMode() & WIFI_AP) ? WiFi.softAPIP().toString() : WiFi.localIP().toString();
  doc["mac"]    = WiFi.macAddress();
  doc["rssi"]   = WiFi.RSSI();
  doc["uptime"] = (unsigned long)(millis() / 1000);

  JsonObject controls = doc.createNestedObject("controls");
  controls["mq135"]   = enable_mq135;
  controls["flame"]   = enable_flame;
  controls["rain"]    = enable_rain;
  controls["sound"]   = enable_sound;
  controls["motion"]  = enable_motion;
  controls["dht11"]   = enable_dht11;
  controls["buzzer"]  = state_buzzer;
  controls["redLed"]  = state_red_led;
  controls["blueLed"] = state_blue_led;

  String response;
  serializeJson(doc, response);
  server.send(200, "application/json", response);
}

// GET & POST /api/control - Set single sensor or actuator state (?name=NAME&enabled=true)
void handleHttpControl() {
  sendCorsHeaders();

  String sensor = "";
  bool turnOn = false;

  // 1. Check Query parameter: ?name=NAME&enabled=true/false
  if (server.hasArg("name")) {
    sensor = server.arg("name");
    if (server.hasArg("enabled")) {
      String en = server.arg("enabled");
      turnOn = (en.equalsIgnoreCase("true") || en == "1" || en.equalsIgnoreCase("ON"));
    }
  }

  // 2. Check Query parameter: ?sensor=NAME&state=ON/OFF
  if (sensor == "" && server.hasArg("sensor")) {
    sensor = server.arg("sensor");
    if (server.hasArg("state")) {
      String st = server.arg("state");
      turnOn = (st.equalsIgnoreCase("ON") || st == "1" || st.equalsIgnoreCase("true"));
    }
  }

  // 3. Check JSON body: {"name":"buzzer","enabled":true} or {"sensor":"buzzer","state":"ON"}
  if (sensor == "" && server.hasArg("plain")) {
    StaticJsonDocument<256> body;
    DeserializationError err = deserializeJson(body, server.arg("plain"));
    if (!err) {
      if (body.containsKey("name")) {
        sensor = body["name"].as<String>();
      } else if (body.containsKey("sensor")) {
        sensor = body["sensor"].as<String>();
      }

      if (body.containsKey("enabled")) {
        turnOn = body["enabled"].as<bool>();
      } else if (body.containsKey("state")) {
        String st = body["state"].as<String>();
        turnOn = (st.equalsIgnoreCase("ON") || st == "1" || body["state"].as<bool>() == true);
      }
    }
  }

  if (sensor != "") {
    applyControl(sensor, turnOn);

    StaticJsonDocument<128> reply;
    reply["success"] = true;
    reply["name"]    = sensor;
    reply["enabled"] = turnOn;

    String jsonReply;
    serializeJson(reply, jsonReply);
    server.send(200, "application/json", jsonReply);
  } else {
    server.send(400, "application/json", "{\"error\":\"Missing name or enabled parameter\"}");
  }
}

// POST /api/control/sync - Synchronize multiple sensor controls at once
void handleHttpControlSync() {
  sendCorsHeaders();

  if (server.hasArg("plain")) {
    StaticJsonDocument<512> body;
    DeserializationError err = deserializeJson(body, server.arg("plain"));
    if (!err) {
      JsonObject controls = body.containsKey("controls") ? body["controls"].as<JsonObject>() : body.as<JsonObject>();
      for (JsonPair p : controls) {
        String key = p.key().c_str();
        bool val = p.value().as<bool>();
        applyControl(key, val);
      }

      server.send(200, "application/json", "{\"success\":true,\"message\":\"All controls synchronized\"}");
      return;
    }
  }
  server.send(400, "application/json", "{\"error\":\"Invalid JSON payload\"}");
}

// GET & POST /api/mode - Switch between MQTT and Direct Wi-Fi HTTP mode on the fly
void handleHttpMode() {
  sendCorsHeaders();

  String target = "";
  if (server.hasArg("set")) {
    target = server.arg("set");
  } else if (server.hasArg("plain")) {
    StaticJsonDocument<128> body;
    deserializeJson(body, server.arg("plain"));
    if (body.containsKey("mode")) {
      target = body["mode"].as<String>();
    }
  }

  if (target != "") {
    target.toLowerCase();
    if (target == "http" || target == "1") {
      commMode = MODE_HTTP;
      if (mqttClient.connected()) {
        mqttClient.publish(TOPIC_STATUS, "offline");
        mqttClient.disconnect();
      }
      Serial.println("[MODE SWITCH] Activated Direct Wi-Fi HTTP Mode");
    } else if (target == "mqtt" || target == "0") {
      commMode = MODE_MQTT;
      Serial.println("[MODE SWITCH] Activated Cloud MQTT Mode");
    }
  }

  StaticJsonDocument<128> doc;
  doc["activeMode"] = (commMode == MODE_HTTP) ? "http" : "mqtt";
  String resp;
  serializeJson(doc, resp);
  server.send(200, "application/json", resp);
}

void setupWebServer() {
  // Setup endpoints
  server.on("/", HTTP_GET, handleHttpStatus);
  server.on("/api/status", HTTP_GET, handleHttpStatus);
  server.on("/api/sensors", HTTP_GET, handleHttpSensors);
  server.on("/api/telemetry", HTTP_GET, handleHttpTelemetry);
  server.on("/telemetry", HTTP_GET, handleHttpTelemetry);
  
  server.on("/api/control", HTTP_POST, handleHttpControl);
  server.on("/api/control", HTTP_GET, handleHttpControl);
  server.on("/api/control/sync", HTTP_POST, handleHttpControlSync);
  
  server.on("/api/mode", HTTP_GET, handleHttpMode);
  server.on("/api/mode", HTTP_POST, handleHttpMode);

  // Handle CORS preflight options requests
  server.on("/", HTTP_OPTIONS, handleHttpOptions);
  server.on("/api/status", HTTP_OPTIONS, handleHttpOptions);
  server.on("/api/sensors", HTTP_OPTIONS, handleHttpOptions);
  server.on("/api/telemetry", HTTP_OPTIONS, handleHttpOptions);
  server.on("/api/control", HTTP_OPTIONS, handleHttpOptions);
  server.on("/api/control/sync", HTTP_OPTIONS, handleHttpOptions);
  server.on("/api/mode", HTTP_OPTIONS, handleHttpOptions);

  server.onNotFound([]() {
    if (server.method() == HTTP_OPTIONS) {
      handleHttpOptions();
    } else {
      sendCorsHeaders();
      server.send(404, "application/json", "{\"error\":\"Route not found\"}");
    }
  });

  server.begin();
  Serial.println("[HTTP SERVER] Direct Wi-Fi WebServer listening on Port 80 with CORS.");
}

// ══════════════════════════════════════════════════════════════════════════════
// 8. CLOUD MQTT CALLBACK & CONNECTION MANAGERS
// ══════════════════════════════════════════════════════════════════════════════
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  // If operating in Direct Wi-Fi HTTP mode, do not process MQTT commands (Requirement 10)
  if (commMode != MODE_MQTT) return;

  String message = "";
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  message.trim();
  bool turnOn = (message.equalsIgnoreCase("ON") || message == "1");

  Serial.print("[MQTT CMD] Topic: ");
  Serial.print(topic);
  Serial.print(" => Value: ");
  Serial.println(message);

  if (strcmp(topic, TOPIC_CTRL_MQ135) == 0) {
    applyControl("mq135", turnOn);
  } else if (strcmp(topic, TOPIC_CTRL_FLAME) == 0) {
    applyControl("flame", turnOn);
  } else if (strcmp(topic, TOPIC_CTRL_RAIN) == 0) {
    applyControl("rain", turnOn);
  } else if (strcmp(topic, TOPIC_CTRL_SOUND) == 0) {
    applyControl("sound", turnOn);
  } else if (strcmp(topic, TOPIC_CTRL_MOTION) == 0) {
    applyControl("motion", turnOn);
  } else if (strcmp(topic, TOPIC_CTRL_DHT11) == 0) {
    applyControl("dht11", turnOn);
  } else if (strcmp(topic, TOPIC_CTRL_BUZZER) == 0) {
    applyControl("buzzer", turnOn);
  } else if (strcmp(topic, TOPIC_CTRL_RED_LED) == 0) {
    applyControl("redled", turnOn);
  } else if (strcmp(topic, TOPIC_CTRL_BLUE_LED) == 0) {
    applyControl("blueled", turnOn);
  }
}

void reconnectMqtt() {
  if (WiFi.status() != WL_CONNECTED) return;
  if (commMode != MODE_MQTT) return; // Do not reconnect if in Direct Wi-Fi HTTP mode
  if (mqttClient.connected()) return;

  unsigned long now = millis();
  if (now - lastMqttRetry < MQTT_RETRY_INTERVAL) return;
  lastMqttRetry = now;

  String clientId = "ESP32-EnviroHub-" + String(WiFi.macAddress());
  clientId.replace(":", "");

  Serial.print("Attempting MQTT connection to ");
  Serial.print(MQTT_BROKER);
  Serial.print("...");

  if (mqttClient.connect(clientId.c_str(), NULL, NULL, TOPIC_STATUS, 1, true, "offline")) {
    Serial.println(" CONNECTED!");

    // Publish birth message: 'online' (retained)
    mqttClient.publish(TOPIC_STATUS, "online", true);

    // Subscribe to all 9 control topics
    mqttClient.subscribe(TOPIC_CTRL_MQ135);
    mqttClient.subscribe(TOPIC_CTRL_FLAME);
    mqttClient.subscribe(TOPIC_CTRL_RAIN);
    mqttClient.subscribe(TOPIC_CTRL_SOUND);
    mqttClient.subscribe(TOPIC_CTRL_MOTION);
    mqttClient.subscribe(TOPIC_CTRL_DHT11);
    mqttClient.subscribe(TOPIC_CTRL_BUZZER);
    mqttClient.subscribe(TOPIC_CTRL_RED_LED);
    mqttClient.subscribe(TOPIC_CTRL_BLUE_LED);

    Serial.println("Subscribed to control topics successfully.");

    // Light blue LED briefly to signal MQTT handshake
    digitalWrite(PIN_BLUE_LED, HIGH);
    delay(100);
    digitalWrite(PIN_BLUE_LED, state_blue_led ? HIGH : LOW);
  } else {
    Serial.print(" Failed! rc=");
    Serial.println(mqttClient.state());
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 9. RAPID SAFETY CHECK: GAS & FLAME EMERGENCY OVERRIDE
// ══════════════════════════════════════════════════════════════════════════════
void checkSafetyAlerts() {
  if (!ALWAYS_ALERT_SAFETY && !enable_flame && !enable_mq135) return;

  // 1. Emergency Flame Check
  int flameDigital = digitalRead(PIN_FLAME_D);
  if (flameDigital == LOW) { // Fire detected
    if (enable_flame || ALWAYS_ALERT_SAFETY) {
      StaticJsonDocument<256> alertDoc;
      alertDoc["type"]    = "danger";
      alertDoc["sensor"]  = "flame";
      alertDoc["message"] = "CRITICAL FIRE HAZARD DETECTED! Flame sensor triggered.";
      alertDoc["ts"]      = (unsigned long)(millis() / 1000);

      // In MQTT mode: publish via MQTT
      if (commMode == MODE_MQTT && mqttClient.connected()) {
        char buffer[256];
        serializeJson(alertDoc, buffer);
        mqttClient.publish(TOPIC_ALERTS, buffer);
      }

      // In HTTP mode: cache in latestAlert for polling responses
      latestAlert.active  = true;
      latestAlert.type    = "danger";
      latestAlert.sensor  = "flame";
      latestAlert.message = "CRITICAL FIRE HAZARD DETECTED! Flame sensor triggered.";
      latestAlert.ts      = (unsigned long)(millis() / 1000);

      // Hardware alarm trigger
      digitalWrite(PIN_RED_LED, HIGH);
      digitalWrite(PIN_BUZZER, HIGH);
    }
  }

  // 2. Emergency Toxic Gas Check
  int gasRaw = analogRead(PIN_MQ135);
  if (gasRaw > 2800) { // Severe gas leak threshold
    if (enable_mq135 || ALWAYS_ALERT_SAFETY) {
      StaticJsonDocument<256> alertDoc;
      alertDoc["type"]    = "danger";
      alertDoc["sensor"]  = "gas";
      alertDoc["message"] = "HAZARDOUS GAS LEAK DETECTED! Evacuate and ventilate area.";
      alertDoc["ts"]      = (unsigned long)(millis() / 1000);

      // In MQTT mode: publish via MQTT
      if (commMode == MODE_MQTT && mqttClient.connected()) {
        char buffer[256];
        serializeJson(alertDoc, buffer);
        mqttClient.publish(TOPIC_ALERTS, buffer);
      }

      // In HTTP mode: cache for HTTP telemetry
      latestAlert.active  = true;
      latestAlert.type    = "danger";
      latestAlert.sensor  = "gas";
      latestAlert.message = "HAZARDOUS GAS LEAK DETECTED! Evacuate and ventilate area.";
      latestAlert.ts      = (unsigned long)(millis() / 1000);

      digitalWrite(PIN_RED_LED, HIGH);
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 10. TELEMETRY PUBLISH (MQTT MODE)
// ══════════════════════════════════════════════════════════════════════════════
void publishTelemetryMqtt() {
  StaticJsonDocument<512> doc;
  buildTelemetryDoc(doc);

  char jsonBuffer[512];
  serializeJson(doc, jsonBuffer);

  if (mqttClient.connected()) {
    mqttClient.publish(TOPIC_TELEMETRY, jsonBuffer);
    Serial.print("[MQTT TELEMETRY PUBLISHED] ");
    Serial.println(jsonBuffer);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 11. SETUP & MAIN LOOP
// ══════════════════════════════════════════════════════════════════════════════
void setupWiFi() {
  if (commMode == MODE_HTTP) {
    Serial.println("\n[WIFI] Initializing Direct Wi-Fi Access Point Mode...");
    WiFi.mode(WIFI_AP);
    WiFi.softAP(AP_SSID, AP_PASSWORD);
    Serial.printf("Access Point Started! SSID: %s | Pass: %s\n", AP_SSID, AP_PASSWORD);
    Serial.printf("AP IP Address: %s\n", WiFi.softAPIP().toString().c_str());
    Serial.printf("Direct Sensor API: http://%s/api/sensors\n", WiFi.softAPIP().toString().c_str());
    return;
  }

  // Otherwise Station mode for Cloud MQTT
  Serial.print("Connecting to WiFi: ");
  Serial.println(WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 25) {
    delay(300);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi Connected!");
    Serial.print("Local IP Address: ");
    Serial.println(WiFi.localIP());
    Serial.printf("Direct HTTP URL: http://%s/\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("\nWiFi Station failed. Starting Fallback Access Point (EnviroHub-ESP32)...");
    WiFi.mode(WIFI_AP_STA);
    WiFi.softAP(AP_SSID, AP_PASSWORD);
    Serial.printf("AP IP Address: %s\n", WiFi.softAPIP().toString().c_str());
  }
}

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\n==================================================");
  Serial.println("  EnviroHub ESP32 - Multi-Sensor Environmental Hub ");
  Serial.printf ("  Active Default Mode: %s\n", (commMode == MODE_HTTP) ? "Direct Wi-Fi HTTP" : "Cloud HiveMQ MQTT");
  Serial.println("==================================================");

  // Output pins
  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_RED_LED, OUTPUT);
  pinMode(PIN_BLUE_LED, OUTPUT);

  digitalWrite(PIN_BUZZER, LOW);
  digitalWrite(PIN_RED_LED, LOW);
  digitalWrite(PIN_BLUE_LED, LOW);

  // Input pins
  pinMode(PIN_FLAME_D, INPUT);
  pinMode(PIN_RAIN_D, INPUT);
  pinMode(PIN_PIR, INPUT);

  // Initialize DHT
  dht.begin();

  // Setup WiFi
  setupWiFi();

  // Initialize WebServer (Always available locally)
  setupWebServer();

  // Initialize MQTT Client
  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);
  mqttClient.setBufferSize(768);

  Serial.println("System ready. Monitoring sensors in non-blocking loop.\n");
}

void loop() {
  // 1. Non-blocking Wi-Fi Reconnect Check
  if (WiFi.status() != WL_CONNECTED) {
    unsigned long now = millis();
    if (now - lastWiFiRetry >= WIFI_RETRY_INTERVAL) {
      lastWiFiRetry = now;
      Serial.println("[WIFI] Attempting reconnection...");
      WiFi.reconnect();
    }
  }

  // 2. Always handle local HTTP WebServer requests (CORS enabled)
  server.handleClient();

  // 3. Handle MQTT logic only if in MQTT mode (Requirement 10)
  if (commMode == MODE_MQTT && WiFi.status() == WL_CONNECTED) {
    if (!mqttClient.connected()) {
      reconnectMqtt();
    } else {
      mqttClient.loop();
    }
  }

  unsigned long currentMillis = millis();

  // 4. Rapid safety monitoring loop (every 200ms)
  if (currentMillis - lastSafetyCheck >= SAFETY_CHECK_INTERVAL) {
    lastSafetyCheck = currentMillis;
    checkSafetyAlerts();
  }

  // 5. Periodic telemetry publishing for MQTT (every 2000ms)
  if (commMode == MODE_MQTT && (currentMillis - lastTelemetryTime >= TELEMETRY_INTERVAL)) {
    lastTelemetryTime = currentMillis;
    publishTelemetryMqtt();
  }
}
