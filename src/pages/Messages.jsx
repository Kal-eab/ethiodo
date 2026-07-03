import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Send, Image as ImageIcon, X, Loader2, MessageSquare, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import Navbar from '@/components/store/Navbar';
import MobileHeader from '@/components/store/MobileHeader';

// ─── Chat bubble ────────────────────────────────────────────────────────────
function ChatBubble({ message }) {
  const isUser = message.sender === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-[10px] font-bold text-primary mr-2 flex-shrink-0 mt-1">
          S
        </div>
      )}
      <div className={`max-w-[75%] flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={`px-4 py-2.5 text-sm leading-relaxed rounded-2xl ${
          isUser
            ? 'bg-primary text-primary-foreground rounded-br-sm'
            : 'bg-secondary border border-border text-foreground rounded-bl-sm'
        }`}>
          {message.content && message.content !== '(image)' && <p>{message.content}</p>}
          {message.image_url && (
            <a href={message.image_url} target="_blank" rel="noopener noreferrer" className={`block ${message.content && message.content !== '(image)' ? 'mt-2' : ''}`}>
              <img src={message.image_url} alt="attachment" className="max-h-48 w-auto rounded-lg hover:opacity-90 transition-opacity" />
            </a>
          )}
        </div>
        <span className="font-mono text-[10px] text-muted-foreground px-1">
          {message.created_date ? format(new Date(message.created_date), 'HH:mm') : ''}
        </span>
      </div>
    </div>
  );
}

// ─── First-message contact form ──────────────────────────────────────────────
function ContactInput({ user, onSent }) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!text.trim()) return;
    setSending(true);
    const conversationId = user?.email || user?.id || `anon-${Date.now()}`;
    await base44.entities.Message.create({
      conversation_id: conversationId,
      user_email: user?.email || '',
      user_name: user?.full_name || user?.email || 'Guest',
      content: text.trim(),
      sender: 'user',
      is_read: false,
    });
    await base44.entities.Notification.create({
      type: 'message',
      content: `New message from ${user?.full_name || user?.email || 'Guest'}: ${text.trim().slice(0, 60)}`,
      link: '/admin/messages',
      is_read: false,
    });
    setSending(false);
    onSent();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MobileHeader title="Messages" />
      <Navbar />
      <div className="flex-1 flex flex-col items-center justify-center px-4 pt-20 pb-24">
        <div className="w-full max-w-lg">
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-primary/10 border border-primary/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Contact Support</h1>
            <p className="text-muted-foreground text-sm">
              Send us a message and we'll get back to you shortly.
            </p>
          </div>

          <div className="bg-card border border-border p-6 space-y-4">
            {user && (
              <div className="flex items-center gap-2 pb-2 border-b border-border">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-xs font-bold text-primary">
                  {(user.full_name || user.email || '?')[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium">{user.full_name || 'You'}</p>
                  <p className="font-mono text-xs text-muted-foreground">{user.email}</p>
                </div>
              </div>
            )}

            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleSend(); }}
              placeholder="Write your message here..."
              rows={5}
              className="w-full bg-secondary border border-border px-4 py-3 text-sm outline-none placeholder:text-muted-foreground resize-none focus:border-primary/50 transition-colors"
            />

            <Button
              onClick={handleSend}
              disabled={!text.trim() || sending}
              className="w-full h-11 bg-primary text-primary-foreground font-mono font-medium hover:bg-primary/90"
            >
              {sending ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Sending...</>
              ) : (
                <><Send className="w-4 h-4 mr-2" /> Send Message</>
              )}
            </Button>
            <p className="text-center font-mono text-[10px] text-muted-foreground">Ctrl+Enter to send</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Full chat UI ────────────────────────────────────────────────────────────
function ChatUI({ user, conversationId }) {
  const [text, setText] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: messages = [] } = useQuery({
    queryKey: ['my-messages', conversationId],
    queryFn: () => base44.entities.Message.filter({ conversation_id: conversationId }, 'created_date', 500),
    enabled: !!conversationId,
    refetchInterval: 4000,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

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

  const sendMessage = async () => {
    if (!text.trim() && !imageFile) return;
    setSending(true);
    let image_url = null;
    if (imageFile) {
      const result = await base44.integrations.Core.UploadFile({ file: imageFile });
      image_url = result.file_url;
    }
    await base44.entities.Message.create({
      conversation_id: conversationId,
      user_email: user?.email || '',
      user_name: user?.full_name || user?.email || 'Guest',
      content: text.trim() || '(image)',
      image_url,
      sender: 'user',
      is_read: false,
    });
    await base44.entities.Notification.create({
      type: 'message',
      content: `New message from ${user?.full_name || user?.email}: ${(text.trim() || '(image)').slice(0, 60)}`,
      link: '/admin/messages',
      is_read: false,
    });
    setText('');
    setImageFile(null);
    setImagePreview(null);
    queryClient.invalidateQueries({ queryKey: ['my-messages', conversationId] });
    setSending(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  return (
    <div className="bg-background flex flex-col" style={{ minHeight: '100dvh' }}>
      {/* Chat header */}
      <div className="flex-shrink-0 border-b border-border px-4 py-3 flex items-center gap-3 bg-card/50 backdrop-blur-sm" style={{ paddingTop: 'var(--navbar-height, 56px)' }}>
        <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="w-9 h-9 bg-primary/10 border border-primary/30 rounded-full flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
          S
        </div>
        <div>
          <p className="font-medium text-sm">Support Team</p>
          <p className="font-mono text-[11px] text-primary">● Online</p>
        </div>
      </div>

      {/* Messages — scrollable middle */}
      <div className="flex-1 overflow-y-auto px-4 py-4 min-h-0">
        {messages.length === 0 && (
          <div className="flex justify-center py-8">
            <p className="font-mono text-xs text-muted-foreground">Start of conversation</p>
          </div>
        )}
        {messages.map(msg => (
          <ChatBubble key={msg.id} message={msg} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Image preview */}
      {imagePreview && (
        <div className="flex-shrink-0 px-4 py-2 border-t border-border bg-secondary/30 flex items-center gap-2">
          <div className="relative inline-block">
            <img src={imagePreview} alt="preview" className="h-14 w-auto rounded border border-border" />
            <button onClick={removeImage} className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5">
              <X className="w-3 h-3" />
            </button>
          </div>
          <span className="font-mono text-xs text-muted-foreground">Image attached</span>
        </div>
      )}

      {/* Input bar — always pinned to bottom */}
      <div className="flex-shrink-0 border-t border-border p-3 flex gap-2 items-end bg-background"
        style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}>
        <label className="cursor-pointer text-muted-foreground hover:text-primary transition-colors flex-shrink-0 pb-2">
          <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
          <ImageIcon className="w-5 h-5" />
        </label>
        <textarea
          ref={inputRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          placeholder="Message..."
          rows={1}
          className="flex-1 bg-secondary border border-border px-3 py-2 text-sm outline-none placeholder:text-muted-foreground resize-none rounded-xl focus:border-primary/50 transition-colors"
          style={{ maxHeight: 100, overflowY: 'auto' }}
        />
        <Button
          onClick={sendMessage}
          disabled={(!text.trim() && !imageFile) || sending}
          size="icon"
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full flex-shrink-0 h-9 w-9"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────
export default function Messages() {
  const { user, isLoadingAuth } = useAuth();
  const [hasMessages, setHasMessages] = useState(false);

  const conversationId = user?.email || user?.id || null;

  const { data: messages = [], isLoading: loadingMessages } = useQuery({
    queryKey: ['my-messages-check', conversationId],
    queryFn: () => base44.entities.Message.filter({ conversation_id: conversationId }, 'created_date', 1),
    enabled: !!conversationId,
  });

  useEffect(() => {
    if (!loadingMessages && messages.length > 0) setHasMessages(true);
  }, [messages, loadingMessages]);

  if (isLoadingAuth || (conversationId && loadingMessages)) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!hasMessages) {
    return <ContactInput user={user} onSent={() => setHasMessages(true)} />;
  }

  return <ChatUI user={user} conversationId={conversationId} />;
}