import { useEffect, useState, useRef } from "react";

export default function useWebSocket(url) {
  const [messages, setMessages] = useState([]);
  const ws = useRef(null);

  useEffect(() => {
    ws.current = new WebSocket(url);

    ws.current.onopen = () => console.log("WebSocket connected");
    ws.current.onclose = () => console.log("WebSocket disconnected");

    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setMessages((prev) => [data, ...prev]); // prepend new messages
      } catch (err) {
        console.error("Failed to parse WebSocket message:", err);
      }
    };

    ws.current.onerror = (err) => {
      console.error("WebSocket error:", err);
      ws.current.close();
    };

    return () => ws.current && ws.current.close(); // cleanup
  }, [url]);

  return messages;
}
