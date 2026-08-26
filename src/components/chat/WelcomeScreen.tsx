// ARQUIVO: src/components/chat/WelcomeScreen.tsx
import React from 'react';
import { Card } from '@/components/ui/card';
import ChatInput, { ChatInputProps } from '@/components/ChatInput';

interface WelcomeScreenProps {
  chatInputProps: ChatInputProps;
  setInputValue: (value: string) => void;
}

const suggestedQuestions = [
  "O que é cuidado informal?",
  "Quais são os sinais de sobrecarga do cuidador?",
  "Conselhos práticos para cuidar de uma pessoa dependente.",
  "Informações sobre mobilidade."
];

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ chatInputProps, setInputValue }) => {
  return (
    /* 1. Aqui adicionamos o 'overflow-y-auto' para criar a barra de rolagem quando necessário*/
    <div className="flex-1 w-full overflow-y-auto bg-background">
      <div className="flex flex-col items-center justify-center min-h-full p-4 md:p-8">
        
        <div className="mb-8 mt-8 md:mt-0">
          <img
            src="/lovable-uploads/4c027406-2fc7-44c8-af21-651d07caa6b8.png"
            alt="IA Nery - Assistente de Apoio ao Cuidador Informal"
            className="w-16 h-16 mx-auto mb-4"
          />
          <h2 className="text-xl font-semibold text-foreground mb-2 text-center">Como posso ajudá-lo hoje?</h2>
          <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
            Sou a IA Nery, especializada em orientações para cuidadores informais.
            Faça uma pergunta ou escolha uma das opções abaixo:
          </p>
        </div>

        <div className="w-full max-w-2xl mb-8">
          <div className="bg-background p-4 rounded-xl border border-border shadow-sm">
            <ChatInput {...chatInputProps} />
          </div>
        </div>

        {/* 3. Adicionado um padding-bottom (pb-8) para desgrudar as caixas do limite inferior ao rolar */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl w-full pb-8">
          {suggestedQuestions.map((question, index) => (
            <Card
              key={index}
              className="p-4 hover:shadow-md transition-shadow cursor-pointer bg-card border-border hover:border-primary"
              onClick={() => setInputValue(question)}
            >
              <p className="text-sm text-card-foreground">{question}</p>
            </Card>
          ))}
        </div>

      </div>
    </div>
  );
};

export default WelcomeScreen;
