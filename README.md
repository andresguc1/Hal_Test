Hal Test Flow Manager

A powerful React-based application for creating, managing, and executing automated flow sequences. Designed to integrate seamlessly with the HalTest Backend, which provides browser automation through Playwright.

🔗 Backend Repository

The HalTest Flow Manager works together with the HalTest backend.
You can find the backend source code here:

👉 HalTest Backend Repository:
https://github.com/andresguc1/hal-test_Backend

This backend exposes RESTful automation endpoints under /actions/:actionName, which the frontend uses to run browser-based automation.

🚀 Features
🎨 Visual Flow Builder

Interactive drag-and-drop editor powered by React Flow.

Quickly build complex automation flows.

Live editing of nodes, edges, and parameters.

🧩 Node & Action Management

Nodes are synchronized with backend actions retrieved from /routes.

Dynamic configuration panels based on backend Joi validation schemas.

Pre-validation before executing actions to prevent backend errors.

🖥️ Flow Execution Engine

Sequential execution of flow nodes through REST calls:

Each node triggers /actions/:actionName

Parameters are sent as JSON

Real-time execution status, error handling, and logs.

Supports all backend automation categories (navigation, interactions, waits, screenshots, etc.).

📁 Import / Export

Export flows as JSON.

Import saved flows anytime.

🗺️ Navigation & Tools

Integrated minimap for large flow diagrams.

Collapsible panels.

Optional dark mode (if added later).

🔌 Full Backend Integration

Supports all automation categories provided by HalTest Backend:

Browser management

Navigation

DOM interactions

Waits and conditions

Screenshots & snapshots

Context/session handling

Network mocking/interception

AI-powered operations

CI/Test utilities

🛠️ Tech Stack

React 18

Vite

React Flow

Axios / Fetch

CSS Modules

React Icons

Vitest

📦 Installation
git clone <repository-url>
cd hal_test
npm install

🏃‍♂️ Usage
Development
npm run dev

Visit: http://localhost:5173

Production
npm run build
npm run preview

🔌 Backend Configuration

Create a .env file to configure the backend endpoint:

VITE_API_URL=http://localhost:3000

Example Axios client:

const api = axios.create({
baseURL: import.meta.env.VITE_API_URL,
});

🧠 How Flow Execution Works

Each node represents an automation action:

{
"id": "1",
"type": "actionNode",
"data": {
"action": "open_url",
"params": { "url": "https://example.com" }
}
}

The frontend makes a request:

POST {API_URL}/actions/open_url
Content-Type: application/json

{
"url": "https://example.com"
}

Backend response example:

{
"success": true,
"result": "Page loaded successfully"
}

This chaining mechanism allows full browser automation through visual flow design.

📜 Scripts

npm run dev – Development server

npm run build – Production build

npm run preview – Preview build

npm run lint – ESLint

npm run format – Prettier

npm test – Vitest

🤝 Contributing

Contributions are welcome!
Feel free to submit PRs for:

New node/automation types

UI/UX improvements

Better execution handling

Documentation enhancements

📄 License

MIT
