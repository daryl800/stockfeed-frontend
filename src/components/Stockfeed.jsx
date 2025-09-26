import React, { useEffect, useState, useRef } from "react";

export default function Stockfeed() {
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem("stockfeed_messages");
    return saved ? JSON.parse(saved) : [];
  });

  const wsRef = useRef(null);
  const connectedRef = useRef(false);
  const MAX_ENTRIES = 50;

  const formatTime = (isoString) => {
    try {
      const dt = new Date(isoString);
      const hh = dt.getHours().toString().padStart(2, "0");
      const mm = dt.getMinutes().toString().padStart(2, "0");
      return `${hh}:${mm}`;
    } catch {
      return isoString;
    }
  };

  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (connectedRef.current) return;
    connectedRef.current = true;

    const STOCK_WS_URL =
      (window.location.protocol === "https:" ? "wss" : "ws") +
      "://memorykeeper.duckdns.org/ws/stockfeed";

    function connect() {
      wsRef.current = new WebSocket(STOCK_WS_URL);

      wsRef.current.onopen = () => console.log("WebSocket connected");

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setMessages((prev) => {
            const newList = [data, ...prev].slice(0, MAX_ENTRIES);
            localStorage.setItem("stockfeed_messages", JSON.stringify(newList));
            return newList;
          });
        } catch (err) {
          console.error("Error parsing message:", err);
        }
      };

      wsRef.current.onclose = () => {
        console.log("WebSocket disconnected, reconnecting in 3s...");
        setTimeout(connect, 3000);
      };

      wsRef.current.onerror = (err) => {
        console.error("WebSocket error:", err);
        wsRef.current.close();
      };
    }

    connect();
    return () => wsRef.current?.close();
  }, []);

  // Style for each cell with border and optional color
  const cellStyle = (val, forceRed = false) => ({
    border: "1px solid #ccc",
    padding: "6px",
    textAlign: "center",
    // color: val !== undefined ? (forceRed || val < 0 ? "red" : "green") : "black",
    color: val !== undefined ? (forcedGreen || val > 0 ? "green" : "red") : "black",
    fontWeight: forcedGreen || (val !== undefined && val < 0) ? "bold" : "normal",
  });

  return (
    <div style={{ padding: 20 }}>
      <h1 style={{ textAlign: "center" }}>Stockfeed {today}</h1>

    {/* Grid Header */}
    <div
    style={{
        display: "grid",
        gridTemplateColumns: "repeat(7, 1fr)",
        textAlign: "center",
    }}
    >
    <div style={{ ...cellStyle(), fontWeight: "bold", backgroundColor: "lightgrey" }}>Symbol</div>
    <div style={{ ...cellStyle(), fontWeight: "bold", backgroundColor: "lightgrey" }}>Time</div>
    <div style={{ ...cellStyle(), fontWeight: "bold", backgroundColor: "lightgrey" }}>Current</div>
    <div style={{ ...cellStyle(), fontWeight: "bold", backgroundColor: "lightgrey" }}>Day Open</div>
    <div style={{ ...cellStyle(), fontWeight: "bold", backgroundColor: "lightgrey" }}>vs Day Open (%)</div>
    <div style={{ ...cellStyle(), fontWeight: "bold", backgroundColor: "lightgrey" }}>🟢/🔴</div>
    <div style={{ ...cellStyle(), fontWeight: "bold", backgroundColor: "lightgrey" }}>vs Lst Bar Close (%)</div>
    </div>


      {/* Grid Rows */}
      <div>
        {messages.map((msg, idx) => (
          <div
            key={idx}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
            }}
          >
            <div style={{ ...cellStyle(), fontWeight: "bold" }}>
                {msg.symbol}
            </div>
            <div style={cellStyle()}>{formatTime(msg.time)}</div>
            <div style={cellStyle(msg.price, msg.price < msg.day_open)}>
              {msg.price.toFixed(3)}
            </div>
            <div style={cellStyle()}>{msg.day_open.toFixed(3)}</div>
            <div style={cellStyle(msg.pct_vs_day_open)}>
              {msg.pct_vs_day_open.toFixed(5)}
            </div>
            <div style={cellStyle(msg.pct_vs_last_close)}>
                {msg.direction}
            </div>
            <div style={cellStyle(msg.pct_vs_last_close)}>
              {msg.pct_vs_last_close.toFixed(5)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
