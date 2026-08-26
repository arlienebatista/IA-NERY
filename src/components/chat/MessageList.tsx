import React, { useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Message } from '@/types/chat';
import MessageItem from './MessageItem';
import LoadingIndicator from './LoadingIndicator';

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
}

const MessageList: React.FC<MessageListProps> = ({ messages, isLoading }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Filtra mensagens do assistente vazias enquanto está pensando
  const visibleMessages = isLoading
    ? messages.filter(m => !(m.role === 'assistant' && (!m.content || m.content.trim() === '')))
    : messages;

  const showLoading = isLoading;

  return (
    <ScrollArea className="flex-1 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {visibleMessages.map((message) => (
          <MessageItem key={message.id} message={message} />
        ))}
        {showLoading && <LoadingIndicator />}
        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  );
};

export default MessageList;
