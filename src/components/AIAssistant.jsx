import { useState, useRef, useEffect } from "react";
import { askAssistant } from "../lib/api";

const QUICK = [
  "How many GOD-tier gifts are still pending?",
  "Give me a VIP finance summary report",
  "What percentage of GOD-tier gifts are delivered?",
  "What should we prioritize for GOD-tier clients?",
];

export default function AIAssistant() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Hello! I can answer questions about your GOD-tier gift delivery status. I only use aggregated, anonymized data — no personal client information is ever sent to the AI.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const loadingRef = useRef(false);
  const bottomRef = useRef();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (q) => {
    const question = (q || input).trim();
    if (!question || loadingRef.current) return;

    loadingRef.current = true;
    setLoading(true);
    setInput("");
    setMessages((m) => [...m, { role: "user", text: question }]);

    try {
      const text = await askAssistant(question);
      setMessages((m) => [...m, { role: "assistant", text }]);
    } catch (error) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text:
            error.message ||
            "Connection error. Please try again.",
        },
      ]);
    }

    loadingRef.current = false;
    setLoading(false);
  };

  return (
    <div>
      <div
        style={{
          background: "#EFF6FF",
          border: "1px solid #BFDBFE",
          borderRadius: 10,
          padding: "10px 14px",
          fontSize: 12,
          color: "#1D4ED8",
          display: "flex",
          gap: 8,
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        🔒{" "}
        <span>
          <strong>Privacy-safe:</strong> The browser sends your question to the
          app backend, and only aggregated GOD-tier totals are forwarded to the AI.
        </span>
      </div>

      <div
        style={{
          border: "1px solid #E2E8F0",
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "10px 16px",
            background: "#F8FAFC",
            borderBottom: "1px solid #E2E8F0",
            fontSize: 13,
            fontWeight: 600,
            color: "#1E293B",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          🤖 AI Assistant
          <span
            style={{
              fontSize: 11,
              fontWeight: 400,
              color: "#64748B",
              marginLeft: 4,
            }}
          >
            GOD-tier aggregated data only
          </span>
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            padding: "10px 14px",
            borderBottom: "1px solid #F1F5F9",
            background: "#fff",
          }}
        >
          {QUICK.map((q) => (
            <button
              key={q}
              onClick={() => send(q)}
              disabled={loading}
              style={{
                fontSize: 11,
                padding: "5px 12px",
                borderRadius: 99,
                border: "1px solid #E2E8F0",
                background: "#F8FAFC",
                cursor: loading ? "not-allowed" : "pointer",
                color: "#475569",
                opacity: loading ? 0.5 : 1,
              }}
            >
              {q}
            </button>
          ))}
        </div>

        <div
          style={{
            minHeight: 240,
            maxHeight: 320,
            overflowY: "auto",
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 12,
            background: "#fff",
          }}
        >
          {messages.map((m, i) => (
            <div
              key={i}
              style={{
                maxWidth: "80%",
                alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              }}
            >
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: 12,
                  fontSize: 13,
                  lineHeight: 1.6,
                  borderBottomRightRadius: m.role === "user" ? 4 : 12,
                  borderBottomLeftRadius: m.role === "assistant" ? 4 : 12,
                  background: m.role === "user" ? "#1E293B" : "#F8FAFC",
                  color: m.role === "user" ? "#fff" : "#1E293B",
                  border: m.role === "assistant" ? "1px solid #E2E8F0" : "none",
                  whiteSpace: "pre-wrap",
                }}
              >
                {m.text}
              </div>
            </div>
          ))}
          {loading && (
            <div
              style={{
                alignSelf: "flex-start",
                background: "#F8FAFC",
                border: "1px solid #E2E8F0",
                borderRadius: 12,
                borderBottomLeftRadius: 4,
                padding: "10px 14px",
                fontSize: 13,
                color: "#94A3B8",
              }}
            >
              Analyzing...
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
            padding: "12px 14px",
            borderTop: "1px solid #E2E8F0",
            background: "#fff",
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Ask about GOD-tier delivery status..."
            disabled={loading}
            style={{
              flex: 1,
              fontSize: 13,
              padding: "9px 12px",
              border: "1px solid #E2E8F0",
              borderRadius: 8,
              background: "#fff",
              color: "#1E293B",
              outline: "none",
            }}
          />
          <button
            onClick={() => send()}
            disabled={loading || !input.trim()}
            style={{
              fontSize: 13,
              padding: "9px 18px",
              borderRadius: 8,
              border: "none",
              background: "#1E293B",
              color: "#fff",
              cursor: "pointer",
              fontWeight: 600,
              opacity: !input.trim() || loading ? 0.5 : 1,
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
