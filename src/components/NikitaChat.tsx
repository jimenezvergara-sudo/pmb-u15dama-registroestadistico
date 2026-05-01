import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, Send, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useRoster } from '@/context/contexts';
import { useRama } from '@/hooks/useRama';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface NikitaChatProps {
  /** Optional stats context (e.g. plain-text box score) inyectado al system prompt. */
  statsPayload?: string;
}

const NikitaChat: React.FC<NikitaChatProps> = ({ statsPayload }) => {
  const { rama } = useRama();
  const { myTeamName, activeCategory } = useRoster();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        rama === 'masculino'
          ? '¡Hola! Soy Nikita 🏀 Tu asistente táctica. Preguntame lo que quieras del rendimiento del equipo.'
          : rama === 'mixto'
            ? '¡Hola! Soy Nikita 🏀 Tu asistente táctica. ¿En qué puedo ayudarte con el equipo?'
            : '¡Hola! Soy Nikita 🏀 Tu asistente táctica. Preguntame lo que quieras sobre el rendimiento de las jugadoras.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const next: ChatMessage[] = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setInput('');
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('nikita-chat', {
        body: {
          messages: next,
          rama,
          teamName: myTeamName || undefined,
          category: activeCategory || undefined,
          statsPayload,
        },
      });
      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }
      const reply = data?.reply as string | undefined;
      if (reply) setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      console.error(err);
      toast.error('No pude responder, intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs font-bold"
        >
          <Sparkles className="w-4 h-4" />
          Nikita
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[85vh] flex flex-col p-0">
        <SheetHeader className="px-4 py-3 border-b border-border/60">
          <SheetTitle className="flex items-center gap-2 text-base font-extrabold">
            <Sparkles className="w-5 h-5 text-primary" />
            Nikita — Asistente Táctica
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 px-4 py-3" ref={scrollRef as any}>
          <div className="space-y-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-md'
                      : 'bg-muted text-foreground rounded-bl-md'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl rounded-bl-md px-3.5 py-2 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  <span className="text-xs text-muted-foreground font-semibold">Pensando…</span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-3 border-t border-border/60 flex gap-2">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Preguntale algo a Nikita…"
            disabled={loading}
            className="flex-1"
          />
          <Button onClick={send} disabled={loading || !input.trim()} size="icon" className="h-10 w-10 shrink-0">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default NikitaChat;
