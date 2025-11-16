import { format, isToday, isYesterday, isThisWeek } from "date-fns";
import { v4 as uuidv4 } from "uuid";
import { useSocket } from "@/hooks/use-socket";
import type { ChatType } from "@/types/chat.type";

/**
 * Check if a user is online via socket state
 */
export const isUserOnline = (userId?: string) => {
  if (!userId) return false;
  const { onlineUsers } = useSocket.getState();
  return onlineUsers.includes(userId);
};

/**
 * Determine chat display name, subheading, and status
 */
export const getOtherUserAndGroup = (
  chat: ChatType,
  currentUserId: string | null
) => {
  const isGroup = chat?.isGroup;

  // 🧩 Group chat
  if (isGroup) {
    return {
      name: chat.groupName || "Unnamed Group",
      subheading: `${chat.participants.length} members`,
      avatar: "",
      isGroup,
      isOnline: false,
      isAI: false,
    };
  }

  // 🧩 Private chat
  const other = chat?.participants.find((p) => p._id !== currentUserId);

  // 🧠 AI should *always* be online
  const isOnline = other?.isAI ? true : isUserOnline(other?._id ?? "");

  // 🧠 Set correct name and subheading
  let name = other?.name || "Unknown";
  let subheading = "";

  if (other?.isAI) {
    name = "Kutz AI";
    subheading = "Online Assistant";
  } else if (isOnline) {
    subheading = "Online";
  } else {
    subheading = "Offline";
  }

  return {
    name,
    subheading,
    avatar: other?.avatar || "",
    isGroup: false,
    isOnline,
    isAI: other?.isAI || false,
  };
};

/**
 * Format message time in chat
 */
export const formatChatTime = (date: string | Date) => {
  if (!date) return "";
  const newDate = new Date(date);
  if (isNaN(newDate.getTime())) return "Invalid date";

  if (isToday(newDate)) return format(newDate, "h:mm a");
  if (isYesterday(newDate)) return "Yesterday";
  if (isThisWeek(newDate)) return format(newDate, "EEEE");
  return format(newDate, "M/d");
};

/**
 * Generate a unique UUID for chat messages
 */
export function generateUUID(): string {
  return uuidv4();
}
