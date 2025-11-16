/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from "zustand";
import type { UserType } from "@/types/auth.type";
import type {
  ChatType,
  CreateChatType,
  CreateMessageType,
  MessageType,
} from "@/types/chat.type";
import { API } from "@/lib/axios-client";
import { toast } from "sonner";
import { useAuth } from "./use-auth";
import { generateUUID } from "@/lib/helper";

interface ChatState {
  chats: ChatType[];
  users: UserType[];
  singleChat: {
    chat: ChatType;
    messages: MessageType[];
  } | null;

  currentAIStreamId: string | null;

  isChatsLoading: boolean;
  isUsersLoading: boolean;
  isCreatingChat: boolean;
  isSingleChatLoading: boolean;
  isSendingMsg: boolean;

  fetchAllUsers: () => void;
  fetchChats: () => void;
  createChat: (payload: CreateChatType) => Promise<ChatType | null>;
  fetchSingleChat: (chatId: string) => void;
  sendMessage: (payload: CreateMessageType, isAIChat?: boolean) => void;

  addNewChat: (newChat: ChatType) => void;
  updateChatLastMessage: (chatId: string, lastMessage: MessageType) => void;
  addNewMessage: (chatId: string, message: MessageType) => void;
  addOrUpdateMessage: (chatId: string, msg: MessageType, tempId?: string) => void;
}

export const useChat = create<ChatState>()((set, get) => ({
  chats: [],
  users: [],
  singleChat: null,

  isChatsLoading: false,
  isUsersLoading: false,
  isCreatingChat: false,
  isSingleChatLoading: false,
  isSendingMsg: false,

  currentAIStreamId: null,

  // 🧠 Fetch all users
  fetchAllUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const { data } = await API.get("/user/all");
      set({ users: data.users });
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to fetch users");
    } finally {
      set({ isUsersLoading: false });
    }
  },

  // 🧠 Fetch all chats
  fetchChats: async () => {
    set({ isChatsLoading: true });
    try {
      const { data } = await API.get("/chat/all");
      set({ chats: data.chats });
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to fetch chats");
    } finally {
      set({ isChatsLoading: false });
    }
  },

  // 🧠 Create a new chat
  createChat: async (payload: CreateChatType) => {
    set({ isCreatingChat: true });
    try {
      const response = await API.post("/chat/create", payload);
      get().addNewChat(response.data.chat);
      toast.success("Chat created successfully");
      return response.data.chat;
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to create chat");
      return null;
    } finally {
      set({ isCreatingChat: false });
    }
  },

  // 🧠 Fetch a single chat with messages
  fetchSingleChat: async (chatId: string) => {
    set({ isSingleChatLoading: true });
    try {
      const { data } = await API.get(`/chat/${chatId}`);
      set({ singleChat: data });
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to fetch chat");
    } finally {
      set({ isSingleChatLoading: false });
    }
  },

  // 🧠 Send a new message
  sendMessage: async (payload: CreateMessageType, isAIChat?: boolean) => {
    set({ isSendingMsg: true });
    const { chatId, replyTo, content, image } = payload;
    const { user } = useAuth.getState();
    const chat = get().singleChat?.chat;
    const aiSender = chat?.participants.find((p) => p.isAI);

    if (!chatId || !user?._id) return;

    const tempUserId = generateUUID();

    // 🟢 Show user's message immediately
    const tempMessage: MessageType = {
      _id: tempUserId,
      chatId,
      content: content || "",
      image: image || null,
      sender: user,
      replyTo: replyTo || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: "sending...",
    };

    get().addOrUpdateMessage(chatId, tempMessage, tempUserId);

    try {
      const { data } = await API.post("/chat/message/send", {
        chatId,
        content,
        image,
        replyToId: replyTo?._id,
      });

      const { userMessage, aiResponse } = data;

      // ✅ Replace temp user message with the actual saved message
      get().addOrUpdateMessage(chatId, userMessage, tempUserId);

      // ✅ Let socket handle AI message response (avoid duplicates)
      if (isAIChat && aiSender && aiResponse) return;
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to send message");
    } finally {
      set({ isSendingMsg: false });
    }
  },

  // 🧠 Add a new chat to list
  addNewChat: (newChat) => {
    set((state) => {
      const exists = state.chats.some((c) => c._id === newChat._id);
      return { chats: exists ? state.chats : [newChat, ...state.chats] };
    });
  },

  // 🧠 Update chat's last message
  updateChatLastMessage: (chatId, lastMessage) => {
    set((state) => ({
      chats: state.chats.map((c) =>
        c._id === chatId ? { ...c, lastMessage } : c
      ),
    }));
  },

  // 🧠 Add a new message (used by sockets)
  addNewMessage: (chatId, message) => {
    set((state) => {
      if (!state.singleChat || state.singleChat.chat._id !== chatId) return state;
      return {
        singleChat: {
          ...state.singleChat,
          messages: [...state.singleChat.messages, message],
        },
      };
    });
  },

  // 🧠 Add or update message (replace temp or insert)
  addOrUpdateMessage: (chatId: string, msg: MessageType, tempId?: string) => {
    const state = get();
    const singleChat = state.singleChat;
    if (!singleChat || singleChat.chat._id !== chatId) return;

    let updatedMessages = [...singleChat.messages];

    if (tempId) {
      const tempIndex = updatedMessages.findIndex((m) => m._id === tempId);
      if (tempIndex !== -1) {
        updatedMessages[tempIndex] = msg;
      } else {
        const exists = updatedMessages.some((m) => m._id === msg._id);
        if (!exists) updatedMessages.push(msg);
      }
    } else {
      const existingIndex = updatedMessages.findIndex((m) => m._id === msg._id);
      if (existingIndex !== -1) {
        updatedMessages[existingIndex] = msg;
      } else {
        updatedMessages.push(msg);
      }
    }

    updatedMessages = updatedMessages.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    set({
      singleChat: {
        chat: singleChat.chat,
        messages: updatedMessages,
      },
    });
  },
}));
