import React, { useState } from 'react';
import { User, Copy, Check } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Message } from '@/types/chat';
import { cn } from '@/lib/utils';

interface MessageItemProps {
  message: Message;
}

const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
  const isAssistant = message.role === 'assistant';
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async () => {
    if (!message.content) return;
    
    try {
      await navigator.clipboard.writeText(message.content);
      setIsCopied(true);
      
      // Retorna o botão ao estado original após 2 segundos
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    } catch (error) {
      console.error('Falha ao copiar o texto:', error);
    }
  };

  return (
    <div className={cn('flex gap-4', !isAssistant && 'flex-row-reverse')}>
      <Avatar className={`w-8 h-8 flex-shrink-0 ${isAssistant ? 'bg-teal-600' : 'bg-green-600'}`}>
        <AvatarFallback className="text-white text-sm">
          {isAssistant ? (
            <img
              src="/lovable-uploads/4c027406-2fc7-44c8-af21-651d07caa6b8.png"
              alt="IA Nery"
              className="w-6 h-6 rounded-full"
            />
          ) : (
            <User className="w-4 h-4 text-white" />
          )}
        </AvatarFallback>
      </Avatar>

      <div className={cn('flex-1 space-y-2', !isAssistant && 'text-right')}>
        <div className={cn('flex items-center gap-2', !isAssistant && 'justify-end')}>
          <span className="font-medium text-sm text-foreground">
            {isAssistant ? 'IA Nery' : 'Você'}
          </span>
          <span className="text-xs text-muted-foreground">
            {message.timestamp.toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
        
        <p className="text-foreground/90 leading-relaxed whitespace-pre-wrap">
          {message.content}
        </p>

        {/* Renderização condicional do botão de cópia apenas para a IA Nery */}
        {isAssistant && (
          <div className="flex justify-start pt-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {isCopied ? (
                <>
                  <Check className="w-3.5 h-3.5 mr-1.5 text-teal-600" />
                  Copiado!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 mr-1.5" />
                  Copiar
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageItem;
