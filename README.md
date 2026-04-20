# CodeSphere - Real-Time Collaborative IDE

CodeSphere is a robust, dynamic Online Code Execution Engine and Collaborative IDE. It features a premium Glassmorphism UI, real-time Google Docs-style code editing, a multi-file explorer, an interactive terminal, and highly secure backend Docker sandboxing. It supports NodeJS, Python, C++, and Java execution seamlessly via remote isolated containers.

## 🚀 Key Features

- **Real-Time Collaboration**: Powered by Yjs and WebSockets (`y-websocket`), multiple users can edit code simultaneously with zero latency. See live cursors and color-coded name tags of your peers.
- **Interactive PTY Terminal**: Built with `xterm.js` and `node-pty`, the execution engine streams standard input/output in real-time. You can interact with your programs live (e.g., typing into Java `Scanner` or Python `input()`).
- **Multi-File Project Explorer**: Create and manage multiple files (e.g., `main.py` and `helper.py`). The Docker engine preserves your directory structure so modules and imports resolve perfectly during execution.
- **Secure Sandbox Execution**: 
  - Every run is isolated in an ephemeral Docker container.
  - Strict hardware caps: `256MB RAM`, `0.5 CPU cores`, and `50 PIDs limit`.
  - Network isolation (`--network none`) and a 60-second execution timeout guard against malicious code or infinite loops.
  - An asynchronous Job Queue rate-limits the server to a maximum of 5 concurrent compilations to ensure absolute host-server safety.
- **Authentication & Cloud Storage**: JWT-based secure authentication. Save and load your multi-file projects to a MongoDB cloud database.
- **Local DB Fallback Engine**: If the MongoDB URI is missing or the connection drops (e.g., blocked by a corporate firewall), CodeSphere instantly and seamlessly falls back to a custom local JSON database engine, ensuring the app never goes down.
- **Live Integrated Chat**: Chat with other users in your current room without leaving the IDE.
- **Premium Glassmorphism UI**: Beautiful, fully-responsive dashboard utilizing CSS-animated gradients, Dark/Light mode, and `Monaco Editor` for a native VS Code typing experience.

## 🛠 Tech Stack

* **Frontend**: React (Vite JS framework), Vanilla CSS, Monaco Editor, Xterm.js
* **Collaboration Engine**: Yjs, y-websocket, y-monaco, Socket.io
* **API Backend**: Node.js, Express JS, node-pty, jsonwebtoken, bcryptjs
* **Database**: MongoDB (Mongoose) + Local JSON Fallback (`fs`)
* **Execution Environment**: Docker via Child Processes

## 🧰 Prerequisites

In order to run this project natively, you must have the following installed on your host machine:
* [Node.js](https://nodejs.org/en/) (v16+)
* [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Actively running)
* Required Docker images pulled globally:
  * `node:18-slim`
  * `python:3.9-slim`
  * `gcc:latest`
  * `eclipse-temurin:17-jdk-alpine`

## ⚙️ Environment Configuration

Navigate to your `server/` directory and configure the environment variables via an `.env` file:
```env
MONGO_URI=mongodb+srv://<user>:<password>@<your-cluster-url>/<db>?retryWrites=true&w=majority
PORT=5000
```
> **Note**: If `MONGO_URI` is left blank or throws a connection error, the app will automatically generate and use a local `data/db.json` file for persistent storage.

## 💻 Startup Scripts

### 1. Launch Execution Server (Backend)
```bash
cd server
npm install
node index.js
```
The server binds to `http://localhost:5000` executing the Docker logic endpoints, WebSocket handlers, and Auth routes.

### 2. Launch Client UI (Frontend)
```bash
cd client
npm install
npm run dev
```
The application will be live at `http://localhost:5173`. Invite friends by sending them the URL with your Room ID, select your language, type some code, and hit **Run Code**!
