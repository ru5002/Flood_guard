import { useMemo, useState } from 'react';
import { MessageCircle, Send, X } from 'lucide-react';
import './faq-chatbot.css';

const FAQ_ITEMS = [
  {
    keywords: ['flood', 'high', 'risk', 'warning', 'danger', 'evacuate'],
    question: 'What should I do during a high flood risk warning?',
    answer: 'Move to higher ground, avoid flooded roads, keep your phone charged, and follow instructions from local authorities. For emergencies in Sri Lanka, contact the Disaster Management Centre on 117.'
  },
  {
    keywords: ['moderate', 'watch', 'advisory'],
    question: 'What does moderate flood risk mean?',
    answer: 'Moderate risk means flooding is possible if rain or river levels increase. Keep essentials ready, monitor alerts, avoid low-lying areas, and reduce unnecessary travel near canals or rivers.'
  },
  {
    keywords: ['sms', 'text', 'message', 'phone', 'twilio', 'alert'],
    question: 'How do SMS alerts work?',
    answer: 'FloodGuard sends SMS alerts to registered users when their saved location has Moderate, High, or Critical flood risk. Real SMS delivery requires Twilio credentials and a verified recipient number in trial mode.'
  },
  {
    keywords: ['register', 'sign up', 'location', 'zone'],
    question: 'Why do I need to enter my location when registering?',
    answer: 'Your location lets FloodGuard match your account to the correct prediction zone, such as Gampaha or Ja-Ela, so alerts are relevant to where you live.'
  },
  {
    keywords: ['prediction', 'model', 'random forest', 'accuracy', 'rainfall'],
    question: 'How are flood predictions calculated?',
    answer: 'The app combines rainfall, river or gauge readings, mapped zone information, and model output to estimate flood risk. Official gauge data is given strong importance when available.'
  },
  {
    keywords: ['gampaha', 'gampaha city', 'dunamale', 'aththanagalu'],
    question: 'Why does Gampaha use Dunamale gauge data?',
    answer: 'Gampaha City is mapped to the Dunamale gauge on Aththanagalu Oya because it is the relevant official river gauge context for that area.'
  },
  {
    keywords: ['emergency', 'help', 'contact', 'number'],
    question: 'What emergency numbers should I use?',
    answer: 'For disaster emergencies, call DMC 117. You can also call Police 119 or Suwa Seriya ambulance 1990 if immediate emergency support is needed.'
  },
  {
    keywords: ['weather', 'openweather', 'api', 'rain'],
    question: 'Why does weather sometimes show fallback data?',
    answer: 'If an OpenWeather API key is missing or rate-limited, the app uses available historical or fallback data so the prediction page can still function.'
  }
];

const QUICK_QUESTIONS = [
  'What should I do in high risk?',
  'How do SMS alerts work?',
  'Why enter my location?',
  'Emergency numbers'
];

const INITIAL_MESSAGES = [
  {
    from: 'bot',
    text: 'Hi, I can answer common FloodGuard questions about alerts, flood risk, registration, SMS, and emergency steps.'
  }
];

const normalize = (value) => value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');

const findAnswer = (question) => {
  const text = normalize(question);
  const scored = FAQ_ITEMS.map((item) => ({
    ...item,
    score: item.keywords.reduce((total, keyword) => (
      text.includes(normalize(keyword)) ? total + 1 : total
    ), 0)
  })).sort((a, b) => b.score - a.score);

  if (scored[0]?.score > 0) return scored[0];

  return {
    question: 'General help',
    answer: 'I can help with flood warnings, moderate risk, SMS alerts, registration location, predictions, and emergency contacts. Try asking "How do SMS alerts work?" or "What should I do in high risk?"'
  };
};

const FAQChatbot = () => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const suggestedQuestions = useMemo(() => QUICK_QUESTIONS, []);

  const sendQuestion = (question) => {
    const trimmed = question.trim();
    if (!trimmed) return;

    const result = findAnswer(trimmed);
    setMessages((current) => [
      ...current,
      { from: 'user', text: trimmed },
      { from: 'bot', text: result.answer }
    ]);
    setInput('');
    setOpen(true);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    sendQuestion(input);
  };

  return (
    <div className="faq-chatbot">
      {open && (
        <section className="faq-chatbot-panel" aria-label="FloodGuard FAQ chatbot">
          <header className="faq-chatbot-header">
            <div>
              <span>FloodGuard Assistant</span>
              <small>FAQ support</small>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close FAQ chatbot">
              <X size={18} />
            </button>
          </header>

          <div className="faq-chatbot-messages">
            {messages.map((message, index) => (
              <div key={`${message.from}-${index}`} className={`faq-message ${message.from}`}>
                {message.text}
              </div>
            ))}
          </div>

          <div className="faq-chatbot-suggestions">
            {suggestedQuestions.map((question) => (
              <button key={question} type="button" onClick={() => sendQuestion(question)}>
                {question}
              </button>
            ))}
          </div>

          <form className="faq-chatbot-input" onSubmit={handleSubmit}>
            <input
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask about alerts, risk, SMS..."
              aria-label="Ask FloodGuard FAQ"
            />
            <button type="submit" aria-label="Send FAQ question">
              <Send size={17} />
            </button>
          </form>
        </section>
      )}

      <button
        type="button"
        className="faq-chatbot-toggle"
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? 'Close FAQ chatbot' : 'Open FAQ chatbot'}
      >
        {open ? <X size={22} /> : <MessageCircle size={24} />}
      </button>
    </div>
  );
};

export default FAQChatbot;
