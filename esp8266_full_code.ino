#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <DHT.h>
#include <HX711.h>
#include <math.h>
#include <EEPROM.h>
#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>

int id_bote=3;
// =====================
// WIFI & API CONFIG
// =====================
const char* ssid = "TU_WIFI_SSID";
const char* password = "TU_WIFI_PASSWORD";
// Usa la IP de tu computadora (revisa ipconfig)
const char* serverUrl = "http://192.168.1.100:3000/api/mediciones"; 
const char* serverUrlEventos = "http://192.168.1.100:3000/api/eventos-actuador";

const int EEPROM_SIZE = 32;
const int ADDR_MAGIC  = 0;
const int ADDR_FACTOR = 4;
const uint32_t MAGIC  = 0xB017CA1B;  // firma para saber si hay dato válido

// Variables de estado para eventos
bool prevLedState = false;
bool prevFanState = false;
bool prevTiltState = false;
unsigned long lastLcdEventMs = 0;

bool loadCalFactor(float &out) {
  uint32_t m = 0;
  EEPROM.get(ADDR_MAGIC, m);
  if (m != MAGIC) return false;

  float f = 0;
  EEPROM.get(ADDR_FACTOR, f);

  // Validación básica para evitar basura
  if (!isfinite(f) || fabs(f) < 100.0 || fabs(f) > 1e9) return false;

  out = f;
  return true;
}

void saveCalFactor(float f) {
  EEPROM.put(ADDR_MAGIC, MAGIC);
  EEPROM.put(ADDR_FACTOR, f);
  EEPROM.commit();
}

void clearCalFactor() {
  uint32_t m = 0;
  float f = 0;
  EEPROM.put(ADDR_MAGIC, m);
  EEPROM.put(ADDR_FACTOR, f);
  EEPROM.commit();
}

// =====================
// PINES (TU MAPEO)
// =====================
#define TRIG_PIN      D5
#define ECHO_PIN      D6

#define HX711_DOUT    D7
#define HX711_SCK     D8

#define DHT_PIN       D4
#define DHT_TYPE      DHT11   // <-- cambia a DHT22 si aplica

#define BUZZER_PIN    D0
#define LED_PIN       1       // TX (GPIO1)

#define FAN_PIN       D3      // Relay ventilador (GPIO0)
#define ACCEL_PIN     A0      // A0 conectado a X del acelerómetro

#define DEBUG_SERIAL 0   // 1 = quiero Serial / 0 = quiero LED en TX

// =====================
// OBJETOS
// =====================
LiquidCrystal_I2C lcd(0x27, 16, 2);
DHT dht(DHT_PIN, DHT_TYPE);
HX711 scale;

// =====================
// AJUSTES / UMBRALES
// =====================
const float ALTURA_BOTE_CM = 23.0;   // ajusta a tu bote
const float UMBRAL_LLENADO = 70.0;   // enciende LED TX si >80%

const float UMBRAL_TEMP_C  = 23.0;   // enciende relay si >30°C

// Relay: la mayoría son "active LOW"
const bool RELAY_ACTIVE_LOW = true;

// HX711 - Factor de calibración (se puede recalibrar por Serial con 'c')
float CAL_FACTOR = 417700.51;        // <-- tu promedio actual
const float PESO_TARA_KG = 0.0;      // si quieres restar peso del bote, cambia esto

// Acelerómetro analógico (X a A0)
const float A0_MAX_VOLT = 3.3;       // NodeMCU típico en pin A0
const float ADC_MAX = 1023.0;
const float SENS_V_PER_G = 0.30;     // 0.30–0.33 típico
float OFFSET_V = 1.65;               // Se auto-calibra en setup()

// Inclinación >45° si |gX| < cos(45)=0.707 (solo funciona si X está "vertical" cuando está derecho)
const float COS_45 = 0.707;

// Timings
const unsigned long SENSOR_PERIOD_MS = 500;
const unsigned long LCD_PERIOD_MS    = 500;
const unsigned long DEBUG_PERIOD_MS  = 1000;
const unsigned long HTTP_PERIOD_MS   = 10000; // Enviar datos cada 10 segundos

// =====================
// VARIABLES
// =====================
float distancia_cm = 0;
float porcentaje_llenado = 0;

float peso_kg = 0;

float temp_c = 0;
float hum = 0;

float gX = 0;
bool inclinado = false;

bool debugOn = false;

unsigned long lastSensorMs = 0;
unsigned long lastLcdMs = 0;
unsigned long lastDebugMs = 0;
unsigned long lastHttpMs = 0;

// Para buzzer 2s ON cada 3s mientras esté inclinado
unsigned long tiltStartMs = 0;

