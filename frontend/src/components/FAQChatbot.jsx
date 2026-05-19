import { useEffect, useMemo, useRef, useState } from 'react';
import { MessageCircle, Send, X, Trash2, Droplets } from 'lucide-react';
import './faq-chatbot.css';

const FAQ_ITEMS = [
  {
    keywords: ['critical', 'evacuate', 'imminent', 'severe', 'escape'],
    question: 'What should I do during a Critical flood alert?',
    answer: 'Critical risk means severe flooding is imminent. Move to higher ground immediately, do not wait. Avoid all roads near rivers and canals. Follow official evacuation instructions. Call DMC: 117 for emergency guidance.'
  },
  {
    keywords: ['high', 'flood', 'warning', 'danger', 'prepare', 'high risk'],
    question: 'What should I do during a High flood risk warning?',
    answer: 'Move valuables upstairs, keep emergency items ready, avoid flooded roads, and stay alert. Monitor FloodGuard updates. For emergencies, call the Disaster Management Centre on 117.'
  },
  {
    keywords: ['moderate', 'advisory', 'watch', 'increasing'],
    question: 'What does Moderate flood risk mean?',
    answer: 'Moderate risk means flooding is possible if conditions worsen. Keep essentials ready, monitor river levels and alerts, and avoid low-lying areas and unnecessary travel near waterways.'
  },
  {
    keywords: ['low', 'minor', 'low risk', 'watch'],
    question: 'What does Low flood risk mean?',
    answer: 'Low risk means minor flooding is possible but not expected. Stay informed, follow FloodGuard updates, and avoid travel near waterways as a precaution.'
  },
  {
    keywords: ['sms', 'text', 'message', 'phone', 'twilio', 'alert', 'notification'],
    question: 'How do SMS alerts work?',
    answer: 'FloodGuard sends SMS alerts to registered users when their saved zone has an elevated flood risk. Alerts are sent by admins via the admin panel. Real delivery requires active Twilio credentials; otherwise messages are simulated in the system.'
  },
  {
    keywords: ['email', 'email alert', 'inbox', 'mail'],
    question: 'How do email alerts work?',
    answer: 'Admins can send flood alert emails to registered users alongside or instead of SMS. Emails include a risk badge, alert message, and emergency contacts. Configure SMTP or SendGrid credentials in the backend to enable real delivery.'
  },
  {
    keywords: ['register', 'sign up', 'signup', 'location', 'zone', 'create account'],
    question: 'Why do I need to enter my location when registering?',
    answer: 'Your location is used to match your account to the correct prediction zone — such as Gampaha, Ja-Ela, or Kelaniya — so that alerts and predictions you receive are relevant to where you actually live.'
  },
  {
    keywords: ['prediction', 'predict', 'model', 'random forest', 'accuracy', 'machine learning', 'ml'],
    question: 'How are flood predictions calculated?',
    answer: 'FloodGuard uses a Random Forest model trained on ~10 years of river gauge, rainfall, and climate data (3,829 days). It engineers 46 features including 14-day lag values, rolling averages, and rainfall anomalies to predict the next 2 days of flood risk category and water level. Accuracy is 77.7% with R² = 0.817.'
  },
  {
    keywords: ['gampaha', 'gampaha city', 'dunamale', 'aththanagalu', 'oya'],
    question: 'Why does Gampaha use Dunamale gauge data?',
    answer: 'Gampaha City is mapped to the Dunamale gauge on Aththanagalu Oya — the official river gauge that monitors the river most relevant to flood risk in that area.'
  },
  {
    keywords: ['ja-ela', 'ja ela', 'ja ела', 'kelani', 'kelaniya', 'kelani river'],
    question: 'Which areas does FloodGuard monitor?',
    answer: 'FloodGuard monitors selected zones in Gampaha District including Gampaha City, Ja-Ela, Kelaniya, Dompe, Minuwangoda, Divulapitiya, and others. Predictions are supported by the Random Forest model and official gauge context.'
  },
  {
    keywords: ['emergency', 'help', 'contact', 'number', 'call', 'police', 'ambulance', 'dmc'],
    question: 'What emergency numbers should I use?',
    answer: 'Disaster Management Centre: 117\nPolice Emergency: 119\nAmbulance / Suwa Seriya: 1990\nNational Hospital Colombo: 011 2691111\n\nThese numbers are also shown in the emergency ribbon at the top of the site.'
  },
  {
    keywords: ['weather', 'openweather', 'api', 'rain', 'rainfall', 'fallback'],
    question: 'Why does weather sometimes show fallback data?',
    answer: 'If the OpenWeather API key is missing or rate-limited, the app uses available historical or cached data so the predictions page can still function. Configure OPENWEATHER_API_KEY in the backend .env to enable live data.'
  },
  {
    keywords: ['profile', 'update', 'change', 'phone number', 'my account', 'edit'],
    question: 'How do I update my profile or phone number?',
    answer: 'Log in and go to your Profile page. From there you can update your name, phone number, zone, and alert preferences. Keeping your zone and phone number up to date ensures you receive relevant alerts.'
  },
  {
    keywords: ['password', 'forgot', 'reset', 'forgot password', 'lost password'],
    question: 'How do I reset my password?',
    answer: 'On the login page, click "Forgot Password" and enter your registered email. A reset code will be sent to you. If SMTP is not configured, the code is printed to the backend console in development mode.'
  },
  {
    keywords: ['donate', 'donation', 'relief', 'charity', 'fund'],
    question: 'How can I donate to flood relief?',
    answer: 'Visit the Donate page from the navigation menu. It provides information on how to contribute to Sri Lanka flood emergency relief efforts.'
  },
  {
    keywords: ['map', 'flood map', 'zones map', 'leaflet', 'view map'],
    question: 'What does the flood map show?',
    answer: 'The Flood Map page shows all monitored Gampaha District zones plotted on an interactive Leaflet map. Each zone marker reflects the current risk level for that area.'
  },
  {
    keywords: ['what is', 'floodguard', 'about', 'system', 'prototype'],
    question: 'What is FloodGuard?',
    answer: 'FloodGuard is a flood-risk monitoring and early-warning web app for selected locations in Gampaha District, Sri Lanka. It combines live weather data, official gauge context, a Random Forest ML model, SMS/email alerts, and an admin console — built as a final-year student prototype.'
  },
  {
    keywords: ['alerts enabled', 'opt out', 'stop alerts', 'unsubscribe'],
    question: 'How do I stop receiving flood alerts?',
    answer: 'Go to your Profile page and toggle off the "Alerts Enabled" setting. This will prevent you from receiving SMS and email flood alerts from the admin panel.'
  },
];

