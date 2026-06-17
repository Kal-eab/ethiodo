import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Send, Image as ImageIcon, X, Loader2, MessageSquare, Search, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';

// ─── Chat bubble (Telegram style) ───────────────────────────────────────────
function ChatBubble({ message }) {
  const isAdmin = message.sender === 'admin';
  return (
    <div className={`flex ${isAdmin ? 'justify-end' : 'justify-start'} mb-2`}>
      {!isAdmin && (
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mr-2 mt-0.5"
          style={{ background: 'linear-gradient(135deg, #6e8efb, #4a6cf7)' }}>
          {(message.user_name || 'U')[0].toUpperCase()}
        </div>
      )}
      <div className={`max-w-[72%] flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}>
        <div className={`px-3.5 py-2 text-sm leading-relaxed rounded-2xl ${
          isAdmin
            ? 'bg-[#2b5278] text-white rounded-br-[4px]'
            : 'bg-[#21222c] text-[#e4e4e4] rounded-bl-[4px]'
        }`}>
          {message.content && message.content !== '(image)' && <p className="whitespace-pre-wrap break-words">{message.content}</p>}
          {message.image_url && (
            <a href={message.image_url} target="_blank" rel="noopener noreferrer" className={message.content && message.content !== '(image)' ? 'block mt-2' : 'block'}>
              <img src={message.image_url} alt="attachment" className="max-h-52 w-auto rounded-lg hover:opacity-90 transition-opacity" />
            </a>
          )}
        </div>
        <span className="text-[10px] text-muted-foreground/60 px-1.5 mt-0.5">
          {message.created_date ? format(new Date(message.created_date), 'HH:mm') : ''}
        </span>
      </div>
    </div>
  );
}

// ─── Conversation list item (Telegram style) ────────────────────────────────
function ConvItem({ conv, isSelected, onClick }) {
  const initials = (conv.user_name || conv.id || '?')[0].toUpperCase();
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3.5 py-3 flex items-center gap-3 transition-colors ${
        isSelected ? 'bg-[#2b5278]' : 'hover:bg-white/[0.04]'
      }`}
    >
      <div className="w-12 h-12 rounded-full flex items-center justify-center text-base font-bold text-white flex-shrink-0"
        style={{ background: 'linear-gradient(135deg, #6e8efb, #4a6cf7)' }}>
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold text-sm text-white truncate">{conv.user_name || conv.user_email || conv.id}</span>
          <span className="text-[11px] text-white/40 flex-shrink-0">{conv.lastTime}</span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p className="text-xs text-white/45 truncate">{conv.lastMessage}</p>
          {conv.unread > 0 && (
            <span className="bg-[#4a9c5d] text-white text-[11px] font-semibold min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full flex-shrink-0">
              {conv.unread}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// ─── Main admin messages page ────────────────────────────────────────────────
export default function AdminMessages() {
  const [selectedConvId, setSelectedConvId] = useState(null);
  const [reply, setReply] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: allMessages = [] } = useQuery({
    queryKey: ['admin-all-messages'],
    queryFn: () => base44.entities.Message.list('created_date', 1000),
    refetchInterval: 4000,
  });

  // Group into conversations
  const conversations = useMemo(() => {
    const map = {};
    allMessages.forEach(msg => {
      const cid = msg.conversation_id;
      if (!map[cid]) {
        map[cid] = {
          id: cid,
          user_name: msg.user_name || msg.user_email || cid,
          user_email: msg.user_email || '',
          messages: [],
          unread: 0,
          lastMessage: '',
          lastTime: '',
        };
      }
      map[cid].messages.push(msg);
      if (msg.sender === 'user' && !msg.is_read) map[cid].unread++;
    });

    return Object.values(map)
      .map(conv => {
        const sorted = [...conv.messages].sort((a, b) => (a.created_date || '').localeCompare(b.created_date || ''));
        const last = sorted[sorted.length - 1];
        return {
          ...conv,
          messages: sorted,
          lastMessage: last?.content?.slice(0, 50) || '',
          lastTime: last?.created_date ? format(new Date(last.created_date), 'MMM d') : '',
        };
      })
      .sort((a, b) => {
        const aT = a.messages[a.messages.length - 1]?.created_date || '';
        const bT = b.messages[b.messages.length - 1]?.created_date || '';
        return bT.localeCompare(aT);
      });
  }, [allMessages]);

  const filtered = search
    ? conversations.filter(c =>
        c.user_name.toLowerCase().includes(search.toLowerCase()) ||
        c.user_email.toLowerCase().includes(search.toLowerCase())
      )
    : conversations;

  const selectedConv = conversations.find(c => c.id === selectedConvId) || null;
  const currentMessages = selectedConv?.messages || [];

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages.length]);

  // Mark unread messages as read when selecting a conversation
  useEffect(() => {
    if (!selectedConv) return;
    const unread = currentMessages.filter(m => m.sender === 'user' && !m.is_read);
    if (unread.length === 0) return;
    Promise.all(unread.map(m => base44.entities.Message.update(m.id, { is_read: true })))
      .then(() => queryClient.invalidateQueries({ queryKey: ['admin-all-messages'] }));
  }, [selectedConvId]);

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const sendReply = async () => {
    if (!reply.trim() && !imageFile) return;
    if (!selectedConv) return;
    setSending(true);
    let image_url = null;
    if (imageFile) {
      const result = await base44.integrations.Core.UploadFile({ file: imageFile });
      image_url = result.file_url;
    }
    await base44.entities.Message.create({
      conversation_id: selectedConv.id,
      user_email: selectedConv.user_email,
      user_name: selectedConv.user_name,
      content: reply.trim() || '(image)',
      image_url,
      sender: 'admin',
      is_read: true,
    });
    setReply('');
    setImageFile(null);
    setImagePreview(null);
    queryClient.invalidateQueries({ queryKey: ['admin-all-messages'] });
    setSending(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const totalUnread = conversations.reduce((s, c) => s + c.unread, 0);

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 3.5rem)' }}>
      {/* Page header */}
      <div className="flex items-center justify-between px-2 pb-4 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold">Messages</h1>
          <p className="font-mono text-xs text-muted-foreground mt-0.5">
            {totalUnread > 0 ? `${totalUnread} unread` : `${conversations.length} conversations`}
          </p>
        </div>
      </div>

      {/* Main panel */}
      <div className="flex-1 bg-card border border-border rounded-lg overflow-hidden flex min-h-0">
        {/* Sidebar: conversation list */}
        <div className={`${selectedConv ? 'hidden md:flex' : 'flex'} w-full md:w-80 lg:w-96 flex-shrink-0 border-r border-border flex-col min-h-0`}>
          {/* Search */}
          <div className="p-3 flex-shrink-0">
            <div className="flex items-center gap-2 bg-[#181820] border border-white/[0.06] px-3.5 py-2.5 rounded-lg">
              <Search className="w-4 h-4 text-white/25 flex-shrink-0" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search chats..."
                className="bg-transparent text-sm outline-none w-full placeholder:text-white/25 text-white/90"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 && (
              <p className="p-6 text-center font-mono text-xs text-muted-foreground">No conversations</p>
            )}
            {filtered.map(conv => (
              <ConvItem
                key={conv.id}
                conv={conv}
                isSelected={selectedConvId === conv.id}
                onClick={() => setSelectedConvId(conv.id)}
              />
            ))}
          </div>
        </div>

        {/* Chat window */}
        <div className={`${selectedConv ? 'flex' : 'hidden md:flex'} flex-1 flex-col min-w-0 min-h-0`}>
          {!selectedConv ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <MessageSquare className="w-14 h-14 mb-3 opacity-20" />
              <p className="font-mono text-xs uppercase tracking-wider">Select a conversation</p>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-3 flex-shrink-0" style={{ background: '#1c1c24' }}>
                <button
                  onClick={() => setSelectedConvId(null)}
                  className="md:hidden flex items-center justify-center w-8 h-8 rounded-full hover:bg-white/[0.06] transition-colors flex-shrink-0"
                >
                  <ArrowLeft className="w-4 h-4 text-white/60" />
                </button>
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #6e8efb, #4a6cf7)' }}>
                  {(selectedConv.user_name || '?')[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-sm text-white">{selectedConv.user_name || selectedConv.id}</p>
                  <p className="text-[11px] text-white/40">{selectedConv.user_email || 'online'}</p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4" style={{ background: '#0f0f13' }}>
                {currentMessages.length === 0 && (
                  <p className="text-center font-mono text-xs text-muted-foreground py-8">No messages yet</p>
                )}
                {currentMessages.map(msg => (
                  <ChatBubble key={msg.id} message={msg} />
                ))}
                <div ref={bottomRef} />
              </div>

              {/* Image preview */}
              {imagePreview && (
                <div className="px-4 py-2 border-t border-white/[0.06] flex items-center gap-2 flex-shrink-0" style={{ background: '#1c1c24' }}>
                  <div className="relative inline-block">
                    <img src={imagePreview} alt="preview" className="h-14 w-auto rounded-lg" />
                    <button onClick={removeImage} className="absolute -top-1.5 -right-1.5 bg-[#ff4d4d] text-white rounded-full p-0.5 shadow">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <span className="text-xs text-white/40">Image attached</span>
                </div>
              )}

              {/* Reply bar */}
              <div className="p-3 flex gap-2 items-end flex-shrink-0" style={{ background: '#1c1c24' }}>
                <label className="cursor-pointer text-white/40 hover:text-[#6e8efb] transition-colors flex-shrink-0 pb-2.5">
                  <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                  <ImageIcon className="w-5 h-5" />
                </label>
                <textarea
                  ref={inputRef}
                  value={reply}
                  onChange={e => setReply(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
                  placeholder="Write a message..."
                  rows={1}
                  className="flex-1 bg-[#21222c] border border-white/[0.06] px-4 py-2.5 text-sm outline-none placeholder:text-white/25 text-white/90 resize-none rounded-2xl focus:border-[#6e8efb]/40 transition-colors"
                  style={{ maxHeight: 120, overflowY: 'auto' }}
                />
                <button
                  onClick={sendReply}
                  disabled={(!reply.trim() && !imageFile) || sending}
                  className="bg-[#6e8efb] text-white rounded-full flex-shrink-0 h-10 w-10 flex items-center justify-center hover:bg-[#5b7df0] transition-colors disabled:opacity-40"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}