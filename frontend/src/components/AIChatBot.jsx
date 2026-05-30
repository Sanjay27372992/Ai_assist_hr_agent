import { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Sparkles, User, Loader2, ChevronDown, ChevronLeft, MessageSquare } from 'lucide-react';
import { aiService } from '../services';
import toast from 'react-hot-toast';

/* ── Markdown-lite renderer (bold + bullets) ─────────────────────── */
const renderText = (text) => {
  if (!text) return null;
  return text.split('\n').map((line, i) => {
    // Bold **text**
    const parts = line.split(/\*\*(.*?)\*\*/g).map((part, j) =>
      j % 2 === 1
        ? <strong key={j} style={{ color: '#000000', fontWeight: 700 }}>{part}</strong>
        : part
    );
    // Bullet lines
    const isBullet = line.trim().startsWith('•') || line.trim().startsWith('-');
    return (
      <p key={i} style={{
        margin: isBullet ? '2px 0' : '4px 0',
        paddingLeft: isBullet ? 8 : 0,
        lineHeight: 1.55,
      }}>
        {parts}
      </p>
    );
  });
};



/* ── Single message bubble ───────────────────────────────────────── */
const Bubble = ({ msg }) => {
  const isUser = msg.role === 'user';
  return (
    <div style={{
      display: 'flex',
      flexDirection: isUser ? 'row-reverse' : 'row',
      alignItems: 'flex-end',
      gap: 8,
      marginBottom: 14,
      animation: 'aiSlideUp .25s ease',
    }}>
      {/* Avatar icon */}
      <div style={{
        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: isUser
          ? '#000000'
          : '#343A40',
        border: '1px solid var(--bd-hi)',
      }}>
        {isUser ? <User size={13} color="#FFFFFF" /> : <Bot size={13} color="#FFFFFF" />}
      </div>

      {/* Bubble */}
      <div style={{
        maxWidth: '78%',
        padding: '10px 14px',
        borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
        background: isUser
          ? '#000000'
          : '#FFFFFF',
        border: isUser ? 'none' : '1px solid var(--bd-md)',
        fontSize: 13,
        color: isUser ? '#FFFFFF' : '#212529',
        lineHeight: 1.55,
        boxShadow: isUser
          ? '0 4px 16px rgba(0,0,0,.08)'
          : '0 2px 8px rgba(0,0,0,.05)',
      }}>
        {isUser ? msg.content : renderText(msg.content)}
        <div style={{ fontSize: 10, color: 'var(--tx-3)', marginTop: 5, textAlign: 'right' }}>
          {msg.time}
        </div>
      </div>
    </div>
  );
};

/* ── Typing indicator ────────────────────────────────────────────── */
const Typing = () => (
  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 14 }}>
    <div style={{
      width: 28, height: 28, borderRadius: '50%',
      background: '#F8F9FA',
      border: '1px solid var(--bd-hi)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Bot size={13} color="#000000" />
    </div>
    <div style={{
      padding: '12px 16px', borderRadius: '16px 16px 16px 4px',
      background: '#FFFFFF', border: '1px solid var(--bd-md)',
      display: 'flex', gap: 5, alignItems: 'center',
    }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 6, height: 6, borderRadius: '50%',
          background: '#868E96',
          animation: `aiDot 1.2s ease-in-out ${i * 0.2}s infinite`,
        }} />
      ))}
    </div>
  </div>
);

