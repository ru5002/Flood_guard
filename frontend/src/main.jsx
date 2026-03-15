import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import L from "leaflet";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

document.title = "FloodGuard";

const favicon = document.querySelector("link[rel='icon']") || document.createElement("link");
favicon.rel = "icon";
favicon.type = "image/png";
favicon.href = `/floodguard-logo.png?v=${Date.now()}`;
document.head.appendChild(favicon);

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});


ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