// =====================
// HELPERS
// =====================
void setRelay(bool on) {
  if (RELAY_ACTIVE_LOW) digitalWrite(FAN_PIN, on ? LOW : HIGH);
  else                  digitalWrite(FAN_PIN, on ? HIGH : LOW);
}

float readUltrasonicCM() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  long dur = pulseIn(ECHO_PIN, HIGH, 30000);
  if (dur == 0) return -1;
  return (dur * 0.0343f) / 2.0f;
}

float readA0VoltageAvg(int n = 20) {
  long sum = 0;
  for (int i = 0; i < n; i++) {
    sum += analogRead(ACCEL_PIN);
    delay(2);
  }
  float adc = (float)sum / n;
  return adc * (A0_MAX_VOLT / ADC_MAX);
}

void printHelp() {
  Serial.println("\n=== COMANDOS ===");
  Serial.println("h  -> ayuda");
  Serial.println("p  -> toggle debug prints (ON/OFF)");
  Serial.println("t  -> tare HX711 (0 kg con bascula vacia)");
  Serial.println("c  -> recalibrar HX711 (interactivo)");
  Serial.println("s  -> mostrar CAL_FACTOR actual");
  Serial.println("================\n");
}

void tareHX() {
  Serial.println(">> TARE: Quita TODO el peso y espera...");
  delay(1000);
  scale.tare(30);
  Serial.println(">> OK: tarado.\n");
}

void waitEnter(const char* msg) {
  Serial.println(msg);
  Serial.println("Presiona ENTER...");
  while (Serial.available()) Serial.read();
  while (!Serial.available()) delay(10);
  while (Serial.available()) Serial.read();
}

float askFloat(const char* msg) {
  Serial.println(msg);
  while (Serial.available()) Serial.read();
  while (!Serial.available()) delay(10);
  float v = Serial.parseFloat();
  while (Serial.available()) Serial.read();
  return v;
}

void calibrateHX() {
  if (!scale.is_ready()) {
    Serial.println("❌ HX711 no listo. Revisa DT/SCK, VCC, GND.");
    return;
  }

  // Poner actuadores en estado seguro mientras calibras
  digitalWrite(BUZZER_PIN, LOW);
  setRelay(false);

  Serial.println("\n=== CALIBRACION HX711 ===");
  waitEnter("1) Quita TODO el peso (bote vacio).");
  long zero = scale.read_average(40);
  Serial.print("Zero RAW = "); Serial.println(zero);

  waitEnter("2) Coloca un peso conocido (ej: tu telefono).");
  long withW = scale.read_average(40);
  Serial.print("WithWeight RAW = "); Serial.println(withW);

  float knownG = askFloat("3) Escribe el peso conocido en GRAMOS (ej: 197) y ENTER:");
  if (knownG <= 0) {
    Serial.println("❌ Peso invalido.");
    return;
  }
  float knownKg = knownG / 1000.0;

  long delta = withW - zero;
  float newFactor = (float)delta / knownKg;  // RAW por kg (puede ser negativo)

  CAL_FACTOR = newFactor;
  scale.set_scale(CAL_FACTOR);
  scale.tare(30);

  Serial.println("\n✅ CALIBRADO!");
  Serial.print("Nuevo CAL_FACTOR = "); Serial.println(CAL_FACTOR, 6);
  Serial.println("Tip: si el peso sale negativo, invierte A+/A- o usa -CAL_FACTOR.\n");

  saveCalFactor(CAL_FACTOR);
  Serial.println("💾 CAL_FACTOR guardado en EEPROM.");

}

// =====================
// HTTP SEND FUNCTION
// =====================
void postJson(String url, String jsonPayload) {
  if (WiFi.status() == WL_CONNECTED) {
    WiFiClient client;
    HTTPClient http;

    http.begin(client, url);
    http.addHeader("Content-Type", "application/json");

    int httpCode = http.POST(jsonPayload);

    if (httpCode > 0) {
      if (httpCode == HTTP_CODE_OK) {
        // Success
      }
    } else {
      Serial.printf("[HTTP] Error: %s\n", http.errorToString(httpCode).c_str());
    }
    http.end();
  }
}

void postEvent(int id_actuador, String descp) {
  Serial.print(">> EVENTO Actuador "); Serial.print(id_actuador); Serial.println(": " + descp);
  String json = "{";
  json += "\"id_actuador\": " + String(id_actuador) + ",";
  json += "\"descp\": \"" + descp + "\"";
  json += "}";
  postJson(serverUrlEventos, json);
}

