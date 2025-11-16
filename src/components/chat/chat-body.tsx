import { useEffect, useRef, useState } from "react";
import { useSocket } from "@/hooks/use-socket";
import { useChat } from "@/hooks/use-chat";
import ChatBodyMessage from "./chat-body-message";
import type { MessageType } from "@/types/chat.type";

interface Props {
  chatId: string | null;
  messages: MessageType[];
  onReply: (message: MessageType) => void;
}

const ChatBody = ({ chatId, messages, onReply }: Props) => {
  const { socket } = useSocket();
  const { addNewMessage, addOrUpdateMessage } = useChat();
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [aiChunk, setAiChunk] = useState<string>("");

  // ✅ Handle new incoming messages
  useEffect(() => {
    if (!socket || !chatId) return;

    const handleNewMessage = (msg: MessageType) => {
      if (msg.chatId !== chatId) return;

      // Prevent duplicates based on _id
      const alreadyExists = messages.some((m) => m._id === msg._id);
      if (alreadyExists) return;

      addNewMessage(chatId, msg);
    };

    socket.on("newMessage", handleNewMessage);
    return () => {
      socket.off("newMessage", handleNewMessage);
    };
  }, [socket, chatId, messages, addNewMessage]);

  // ✅ Handle AI message streaming
  useEffect(() => {
    if (!socket || !chatId) return;

    const handleAIStream = ({
      chatId: streamChatId,
      chunk,
      done,
      message,
    }: {
      chatId: string;
      chunk?: string;
      done?: boolean;
      message?: MessageType;
    }) => {
      if (streamChatId !== chatId) return;

      const lastMsg = messages[messages.length - 1];
      if (!lastMsg) return;

      if (chunk && !done) {
        const updated = (aiChunk ?? "") + chunk;
        setAiChunk(updated);

        addOrUpdateMessage(
          chatId,
          { ...lastMsg, content: updated, streaming: true },
          lastMsg._id
        );
      } else if (done && message) {
        addOrUpdateMessage(
          chatId,
          { ...message, streaming: false },
          message._id
        );
        setAiChunk("");
      }
    };

    socket.on("chat:ai", handleAIStream);
    return () => {
      socket.off("chat:ai", handleAIStream);
    };
  }, [socket, chatId, messages, aiChunk, addOrUpdateMessage]);

  // ✅ Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ✅ Render messages (deduped)
  const uniqueMessages = Array.from(new Map(messages.map((m) => [m._id, m])).values());

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col px-3 py-2">
      {uniqueMessages.map((m, i) => (
        <ChatBodyMessage
          key={m._id || `${m.createdAt}-${i}`}
          message={m}
          onReply={onReply}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  );
};

export default ChatBody;
