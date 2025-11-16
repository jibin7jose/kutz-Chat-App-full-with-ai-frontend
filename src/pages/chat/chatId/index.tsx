import ChatBody from "@/components/chat/chat-body";
import ChatFooter from "@/components/chat/chat-footer";
import ChatHeader from "@/components/chat/chat-header";
import EmptyState from "@/components/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/hooks/use-auth";
import { useChat } from "@/hooks/use-chat";
import useChatId from "@/hooks/use-chat-id";
import { useSocket } from "@/hooks/use-socket";
import type { MessageType } from "@/types/chat.type";
import { useEffect, useState, useRef } from "react";

const SingleChat = () => {
  const chatId = useChatId();
  const { fetchSingleChat, isSingleChatLoading, singleChat } = useChat();
  const { socket } = useSocket();
  const { user } = useAuth();

  const [replyTo, setReplyTo] = useState<MessageType | null>(null);
  const [messages, setMessages] = useState<MessageType[]>([]);

  const currentUserId = user?._id || null;
  const chat = singleChat?.chat;
  const isAIChat = chat?.isAiChat || false;

  // 👇 Ref for auto-scroll container
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ✅ Auto-scroll when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // ✅ Run scrollToBottom whenever messages update
  useEffect(() => {
    if (messages.length > 0) scrollToBottom();
  }, [messages]);

  // ✅ Sync messages from store
  useEffect(() => {
    if (singleChat?.messages) {
      setMessages(singleChat.messages);
    }
  }, [singleChat]);

  // ✅ Fetch chat initially
  useEffect(() => {
    if (!chatId) return;
    fetchSingleChat(chatId);
  }, [fetchSingleChat, chatId]);

  // ✅ Socket events for new messages
  useEffect(() => {
    if (!chatId || !socket) return;

    socket.emit("chat:join", chatId);

    socket.on("newMessage", (message: MessageType) => {
      setMessages((prev) => [...prev, message]);
    });

    return () => {
      socket.emit("chat:leave", chatId);
      socket.off("newMessage");
    };
  }, [chatId, socket]);

  if (isSingleChatLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Spinner className="w-11 h-11 !text-primary" />
      </div>
    );
  }

  if (!chat) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p className="text-lg">Chat not found</p>
      </div>
    );
  }

  return (
    <div className="relative h-svh flex flex-col">
      <ChatHeader chat={chat} currentUserId={currentUserId} />

      {/* ✅ Chat body scrollable area */}
      <div className="flex-1 overflow-y-auto bg-background px-2 pb-3">
        {messages.length === 0 ? (
          <EmptyState
            title="Start a conversation"
            description="No messages yet. Send the first message"
          />
        ) : (
          <>
            <ChatBody chatId={chatId} messages={messages} onReply={setReplyTo} />
            {/* 👇 Anchor div for scroll */}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <ChatFooter
        replyTo={replyTo}
        chatId={chatId}
        isAIChat={isAIChat}
        currentUserId={currentUserId}
        onCancelReply={() => setReplyTo(null)}
      />
    </div>
  );
};

export default SingleChat;