void sendSensorData() {
  if (WiFi.status() != WL_CONNECTED) return;

  Serial.println(">> Enviando datos de sensores...");

  // 1. ULTRASONICO (ID 1)
  String json1 = "{";
  json1 += "\"id_sensor\":"+String(1+((id_bote-1)*4))+",";
  json1 += "\"distancia_cm\":" + String(distancia_cm) + ",";
  json1 += "\"porcentaje_llenado\":" + String(porcentaje_llenado);
  json1 += "}";
  postJson(serverUrl, json1);
  delay(50);

  // 2. ACELEROMETRO (ID 2)
  String json2 = "{";
  json2 += "\"id_sensor\":"+String(2+((id_bote-1)*4))+",";
  json2 += "\"aceleracion_x\":" + String(gX) + ",";
  json2 += "\"detecta_caida\":" + String(inclinado ? "true" : "false");
  json2 += "}";
  postJson(serverUrl, json2);
  delay(50);

  // 3. DHT11 (ID 3)
  String json3 = "{";
  json3 += "\"id_sensor\":"+String(3+((id_bote-1)*4))+",";
  json3 += "\"temperatura_celsius\":" + String(temp_c) + ",";
  json3 += "\"humedad_porcentaje\":" + String(hum);
  json3 += "}";
  postJson(serverUrl, json3);
  delay(50);

  // 4. PESO (ID 4)
  String json4 = "{";
  json4 += "\"id_sensor\":"+String(4+((id_bote-1)*4))+",";
  json4 += "\"peso_kg\":" + String(peso_kg);
  json4 += "}";
  postJson(serverUrl, json4);
  
  Serial.println(">> Datos enviados.");
}

// =====================
// SETUP
// =====================
void setup() {
  Serial.begin(115200);
  delay(200);
  EEPROM.begin(EEPROM_SIZE);

  // --- WIFI ---
  Serial.println();
  Serial.print("Conectando a WiFi: ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);
  
  int retries = 0;
  while (WiFi.status() != WL_CONNECTED && retries < 20) {
    delay(500);
    Serial.print(".");
    retries++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi Conectado!");
    Serial.print("IP: "); Serial.println(WiFi.localIP());
  } else {
    Serial.println("\nFallo al conectar WiFi (seguire offline)");
  }
  // ------------

float stored = 0;
if (loadCalFactor(stored)) {
  CAL_FACTOR = stored;
  Serial.print("CAL_FACTOR cargado de EEPROM: ");
  Serial.println(CAL_FACTOR, 6);
} else {
  Serial.print("ℹ️ No hay CAL_FACTOR guardado. Usando default: ");
  Serial.println(CAL_FACTOR, 6);
}
  delay(200);

  lcd.init();
  lcd.backlight();
  lcd.clear();
  lcd.setCursor(0,0); lcd.print("Iniciando...");

  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);

  #if DEBUG_SERIAL
  // NO tocar TX
  #else
    pinMode(LED_PIN, OUTPUT);
    digitalWrite(LED_PIN, LOW);
  #endif

  pinMode(BUZZER_PIN, OUTPUT);
  //pinMode(LED_PIN, OUTPUT);
  pinMode(FAN_PIN, OUTPUT);

  digitalWrite(BUZZER_PIN, LOW);
  //digitalWrite(LED_PIN, LOW);
  setRelay(false);

  dht.begin();

  scale.begin(HX711_DOUT, HX711_SCK);
  scale.set_scale(CAL_FACTOR);
  scale.tare(30);

  Serial.println("\n=== BOTE INTELIGENTE (DEBUG+CAL) ===");
  printHelp();

  // --- CALIBRACION ACELEROMETRO ---
  Serial.println(">> Calibrando Acelerometro (OFFSET)... Deja quieto el sensor.");
  float vSum = 0;
  const int samples = 50;
  for(int i=0; i<samples; i++) {
    vSum += readA0VoltageAvg(10);
    delay(10);
  }
  OFFSET_V = vSum / samples;
  Serial.print(">> OFFSET_V calculado: "); Serial.println(OFFSET_V, 4);
  // --------------------------------

  delay(1000);
  lcd.clear();
}

