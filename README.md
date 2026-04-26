![Build With AI](https://img.shields.io/badge/build-passing-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)
![AI](https://img.shields.io/badge/AI-Google%20Gemini-orange)
![Platform](https://img.shields.io/badge/platform-Web%20App-lightgrey)
![Status](https://img.shields.io/badge/status-Prototype-success)
![Hackathon](https://img.shields.io/badge/Hackathon-Solution%20Challenge%202026-purple)

---
# 🚑 ReliefRoute (रिलीफ रूट)
### Smart Resource Allocation for Disaster Relief

> "Turning chaos into coordination with AI-powered precision."

ReliefRoute is an AI-driven, offline-first disaster relief platform designed for coordinators operating in unstable network environments. It automates supply chain routing to prioritize the most critical, high-density, and low-accessibility zones following a disaster.

---

## 🏆 About Solution Challenge 2026

This project is built as part of the **Solution Challenge 2026 – Build with AI**, organized on the Hack2Skill platform.

The challenge focuses on leveraging **Artificial Intelligence and Google technologies** to solve real-world problems and create impactful, scalable solutions.

---

## 👥 Team: Error_404

> *"Where problems aren’t missing — just waiting to be solved."*

### 👩‍💻 Team Members
- **Renu Kumari Prajapati**
-  **Muskan Yadav**
- **Arushi Thalur**

---

## 🌍 Problem Statement

During disasters, relief operations face critical challenges:

- ❌ Lack of internet connectivity in affected areas  
- ❌ Inefficient and manual resource allocation  
- ❌ Poor communication between coordinators  
- ❌ Unequal distribution of resources (remote areas ignored)  

---

## 💡 Our Solution

**ReliefRoute** is an **AI-powered, offline-first disaster relief platform** designed to:

- 📍 Identify high-priority zones  
- 🚚 Optimize resource distribution  
- 📡 Enable communication without internet  
- ⚖️ Ensure fair and unbiased allocation  

It empowers coordinators to make **fast, data-driven decisions even in extreme conditions**.

---

## Features

- **Offline-First Architecture**: Continuous operation without internet. IndexedDB queues actions, caches the last-known state, and automatically synchronizes when connection is restored.
- **Mesh Communication**: A 3-mode relay system (Internet -> Local Mesh WebSocket -> SMS Fallback) ensures field coordinators can always send and receive critical updates.
- **AI Allocation Engine**: Automates the distribution of food, medicine, and shelter using Haversine distance, severity floors, and population density metrics.
- **Conversational Reallocation**: Ask Claude to intelligently shift resources via natural language when ground conditions change.
- **Bilingual Interface**: Full support for English and Hindi (Devanagari) with instant, zero-reload switching.
- **Equity Auditing**: Proactively detects and flags systematic bias against remote zones, ensuring minimum resource thresholds are always met.

## Tech Stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Zustand, React-Leaflet, Workbox (Service Workers), IndexedDB
- **Backend**: Express, TypeScript, Better-SQLite3 (WAL Mode)
- **AI Integration**: Google Gemini API(Gemini 2.5 Flash)

## Setup Guide

### 1. Prerequisites
- Node.js (v18 or higher)
- API Key from Google Gemini

### 2. Installation
```bash
# Install root dependencies (concurrently, etc.)
npm install

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 3. Environment Variables
Create a `.env` file in the root directory and add your Anthropic API key:
```env
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxx
PORT=3001
MESH_WS_PORT=8765
EQUITY_THRESHOLD=0.40
```

### 4. Running the Application
Return to the root directory and start the entire stack:
```bash
npm run dev
```
This command concurrently runs:
- The React Vite server (`http://localhost:5173`)
- The Express backend (`http://localhost:3001`)
- The WebSocket Mesh Relay (`ws://localhost:8765`)

### 5. Seeding the Database
To reset the system state and load the initial disaster scenario (Uttarakhand Flood):
```bash
npm run seed
```

## Architecture

- **`server/`**: Contains the Express API, the SQLite database logic (`db.ts`), the matching and scoring algorithms, the mesh WebSocket server, and the Anthropic integration service.
- **`client/`**: The React UI. Notable structures include `useStore.ts` for Zustand global state, `offlineQueue.ts` for IndexedDB caching, and `meshComm.ts` for the 3-mode communication logic.
- **`data.db`**: The local SQLite database, operating in WAL (Write-Ahead Logging) mode for durability.

## 📜 License

MIT License © 2026 Error_404

## 🙌 Acknowledgement

Built for Solution Challenge 2026 – Build with AI
Powered by innovation, AI, and teamwork 🚀
