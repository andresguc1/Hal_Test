# Hal Test Flow Manager

A powerful React-based application for creating, managing, and executing automated flow sequences. Designed to integrate seamlessly with the **HalTest Backend**, which provides browser automation through Playwright.

---

## 📦 Related Repositories

### 🔗 HalTest Backend

This frontend works together with the HalTest Backend, available here:

➡️ **Repository:** https://github.com/andresguc1/hal-test_Backend

The backend exposes RESTful endpoints for browser automation, action execution, session handling, Playwright control, and more. Make sure you have it running for full functionality.

---

## 🚀 Features

### 🎨 **Visual Flow Builder**

- Interactive drag-and-drop interface powered by React Flow.
- Easily create complex automation flows.
- Real-time editing of nodes, edges, and parameters.

### 🧩 **Node & Action Management**

- Node types automatically aligned with backend actions (retrieved from `/routes`).
- Dynamic configuration panels based on backend **Joi schemas**.
- Parameter validation before triggering an execution.

### 🖥️ **Flow Execution Engine**

- Execute entire flows by sending sequential REST calls to the backend:
  - Each node corresponds to: `/actions/:actionName`
  - Node parameters are sent in the request body
- Real-time progress tracking for each action.
- Error handling, logging, and execution reports.

### 📁 **Import / Export**

- Export flows to JSON for reuse or sharing.
- Import previously saved flows at any time.

### 🗺️ **Navigation & Tools**

- Built-in minimap for large flows.
- Collapsible side panels for a clean workspace.
- Optional dark mode (if added later).

### 🔌 **Full Integration With HalTest Backend**

Supports all backend features, including:

- Browser launch & control
- Navigation
- DOM interactions
- Wait conditions
- Screenshots & DOM captures
- Session & context management
- Network mocking & interception
- AI-based actions
- CI-oriented test flows

---

## 🛠️ Tech Stack

- **React 18**
- **Vite**
- **React Flow**
- **Axios / Fetch** (for backend communication)
- **CSS Modules**
- **React Icons**
- **Vitest**

---

## 📦 Installation

```bash
git clone <repository-url>
cd hal_test
npm install
🏃‍♂️ Usage
Development
bash
Copy code
npm run dev
Open: http://localhost:5173

Production Build
bash
Copy code
npm run build
npm run preview
🔌 Backend Configuration
Create a .env file to set the backend URL:

env
Copy code
VITE_API_URL=http://localhost:3000
Use it in your API client:

js
Copy code
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});
🧠 How Flow Execution Works
Each flow node represents an automation action:

json
Copy code
{
  "id": "1",
  "type": "actionNode",
  "data": {
    "action": "open_url",
    "params": { "url": "https://example.com" }
  }
}
The frontend sends:

http
Copy code
POST {API_URL}/actions/open_url
Content-Type: application/json

{
  "url": "https://example.com"
}
The backend executes it using Playwright and returns:

json
Copy code
{
  "success": true,
  "result": "Page loaded"
}
By connecting nodes, you can visually build complete browser automation pipelines.

📜 Available Scripts
npm run dev – Start development server

npm run build – Build for production

npm run preview – Preview production build

npm run lint – Run ESLint

npm run format – Format code

npm test – Run tests

🤝 Contributing
Contributions are welcome! You can help improve:

Node/action components

Flow editor UX/UI

Execution engine

Documentation

📄 License
MIT
```
