/*
 * ==============================================================================
 * EnviroHub – Smart Environmental Monitoring System
 * ESP32 Production Firmware with HiveMQ MQTT & Real-Time Sensor Control
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
 * MQTT Broker:
 *   - Host: broker.hivemq.com (Port: 1883)
 *   - Command Topics:
 *       iot-hub/control/mq135    (ON/OFF)
 *       iot-hub/control/flame    (ON/OFF)
 *       iot-hub/control/rain     (ON/OFF)
 *       iot-hub/control/sound    (ON/OFF)
 *       iot-hub/control/motion   (ON/OFF)
 *       iot-hub/control/dht11    (ON/OFF)
 *       iot-hub/control/buzzer   (ON/OFF)
 *       iot-hub/control/red-led  (ON/OFF)
 *       iot-hub/control/blue-led (ON/OFF)
 *   - Telemetry Topic: iot-hub/telemetry
 *   - Device Status Topic: iot-hub/status (online/offline with LWT)
 *   - Alerts Topic: iot-hub/alerts
 * 
 * Non-blocking architecture using millis() timers.
 * ==============================================================================
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>
#include <ArduinoJson.h>

// ══════════════════════════════════════════════════════════════════════════════
// 1. NETWORK & MQTT CONFIGURATION
// ══════════════════════════════════════════════════════════════════════════════
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

const char* MQTT_BROKER   = "broker.hivemq.com";
const int   MQTT_PORT     = 1883;

// Topic configurations (matching EnviroHub Web Dashboard)
const char* TOPIC_PREFIX       = "iot-hub";
const char* TOPIC_STATUS       = "iot-hub/status";
const char* TOPIC_TELEMETRY    = "iot-hub/telemetry";
const char* TOPIC_ALERTS       = "iot-hub/alerts";

// Command topics subscribed to by ESP32
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
// 2. PIN DEFINITIONS
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

WiFiClient espClient;
PubSubClient mqttClient(espClient);

// ══════════════════════════════════════════════════════════════════════════════
// 3. SENSOR & ACTUATOR STATES (Synchronized via MQTT)
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

// Timing variables (non-blocking)
unsigned long lastTelemetryTime = 0;
const unsigned long TELEMETRY_INTERVAL = 2000; // 2 seconds

unsigned long lastMqttRetry = 0;
const unsigned long MQTT_RETRY_INTERVAL = 4000; // 4 seconds

unsigned long lastSafetyCheck = 0;
const unsigned long SAFETY_CHECK_INTERVAL = 200; // 200ms rapid safety scan

// ══════════════════════════════════════════════════════════════════════════════
// 4. MQTT CALLBACK: RECEIVE DASHBOARD COMMANDS
// ══════════════════════════════════════════════════════════════════════════════
void mqttCallback(char* topic, byte* payload, unsigned int length) {
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

  // 1. Sensors
  if (strcmp(topic, TOPIC_CTRL_MQ135) == 0) {
    enable_mq135 = turnOn;
    Serial.printf("MQ-135 Gas Sensor: %s\n", enable_mq135 ? "ENABLED" : "DISABLED");
  } else if (strcmp(topic, TOPIC_CTRL_FLAME) == 0) {
    enable_flame = turnOn;
    Serial.printf("Flame Sensor: %s\n", enable_flame ? "ENABLED" : "DISABLED");
  } else if (strcmp(topic, TOPIC_CTRL_RAIN) == 0) {
    enable_rain = turnOn;
    Serial.printf("Rain Sensor: %s\n", enable_rain ? "ENABLED" : "DISABLED");
  } else if (strcmp(topic, TOPIC_CTRL_SOUND) == 0) {
    enable_sound = turnOn;
    Serial.printf("Sound Sensor: %s\n", enable_sound ? "ENABLED" : "DISABLED");
  } else if (strcmp(topic, TOPIC_CTRL_MOTION) == 0) {
    enable_motion = turnOn;
    Serial.printf("PIR Motion Sensor: %s\n", enable_motion ? "ENABLED" : "DISABLED");
  } else if (strcmp(topic, TOPIC_CTRL_DHT11) == 0) {
    enable_dht11 = turnOn;
    Serial.printf("DHT11 Sensor: %s\n", enable_dht11 ? "ENABLED" : "DISABLED");
  }
  // 2. Actuators
  else if (strcmp(topic, TOPIC_CTRL_BUZZER) == 0) {
    state_buzzer = turnOn;
    digitalWrite(PIN_BUZZER, state_buzzer ? HIGH : LOW);
    Serial.printf("Buzzer Actuator: %s\n", state_buzzer ? "SOUNDING" : "OFF");
  } else if (strcmp(topic, TOPIC_CTRL_RED_LED) == 0) {
    state_red_led = turnOn;
    digitalWrite(PIN_RED_LED, state_red_led ? HIGH : LOW);
    Serial.printf("Red Alert LED: %s\n", state_red_led ? "ON" : "OFF");
  } else if (strcmp(topic, TOPIC_CTRL_BLUE_LED) == 0) {
    state_blue_led = turnOn;
    digitalWrite(PIN_BLUE_LED, state_blue_led ? HIGH : LOW);
    Serial.printf("Blue Status LED: %s\n", state_blue_led ? "ON" : "OFF");
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 5. WIFI & MQTT CONNECTION MANAGERS
// ══════════════════════════════════════════════════════════════════════════════
void setupWiFi() {
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
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\nWiFi Connection failed. Running in offline loop...");
  }
}

void reconnectMqtt() {
  if (WiFi.status() != WL_CONNECTED) return;
  if (mqttClient.connected()) return;

  unsigned long now = millis();
  if (now - lastMqttRetry < MQTT_RETRY_INTERVAL) return;
  lastMqttRetry = now;

  String clientId = "ESP32-EnviroHub-" + String(WiFi.macAddress());
  clientId.replace(":", "");

  Serial.print("Attempting MQTT connection to ");
  Serial.print(MQTT_BROKER);
  Serial.print("...");

  // Connect with Last Will and Testament (LWT) so dashboard knows if ESP32 drops
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
// 6. SENSOR READINGS & TELEMETRY DISPATCH (NON-BLOCKING)
// ══════════════════════════════════════════════════════════════════════════════
void publishTelemetry() {
  StaticJsonDocument<512> doc;

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
    // Simple calibration formula for demo/benchmark curve
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
  int flameDetected = (flameDigital == LOW) ? 1 : 0; // Active LOW on optical IR sensor
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

  // Serialize and publish
  char jsonBuffer[512];
  serializeJson(doc, jsonBuffer);

  if (mqttClient.connected()) {
    mqttClient.publish(TOPIC_TELEMETRY, jsonBuffer);
    Serial.print("[TELEMETRY PUBLISHED] ");
    Serial.println(jsonBuffer);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 7. RAPID SAFETY CHECK: GAS & FLAME EMERGENCY OVERRIDE
// ══════════════════════════════════════════════════════════════════════════════
void checkSafetyAlerts() {
  // If safety override is enabled, check even if switches are OFF!
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

      char buffer[256];
      serializeJson(alertDoc, buffer);
      mqttClient.publish(TOPIC_ALERTS, buffer);

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

      char buffer[256];
      serializeJson(alertDoc, buffer);
      mqttClient.publish(TOPIC_ALERTS, buffer);
      digitalWrite(PIN_RED_LED, HIGH);
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 8. SETUP & LOOP
// ══════════════════════════════════════════════════════════════════════════════
void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\n--- EnviroHub ESP32 Starting ---");

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

  // Setup WiFi and MQTT
  setupWiFi();
  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);
  mqttClient.setBufferSize(768); // Allow larger JSON payloads

  Serial.println("System ready. Monitoring sensors in non-blocking loop.\n");
}

void loop() {
  // Non-blocking WiFi check
  if (WiFi.status() == WL_CONNECTED) {
    if (!mqttClient.connected()) {
      reconnectMqtt();
    } else {
      mqttClient.loop(); // Process incoming MQTT messages
    }
  }

  unsigned long currentMillis = millis();

  // Rapid safety monitoring loop (every 200ms)
  if (currentMillis - lastSafetyCheck >= SAFETY_CHECK_INTERVAL) {
    lastSafetyCheck = currentMillis;
    checkSafetyAlerts();
  }

  // Periodic telemetry publishing (every 2000ms)
  if (currentMillis - lastTelemetryTime >= TELEMETRY_INTERVAL) {
    lastTelemetryTime = currentMillis;
    publishTelemetry();
  }
}
