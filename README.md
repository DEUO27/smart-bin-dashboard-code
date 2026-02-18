# Smart Bin Monitoring + Dispatch Dashboard

A comprehensive IoT solution for efficient waste management, featuring real-time monitoring of bin levels, weight, temperature, and status via a modern web dashboard.

## 📋 Overview

This project consists of a full-stack IoT system designed to optimize waste collection. It uses an **ESP8266** microcontroller to gather data from various sensors (ultrasonic, load cell, temperature, accelerometer) and sends it to a centralized **Node.js** server. A **React** frontend provides a user-friendly dashboard for monitoring bin status and dispatching collection routes.

## ✨ Features

- **Real-Time Level Monitoring**: Ultrasonic sensor measures bin fill level.
- **Weight Detection**: Load cell (HX711) measures waste weight.
- **Environmental Monitoring**: DHT11/22 sensor tracks temperature and humidity.
- **Fall Detection**: Accelerometer detects if the bin has tipped over.
- **Smart Actuators**:
  - **Auto-Fan**: Activates when temperature exceeds a threshold (>23°C).
  - **Status LED**: Lights up when the bin is full (>70%).
  - **Buzzer Alarm**: Sounds when a fall is detected.
- **Web Dashboard**: Visualizes data and manages alerts.

## 🛠 Technology Stack

### Hardware (Edge)
- **Microcontroller**: ESP8266 (NodeMCU)
- **Sensors**:
  - HC-SR04/Ultrasonic (Fill Level)
  - HX711 + Load Cell (Weight)
  - DHT11 (Temperature/Humidity)
  - Analog Accelerometer (Tilt/Fall Detection)
- **Actuators**: Fan (Relay), LED, Buzzer, LCD I2C Display

### Software
- **Backend**: Node.js, Express.js, MySQL (Database)
- **Frontend**: React, Vite, Tailwind CSS
- **Communication**: REST API (HTTP)

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- MySQL Database
- Arduino IDE (for ESP8266 flashing)

### 1. Backend Setup

1.  Navigate to the `server` directory (files in root act as server root in this repo structure, or check `server/` folder if separated). *Note: `server.js` is in `server/` but `package.json` is in root.*
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Configure Environment Variables:
    - Copy `.env.example` to `.env`.
    - Update `.env` with your MySQL credentials.
    ```env
    DB_HOST=your_host
    DB_USER=your_user
    DB_PASSWORD=your_password
    DB_NAME=your_db_name
    PORT=3000
    ```
4.  Initialize Database:
    - Run the script in `server/schema.sql` (or `init_db.js` if available) to create tables.
5.  Start the Server:
    ```bash
    npm run dev:server
    # or
    node server/server.js
    ```

### 2. Frontend Setup

1.  Navigate to the `web` directory:
    ```bash
    cd web
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the Development Server:
    ```bash
    npm run dev
    ```
    Access the dashboard at `http://localhost:5173`.

### 3. Hardware Setup (ESP8266)

1.  Open `esp8266_full_code.ino` in Arduino IDE.
2.  Install required libraries:
    - `LiquidCrystal_I2C`
    - `DHT sensor library`
    - `HX711`
3.  Update Configuration:
    - **WiFi**: Change `ssid` and `password`.
    - **Server URL**: Update `serverUrl` to point to your backend IP (e.g., `http://192.168.1.100:3000/api/mediciones`).
4.  Upload the code to your ESP8266.

## 📡 API Endpoints

- **GET /health**: Check server status.
- **POST /api/mediciones**: Submit sensor data.
  ```json
  {
    "id_sensor": 1,
    "distancia_cm": 45.5,
    "porcentaje_llenado": 20.5,
    "temperatura_celsius": 25.0,
    "detecta_caida": false
  }
  ```
- **POST /api/eventos-actuador**: Log actuator events.
- **POST /api/recolecciones**: Log collection events.

## 📄 License

This project is licensed under the ISC License.
