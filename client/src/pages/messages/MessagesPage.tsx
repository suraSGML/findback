import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  MessageSquare,
  Send,
  User as UserIcon,
  ShieldCheck,
  Search,
  Package,
  MapPin,
  Clock,
  AlertCircle,
  HelpCircle,
  ArrowLeft,
  Check,
  CheckCheck,
  ExternalLink,
  Flag,
} from 'lucide-react';
import { api } from '../../services/api.js';
import { Conversation, Message, User } from '../../types/index.js';
import { useAuth } from '../../context/AuthContext.js';
import { EmptyState } from '../../components/common/EmptyState.js';
import { ReportAbuseModal, ReportTarget } from '../../components/common/ReportAbuseModal.js';
import {
  getSocket,
  joinConversationRoom,
  leaveConversationRoom,
} from '../../services/socket.js';

export const MessagesPage: React.FC = () => {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvo, setActiveConvo] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [conversationPage, setConversationPage] = useState(1);
  const [conversationPages, setConversationPages] = useState(1);
  const [messagePage, setMessagePage] = useState(1);
  const [messagePages, setMessagePages] = useState(1);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [abuseTarget, setAbuseTarget] = useState<{ type: ReportTarget; id: string } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeConvoRef = useRef<Conversation | null>(null);
  activeConvoRef.current = activeConvo;

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchConversations();
  }, [user]);

  // When conversations load or conversationId in URL changes, select it
  useEffect(() => {
    if (conversations.length > 0) {
      if (conversationId) {
        const found = conversations.find((c) => c._id === conversationId);
        if (found) {
          if (activeConvo?._id !== found._id) {
            selectConversation(found);
          }
        } else {
          // If conversationId not found in loaded list, fetch messages directly
          loadUnlistedConversation(conversationId);
        }
      } else if (!activeConvo) {
        selectConversation(conversations[0]);
      }
    }
  }, [conversationId, conversations.length]);

  const fetchConversations = async (page = 1, append = false) => {
    try {
      const res = await api.get<{
        success: boolean;
        conversations: Conversation[];
        pagination?: { page: number; pages: number };
      }>(
        `/messages/conversations?page=${page}&limit=50`
      );
      if (res.success && res.conversations) {
        setConversations((current) => append
          ? [...current, ...res.conversations.filter((item) => !current.some((existing) => existing._id === item._id))]
          : res.conversations);
        setConversationPage(res.pagination?.page ?? page);
        setConversationPages(res.pagination?.pages ?? 1);
      }
    } catch (err) {
      console.error('Failed to load conversations', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUnlistedConversation = async (cId: string) => {
    try {
      const res = await api.get<{
        success: boolean;
        messages: Message[];
        pagination?: { page: number; pages: number };
        conversation?: Conversation;
      }>(`/messages/${cId}?page=1&limit=100`);
      if (res.success && res.messages) {
        setMessages(res.messages);
        setMessagePage(res.pagination?.page ?? 1);
        setMessagePages(res.pagination?.pages ?? 1);
        const conversation = res.conversation;
        if (conversation) {
          setActiveConvo(conversation);
          setConversations((current) => current.some((item) => item._id === conversation._id)
            ? current
            : [conversation, ...current]);
        }
        // Refresh conversations to populate sidebar
        fetchConversations();
      }
    } catch (err) {
      console.error('Failed to load conversation', err);
    }
  };

  const selectConversation = async (convo: Conversation) => {
    setActiveConvo(convo);
    setMessagePage(1);
    setMessages([]);
    if (conversationId !== convo._id) {
      navigate(`/messages/${convo._id}`, { replace: true });
    }

    try {
      const res = await api.get<{
        success: boolean;
        messages: Message[];
        pagination?: { page: number; pages: number };
      }>(
        `/messages/${convo._id}?page=1&limit=100`
      );
      if (res.success && res.messages) {
        setMessages(res.messages);
        setMessagePages(res.pagination?.pages ?? 1);
      }
    } catch (err) {
      console.error('Failed to load messages', err);
    }
  };

  // Real-Time Socket.IO Listener and Room Management
  useEffect(() => {
    if (!activeConvo) return;

    const currentConvoId = activeConvo._id;
    joinConversationRoom(currentConvoId);

    const socket = getSocket();

    const handleIncomingMessage = (incomingMsg: Message) => {
      // If message belongs to active thread, append it
      if (
        incomingMsg.conversation === currentConvoId ||
        (incomingMsg.conversation as any)?._id === currentConvoId
      ) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === incomingMsg._id)) return prev;
          return [...prev, incomingMsg];
        });
      }

      // Update sidebar snippet
      setConversations((prev) =>
        prev.map((c) => {
          if (c._id === incomingMsg.conversation || (incomingMsg.conversation as any)?._id === c._id) {
            return {
              ...c,
              lastMessage: incomingMsg.content,
              lastMessageAt: incomingMsg.createdAt,
            };
          }
          return c;
        })
      );
    };

    socket.on('message:new', handleIncomingMessage);

    // Fallback gentle polling every 4 seconds to guarantee sync
    const pollInterval = setInterval(() => {
      if (activeConvoRef.current) {
        api.get<{ success: boolean; messages: Message[] }>(
          `/messages/${activeConvoRef.current._id}?page=1&limit=100`
        ).then((res) => {
          if (res.success && res.messages) {
            setMessages((prev) => {
              const byId = new Map(prev.map((message) => [message._id, message]));
              res.messages.forEach((message) => byId.set(message._id, message));
              return [...byId.values()].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
            });
          }
        }).catch(() => {});
      }
    }, 4000);

    return () => {
      leaveConversationRoom(currentConvoId);
      socket.off('message:new', handleIncomingMessage);
      clearInterval(pollInterval);
    };
  }, [activeConvo?._id]);

  const loadOlderMessages = async () => {
    if (!activeConvo || messagePage >= messagePages || isLoadingOlder) return;
    setIsLoadingOlder(true);
    try {
      const page = messagePage + 1;
      const res = await api.get<{
        success: boolean;
        messages: Message[];
        pagination?: { page: number; pages: number };
      }>(`/messages/${activeConvo._id}?page=${page}&limit=100`);
      if (res.success && activeConvoRef.current?._id === activeConvo._id) {
        setMessages((current) => {
          const byId = new Map(res.messages.map((message) => [message._id, message]));
          current.forEach((message) => byId.set(message._id, message));
          return [...byId.values()].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        });
        setMessagePage(res.pagination?.page ?? page);
      }
    } catch (err) {
      console.error('Failed to load older messages', err);
    } finally {
      setIsLoadingOlder(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConvo || !user || isSending) return;

    const otherParticipant = getOtherParticipant(activeConvo);
    const contentToSend = newMessage.trim();
    setNewMessage('');
    setIsSending(true);

    try {
      const payload: any = {
        conversationId: activeConvo._id,
        recipientId: otherParticipant?._id,
        content: contentToSend,
      };

      const res = await api.post<{ success: boolean; message: Message }>('/messages', payload);

      if (res.success && res.message) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === res.message._id)) return prev;
          return [...prev, res.message];
        });

        // Update sidebar last message immediately
        setConversations((prev) =>
          prev.map((c) =>
            c._id === activeConvo._id
              ? { ...c, lastMessage: contentToSend, lastMessageAt: new Date().toISOString() }
              : c
          )
        );
      }
    } catch (err: any) {
      alert(err.message || 'Failed to send message. Please try again.');
      setNewMessage(contentToSend); // restore on error
    } finally {
      setIsSending(false);
    }
  };

  const getOtherParticipant = (convo: Conversation): User | undefined => {
    if (!convo || !convo.participants) return undefined;
    const currentUserId = user?._id?.toString();
    const other = convo.participants.find(
      (p) => (p._id?.toString() || (p as any)?.toString()) !== currentUserId
    );
    return other || convo.participants[0];
  };

  const getItemContext = (convo: Conversation) => {
    if (convo.claim) {
      const foundItem = (convo.claim as any)?.foundReport;
      return {
        type: 'CLAIM',
        title: foundItem?.title || 'Claimed Item',
        link: `/claims`,
        location: foundItem?.locationName || foundItem?.city,
      };
    }
    if (convo.foundReport) {
      return {
        type: 'FOUND ITEM',
        title: convo.foundReport.title,
        link: `/browse?tab=found`,
        location: convo.foundReport.locationName || convo.foundReport.city,
      };
    }
    if (convo.lostReport) {
      return {
        type: 'LOST REPORT',
        title: convo.lostReport.title,
        link: `/browse?tab=lost`,
        location: convo.lostReport.locationName || convo.lostReport.city,
      };
    }
    return null;
  };

  const filteredConversations = conversations.filter((c) => {
    if (!searchFilter.trim()) return true;
    const other = getOtherParticipant(c);
    const item = getItemContext(c);
    const query = searchFilter.toLowerCase();
    return (
      other?.name?.toLowerCase().includes(query) ||
      item?.title?.toLowerCase().includes(query) ||
      c.lastMessage?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Page Header */}
      <div className="border-b border-slate-200 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-emerald-600" />
            Direct Messages
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Real-time chat to coordinate safe handovers, discuss challenge questions, and arrange verified meetups
          </p>
        </div>

        <Link
          to="/claims"
          className="btn-secondary h-8 px-3 text-xs self-start sm:self-auto"
        >
          View Ownership Claims &rarr;
        </Link>
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[600px] h-[calc(100vh-220px)] max-h-[800px]">
        {/* Conversations Sidebar (Hidden on mobile if a thread is open) */}
        <div
          className={`md:col-span-5 lg:col-span-4 border-r border-slate-200 flex flex-col bg-slate-50/40 ${
            activeConvo ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Search Toolbar */}
          <div className="p-3 border-b border-slate-200 bg-white space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Conversations ({conversations.length})
              </span>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                aria-label="Search conversations"
                placeholder="Search user or item..."
                className="input-field h-8 pl-8 text-xs bg-slate-50"
              />
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {isLoading ? (
              <div className="p-6 text-center text-xs text-slate-400">Loading messages...</div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 space-y-2">
                <p className="font-semibold text-slate-700">No conversations found</p>
                <p className="text-[11px] text-slate-400">
                  When you initiate contact on a claim or report, your chat threads will appear here.
                </p>
              </div>
            ) : (
              filteredConversations.map((convo) => {
                const other = getOtherParticipant(convo);
                const isSelected = activeConvo?._id === convo._id;
                const item = getItemContext(convo);

                return (
                  <div
                    key={convo._id}
                    onClick={() => selectConversation(convo)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        selectConversation(convo);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    className={`p-3.5 transition-colors cursor-pointer flex items-start gap-3 ${
                      isSelected
                        ? 'bg-emerald-50/80 border-l-3 border-emerald-600'
                        : 'hover:bg-slate-100/70'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-full bg-emerald-600 text-white font-semibold flex items-center justify-center text-xs shrink-0 shadow-xs">
                      {other?.name ? other.name.charAt(0).toUpperCase() : 'U'}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="text-xs font-semibold text-slate-900 truncate">
                          {other?.name || 'Community Member'}
                        </span>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {convo.lastMessageAt
                            ? new Date(convo.lastMessageAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : ''}
                        </span>
                      </div>

                      {item && (
                        <p className="text-[11px] font-medium text-emerald-800 truncate flex items-center gap-1 mb-0.5">
                          <span className="uppercase text-[9px] px-1 py-0.2 bg-emerald-100 rounded text-emerald-900 font-bold">
                            {item.type}
                          </span>
                          <span className="truncate">{item.title}</span>
                        </p>
                      )}

                      <p className="text-xs text-slate-500 truncate">
                        {convo.lastMessage || 'Start conversation...'}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            {conversationPage < conversationPages && (
              <button
                type="button"
                onClick={() => fetchConversations(conversationPage + 1, true)}
                className="w-full p-3 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
              >
                Load more conversations
              </button>
            )}
          </div>
        </div>

        {/* Message Thread View */}
        <div
          className={`md:col-span-7 lg:col-span-8 flex flex-col bg-white ${
            !activeConvo ? 'hidden md:flex' : 'flex'
          }`}
        >
          {activeConvo ? (
            <>
              {/* Thread Header */}
              <div className="p-3.5 border-b border-slate-200 bg-white flex items-center justify-between gap-2 shadow-xs z-10">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Mobile Back Button */}
                  <button
                    onClick={() => setActiveConvo(null)}
                    className="md:hidden p-1.5 -ml-1 text-slate-500 hover:text-slate-800 rounded-md"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>

                  <div className="w-9 h-9 rounded-full bg-slate-800 text-white font-medium flex items-center justify-center text-xs shrink-0">
                    {getOtherParticipant(activeConvo)?.name
                      ? getOtherParticipant(activeConvo)!.name.charAt(0).toUpperCase()
                      : 'U'}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h2 className="text-xs sm:text-sm font-semibold text-slate-900 truncate">
                        {getOtherParticipant(activeConvo)?.name || 'Community Member'}
                      </h2>
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    </div>
                    <p className="text-[11px] text-slate-500 truncate flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>{getOtherParticipant(activeConvo)?.city || 'Ethiopia'} • Verified User</span>
                    </p>
                  </div>
                </div>

                {getItemContext(activeConvo) && (
                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                      Topic Context
                    </span>
                    <Link
                      to={getItemContext(activeConvo)!.link}
                      className="text-xs font-semibold text-emerald-700 hover:underline inline-flex items-center gap-1 truncate max-w-[200px]"
                    >
                      <span>{getItemContext(activeConvo)?.title}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </Link>
                  </div>
                )}
                {getOtherParticipant(activeConvo)?._id && (
                  <button
                    type="button"
                    onClick={() => setAbuseTarget({ type: 'USER', id: getOtherParticipant(activeConvo)!._id })}
                    className="text-[11px] font-medium text-rose-700 hover:text-rose-900 inline-flex items-center gap-1"
                  >
                    <Flag className="w-3 h-3" /> Report
                  </button>
                )}
              </div>

              {/* Message History List */}
              <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-3 bg-slate-50/40">
                {messagePage < messagePages && (
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={loadOlderMessages}
                      disabled={isLoadingOlder}
                      className="btn-secondary h-8 px-3 text-xs"
                    >
                      {isLoadingOlder ? 'Loading older messages...' : 'Load older messages'}
                    </button>
                  </div>
                )}
                {messages.length === 0 ? (
                  <div className="text-center py-16 text-slate-400 text-xs space-y-1">
                    <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-600">Start the conversation</p>
                    <p>Send a message below to arrange meeting details or ask verification questions.</p>
                  </div>
                ) : (
                  messages.map((m) => {
                    const isMine =
                      m.sender?._id?.toString() === user?._id?.toString() ||
                      (m.sender as any) === user?._id?.toString();

                    return (
                      <div
                        key={m._id}
                        className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-md sm:max-w-lg rounded-xl px-4 py-2.5 text-xs leading-relaxed shadow-xs ${
                            isMine
                              ? 'bg-emerald-600 text-white rounded-br-xs'
                              : 'bg-white text-slate-900 border border-slate-200 rounded-bl-xs'
                          }`}
                        >
                          {m.content}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-1 px-1">
                          <span>
                            {new Date(m.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {isMine && <CheckCheck className="w-3 h-3 text-emerald-600" />}
                        </div>
                        {abuseTarget && (
                          <ReportAbuseModal targetType={abuseTarget.type} targetId={abuseTarget.id} onClose={() => setAbuseTarget(null)} />
                        )}
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Form */}
              <form
                onSubmit={handleSendMessage}
                className="p-3 bg-white border-t border-slate-200 flex items-center gap-2"
              >
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  aria-label="Message"
                  placeholder="Type your message to coordinate handover or ask questions..."
                  className="input-field h-10 text-xs flex-1"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || isSending}
                  className="btn-primary h-10 px-4 text-xs shrink-0 inline-flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-xs p-8 text-center space-y-2">
              <MessageSquare className="w-10 h-10 text-slate-300" />
              <p className="font-semibold text-slate-700">No Conversation Selected</p>
              <p className="max-w-xs text-slate-400">
                Choose a conversation from the left to read messages and coordinate property recovery.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
