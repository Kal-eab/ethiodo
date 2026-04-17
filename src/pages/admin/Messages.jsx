import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Send, Image, X, Loader2, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { toast } from 'sonner';

function ConversationList({ conversations, selected, onSelect }) {
  return (
    <div className="w-full h-full flex flex-col">
      <div className="p-4 border-b border-border">
        <h2 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Conversations</h2>
      </div>
      <div className="flex-1 overflow-y-auto divide-y divide-border">
        {conversations.length === 0 && (
          <p className="p-4 font-mono text-xs text-muted-foreground text-center">No conversations yet</p>
        )}
        {conversations.map(conv => (
          <button
            key={conv.id}
            onClick={() => onSelect(conv)}
            className={`w-full text-left p-4 hover:bg-secondary/50 transition-colors ${
              selected?.id === conv.id ? 'bg-secondary/70 border-l-2 border-primary' : ''
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-sm truncate">{conv.user_name || conv.id}</span>
              {conv.unread > 0 && (
                <span className="bg-primary text-primary-foreground text-xs font-mono font-bold w-5 h-5 flex items-center justify-center rounded-full flex-shrink-0">
                  {conv.unread}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate">{conv.lastMessage}</p>
            <p className="font-mono text-[10px] text-muted-foreground mt-1">{conv.lastTime}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function ChatBubble({ message }) {
  const isAdmin = message.sender === 'admin';
  return (
    <div className={`flex ${isAdmin ? 'justify-end' : 'justify-start'} mb-3`}>
      <div className={`max-w-[75%] ${isAdmin ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <div className={`px-4 py-3 text-sm leading-relaxed ${
          isAdmin
            ? 'bg-primary text-primary-foreground'
            : 'bg-secondary border border-border text-foreground'
        }`}>
          {message.content}
          {message.image_url && (
            <a href={message.image_url} target="_blank" rel="noopener noreferrer" className="block mt-2">
              <img src={message.image_url} alt="attachment" className="max-h-40 w-auto border border-border/30 hover:opacity-80 transition-opacity" />
            </a>
          )}
        </div>
        <span className="font-mono text-[10px] text-muted-foreground px-1">
          {isAdmin ? 'Admin' : (message.user_name || 'Customer')} •{' '}
          {message.created_date ? format(new Date(message.created_date), 'MMM d, HH:mm') : ''}
        </span>
      </div>
    </div>
  );
}

export default function AdminMessages() {
  const [selectedConv, setSelectedConv] = useState(null);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: allMessages = [] } = useQuery({
    queryKey: ['all-messages'],
    queryFn: () => base44.entities.Message.list('-created_date', 500),
    refetchInterval: 5000,
  });

  // Group messages into conversations by conversation_id
  const conversations = React.useMemo(() => {
    const map = {};
    [...allMessages].reverse().forEach(msg => {
      const cid = msg.conversation_id;
      if (!map[cid]) {
        map[cid] = {
          id: cid,
          user_name: msg.user_name || msg.user_email || cid,
          user_email: msg.user_email,
          messages: [],
          unread: 0,
          lastMessage: '',
          lastTime: '',
        };
      }
      map[cid].messages.push(msg);
      if (msg.sender === 'user' && !msg.is_read) map[cid].unread++;
      map[cid].lastMessage = msg.content?.slice(0, 50) || '';
      map[cid].lastTime = msg.created_date ? format(new Date(msg.created_date), 'MMM d, HH:mm') : '';
    });
    return Object.values(map).sort((a, b) => {
      const aLast = a.messages[a.messages.length - 1]?.created_date || '';
      const bLast = b.messages[b.messages.length - 1]?.created_date || '';
      return bLast.localeCompare(aLast);
    });
  }, [allMessages]);

  const currentMessages = selectedConv
    ? (conversations.find(c => c.id === selectedConv.id)?.messages || [])
    : [];

  // Auto scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages.length]);

  // Mark messages as read when selecting conversation
  useEffect(() => {
    if (!selectedConv) return;
    const unread = currentMessages.filter(m => m.sender === 'user' && !m.is_read);
    unread.forEach(m => base44.entities.Message.update(m.id, { is_read: true }));
    if (unread.length > 0) queryClient.invalidateQueries({ queryKey: ['all-messages'] });
  }, [selectedConv?.id]);

  const sendReply = async () => {
    if (!reply.trim() || !selectedConv) return;
    setSending(true);
    await base44.entities.Message.create({
      conversation_id: selectedConv.id,
      user_email: selectedConv.user_email,
      user_name: selectedConv.user_name,
      content: reply.trim(),
      sender: 'admin',
      is_read: true,
    });
    setReply('');
    queryClient.invalidateQueries({ queryKey: ['all-messages'] });
    setSending(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Messages</h1>
        <p className="font-mono text-xs text-muted-foreground mt-1">
          {conversations.reduce((s, c) => s + c.unread, 0)} unread
        </p>
      </div>

      <div className="bg-card border border-border overflow-hidden" style={{ height: '70vh' }}>
        <div className="flex h-full">
          {/* Sidebar */}
          <div className="w-72 flex-shrink-0 border-r border-border">
            <ConversationList
              conversations={conversations}
              selected={selectedConv}
              onSelect={setSelectedConv}
            />
          </div>

          {/* Chat area */}
          <div className="flex-1 flex flex-col min-w-0">
            {!selectedConv ? (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                <MessageSquare className="w-12 h-12 mb-3 opacity-30" />
                <p className="font-mono text-xs uppercase">Select a conversation</p>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="px-4 py-3 border-b border-border flex items-center gap-3">
                  <div>
                    <p className="font-medium text-sm">{selectedConv.user_name || selectedConv.id}</p>
                    {selectedConv.user_email && (
                      <p className="font-mono text-xs text-muted-foreground">{selectedConv.user_email}</p>
                    )}
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4">
                  {currentMessages.map(msg => (
                    <ChatBubble key={msg.id} message={msg} />
                  ))}
                  <div ref={bottomRef} />
                </div>

                {/* Reply bar */}
                <div className="border-t border-border p-3 flex gap-2">
                  <input
                    value={reply}
                    onChange={e => setReply(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
                    placeholder="Type a reply..."
                    className="flex-1 bg-secondary border border-border px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
                  />
                  <Button
                    onClick={sendReply}
                    disabled={!reply.trim() || sending}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 px-4"
                  >
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}