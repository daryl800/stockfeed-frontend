import React, { useEffect, useState, useRef } from "react";

export default function Stockfeed() {
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem("stockfeed_messages");
    return saved ? JSON.parse(saved) : [];
  });

  const [, tick] = useState(0); // force re-render for highlights
  const wsRef = useRef(null);
  const connectedRef = useRef(false);
  const MAX_ENTRIES = 200;

  // Audio objects
  const dingSound = useRef(new Audio('/stockfeed-frontend/sounds/ding.mp3')).current;
  const dongSound = useRef(new Audio('/stockfeed-frontend/sounds/dong.mp3')).current;

  // Sounds enabled flag
  const [soundsEnabled, setSoundsEnabled] = useState(false);
  const soundsEnabledRef = useRef(soundsEnabled);
  useEffect(() => { soundsEnabledRef.current = soundsEnabled; }, [soundsEnabled]);

  // Clock state
  const [currentTime, setCurrentTime] = useState(() => {
    const now = new Date();
    return now.toLocaleTimeString("en-GB", { hour12: false }); // hh:mm:ss
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString("en-GB", { hour12: false }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (isoString) => {
    try {
      const dt = new Date(isoString);
      return `${dt.getHours().toString().padStart(2, "0")}:${dt.getMinutes().toString().padStart(2, "0")}`;
    } catch {
      return isoString;
    }
  };

  const today = new Date().toISOString().slice(0, 10);
  const STOCK_WS_URL = "wss://memorykeeper.duckdns.org/ws/stockfeed";

  useEffect(() => {
    if (connectedRef.current) return;
    connectedRef.current = true;

    function connect() {
      wsRef.current = new WebSocket(STOCK_WS_URL);

      wsRef.current.onopen = () => console.log("WebSocket connected:", STOCK_WS_URL);

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          data._updated = Date.now();

          console.log("🔔 Sound check for message:", data.symbol, data.pct_vs_last_close);

          if (soundsEnabledRef.current) {
            if (data.pct_vs_last_close > 0) {
              dingSound.currentTime = 0;
              dingSound.play().then(() => console.log("✅ dingSound played")).catch(err => console.error("❌ dingSound play error:", err));
            } else if (data.pct_vs_last_close < 0) {
              dongSound.currentTime = 0;
              dongSound.play().then(() => console.log("✅ dongSound played")).catch(err => console.error("❌ dongSound play error:", err));
            }
          }

          setMessages(prev => {
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

  // Force update for highlights every 1 second
  useEffect(() => {
    const interval = setInterval(() => tick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const cellStyle = (val) => {
    let color = "black";
    let fontWeight = "normal";
    if (typeof val === "number") {
      if (val > 0) color = "green";
      else if (val < 0) color = "red";
      if (val !== 0) fontWeight = "bold";
    }
    return { border: "1px solid darkgrey", padding: "6px", textAlign: "center", color, fontWeight };
  };

  const grouped = messages.reduce((acc, msg) => {
    if (!acc[msg.symbol]) acc[msg.symbol] = [];
    if (acc[msg.symbol].length < 5) acc[msg.symbol].push(msg);
    return acc;
  }, {});

  const clearMessages = () => {
    setMessages([]);
    localStorage.removeItem("stockfeed_messages");
  };

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ textAlign: "center", color: "blueviolet" }}>
        STOCKFEED {today}{" "}
        <span style={{ color: "grey" }}>[{currentTime}]</span>
      </h2>

      <div style={{ textAlign: "center", marginBottom: 10 }}>
        <button
          onClick={clearMessages}
          style={{ padding: "6px 12px", cursor: "pointer", backgroundColor: "lightgrey", border: "1px solid #999", borderRadius: "4px", fontWeight: "bold", color: "blue" }}
        >
          Clear All
        </button>

        {!soundsEnabled && (
          <button
            onClick={() => {
              // Unlock sounds by playing briefly
              dingSound.currentTime = 0;
              dingSound.play().then(() => {
                dingSound.pause();
                dingSound.currentTime = 0;
                console.log("✅ dingSound unlocked");
              }).catch(() => { });

              dongSound.currentTime = 0;
              dongSound.play().then(() => {
                dongSound.pause();
                dongSound.currentTime = 0;
                console.log("✅ dongSound unlocked");
              }).catch(() => { });

              setSoundsEnabled(true);
              console.log("🔊 Enable Sounds clicked");
            }}
            style={{ padding: "6px 12px", marginLeft: 10, cursor: "pointer", backgroundColor: "lightgreen", border: "1px solid #999", borderRadius: "4px", fontWeight: "bold", color: "darkgreen" }}
          >
            Enable Sounds
          </button>
        )}
      </div>

      {/* Grid Header */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", textAlign: "center" }}>
        {["Symbol", "Time", "Day Open", "Current", "vs Day Open (%)", "🟢/🔴", "vs Lst Bar Close (%)"].map(header => (
          <div key={header} style={{ border: "1px solid darkgrey", padding: "6px", textAlign: "center", fontWeight: "bold", backgroundColor: "grey", color: "white" }}>
            {header}
          </div>
        ))}
      </div>

      {/* Grid Rows */}
      <div>
        {Object.entries(grouped)
          .sort((a, b) => Math.max(...b[1].map(m => m.pct_vs_day_open)) - Math.max(...a[1].map(m => m.pct_vs_day_open)))
          .map(([symbol, msgs], groupIdx) => {
            const groupBg = groupIdx % 2 === 0 ? "white" : "lightgrey";
            return msgs.map((msg, idx) => {
              const isRecent = Date.now() - msg._updated < 60 * 1000;
              let rowBg = groupBg;
              if (isRecent) {
                if (msg.pct_vs_last_close > 0) rowBg = "lightgreen";
                else if (msg.pct_vs_last_close < 0) rowBg = "lightpink";
              }

              return (
                <div key={`${symbol}-${idx}`} style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", backgroundColor: rowBg }}>
                  <div style={{ ...cellStyle(), fontWeight: "bold" }}>{msg.symbol}</div>
                  <div style={cellStyle()}>{formatTime(msg.time)}</div>
                  <div style={cellStyle()}>{msg.day_open.toFixed(3)}</div>
                  <div style={cellStyle(msg.price - msg.day_open)}>{msg.price.toFixed(3)}</div>
                  <div style={cellStyle(msg.pct_vs_day_open)}>{msg.pct_vs_day_open.toFixed(5)}</div>
                  <div style={cellStyle(msg.pct_vs_last_close)}>{msg.direction}</div>
                  <div style={cellStyle(msg.pct_vs_last_close)}>{msg.pct_vs_last_close.toFixed(5)}</div>
                </div>
              );
            });
          })}
      </div>
    </div>
  );
}
