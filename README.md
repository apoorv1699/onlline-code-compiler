# CodeSphere - Online Code Compiler

CodeSphere is a robust, dynamic Online Code Execution Engine featuring a premium Glassmorphism UI, real-time code editing, and secure backend Docker sandboxing. It supports NodeJS, Python, C++, and Java execution seamlessly via remote isolated containers.

## 🚀 Features
- **Premium Glassmorphism UI**: Beautiful, fully-responsive dashboard utilizing CSS-animated gradients and an automated chasing border light.
- **Monaco Editor Integration**: VScode-like typing experience with native syntax highlighting and intelligent indentation.
- **Secure Sandbox Execution**: The backend explicitly isolates execution runs using ephemeral Docker containers and randomized directories to prevent variable overlap and ensure absolute host-server safety.
- **Local Settings Caching**: Changes to your default programming language, dark/light mode preference, and exact code progress are locally cached to outlast sudden browser reloads.

## 🛠 Tech Stack
* **Frontend**: React (Vite JS framework), Vanilla CSS + SVG Keyframe Animations
* **Code Engine**: `@monaco-editor/react`
* **API Backend**: Node.js, Express JS, and Mongoose (MongoDB abstraction)
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
> Note: If MongoDB throws a DNS error (ENOTFOUND), the code platform will still technically run immutably, however history logs could not be securely saved.

## 💻 Startup Scripts

### 1. Launch Execution Server (Backend)
```bash
cd server
npm install
node index.js
```
The server binds to `http://localhost:5000` executing the Docker logic endpoints.

### 2. Launch Client UI (Frontend)
```bash
cd client
npm install
npm run dev
```
The application will be live at `http://localhost:5173`. Select your language, paste your algorithms, and hit **Run Code**!
