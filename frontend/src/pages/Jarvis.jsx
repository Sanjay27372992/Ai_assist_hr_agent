import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import api from "../services/api";

const STATUS = {
  IDLE: "idle",
  LISTENING: "listening",
  PROCESSING: "processing",
  SPEAKING: "speaking",
};

export default function PriyaVoice() {
  const [status, setStatus] = useState(STATUS.IDLE);
  const [transcript, setTranscript] = useState("");
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState("");
  const [callTime, setCallTime] = useState(0);

  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  const chatEndRef = useRef(null);
  const micStreamRef = useRef(null);
  const timerRef = useRef(null);

  // Call timer
  useEffect(() => {
    timerRef.current = setInterval(() => setCallTime(t => t + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, transcript]);

  // Auto welcome
  useEffect(() => {
    const welcomeText = "Hi! I'm Priya, your HR assistant. Feel free to ask me anything about employees, attendance, or leaves!";
    setMessages([{ from: "priya", text: welcomeText, time: new Date() }]);
    setTimeout(() => speakResponse(welcomeText), 800);
  }, []);

  // Speech recognition setup
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Speech recognition not supported.");
      return;
    }
    const rec = new SpeechRecognition();
    rec.lang = "en-IN";
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onresult = (e) => {
      const t = Array.from(e.results).map(r => r[0].transcript).join("");
      setTranscript(t);
    };

    rec.onend = async () => {
      releaseMic();
      if (recognitionRef.current._finalTranscript) {
        const text = recognitionRef.current._finalTranscript;
        recognitionRef.current._finalTranscript = "";
        setTranscript("");
        setMessages(prev => [...prev, { from: "user", text, time: new Date() }]);
        setStatus(STATUS.PROCESSING);
        await queryPriya(text);
      } else {
        setStatus(STATUS.IDLE);
      }
    };

    rec.onerror = (e) => {
      releaseMic();
      setError(`Mic error: ${e.error}`);
      setStatus(STATUS.IDLE);
    };

    recognitionRef.current = rec;
    return () => { rec.abort(); releaseMic(); };
  }, []);

  const releaseMic = useCallback(() => {
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(t => t.stop());
      micStreamRef.current = null;
    }
  }, []);

  const queryPriya = async (text) => {
    try {
      const res = await api.post("/jarvis/ask/", { question: text });
      const answer = res.data.answer;
      setMessages(prev => [...prev, { from: "priya", text: answer, time: new Date() }]);
      speakResponse(answer);
    } catch {
      const msg = "Sorry, I'm having trouble connecting right now.";
      setMessages(prev => [...prev, { from: "priya", text: msg, time: new Date() }]);
      speakResponse(msg);
    }
  };

  const speakResponse = (text) => {
    synthRef.current.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 1.05;
    utt.pitch = 1.2;
    const voices = synthRef.current.getVoices();
    const preferred = voices.find(v =>
      v.name.toLowerCase().includes("zira") ||
      v.name.toLowerCase().includes("samantha") ||
      v.name.toLowerCase().includes("aria") ||
      v.name.toLowerCase().includes("victoria") ||
      v.name.toLowerCase().includes("veena") ||
      (v.name.toLowerCase().includes("female") && v.lang.startsWith("en"))
    );
    if (preferred) utt.voice = preferred;
    utt.onstart = () => setStatus(STATUS.SPEAKING);
    utt.onend = () => setStatus(STATUS.IDLE);
    utt.onerror = () => setStatus(STATUS.IDLE);
    synthRef.current.speak(utt);
  };

  const startListening = async () => {
    if (status !== STATUS.IDLE) {
      if (status === STATUS.SPEAKING) { synthRef.current.cancel(); setStatus(STATUS.IDLE); }
      return;
    }
    setTranscript(""); setError(""); setStatus(STATUS.LISTENING);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
    } catch {}
    const rec = recognitionRef.current;
    if (!rec) return;
    rec._finalTranscript = "";
    const origOnResult = rec.onresult;
    rec.onresult = (e) => {
      const last = e.results[e.results.length - 1];
      if (last.isFinal) rec._finalTranscript = last[0].transcript;
      origOnResult(e);
    };
    try { rec.start(); } catch { setStatus(STATUS.IDLE); }
  };

  const stopListening = () => {
    if (status !== STATUS.LISTENING) return;
    if (!recognitionRef.current._finalTranscript) recognitionRef.current._finalTranscript = transcript;
    recognitionRef.current?.stop();
  };

  const handleMicClick = () => {
    if (status === STATUS.LISTENING) stopListening();
    else startListening();
  };

  const fmtMsgTime = (d) => {
    if (!d) return "";
    const h = d.getHours(); const m = d.getMinutes();
    const ampm = h >= 12 ? "PM" : "AM";
    return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
  };

  const isSpeaking = status === STATUS.SPEAKING;
  const isListening = status === STATUS.LISTENING;
  const isProcessing = status === STATUS.PROCESSING;

  return (
    <div style={{
      width: "100vw", height: "100vh", display: "flex",
      background: "#1a1a2e", fontFamily: "'Inter', sans-serif", overflow: "hidden",
    }}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />

      {/* ============ LEFT: VIDEO CALL VIEW ============ */}
      <div style={{
        flex: "1 1 55%", position: "relative", display: "flex",
        alignItems: "center", justifyContent: "center",
        background: "linear-gradient(180deg, #0f0f1a 0%, #1a1a2e 50%, #16132b 100%)",
        overflow: "hidden",
      }}>
        {/* Ambient background glow */}
        <div style={{
          position: "absolute", width: "120%", height: "120%",
          background: isSpeaking
            ? "radial-gradient(ellipse at center, rgba(236,72,153,0.08) 0%, transparent 60%)"
            : isListening
            ? "radial-gradient(ellipse at center, rgba(139,92,246,0.08) 0%, transparent 60%)"
            : "radial-gradient(ellipse at center, rgba(99,102,241,0.04) 0%, transparent 60%)",
          transition: "background 0.8s ease",
        }} />

        {/* Top bar: Call info */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0,
          padding: "16px 24px", display: "flex", alignItems: "center",
          justifyContent: "space-between", zIndex: 10,
          background: "linear-gradient(180deg, rgba(0,0,0,0.6) 0%, transparent 100%)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 8, height: 8, borderRadius: "50%", background: "#22c55e",
              boxShadow: "0 0 8px rgba(34,197,94,0.6)",
              animation: "pulse-dot 2s ease-in-out infinite",
            }} />
            <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: 500 }}>
              Connected
            </span>
          </div>
          <div style={{
            background: "rgba(255,255,255,0.08)", borderRadius: 8,
            padding: "4px 14px", fontSize: 14, fontWeight: 600,
            color: "rgba(255,255,255,0.8)", fontVariantNumeric: "tabular-nums",
          }}>
            {formatTime(callTime)}
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontWeight: 500 }}>
            HD Voice Call
          </div>
        </div>

        {/* Avatar / Video Feed */}
        <div style={{ position: "relative", zIndex: 2, textAlign: "center" }}>
          {/* Speaking ring animation */}
          {isSpeaking && (
            <>
              <motion.div
                animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.6, 0.3] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                style={{
                  position: "absolute", inset: -20, borderRadius: "50%",
                  border: "2px solid rgba(236,72,153,0.4)",
                  pointerEvents: "none",
                }}
              />
              <motion.div
                animate={{ scale: [1, 1.25, 1], opacity: [0.15, 0.35, 0.15] }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut", delay: 0.3 }}
                style={{
                  position: "absolute", inset: -36, borderRadius: "50%",
                  border: "1.5px solid rgba(236,72,153,0.25)",
                  pointerEvents: "none",
                }}
              />
            </>
          )}

          {/* Listening ring */}
          {isListening && (
            <motion.div
              animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.5, 0.2] }}
              transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
              style={{
                position: "absolute", inset: -16, borderRadius: "50%",
                border: "2px solid rgba(139,92,246,0.5)",
                pointerEvents: "none",
              }}
            />
          )}

          <motion.img
            src="/priya_avatar.png"
            alt="Priya"
            animate={{ scale: isSpeaking ? [1, 1.015, 1] : 1 }}
            transition={{ repeat: Infinity, duration: 0.6, ease: "easeInOut" }}
            style={{
              width: 320, height: 320, borderRadius: "50%", objectFit: "cover",
              border: isSpeaking
                ? "3px solid rgba(236,72,153,0.5)"
                : isListening
                ? "3px solid rgba(139,92,246,0.5)"
                : "3px solid rgba(255,255,255,0.08)",
              boxShadow: isSpeaking
                ? "0 0 80px rgba(236,72,153,0.25)"
                : isListening
                ? "0 0 60px rgba(139,92,246,0.2)"
                : "0 0 40px rgba(0,0,0,0.5)",
              transition: "border 0.4s ease, box-shadow 0.4s ease",
            }}
          />

          {/* Sound wave bars when speaking */}
          <AnimatePresence>
            {isSpeaking && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  position: "absolute", bottom: -10, left: "50%", transform: "translateX(-50%)",
                  display: "flex", alignItems: "flex-end", gap: 3, height: 30,
                }}
              >
                {Array(12).fill(0).map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ height: [4, 12 + Math.random() * 18, 4] }}
                    transition={{ repeat: Infinity, duration: 0.3 + Math.random() * 0.3, ease: "easeInOut" }}
                    style={{ width: 3, borderRadius: 3, background: "rgba(236,72,153,0.7)" }}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Name badge overlay */}
        <div style={{
          position: "absolute", bottom: 100, left: 24, zIndex: 10,
          display: "flex", alignItems: "center", gap: 10,
          background: "rgba(0,0,0,0.5)", backdropFilter: "blur(10px)",
          borderRadius: 12, padding: "10px 18px",
        }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", overflow: "hidden", border: "2px solid rgba(255,255,255,0.15)" }}>
            <img src="/priya_avatar.png" alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
          <div>
            <div style={{ color: "#fff", fontSize: 15, fontWeight: 600 }}>Priya</div>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 500 }}>HR Assistant</div>
          </div>
        </div>

        {/* Bottom controls bar */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          padding: "20px 0 28px", display: "flex", alignItems: "center",
          justifyContent: "center", gap: 16, zIndex: 10,
          background: "linear-gradient(0deg, rgba(0,0,0,0.7) 0%, transparent 100%)",
        }}>
          {/* Mic button */}
          <motion.button
            onClick={handleMicClick}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            animate={isListening ? {
              boxShadow: ["0 0 0 0 rgba(139,92,246,0.5)", "0 0 0 16px rgba(139,92,246,0)", "0 0 0 0 rgba(139,92,246,0.5)"],
            } : {}}
            transition={isListening ? { repeat: Infinity, duration: 1.5 } : {}}
            style={{
              width: 60, height: 60, borderRadius: "50%", border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", outline: "none",
              background: isListening
                ? "#7c3aed"
                : isProcessing
                ? "#e11d48"
                : "#ec4899",
              boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
            }}
            aria-label="Toggle microphone"
          >
            {isProcessing ? (
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
              </motion.div>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            )}
          </motion.button>

          {/* Status text under controls */}
          <AnimatePresence mode="wait">
            <motion.div
              key={status}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              style={{
                position: "absolute", bottom: 6,
                fontSize: 12, fontWeight: 600, letterSpacing: "0.05em",
                color: isListening ? "#a78bfa" : isSpeaking ? "#f9a8d4" : isProcessing ? "#fca5a5" : "rgba(255,255,255,0.4)",
              }}
            >
              {isListening ? "● Listening... tap mic to send" : isSpeaking ? "● Priya is speaking..." : isProcessing ? "● Thinking..." : "Tap mic to speak"}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ============ RIGHT: CHAT PANEL ============ */}
      <div style={{
        flex: "1 1 45%", display: "flex", flexDirection: "column",
        background: "#111118", borderLeft: "1px solid rgba(255,255,255,0.06)",
      }}>
        {/* Chat header */}
        <div style={{
          padding: "18px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>Chat</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>
              Voice conversation transcript
            </div>
          </div>
          <div style={{
            fontSize: 11, color: "rgba(255,255,255,0.3)", fontWeight: 500,
            background: "rgba(255,255,255,0.04)", padding: "4px 12px", borderRadius: 6,
          }}>
            {messages.length} messages
          </div>
        </div>

        {/* Messages area */}
        <div style={{
          flex: 1, overflowY: "auto", padding: "16px 20px",
          display: "flex", flexDirection: "column", gap: 4,
        }}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              style={{
                display: "flex", flexDirection: "column",
                alignItems: msg.from === "user" ? "flex-end" : "flex-start",
                marginBottom: 4,
              }}
            >
              {/* Show name if first message or different sender */}
              {(i === 0 || messages[i - 1].from !== msg.from) && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 8,
                  marginBottom: 6, marginTop: i > 0 ? 12 : 0,
                  flexDirection: msg.from === "user" ? "row-reverse" : "row",
                }}>
                  {msg.from === "priya" && (
                    <div style={{
                      width: 28, height: 28, borderRadius: "50%", overflow: "hidden",
                      border: "2px solid rgba(139,92,246,0.3)",
                    }}>
                      <img src="/priya_avatar.png" alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                  )}
                  <span style={{
                    fontSize: 12, fontWeight: 600,
                    color: msg.from === "priya" ? "#a78bfa" : "#f9a8d4",
                  }}>
                    {msg.from === "priya" ? "Priya" : "You"}
                  </span>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>
                    {fmtMsgTime(msg.time)}
                  </span>
                </div>
              )}

              <div style={{
                maxWidth: "88%",
                padding: "12px 16px",
                borderRadius: msg.from === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                background: msg.from === "user"
                  ? "linear-gradient(135deg, rgba(236,72,153,0.15), rgba(236,72,153,0.08))"
                  : "rgba(255,255,255,0.04)",
                border: msg.from === "user"
                  ? "1px solid rgba(236,72,153,0.12)"
                  : "1px solid rgba(255,255,255,0.06)",
              }}>
                <p style={{
                  margin: 0, fontSize: 14, lineHeight: 1.6,
                  color: "rgba(255,255,255,0.85)", fontWeight: 400,
                }}>
                  {msg.text}
                </p>
              </div>
            </motion.div>
          ))}

          {/* Live transcript */}
          {transcript && isListening && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", marginTop: 12 }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexDirection: "row-reverse" }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#c084fc" }}>You</span>
                <span style={{ fontSize: 11, color: "rgba(139,92,246,0.5)" }}>speaking...</span>
              </div>
              <div style={{
                maxWidth: "88%", padding: "12px 16px",
                borderRadius: "18px 18px 4px 18px",
                background: "rgba(139,92,246,0.1)",
                border: "1px dashed rgba(139,92,246,0.25)",
              }}>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "rgba(255,255,255,0.7)" }}>
                  {transcript}
                  <motion.span
                    animate={{ opacity: [1, 0] }}
                    transition={{ repeat: Infinity, duration: 0.5 }}
                    style={{ color: "#8b5cf6", marginLeft: 2 }}
                  >|</motion.span>
                </p>
              </div>
            </motion.div>
          )}

          {/* Processing typing indicator */}
          {isProcessing && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", marginTop: 12 }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", overflow: "hidden", border: "2px solid rgba(139,92,246,0.3)" }}>
                  <img src="/priya_avatar.png" alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#a78bfa" }}>Priya</span>
              </div>
              <div style={{
                padding: "14px 20px", borderRadius: "18px 18px 18px 4px",
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)",
                display: "flex", gap: 5,
              }}>
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    animate={{ opacity: [0.3, 1, 0.3], y: [0, -5, 0] }}
                    transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }}
                    style={{ width: 8, height: 8, borderRadius: "50%", background: "#a78bfa" }}
                  />
                ))}
              </div>
            </motion.div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Error bar */}
        {error && (
          <div style={{
            padding: "10px 20px", background: "rgba(239,68,68,0.08)",
            borderTop: "1px solid rgba(239,68,68,0.1)", color: "#fca5a5", fontSize: 13,
          }}>
            {error}
          </div>
        )}

        {/* Bottom info */}
        <div style={{
          padding: "14px 24px", borderTop: "1px solid rgba(255,255,255,0.04)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          fontSize: 11, color: "rgba(255,255,255,0.2)",
        }}>
          <span>Voice-to-text enabled</span>
          <span>Powered by Priya AI</span>
        </div>
      </div>

      {/* Global styles */}
      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.15); }
      `}</style>
    </div>
  );
}