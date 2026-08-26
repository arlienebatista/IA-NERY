// ARQUIVO: src/components/chat/Header.tsx
import React, { useState } from 'react';
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Type } from "lucide-react";

const Header = () => {
  // Estado para controlar o tamanho da fonte
  const [isLargeFont, setIsLargeFont] = useState(false);

  // Função que injeta a classe CSS na raiz do documento HTML
  const toggleFontSize = () => {
    const htmlElement = document.documentElement;
    
    if (isLargeFont) {
      htmlElement.classList.remove('font-large');
      setIsLargeFont(false);
    } else {
      htmlElement.classList.add('font-large');
      setIsLargeFont(true);
    }
  };

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 h-16 flex items-center px-4 gap-4 sticky top-0 z-20">
      <SidebarTrigger className="text-muted-foreground hover:text-primary" />
      
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center p-1">
            <img
              src="/lovable-uploads/4c027406-2fc7-44c8-af21-651d07caa6b8.png"
              alt="IA Nery"
              className="w-full h-full object-contain"
            />
        </div>
        <div>
            <h1 className="text-sm font-bold text-foreground leading-none">IA Nery</h1>
            <p className="text-[10px] text-muted-foreground leading-none mt-0.5">Assistente de Apoio ao Cuidador Informal</p>
        </div>
      </div>

      {/* Container posicionado à direita (ml-auto) para utilitários */}
      <div className="ml-auto flex items-center">
        <Button 
          variant="outline" 
          size="icon" 
          onClick={toggleFontSize}
          title={isLargeFont ? "Restaurar tamanho do texto" : "Aumentar tamanho do texto"}
          className="border-gray-300 hover:bg-gray-100 font-bold text-teal-700"
        >
          {isLargeFont ? "A-" : "A+"}
        </Button>
      </div>
    </header>
  );
};

export default Header;
