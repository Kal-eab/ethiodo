import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Send, Image as ImageIcon, X, Loader2, MessageSquare, Search, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

// ─── Chat bubble (admin view) ────────────────────────────────────────────────
function ChatBubble({ message }) {
  const isAdmin = message.sender === 'admin';
  return (
    <div className={`flex ${isAdmin ? 'justify-end' : 'justify-start'} mb-3`}>
      {!isAdmin && (
        <div className="w-7 h-7 rounded-full bg-secondary border border-border flex items-center justify-center text-[10px] font-bold text-muted-foreground mr-2 flex-shrink-0 mt-1">
          {(message.user_name || 'U')[0].toUpperCase()}
        </div>
      )}
      <div className={`max-w-[70%] flex flex-col gap-1 ${isAdmin ? 'items-end' : 'items-start'}`}>
        <div className={`px-4 py-2.5 text-sm leading-relaxed rounded-2xl ${
          isAdmin
            ? 'bg-primary text-primary-foreground rounded-br-sm'
            : 'bg-secondary border border-border text-foreground rounded-bl-sm'
        }`}>
          {message.content && message.content !== '(image)' && <p>{message.content}</p>}
          {message.image_url && (
            <a href={message.image_url} target="_blank" rel="noopener noreferrer" className={message.content && message.content !== '(image)' ? 'block mt-2' : 'block'}>
              <img src={message.image_url} alt="attachment" className="max-h-48 w-auto rounded-lg hover:opacity-90 transition-opacity" />
            </a>
          )}
        </div>
        <span className="font-mono text-[10px] text-muted-foreground px-1">
          {isAdmin ? 'You' : (message.user_name || 'Customer')} • {message.created_date ? format(new Date(message.created_date), 'MMM d, HH:mm') : ''}
        </span>
      </div>
    </div>
  );
}

// ─── Conversation list item ──────────────────────────────────────────────────
function ConvItem({ conv, isSelected, onClick }) {
  const initials = (conv.user_name || conv.id || '?')[0].toUpperCase();
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3.5 flex items-center gap-3 hover:bg-secondary/60 transition-colors border-b border-border/50 ${
        isSelected ? 'bg-secondary/80 border-l-2 border-l-primary' : ''
      }`}
    >
      <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="font-medium text-sm truncate">{conv.user_name || conv.user_email || conv.id}</span>
          <span className="font-mono text-[10px] text-muted-foreground flex-shrink-0 ml-2">{conv.lastTime}</span>
        </div>
        <p className="text-xs text-muted-foreground truncate mt-0.5">{conv.lastMessage}</p>
      </div>
      {conv.unread > 0 && (
        <span className="bg-primary text-primary-foreground text-[10px] font-mono font-bold min-w-5 h-5 px-1 flex items-center justify-center rounded-full flex-shrink-0">
          {conv.unread}
        </span>
      )}
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
      <div className="flex-1 bg-card border border-border overflow-hidden flex min-h-0">
        {/* Sidebar: conversation list */}
        <div className={`${selectedConv ? 'hidden md:flex' : 'flex'} w-full md:w-72 flex-shrink-0 border-r border-border flex-col min-h-0`}>
          {/* Search */}
          <div className="p-3 border-b border-border flex-shrink-0">
            <div className="flex items-center gap-2 bg-secondary border border-border px-3 py-2">
              <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search..."
                className="bg-transparent text-sm outline-none w-full placeholder:text-muted-foreground"
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
              <div className="px-4 py-3 border-b border-border flex items-center gap-3 flex-shrink-0 bg-secondary/20">
                <button
                  onClick={() => setSelectedConvId(null)}
                  className="md:hidden flex items-center justify-center w-8 h-8 rounded-full hover:bg-secondary transition-colors flex-shrink-0"
                >
                  <ArrowLeft className="w-4 h-4 text-muted-foreground" />
                </button>
                <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                  {(selectedConv.user_name || '?')[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-sm">{selectedConv.user_name || selectedConv.id}</p>
                  {selectedConv.user_email && (
                    <p className="font-mono text-[11px] text-muted-foreground">{selectedConv.user_email}</p>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4">
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
                <div className="px-4 py-2 border-t border-border bg-secondary/30 flex items-center gap-2 flex-shrink-0">
                  <div className="relative inline-block">
                    <img src={imagePreview} alt="preview" className="h-14 w-auto rounded border border-border" />
                    <button onClick={removeImage} className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <span className="font-mono text-xs text-muted-foreground">Image attached</span>
                </div>
              )}

              {/* Reply bar */}
              <div className="border-t border-border p-3 flex gap-2 items-end flex-shrink-0 bg-background">
                <label className="cursor-pointer text-muted-foreground hover:text-primary transition-colors flex-shrink-0 pb-2">
                  <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                  <ImageIcon className="w-5 h-5" />
                </label>
                <textarea
                  ref={inputRef}
                  value={reply}
                  onChange={e => setReply(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
                  placeholder="Type a reply..."
                  rows={1}
                  className="flex-1 bg-secondary border border-border px-3 py-2 text-sm outline-none placeholder:text-muted-foreground resize-none rounded-xl focus:border-primary/50 transition-colors"
                  style={{ maxHeight: 100, overflowY: 'auto' }}
                />
                <Button
                  onClick={sendReply}
                  disabled={(!reply.trim() && !imageFile) || sending}
                  size="icon"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full flex-shrink-0 h-9 w-9"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}