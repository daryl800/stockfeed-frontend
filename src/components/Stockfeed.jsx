import React, { useEffect, useState, useRef } from "react";

export default function Stockfeed() {
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem("stockfeed_messages");
    return saved ? JSON.parse(saved) : [];
  });

  const [, tick] = useState(0); // force re-render for pink background
  const wsRef = useRef(null);
  const connectedRef = useRef(false);
  const MAX_ENTRIES = 200;

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

  const STOCK_WS_URL = (() => {
    const hostname = window.location.hostname;
    return hostname === "localhost"
      ? "ws://memorykeeper.duckdns.org:9002/ws/stockfeed"
      : "wss://memorykeeper.duckdns.org/ws/stockfeed";
  })();

  useEffect(() => {
    if (connectedRef.current) return;
    connectedRef.current = true;

    function connect() {
      wsRef.current = new WebSocket(STOCK_WS_URL);

      wsRef.current.onopen = () =>
        console.log("WebSocket connected:", STOCK_WS_URL);

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          data._updated = Date.now(); // timestamp

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
  }, [STOCK_WS_URL]);

  // force update every 1 second for pink highlight
  useEffect(() => {
    const interval = setInterval(() => tick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const cellStyle = (val) => {
    let color = "black";
    let fontWeight = "normal";
    if (typeof val === "number") {
      if (val > 0) {
        color = "green";
        fontWeight = "bold";
      } else if (val < 0) {
        color = "red";
      }
    }
    return { border: "1px solid #ccc", padding: "6px", textAlign: "center", color, fontWeight };
  };

  // Group messages by symbol, max 5 per symbol, sort alphabetically
  const grouped = messages.reduce((acc, msg) => {
    if (!acc[msg.symbol]) acc[msg.symbol] = [];
    if (acc[msg.symbol].length < 5) acc[msg.symbol].push(msg);
    return acc;
  }, {});

  const sortedMessages = Object.keys(grouped)
    .sort()
    .flatMap((symbol) => grouped[symbol]);

  const now = Date.now();

  // Clear button handler
  const clearMessages = () => {
    setMessages([]);
    localStorage.removeItem("stockfeed_messages");
  };

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ textAlign: "center" }}>Stockfeed {today}</h2>
<div style={{ textAlign: "center", marginBottom: 10 }}>
  <button
    onClick={clearMessages}
    style={{
      padding: "6px 12px",
      cursor: "pointer",
      backgroundColor: "lightgrey",
      border: "1px solid #999",
      borderRadius: "4px",
      fontWeight: "bold",
    }}
  >
    Clear All
  </button>
</div>


      {/* Grid Header */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          textAlign: "center",
        }}
      >
        {["Symbol","Time","Current","Day Open","vs Day Open (%)","🟢/🔴","vs Lst Bar Close (%)"].map((header) => (
          <div
            key={header}
            style={{
              border: "1px solid #ccc",
              padding: "6px",
              textAlign: "center",
              fontWeight: "bold",
              backgroundColor: "lightgrey",
            }}
          >
            {header}
          </div>
        ))}
      </div>

      {/* Grid Rows */}
      <div>
        {sortedMessages.map((msg, idx) => {
          const isRecent = now - msg._updated < 60 * 1000; // last 1 min
          return (
<div
  key={idx}
  style={{
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    backgroundColor: isRecent ? "#ffe0e5" : "transparent", // lighter pink
  }}
>
              <div style={{ ...cellStyle(), fontWeight: "bold" }}>{msg.symbol}</div>
              <div style={cellStyle()}>{formatTime(msg.time)}</div>
              <div style={cellStyle(msg.price - msg.day_open)}>
                {msg.price.toFixed(3)}
              </div>
              <div style={cellStyle()}>{msg.day_open.toFixed(3)}</div>
              <div style={cellStyle(msg.pct_vs_day_open)}>
                {msg.pct_vs_day_open.toFixed(5)}
              </div>
              <div style={cellStyle(msg.pct_vs_last_close)}>{msg.direction}</div>
              <div style={cellStyle(msg.pct_vs_last_close)}>
                {msg.pct_vs_last_close.toFixed(5)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
