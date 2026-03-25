#include <WiFi.h>
#include <HTTPClient.h>

const char* ssid = "karnesh";
const char* password = "123456789";
const char* serverUrl = "http://10.47.235.134:3000/api/update-bus";

const int BUS_COUNT = 10;

float lat[BUS_COUNT];
float lng[BUS_COUNT];
float latStep[BUS_COUNT];
float lngStep[BUS_COUNT];

float startLat[BUS_COUNT] = {
  13.0827, 13.0685, 13.0732, 13.0418, 13.0067,
  12.9825, 12.9249, 13.1143, 13.0352, 13.0878
};

float startLng[BUS_COUNT] = {
  80.2755, 80.2619, 80.2059, 80.2337, 80.2578,
  80.2212, 80.1488, 80.2101, 80.2123, 80.2785
};

String routeName[BUS_COUNT] = {
  "Central → Egmore",
  "Egmore → T Nagar",
  "CMBT → Guindy",
  "T Nagar → Adyar",
  "Adyar → Velachery",
  "Tambaram → Guindy",
  "Anna Nagar → Central",
  "Broadway → T Nagar",
  "Velachery → Central",
  "Tambaram → Broadway"
};

void setup() {
  Serial.begin(115200);
  delay(1000);

  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.println("Connected to WiFi");
  Serial.print("ESP32 IP Address: ");
  Serial.println(WiFi.localIP());

  for (int i = 0; i < BUS_COUNT; i++) {
    lat[i] = startLat[i];
    lng[i] = startLng[i];
    latStep[i] = 0.00015 + (i * 0.00001);
    lngStep[i] = 0.00012 + (i * 0.00001);
  }

  randomSeed(micros());
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    for (int i = 0; i < BUS_COUNT; i++) {
      HTTPClient http;
      WiFiClient client;

      http.begin(client, serverUrl);
      http.addHeader("Content-Type", "application/json");

      String busId = "BUS" + String(101 + i);

      lat[i] += latStep[i];
      lng[i] += lngStep[i];

      if (lat[i] > 13.1500 || lat[i] < 12.9000) latStep[i] = -latStep[i];
      if (lng[i] > 80.3200 || lng[i] < 80.1200) lngStep[i] = -lngStep[i];

      int totalSeats = 40;
      int occupiedSeats = random(0, 41);
      int availableSeats = totalSeats - occupiedSeats;
      int etaMinutes = random(1, 11);
      int delayMinutes = random(0, 8);
      int speed = random(20, 51);

      String jsonData = "{";
      jsonData += "\"bus_id\":\"" + busId + "\",";
      jsonData += "\"latitude\":" + String(lat[i], 6) + ",";
      jsonData += "\"longitude\":" + String(lng[i], 6) + ",";
      jsonData += "\"status\":\"Running\",";
      jsonData += "\"routeName\":\"" + routeName[i] + "\",";
      jsonData += "\"etaMinutes\":" + String(etaMinutes) + ",";
      jsonData += "\"delayMinutes\":" + String(delayMinutes) + ",";
      jsonData += "\"totalSeats\":" + String(totalSeats) + ",";
      jsonData += "\"occupiedSeats\":" + String(occupiedSeats) + ",";
      jsonData += "\"availableSeats\":" + String(availableSeats) + ",";
      jsonData += "\"speed\":" + String(speed);
      jsonData += "}";

      Serial.println("Sending data:");
      Serial.println(jsonData);

      int httpResponseCode = http.POST(jsonData);

      Serial.print("HTTP Response code: ");
      Serial.println(httpResponseCode);

      if (httpResponseCode > 0) {
        String response = http.getString();
        Serial.println("Server response:");
        Serial.println(response);
      } else {
        Serial.println("Error sending POST request");
      }

      http.end();
      delay(150);
    }
  } else {
    Serial.println("WiFi disconnected. Reconnecting...");
    WiFi.begin(ssid, password);
  }

  delay(500);
}