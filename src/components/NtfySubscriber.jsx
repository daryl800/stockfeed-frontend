import { useEffect, useState } from "react";

const NTFY_USERNAME = "tradeinfouser";
const NTFY_PASSWORD = "Ng123456$";
const NTFY_TOPIC = "stockfeed";
// const NTFY_URL = `https://ntfy-memorykeeper.duckdns.org/${NTFY_TOPIC}/json?poll=1`;
const NTFY_URL = `https://ntfy-memorykeeper.duckdns.org/stockfeed/json?poll=1`;

export default function NtfySubscriber() {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    let isMounted = true;

    const pollMessages = async () => {
      try {
        const response = await fetch(NTFY_URL, {
          headers: {
            'Authorization': 'Basic ' + btoa(`${NTFY_USERNAME}:${NTFY_PASSWORD}`),
          },
        });

        if (!response.ok) {
          console.error("Polling error, status:", response.status);
          return;
        }

        const data = await response.json();

        if (isMounted && Array.isArray(data)) {
          setMessages(prev => [...prev, ...data]);
        }
      } catch (err) {
        console.error("Polling error:", err);
      } finally {
        // Poll again after 1 second
        setTimeout(pollMessages, 1000);
      }
    };

    pollMessages();

    return () => { isMounted = false; };
  }, []);

  return (
    <div>
      <h2>NTFY Messages:</h2>
      <ul>
        {messages.map((msg, idx) => (
          <li key={idx}>
            <strong>{msg.title || "No title"}:</strong> {msg.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
