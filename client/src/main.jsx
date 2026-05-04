import React from "react"
import ReactDOM from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import App from "./App.jsx"
import { AuthProvider } from "./contexts/AuthContext"
import { ToastProvider } from "./contexts/ToastContext"
import "./index.css"

// Clean up console logs in production
if (process.env.NODE_ENV === 'production') {
  // Override console.log to prevent logging in production
  const originalLog = console.log;
  console.log = function() {
    // Only log in development
    if (process.env.NODE_ENV === 'development') {
      originalLog.apply(console, arguments);
    }
  };

  // Override console.info to prevent logging in production
  const originalInfo = console.info;
  console.info = function() {
    if (process.env.NODE_ENV === 'development') {
      originalInfo.apply(console, arguments);
    }
  };

  // Override console.debug to prevent logging in production
  const originalDebug = console.debug;
  console.debug = function() {
    if (process.env.NODE_ENV === 'development') {
      originalDebug.apply(console, arguments);
    }
  };

  // Keep console.error and console.warn for production debugging
  // console.error and console.warn remain unchanged
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
