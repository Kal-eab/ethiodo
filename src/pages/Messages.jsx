import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Send, Upload, X, Loader2, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import Navbar from '@/components/store/Navbar';

function ChatBubble({ message, isOwn }) {
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[75%] flex flex-col gap-1 ${isOwn ? 'items-end' : 'items-start'}`}>
        <div className={`px-4 py-3 text-sm leading-relaxed ${
          isOwn
            ? 'bg-primary text-primary-foreground'
            : 'bg-card border border-border text-foreground'
        }`}>
          {message.content}
          {message.image_url && (
            <a href={message.image_url} target="_blank" rel="noopener noreferrer" className="block mt-2">
              <img src={message.image_url} alt="attachment" className="max-h-40 w-auto hover:opacity-80 transition-opacity" />
            </a>
          )}
        </div>
        <span className="font-mono text-[10px] text-muted-foreground px-1">
          {isOwn ? 'You' : 'Support'} •{' '}
          {message.created_date ? format(new Date(message.created_date), 'MMM d, HH:mm') : ''}
        </span>
      </div>
    </div>
  );
}

export default function Messages() {
  const [user, setUser] = useState(null);
  const [text, setText] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const bottomRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const conversationId = user?.email || user?.id || null;

  const { data: messages = [] } = useQuery({
    queryKey: ['my-messages', conversationId],
    queryFn: () => base44.entities.Message.filter({ conversation_id: conversationId }, 'created_date', 200),
    enabled: !!conversationId,
    refetchInterval: 5000,
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
    if (!conversationId) return;
    setSending(true);

    let image_url = null;
    if (imageFile) {
      setUploading(true);
      const result = await base44.integrations.Core.UploadFile({ file: imageFile });
      image_url = result.file_url;
      setUploading(false);
    }

    await base44.entities.Message.create({
      conversation_id: conversationId,
      user_email: user.email,
      user_name: user.full_name || user.email,
      content: text.trim() || '(image)',
      image_url,
      sender: 'user',
      is_read: false,
    });

    // Create notification for admin
    await base44.entities.Notification.create({
      type: 'message',
      content: `New message from ${user.full_name || user.email}: ${(text.trim() || '(image)').slice(0, 60)}`,
      link: '/admin/messages',
      is_read: false,
    });

    setText('');
    setImageFile(null);
    setImagePreview(null);
    queryClient.invalidateQueries({ queryKey: ['my-messages', conversationId] });
    setSending(false);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Messages</h1>
            <p className="text-muted-foreground text-sm mt-1">Chat with our support team</p>
          </div>

          <div className="bg-card border border-border flex flex-col" style={{ height: '65vh' }}>
            {/* Messages area */}
            <div className="flex-1 overflow-y-auto p-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <MessageSquare className="w-12 h-12 mb-3 opacity-30" />
                  <p className="font-mono text-xs uppercase">Send a message to start the conversation</p>
                </div>
              ) : (
                messages.map(msg => (
                  <ChatBubble
                    key={msg.id}
                    message={msg}
                    isOwn={msg.sender === 'user'}
                  />
                ))
              )}
              <div ref={bottomRef} />
            </div>

            {/* Image preview */}
            {imagePreview && (
              <div className="px-4 pb-2 flex items-center gap-2">
                <div className="relative">
                  <img src={imagePreview} alt="preview" className="h-16 w-auto border border-border" />
                  <button
                    onClick={removeImage}
                    className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}

            {/* Input bar */}
            <div className="border-t border-border p-3 flex gap-2 items-center">
              <label className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
                <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                <Upload className="w-5 h-5" />
              </label>
              <input
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="Type a message..."
                className="flex-1 bg-secondary border border-border px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
              />
              <Button
                onClick={sendMessage}
                disabled={(!text.trim() && !imageFile) || sending}
                className="bg-primary text-primary-foreground hover:bg-primary/90 px-4"
              >
                {sending || uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}