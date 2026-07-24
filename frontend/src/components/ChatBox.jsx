import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  MessageSquare, X, Send, User, Check, CheckCheck, 
  Sparkles, RefreshCw, ChevronDown, HelpCircle, MessageCircle
} from 'lucide-react';

export default function ChatBox() {
  const { authenticatedFetch, userId, role } = useAuth();
  
  const [isOpen, setIsOpen] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [totalUnread, setTotalUnread] = useState(0);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  
  const messagesEndRef = useRef(null);

  // Quick prompt presets for doubt resolution
  const doubtPresets = role === 'student' ? [
    "I need guidance regarding my assigned task deadline.",
    "Could you please review my latest daily report?",
    "I'm facing a blocker in my code execution."
  ] : [
    "Please update me on your current progress.",
    "Great work on your task submission!",
    "Let me know if you need any clarification."
  ];

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  // Fetch contacts and unread count
  const fetchContacts = async () => {
    try {
      setLoadingContacts(true);
      const res = await authenticatedFetch('/api/chat/contacts');
      if (res.ok) {
        const data = await res.json();
        setContacts(data);
        
        // Auto select first contact if none selected
        setSelectedContact(prevSelected => {
          if (prevSelected) {
            const updated = data.find(c => c.user_id === prevSelected.user_id);
            return updated || prevSelected;
          }
          return data.length > 0 ? data[0] : null;
        });
        
        // Calculate total unread
        const sumUnread = data.reduce((acc, c) => acc + (c.unread_count || 0), 0);
        setTotalUnread(sumUnread);
      }
    } catch (err) {
      console.error('Failed to fetch chat contacts:', err);
    } finally {
      setLoadingContacts(false);
    }
  };

  // Fetch message history with target contact
  const fetchMessages = async (contactId, silent = false) => {
    if (!contactId) return;
    try {
      if (!silent) setLoadingMessages(true);
      const res = await authenticatedFetch(`/api/chat/messages/${contactId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
        
        // Refresh contact unread count after reading
        setContacts(prev => prev.map(c => 
          c.user_id === contactId ? { ...c, unread_count: 0 } : c
        ));
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    } finally {
      if (!silent) setLoadingMessages(false);
    }
  };

  // Initial load and background polling
  useEffect(() => {
    fetchContacts();
    const interval = setInterval(() => {
      fetchContacts();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Poll messages when chatbox is open and contact selected
  useEffect(() => {
    if (isOpen && selectedContact) {
      fetchMessages(selectedContact.user_id);
      const msgInterval = setInterval(() => {
        fetchMessages(selectedContact.user_id, true);
      }, 3000);
      return () => clearInterval(msgInterval);
    }
  }, [isOpen, selectedContact?.user_id]);

  const handleSendMessage = async (textToSend = null) => {
    const text = textToSend || newMessage;
    if (!text.trim() || !selectedContact || sending) return;

    try {
      setSending(true);
      const res = await authenticatedFetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiver_id: selectedContact.user_id,
          message: text.trim()
        })
      });

      if (res.ok) {
        const sentMsg = await res.json();
        setMessages(prev => [...prev, sentMsg]);
        setNewMessage('');
        fetchContacts(); // Update last message preview
      }
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 group flex items-center justify-center p-4 bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-full shadow-2xl transition-all duration-300 transform hover:scale-105 active:scale-95 border border-indigo-400/30"
        title="Doubt Clarification Chat"
      >
        <div className="relative flex items-center gap-2">
          {isOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <>
              <MessageSquare className="w-6 h-6" />
              <span className="hidden md:inline font-semibold text-sm">Ask Doubt</span>
            </>
          )}

          {!isOpen && totalUnread > 0 && (
            <span className="absolute -top-3 -right-3 bg-rose-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center shadow-lg animate-bounce border-2 border-slate-950">
              {totalUnread > 9 ? '9+' : totalUnread}
            </span>
          )}
        </div>
      </button>

      {/* Floating Chat Modal Panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-4 md:right-6 z-50 w-[92vw] sm:w-[420px] md:w-[460px] h-[560px] max-h-[80vh] bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          
          {/* Header Bar */}
          <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-base shadow-md">
                  {selectedContact ? selectedContact.name.charAt(0).toUpperCase() : <User className="w-5 h-5" />}
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-slate-950 rounded-full"></span>
              </div>
              
              <div>
                {/* Contact Selection Dropdown */}
                {contacts.length > 1 ? (
                  <div className="relative">
                    <select
                      value={selectedContact?.user_id || ''}
                      onChange={(e) => {
                        const target = contacts.find(c => c.user_id === Number(e.target.value));
                        if (target) {
                          setSelectedContact(target);
                          fetchMessages(target.user_id);
                        }
                      }}
                      className="bg-slate-900 border border-slate-700/80 text-slate-100 font-semibold text-sm rounded-lg px-2 py-1 pr-7 cursor-pointer focus:outline-none focus:border-indigo-500"
                    >
                      {contacts.map(c => (
                        <option key={c.user_id} value={c.user_id}>
                          {c.name} ({c.role === 'mentor' ? 'Mentor' : 'Student'}) {c.unread_count > 0 ? `(${c.unread_count} new)` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <h4 className="font-bold text-slate-100 text-sm flex items-center gap-1.5">
                    {selectedContact ? selectedContact.name : 'Direct Chat'}
                  </h4>
                )}
                
                <p className="text-xs text-slate-400 truncate max-w-[240px]">
                  {selectedContact?.detail || (role === 'student' ? 'Mentor Support' : 'Student Intern')}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => fetchContacts()}
                className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition-colors"
                title="Refresh contacts"
              >
                <RefreshCw className={`w-4 h-4 ${loadingContacts ? 'animate-spin text-indigo-400' : ''}`} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                title="Close chat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Quick Contact Chips Selector (if multiple contacts) */}
          {contacts.length > 1 && (
            <div className="px-3 py-2 bg-slate-950/40 border-b border-slate-800/60 flex items-center gap-2 overflow-x-auto no-scrollbar">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider whitespace-nowrap">
                Chat with:
              </span>
              {contacts.map(c => {
                const isSelected = selectedContact?.user_id === c.user_id;
                return (
                  <button
                    key={c.user_id}
                    onClick={() => {
                      setSelectedContact(c);
                      fetchMessages(c.user_id);
                    }}
                    className={`px-2.5 py-1 text-xs rounded-full font-medium transition-all whitespace-nowrap flex items-center gap-1.5 border ${
                      isSelected
                        ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/50'
                        : 'bg-slate-800/80 text-slate-300 border-slate-700/50 hover:bg-slate-800'
                    }`}
                  >
                    <span>{c.name}</span>
                    {c.unread_count > 0 && (
                      <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                        {c.unread_count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Chat Messages Body */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-900/60">
            {loadingMessages ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 text-xs gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" />
                <span>Loading discussion history...</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 px-4 py-8">
                <div className="w-12 h-12 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-3 border border-indigo-500/20">
                  <HelpCircle className="w-6 h-6" />
                </div>
                <h5 className="font-semibold text-slate-200 text-sm mb-1">
                  {role === 'student' ? 'Ask a doubt or question!' : 'Start conversation with intern'}
                </h5>
                <p className="text-xs text-slate-400 max-w-xs mb-4">
                  {role === 'student' 
                    ? 'Reach out to your mentor for guidance on tasks, daily reports, or technical queries.' 
                    : 'Send direct messages, clarify questions, or offer feedback to your student intern.'}
                </p>

                {/* Preset Doubt Buttons */}
                <div className="w-full space-y-2">
                  <p className="text-[11px] font-medium text-indigo-400 uppercase tracking-wider text-left">
                    Quick suggestions:
                  </p>
                  {doubtPresets.map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(preset)}
                      className="w-full text-left text-xs bg-slate-800/80 hover:bg-indigo-900/30 text-slate-300 hover:text-indigo-200 border border-slate-700/60 hover:border-indigo-500/40 p-2.5 rounded-xl transition-all flex items-center justify-between group"
                    >
                      <span>"{preset}"</span>
                      <Send className="w-3.5 h-3.5 text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg) => {
                  const isSentByMe = msg.sender_id === Number(userId);
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isSentByMe ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`p-3 rounded-2xl text-xs sm:text-sm max-w-[84%] break-words shadow-md transition-all ${
                          isSentByMe
                            ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white rounded-br-xs'
                            : 'bg-slate-800/90 text-slate-100 border border-slate-700/70 rounded-bl-xs'
                        }`}
                      >
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                        <div
                          className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                            isSentByMe ? 'text-indigo-200' : 'text-slate-400'
                          }`}
                        >
                          <span>{formatTime(msg.created_at)}</span>
                          {isSentByMe && (
                            msg.is_read ? (
                              <CheckCheck className="w-3.5 h-3.5 text-emerald-300" title="Read" />
                            ) : (
                              <Check className="w-3.5 h-3.5 text-indigo-300" title="Sent" />
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Preset Chips when conversation exists */}
          {messages.length > 0 && (
            <div className="px-3 py-1.5 bg-slate-950/60 border-t border-slate-800/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              {doubtPresets.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(preset)}
                  className="px-2.5 py-1 text-[11px] bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-indigo-300 border border-slate-700/40 rounded-full whitespace-nowrap transition-colors"
                >
                  {preset}
                </button>
              ))}
            </div>
          )}

          {/* Input Area */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2"
          >
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={
                selectedContact 
                  ? `Message ${selectedContact.name}...` 
                  : "Select a contact to start chatting..."
              }
              disabled={!selectedContact || sending}
              className="flex-1 bg-slate-900 border border-slate-700/80 text-slate-100 placeholder-slate-500 text-xs sm:text-sm rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-50"
            />

            <button
              type="submit"
              disabled={!newMessage.trim() || !selectedContact || sending}
              className="p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl disabled:opacity-40 disabled:hover:bg-indigo-600 transition-all shadow-md flex items-center justify-center shrink-0"
              title="Send Message"
            >
              {sending ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </form>

        </div>
      )}
    </>
  );
}
