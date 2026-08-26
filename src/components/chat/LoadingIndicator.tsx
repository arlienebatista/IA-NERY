
import React from 'react';
import { Bot } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const LoadingIndicator = () => {
  return (
    <div className="flex gap-4">
      <Avatar className="w-8 h-8 bg-teal-600">
        <AvatarFallback className="text-white text-sm">
          <Bot className="w-4 h-4" />
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 space-y-2">
        <span className="font-medium text-sm text-gray-900">IA Nery</span>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <div className="w-2 h-2 bg-teal-600 rounded-full animate-bounce" />
            <div className="w-2 h-2 bg-teal-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
            <div className="w-2 h-2 bg-teal-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
          </div>
          <span className="text-sm text-gray-600">Pensando...</span>
        </div>
      </div>
    </div>
  );
};

export default LoadingIndicator;
