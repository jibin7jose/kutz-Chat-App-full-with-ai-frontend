import React, { useState, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "./theme-provider";
import Logo from "./logo";
import { PROTECTED_ROUTES } from "@/routes/routes";
import { Button } from "./ui/button";
import { Moon, Sun, Camera, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { isUserOnline } from "@/lib/helper";
import AvatarWithBadge from "./avatar-with-badge";

const settingsOptions = [
  { label: "Account", description: "Security notifications, account info", icon: "🔑" },
  { label: "Privacy", description: "Blocked contacts, disappearing messages", icon: "🔒" },
  { label: "Chats", description: "Theme, wallpaper, chat settings", icon: "💬" },
  { label: "Notifications", description: "Message alerts and sounds", icon: "🔔" },
  { label: "Keyboard shortcuts", description: "Quick actions", icon: "⌨️" },
  { label: "Help", description: "Help center, contact us, privacy policy", icon: "❓" },
];

const AsideBar = () => {
  const { user, logout, setUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const isOnline = isUserOnline(user?._id);

  const [showProfile, setShowProfile] = useState(false);
  const [search, setSearch] = useState("");
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileInput = useRef(null);

  const filteredOptions = settingsOptions.filter(
    (opt) =>
      opt.label.toLowerCase().includes(search.trim().toLowerCase()) ||
      opt.description.toLowerCase().includes(search.trim().toLowerCase())
  );

  const handlePhotoChange = (e) => {
    setError("");
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      setPhotoPreview(event.target?.result || "");
    };
    reader.readAsDataURL(file);
  };

  const handlePhotoUpload = async () => {
    if (!photo) return;
    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("avatar", photo);

    try {
      const res = await fetch("/api/user/avatar", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      if (data.avatarUrl && setUser) setUser({ ...user, avatar: data.avatarUrl });
      setPhoto(null);
      setPhotoPreview("");
    } catch {
      setError("Failed to upload photo. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const triggerFilePicker = () => fileInput.current?.click();

  return (
    <>
      {/* 🌟 Settings Modal */}
      {showProfile && (
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn"
          onClick={() => setShowProfile(false)}
        >
          <div
            className="relative bg-gradient-to-b from-white/95 to-white/80 dark:from-zinc-900 dark:to-zinc-800 rounded-2xl shadow-2xl p-6 w-[360px] max-w-[95vw] border border-gray-200/40 dark:border-zinc-700/50 animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-3 right-3 text-gray-600 dark:text-gray-300 hover:text-red-500 transition"
              onClick={() => setShowProfile(false)}
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-2xl font-semibold mb-5 text-center bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
              Settings
            </h2>

            <div className="flex flex-col items-center gap-3">
              <AvatarWithBadge
                name={user?.name || "Unknown"}
                src={photoPreview || user?.avatar || ""}
                isOnline={isOnline}
                className="mb-1 border-4 border-white dark:border-zinc-800 shadow-md"
              />

              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={triggerFilePicker}
                className="flex items-center gap-2 border-gray-300 dark:border-zinc-700"
              >
                <Camera className="w-4 h-4" /> Upload Photo
              </Button>
              <input
                type="file"
                accept="image/*"
                ref={fileInput}
                style={{ display: "none" }}
                onChange={handlePhotoChange}
              />

              {photoPreview && (
                <div className="mt-2 animate-pulse">
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="w-14 h-14 rounded-full object-cover border border-gray-300 dark:border-zinc-700"
                  />
                </div>
              )}

              {photo && (
                <Button
                  onClick={handlePhotoUpload}
                  disabled={loading}
                  className="mt-2 bg-primary hover:bg-primary/90 text-white rounded-lg"
                >
                  {loading ? "Uploading..." : "Update Photo"}
                </Button>
              )}

              {error && <p className="text-red-500 text-xs mt-2">{error}</p>}

              <div className="text-center mt-3">
                <div className="font-semibold text-base">{user?.name}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</div>
              </div>

              <input
                type="text"
                placeholder="Search settings..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-3 py-2 mt-4 rounded-lg border text-sm dark:bg-zinc-800 dark:border-zinc-700 focus:ring-2 focus:ring-primary/50 outline-none transition"
              />

              <ul className="w-full mt-2 max-h-[230px] overflow-y-auto">
                {filteredOptions.length === 0 ? (
                  <li className="text-center py-2 text-gray-400 text-sm">No results found.</li>
                ) : (
                  filteredOptions.map((opt) => (
                    <li
                      key={opt.label}
                      className="flex justify-between items-center px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 cursor-pointer transition-all"
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-lg">{opt.icon}</span>
                        <div>
                          <div className="font-medium">{opt.label}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{opt.description}</div>
                        </div>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* 🌈 AsideBar */}
      <aside className="fixed left-0 top-0 h-screen w-12 bg-gradient-to-b from-primary/90 to-purple-700 backdrop-blur-md flex flex-col justify-between items-center py-4 shadow-lg z-[9999]">
        <Logo
          url={PROTECTED_ROUTES.CHAT}
          imgClass="w-7 h-7"
          textClass="text-white"
          showText={false}
        />

        <div className="flex flex-col items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            className="rounded-full p-2 bg-white/10 hover:bg-white/20 transition"
          >
            {theme === "light" ? (
              <Sun className="h-5 w-5 text-yellow-400 transition-transform rotate-0 hover:rotate-180 duration-300" />
            ) : (
              <Moon className="h-5 w-5 text-gray-200 transition-transform hover:-rotate-180 duration-300" />
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div role="button">
                <AvatarWithBadge
                  name={user?.name || "Unknown"}
                  src={user?.avatar || ""}
                  isOnline={isOnline}
                />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-48 rounded-xl shadow-xl z-[99999]" align="end">
              <DropdownMenuLabel
                onClick={() => setShowProfile(true)}
                className="cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-800 px-3 py-2 rounded-md"
              >
                ⚙️  Settings
              </DropdownMenuLabel>
              <DropdownMenuItem
                onClick={logout}
                className="text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30"
              >
                🚪 Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
    </>
  );
};

export default AsideBar;
