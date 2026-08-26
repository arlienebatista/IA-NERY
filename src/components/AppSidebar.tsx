// ARQUIVO: src/components/AppSidebar.tsx
import { useEffect, useState } from "react";
import { 
  MessageSquarePlus, 
  MessageSquare, 
  Trash2, 
  User2, 
  ChevronUp, 
  LogOut 
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ThemeToggle } from "@/components/ThemeToggle";
import { User } from "@supabase/supabase-js";

interface Conversation {
  id: string;
  title: string;
  created_at: string;
}

interface AppSidebarProps {
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
}

export function AppSidebar({ currentConversationId, onSelectConversation, onNewChat }: AppSidebarProps) {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // 1. Carregar conversas
    const fetchConversations = async () => {
      const { data } = await supabase
        .from("conversations")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (data) setConversations(data);
    };

    // 2. Carregar Usuário
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));

    fetchConversations();

    // 3. Atualização em tempo real das conversas
    const channel = supabase
      .channel("schema-db-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setConversations((prev) => [payload.new as Conversation, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const { error } = await supabase.from("conversations").delete().eq("id", id);
    if (!error) {
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (currentConversationId === id) {
        onNewChat();
      }
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <Sidebar>
      <SidebarContent>
        <div className="p-4">
          <Button 
            onClick={onNewChat} 
            className="w-full justify-start gap-2 bg-primary hover:bg-primary/90 text-white shadow-sm"
          >
            <MessageSquarePlus className="w-4 h-4" />
            Nova Conversa
          </Button>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Histórico</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {conversations.length === 0 ? (
                <div className="px-4 py-2 text-xs text-muted-foreground text-center">
                  Nenhuma conversa salva.
                </div>
              ) : (
                conversations.map((chat) => (
                  <SidebarMenuItem key={chat.id}>
                    <SidebarMenuButton
                      onClick={() => onSelectConversation(chat.id)}
                      isActive={currentConversationId === chat.id}
                      className="group justify-between h-auto py-3"
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <MessageSquare className="w-4 h-4 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
                        <span className="truncate text-sm">{chat.title}</span>
                      </div>
                      <Trash2 
                        className="w-4 h-4 opacity-0 group-hover:opacity-100 text-destructive/70 hover:text-destructive transition-all" 
                        onClick={(e) => handleDelete(e, chat.id)}
                      />
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter className="p-3 border-t bg-sidebar/50">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton 
                  size="lg" 
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground border border-border/40 rounded-lg hover:bg-sidebar-accent transition-colors"
                >
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary ring-1 ring-primary/20">
                    <User2 className="h-5 w-5" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">Minha Conta</span>
                    <span className="truncate text-xs text-muted-foreground">{user?.email}</span>
                  </div>
                  <ChevronUp className="ml-auto h-4 w-4 text-muted-foreground/50" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                className="w-[--radix-popper-anchor-width] min-w-56 rounded-lg bg-background border-border shadow-lg"
              >
                {/* Opção de Tema dentro do Menu */}
                <div className="px-2 py-1.5 flex items-center justify-between text-sm outline-none">
                   <span className="text-muted-foreground">Tema</span>
                   <ThemeToggle />
                </div>
                
                <div className="h-px bg-border my-1" />
                
                <DropdownMenuItem 
                  onClick={handleLogout}
                  className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer gap-2 p-2"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sair da conta</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