/* ── Main AIChatBot component ────────────────────────────────────── */
const AIChatBot = () => {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState('home'); // 'home' or 'chat'
  const [messages, setMessages] = useState([]);
  const [fullHistory, setFullHistory] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(0);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  function now() {
    return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const res = await aiService.getHistory();
        const formatted = [];
        res.data.forEach(item => {
          const formattedTime = new Date(item.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
          formatted.push({ role: 'user', content: item.user_message, time: formattedTime });
          formatted.push({ role: 'ai', content: item.ai_response, time: formattedTime });
        });
        setFullHistory(formatted);
        setMessages(formatted);
      } catch (err) {
        console.error("Failed to load chat history:", err);
      }
    };
    loadHistory();
  }, []);

  useEffect(() => {
    if (open) {
      setUnread(0);
      if (view === 'chat') setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, view]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput('');

    const userMsg = { role: 'user', content: msg, time: now() };
    setMessages(prev => {
      const newMsgs = [...prev, userMsg];
      setFullHistory(newMsgs);
      return newMsgs;
    });
    setLoading(true);

    try {
      const res = await aiService.chat(msg);
      const aiMsg = { role: 'ai', content: res.data.answer, time: now() };
      setMessages(prev => {
        const newMsgs = [...prev, aiMsg];
        setFullHistory(newMsgs);
        return newMsgs;
      });
      if (!open) setUnread(n => n + 1);
    } catch (e) {
      const err = e.response?.data?.error || 'Something went wrong. Please try again.';
      setMessages(prev => [...prev, { role: 'ai', content: `⚠️ ${err}`, time: now() }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <>
      {/* Keyframes */}
      <style>{`
        @keyframes aiSlideUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes aiDot { 0%,80%,100%{transform:scale(.7);opacity:.4} 40%{transform:scale(1);opacity:1} }
        @keyframes aiPulse { 0%,100%{box-shadow:0 0 0 0 rgba(0,0,0,.3)} 50%{box-shadow:0 0 0 8px rgba(0,0,0,0)} }
        @keyframes aiFadeIn { from{opacity:0;transform:scale(.95) translateY(12px)} to{opacity:1;transform:scale(1) translateY(0)} }
      `}</style>

      {/* ── Floating button ── */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 500,
          width: 56, height: 56, borderRadius: '50%',
          background: '#000000',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 32px rgba(0,0,0,.25)',
          animation: 'aiPulse 2.5s ease-in-out infinite',
          transition: 'transform .2s',
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        title="HRMS AI Assistant"
      >
        {open ? <X size={22} color="#FFFFFF" /> : <Bot size={24} color="#FFFFFF" />}
        {!open && unread > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            background: '#000000', color: '#fff',
            fontSize: 10, fontWeight: 800,
            width: 18, height: 18, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{unread}</span>
        )}
      </button>

      {/* ── Chat panel ── */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 92, right: 24, zIndex: 499,
          width: 380, height: 560,
          background: '#FFFFFF',
          border: '1px solid #000000',
          borderRadius: 20,
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 16px 60px rgba(0,0,0,.12)',
          animation: 'aiFadeIn .25s cubic-bezier(.16,1,.3,1)',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            background: '#000000',
            padding: '14px 18px',
            borderBottom: '1px solid #000000',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            {view === 'chat' && (
              <button onClick={() => setView('home')} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#FFFFFF', padding: 4, borderRadius: 6,
                display: 'flex', marginRight: 4,
              }}>
                <ChevronLeft size={20} />
              </button>
            )}
            <div style={{
              width: 38, height: 38, borderRadius: '50%',
              background: '#FFFFFF',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 16px rgba(0,0,0,.15)',
            }}>
              <Sparkles size={18} color="#000000" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#FFFFFF' }}>HRMS AI Assistant</div>
              <div style={{ fontSize: 11, color: '#CCCCCC', marginTop: 1 }}>
                ● Live database access
              </div>
            </div>
            <button onClick={() => setOpen(false)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#868E96', padding: 4, borderRadius: 6,
              display: 'flex', transition: 'color .15s',
            }}
              onMouseEnter={e => e.currentTarget.style.color = '#FFFFFF'}
              onMouseLeave={e => e.currentTarget.style.color = '#868E96'}
            >
              <ChevronDown size={18} />
            </button>
          </div>

          {view === 'home' ? (
            <div style={{ flex: 1, padding: '24px 20px', background: '#F8F9FA', overflowY: 'auto' }}>
              <div style={{ marginBottom: 24, textAlign: 'center' }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#000000', marginBottom: 8 }}>Welcome to AI Support</h3>
                <p style={{ fontSize: 13, color: 'var(--tx-3)', lineHeight: 1.5 }}>
                  Ask questions about your HR data or general topics. We're here to help.
                </p>
              </div>

              <div 
                onClick={() => { setMessages([]); setView('chat'); }}
                style={{
                  background: '#FFFFFF', border: '1px solid var(--bd-md)',
                  borderRadius: 12, padding: '16px 20px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  cursor: 'pointer', marginBottom: 24,
                  boxShadow: '0 4px 12px rgba(0,0,0,.04)',
                  transition: 'border-color 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#000000'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--bd-md)'}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#000000', marginBottom: 4 }}>Start a new chat</div>
                  <div style={{ fontSize: 12, color: 'var(--tx-3)' }}>We typically reply instantly</div>
                </div>
                <Send size={18} color="#000000" />
              </div>

              {fullHistory.length > 0 && (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx-2)', marginBottom: 12, marginLeft: 4 }}>Recent</div>
                  <div 
                    onClick={() => { setMessages(fullHistory); setView('chat'); }}
                    style={{
                      background: '#FFFFFF', border: '1px solid var(--bd-md)',
                      borderRadius: 12, padding: '16px 20px',
                      display: 'flex', alignItems: 'center', gap: 16,
                      cursor: 'pointer',
                      transition: 'border-color 0.2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = '#000000'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--bd-md)'}
                  >
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#F1F3F5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <MessageSquare size={18} color="#000000" />
                    </div>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#000000' }}>Previous Chat</div>
                        <div style={{ fontSize: 11, color: 'var(--tx-3)' }}>{fullHistory[fullHistory.length - 1]?.time || 'Recent'}</div>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--tx-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {fullHistory[fullHistory.length - 1]?.content || 'View your chat history'}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 14px', background: '#F8F9FA' }}>
                {messages.length === 0 && (
                  <div style={{ textAlign: 'center', marginTop: 40, color: 'var(--tx-3)', fontSize: 13 }}>
                    This is the start of your new conversation.
                  </div>
                )}
                {messages.map((m, i) => <Bubble key={i} msg={m} />)}
                {loading && <Typing />}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div style={{
                padding: '12px 14px',
                borderTop: '1px solid var(--bd)',
                display: 'flex', gap: 8, alignItems: 'flex-end',
                background: '#FFFFFF',
              }}>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Ask anything about your HR data…"
                  rows={1}
                  style={{
                    flex: 1, background: '#FFFFFF',
                    border: '1px solid var(--bd-md)',
                    borderRadius: 12, padding: '9px 13px',
                    fontSize: 13, color: '#000000',
                    outline: 'none', resize: 'none',
                    maxHeight: 80, overflowY: 'auto',
                    lineHeight: 1.5,
                    transition: 'border-color .15s',
                  }}
                  onBlur={e => e.target.style.borderColor = 'var(--bd)'}
                />
                <button
                  onClick={() => send()}
                  disabled={!input.trim() || loading}
                  style={{
                    width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                  background: input.trim() && !loading
                      ? '#000000'
                      : '#E9ECEF',
                    border: '1px solid var(--bd-md)',
                    cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all .2s',
                    boxShadow: input.trim() && !loading ? '0 4px 16px rgba(0,0,0,.12)' : 'none',
                  }}
                >
                  {loading
                    ? <Loader2 size={16} color="#868E96" style={{ animation: 'spin .8s linear infinite' }} />
                    : <Send size={15} color={input.trim() ? '#FFFFFF' : '#868E96'} />
                  }
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
};

export default AIChatBot;