const QUICK_QUESTIONS = [
  'What should I do in high risk?',
  'How do SMS alerts work?',
  'Emergency numbers',
  'How are predictions made?',
  'Reset my password',
  'What zones are monitored?',
];

const INITIAL_MESSAGE = {
  from: 'bot',
  text: 'Hi! I\'m the FloodGuard assistant. I can answer questions about flood alerts, risk levels, SMS/email notifications, predictions, and emergency steps. How can I help?',
  time: new Date(),
};

const normalize = (value) => value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');

const findAnswer = (question) => {
  const text = normalize(question);
  const words = text.split(/\s+/);

  const scored = FAQ_ITEMS.map((item) => {
    let score = 0;
    for (const keyword of item.keywords) {
      const normKw = normalize(keyword);
      if (text.includes(normKw)) score += normKw.includes(' ') ? 3 : 1;
      else if (words.some((w) => normKw.startsWith(w) && w.length > 3)) score += 0.5;
    }
    return { ...item, score };
  }).sort((a, b) => b.score - a.score);

  if (scored[0]?.score > 0) return scored[0];

  return {
    question: 'General help',
    answer: 'I can help with flood warnings, risk levels, SMS/email alerts, predictions, emergency contacts, password reset, and more. Try asking:\n• "What should I do in high risk?"\n• "How do email alerts work?"\n• "Emergency numbers"'
  };
};

const formatTime = (date) =>
  date.toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit' });

const FAQChatbot = () => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [typing, setTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const suggestedQuestions = useMemo(() => QUICK_QUESTIONS, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, typing]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  const sendQuestion = (question) => {
    const trimmed = question.trim();
    if (!trimmed || typing) return;

    const userMsg = { from: 'user', text: trimmed, time: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setTyping(true);

    setTimeout(() => {
      const result = findAnswer(trimmed);
      setMessages((prev) => [
        ...prev,
        { from: 'bot', text: result.answer, time: new Date() },
      ]);
      setTyping(false);
    }, 700 + Math.random() * 400);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendQuestion(input);
  };

  const clearChat = () => {
    setMessages([{ ...INITIAL_MESSAGE, time: new Date() }]);
  };

  return (
    <div className="faq-chatbot">
      {open && (
        <section className="faq-chatbot-panel" aria-label="FloodGuard FAQ assistant">
          <header className="faq-chatbot-header">
            <div className="faq-header-left">
              <div className="faq-bot-avatar-sm">
                <Droplets size={14} />
              </div>
              <div>
                <span>FloodGuard Assistant</span>
                <small>
                  <span className="faq-online-dot" /> Online · FAQ support
                </small>
              </div>
            </div>
            <div className="faq-header-actions">
              <button type="button" onClick={clearChat} aria-label="Clear chat" title="Clear chat">
                <Trash2 size={15} />
              </button>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close chatbot">
                <X size={17} />
              </button>
            </div>
          </header>

          <div className="faq-chatbot-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`faq-message-row ${msg.from}`}>
                {msg.from === 'bot' && (
                  <div className="faq-bot-avatar">
                    <Droplets size={12} />
                  </div>
                )}
                <div className="faq-message-wrap">
                  <div className={`faq-message ${msg.from}`}>
                    {msg.text.split('\n').map((line, j) => (
                      <span key={j}>{line}{j < msg.text.split('\n').length - 1 && <br />}</span>
                    ))}
                  </div>
                  {msg.time && (
                    <span className="faq-message-time">{formatTime(msg.time)}</span>
                  )}
                </div>
              </div>
            ))}

            {typing && (
              <div className="faq-message-row bot">
                <div className="faq-bot-avatar">
                  <Droplets size={12} />
                </div>
                <div className="faq-typing-indicator">
                  <span /><span /><span />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="faq-chatbot-suggestions">
            {suggestedQuestions.map((q) => (
              <button key={q} type="button" onClick={() => sendQuestion(q)} disabled={typing}>
                {q}
              </button>
            ))}
          </div>

          <form className="faq-chatbot-input" onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about alerts, risk, predictions…"
              aria-label="Ask a question"
              disabled={typing}
            />
            <button type="submit" aria-label="Send" disabled={!input.trim() || typing}>
              <Send size={16} />
            </button>
          </form>
        </section>
      )}

      <button
        type="button"
        className={`faq-chatbot-toggle ${open ? 'is-open' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close assistant' : 'Open assistant'}
      >
        {open ? <X size={22} /> : <MessageCircle size={24} />}
        {!open && messages.length > 1 && (
          <span className="faq-unread-dot" />
        )}
      </button>
    </div>
  );
};

export default FAQChatbot;
