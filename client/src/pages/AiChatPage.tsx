import { FormEvent, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, Crown, Loader2, MessageCircle, Send } from 'lucide-react';
import MobileLayout from '../components/MobileLayout';
import {
  api,
  ApiError,
  type CefrLevel,
  type ChatMessageDto,
  type ChatQuota,
} from '../lib/api';

const CEFR_LEVELS: Array<{
  level: CefrLevel;
  title: string;
  description: string;
}> = [
  { level: 'A1', title: 'Mới bắt đầu', description: 'Từ vựng rất cơ bản, câu ngắn' },
  { level: 'A2', title: 'Cơ bản', description: 'Giao tiếp đời thường đơn giản' },
  { level: 'B1', title: 'Trung cấp', description: 'Kể chuyện và nêu ý kiến' },
  { level: 'B2', title: 'Trung cao', description: 'Thảo luận chủ đề phức tạp hơn' },
  { level: 'C1', title: 'Cao cấp', description: 'Diễn đạt tự nhiên, tinh tế' },
  { level: 'C2', title: 'Thành thạo', description: 'Gần như người bản ngữ' },
];

export default function AiChatPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'level' | 'chat'>('level');
  const [selectedLevel, setSelectedLevel] = useState<CefrLevel | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageDto[]>([]);
  const [quota, setQuota] = useState<ChatQuota | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void api
      .getChatQuota()
      .then(setQuota)
      .catch(() => setQuota(null));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const quotaExceeded =
    !!quota && !quota.isPremium && quota.used >= quota.limit;

  async function startChat(level: CefrLevel) {
    setSelectedLevel(level);
    setStarting(true);
    setError('');
    try {
      const result = await api.createChatConversation(level);
      setConversationId(result.conversation.id);
      setMessages(result.messages);
      setQuota(result.quota);
      setStep('chat');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể bắt đầu chat');
    } finally {
      setStarting(false);
    }
  }

  async function handleSend(e?: FormEvent) {
    e?.preventDefault();
    const content = input.trim();
    if (!content || !conversationId || loading || quotaExceeded) return;

    setInput('');
    setLoading(true);
    setError('');

    const optimistic: ChatMessageDto = {
      id: `temp-${Date.now()}`,
      role: 'USER',
      content,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const result = await api.sendChatMessage(conversationId, content);
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== optimistic.id),
        result.userMessage,
        result.assistantMessage,
      ]);
      setQuota(result.quota);
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      if (err instanceof ApiError && err.code === 'CHAT_QUOTA_EXCEEDED') {
        setQuota((prev) =>
          prev
            ? { ...prev, used: prev.limit, remaining: 0, isPremium: false }
            : prev,
        );
        navigate('/nang-cap', {
          state: {
            from: '/tro-chuyen-ai',
            message:
              'Bạn đã hết 10 tin nhắn miễn phí. Nâng cấp Premium để chat không giới hạn.',
          },
        });
        return;
      }
      setError(err instanceof Error ? err.message : 'Không gửi được tin nhắn');
      setInput(content);
    } finally {
      setLoading(false);
    }
  }

  if (step === 'level') {
    return (
      <MobileLayout showPlayer={false}>
        <div className="px-4 pt-4 pb-2 flex items-center gap-3">
          <Link
            to="/"
            className="w-9 h-9 rounded-full bg-white border border-gray-100 flex items-center justify-center"
          >
            <ChevronLeft size={18} className="text-gray-700" />
          </Link>
          <div>
            <h1 className="font-bold text-gray-900">Trò chuyện với AI</h1>
            <p className="text-xs text-gray-500">Chọn cấp độ để bắt đầu</p>
          </div>
        </div>

        {error && (
          <div className="mx-4 mt-2 rounded-xl bg-red-50 text-red-600 text-xs px-3 py-2">
            {error}
          </div>
        )}

        <div className="px-4 py-4 grid grid-cols-2 gap-3">
          {CEFR_LEVELS.map((item) => (
            <button
              key={item.level}
              type="button"
              disabled={starting}
              onClick={() => void startChat(item.level)}
              className="text-left bg-white rounded-2xl card-shadow p-4 border border-transparent hover:border-primary/30 disabled:opacity-60"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-lg font-bold text-primary">{item.level}</span>
                {starting && selectedLevel === item.level && (
                  <Loader2 size={16} className="animate-spin text-primary" />
                )}
              </div>
              <p className="text-sm font-semibold text-gray-900">{item.title}</p>
              <p className="text-[11px] text-gray-500 mt-1 leading-snug">
                {item.description}
              </p>
            </button>
          ))}
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout showPlayer={false}>
      <div className="px-4 pt-4 pb-2 flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            setStep('level');
            setConversationId(null);
            setMessages([]);
            setError('');
          }}
          className="w-9 h-9 rounded-full bg-white border border-gray-100 flex items-center justify-center"
        >
          <ChevronLeft size={18} className="text-gray-700" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-gray-900 flex items-center gap-2">
            <MessageCircle size={16} className="text-primary" />
            Chat AI · {selectedLevel}
          </h1>
          <p className="text-xs text-gray-500 truncate">
            {quota?.isPremium
              ? 'Premium · Không giới hạn'
              : `Free · ${quota?.used ?? 0}/${quota?.limit ?? 10} tin đã dùng`}
          </p>
        </div>
      </div>

      {quotaExceeded && (
        <div className="mx-4 mb-2 rounded-xl bg-amber-50 border border-amber-100 p-3">
          <p className="text-xs text-amber-900 mb-2">
            Bạn đã hết 10 tin nhắn miễn phí. Nâng cấp Premium để chat không giới hạn.
          </p>
          <Link
            to="/nang-cap"
            state={{ from: '/tro-chuyen-ai' }}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-primary px-3 py-2 rounded-xl"
          >
            <Crown size={14} />
            Nâng cấp Premium
          </Link>
        </div>
      )}

      {error && (
        <div className="mx-4 mb-2 rounded-xl bg-red-50 text-red-600 text-xs px-3 py-2">
          {error}
        </div>
      )}

      <div className="px-4 pb-28 space-y-3 min-h-[50vh]">
        {messages.map((message) => {
          const isUser = message.role === 'USER';
          return (
            <div
              key={message.id}
              className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                  isUser
                    ? 'bg-primary text-white rounded-br-md'
                    : 'bg-white card-shadow text-gray-800 rounded-bl-md'
                }`}
              >
                {message.content}
              </div>
            </div>
          );
        })}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white card-shadow rounded-2xl rounded-bl-md px-3.5 py-2.5 text-xs text-gray-400 flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" />
              AI đang trả lời...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => void handleSend(e)}
        className="fixed bottom-20 left-1/2 -translate-x-1/2 w-full max-w-lg px-4 z-30"
      >
        <div className="bg-white border border-gray-100 rounded-2xl card-shadow flex items-end gap-2 p-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
            rows={1}
            disabled={quotaExceeded || loading}
            placeholder={
              quotaExceeded
                ? 'Nâng cấp Premium để tiếp tục...'
                : 'Nhập tin nhắn bằng tiếng Anh...'
            }
            className="flex-1 resize-none max-h-28 bg-transparent text-sm text-gray-900 px-2 py-2 outline-none disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading || quotaExceeded}
            className="w-10 h-10 rounded-xl gradient-btn text-white flex items-center justify-center disabled:opacity-40 shrink-0"
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
          </button>
        </div>
      </form>
    </MobileLayout>
  );
}