// =====================
// LOOP
// =====================
void loop() {
  unsigned long now = millis();

  // ---- comandos serial
  if (Serial.available()) {
    char cmd = Serial.read();
    if (cmd == 'h') printHelp();
    else if (cmd == 'p') {
      debugOn = !debugOn;
      Serial.print("DEBUG = "); Serial.println(debugOn ? "ON" : "OFF");
    }
    else if (cmd == 't') tareHX();
    else if (cmd == 'c') calibrateHX();
    else if (cmd == 's') {
      Serial.print("CAL_FACTOR actual = "); Serial.println(CAL_FACTOR, 6);
    }
    while (Serial.available()) Serial.read();
  }

  // ---- leer sensores
  if (now - lastSensorMs >= SENSOR_PERIOD_MS) {
    lastSensorMs = now;

    // Ultrasonido -> % llenado
    float d = readUltrasonicCM();
    if (d > 0) {
      distancia_cm = d;
      float nivel = ALTURA_BOTE_CM - distancia_cm;
      porcentaje_llenado = (nivel / ALTURA_BOTE_CM) * 100.0;
      if (porcentaje_llenado < 0) porcentaje_llenado = 0;
      if (porcentaje_llenado > 100) porcentaje_llenado = 100;
    }

    // LED TX si >80% (ACTUADOR ID 4)
    bool ledState = (porcentaje_llenado > UMBRAL_LLENADO);
    #if !DEBUG_SERIAL
      digitalWrite(LED_PIN, ledState ? HIGH : LOW);
    #endif
    
    if (ledState && !prevLedState) {
      postEvent((4+(id_bote-1)*4), "LED Encendido: Bote lleno > 70%");
    }
    prevLedState = ledState;

    // HX711 -> peso en kg (con calibración)
    if (scale.is_ready()) {
      peso_kg = scale.get_units(10) - PESO_TARA_KG;
      if (peso_kg < 0) peso_kg = 0;
    }

    // DHT -> relay si T>30
    float t = dht.readTemperature();
    float h = dht.readHumidity();
    if (!isnan(t)) temp_c = t;
    if (!isnan(h)) hum = h;

    bool fanState = (temp_c > UMBRAL_TEMP_C);
    setRelay(fanState);

    if (fanState && !prevFanState) {
      postEvent((2+(id_bote-1)*4), "Ventilador Encendido: Temp > 23C");
    }
    prevFanState = fanState;

    // Acelerómetro -> gX
    float v = readA0VoltageAvg(20);
    gX = (v - OFFSET_V) / SENS_V_PER_G;

    // Inclinación >45° según X (solo si X está vertical cuando “derecho”)
    static bool incl = false;
    if (!incl && fabs(gX) > 0.30) incl = true;
    if ( incl && fabs(gX) < 0.20) incl = false;
    inclinado = incl;

    if (inclinado && !prevTiltState) {
      postEvent((3+(id_bote-1)*4), "Buzzer Activado: Caida detectada");
    }
    prevTiltState = inclinado;
  }

  // ---- ENVIAR DATOS HTTP (Cada 10s) ----
  if (now - lastHttpMs >= HTTP_PERIOD_MS) {
    lastHttpMs = now;
    sendSensorData();
  }
  // ---------------------------------------

  // ---- buzzer: 2s ON cada 3s mientras inclinado
  if (inclinado) {
    if (tiltStartMs == 0) tiltStartMs = now;
    unsigned long elapsed = now - tiltStartMs;
    unsigned long phase = elapsed % 3000UL; // ciclo 3s
    digitalWrite(BUZZER_PIN, (phase < 2000UL) ? HIGH : LOW);
  } else {
    tiltStartMs = 0;
    digitalWrite(BUZZER_PIN, LOW);
  }

  // ---- LCD (Line1: llenado, Line2: peso)
  if (now - lastLcdMs >= LCD_PERIOD_MS) {
    lastLcdMs = now;

    lcd.setCursor(0,0);
    lcd.print("Llenado:");
    int p = (int)(porcentaje_llenado + 0.5);
    if (p < 100) lcd.print(" ");
    if (p < 10)  lcd.print(" ");
    lcd.print(p);
    lcd.print("%   ");

    lcd.setCursor(0,1);
    lcd.print("Peso:");
    lcd.print(peso_kg, 2);
    lcd.print("kg   ");

    // Log LCD event periodically (e.g. every 30s)
    if (now - lastLcdEventMs > 30000) {
      lastLcdEventMs = now;
      postEvent((1+(id_bote-1)*4), "LCD Refrescado (Heartbeat)");
    }
  }

  // ---- debug serial (temporal)
  if (debugOn && (now - lastDebugMs >= DEBUG_PERIOD_MS)) {
    lastDebugMs = now;

    Serial.println("----- DEBUG -----");
    Serial.print("Dist(cm): "); Serial.println(distancia_cm, 1);
    Serial.print("Llen(%):  "); Serial.println(porcentaje_llenado, 1);
    Serial.print("Peso(kg): "); Serial.println(peso_kg, 3);
    Serial.print("Temp(C):  "); Serial.println(temp_c, 1);
    Serial.print("Hum(%):   "); Serial.println(hum, 1);
    Serial.print("gX:       "); Serial.println(gX, 3);
    Serial.print("Inclinado>45?: "); Serial.println(inclinado ? "SI" : "NO");
    Serial.print("Ventilador: "); Serial.println(temp_c > UMBRAL_TEMP_C ? "ON" : "OFF");
    Serial.print("LED(>80%): "); Serial.println(porcentaje_llenado > UMBRAL_LLENADO ? "ON" : "OFF");
    Serial.print("CAL_FACTOR: "); Serial.println(CAL_FACTOR, 6);
    Serial.println("-----------------\n");
  }
}
