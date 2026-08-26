
import React from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface ChatInputProps {
  inputValue: string;
  setInputValue: (value: string) => void;
  handleSend: () => void;
  handleKeyPress: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  isLoading: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ inputValue, setInputValue, handleSend, handleKeyPress, isLoading }) => {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="relative">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Envie uma pergunta para IA Nery..."
          className="pr-12 py-3 text-sm resize-none rounded-xl border-gray-500 focus:border-teal-500"
          disabled={isLoading}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          <Button
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading}
            size="icon"
            className="w-8 h-8 bg-teal-600 hover:bg-teal-700 rounded-lg"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatInput;
