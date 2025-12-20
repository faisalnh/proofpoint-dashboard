import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Initialize theme from localStorage before render to prevent flash
const storedTheme = localStorage.getItem('theme');
if (storedTheme === 'dark') {
  document.documentElement.classList.add('dark');
} else if (storedTheme === 'light') {
  document.documentElement.classList.remove('dark');
} else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
  document.documentElement.classList.add('dark');
}

createRoot(document.getElementById("root")!).render(<App />);
