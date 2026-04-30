import React, { useState, useRef } from "react";
import { User, Lock, Mail, Camera, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { GlassCard } from "@/components/shared";
import { axiosSecure } from "@/lib/api-client-react";

export default function ProfileTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(user?.name || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { name?: string; avatarUrl?: string }) => {
      const res = await axiosSecure.patch("/api/user/profile", data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast.success("Profile updated successfully");
    },
    onError: (err: any) => toast.error(err.response?.data?.error || err.message || "Failed to update profile"),
  });

  const updatePasswordMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await axiosSecure.patch("/api/user/password", data);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Password updated successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (err: any) => toast.error(err.response?.data?.error || err.message || "Failed to update password"),
  });

  const handleUpdateName = (e: React.FormEvent) => {
    e.preventDefault();
    if (name === user?.name || !name.trim()) return;
    updateProfileMutation.mutate({ name });
  };

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    updatePasswordMutation.mutate({ currentPassword, newPassword });
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("File size must be less than 2MB");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      // 1. Upload to our server endpoint (which handles Cloudinary)
      const res = await axiosSecure.post("/api/user/profile/avatar/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const { url } = res.data;

      // 2. Update profile with the new URL
      await updateProfileMutation.mutateAsync({ avatarUrl: url });
      toast.success("Avatar updated successfully");
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || "Failed to upload avatar");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile Card */}
        <div className="md:col-span-1">
          <GlassCard className="flex flex-col items-center text-center p-8 h-full">
            <div className="relative group mb-4">
              <div className="h-24 w-24 rounded-full overflow-hidden border-2 border-primary/20 bg-muted/50 flex items-center justify-center">
                {isUploading ? (
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                ) : (user as any)?.avatarUrl ? (
                  <img src={(user as any).avatarUrl} alt={user?.name || ""} className="h-full w-full object-cover" />
                ) : (
                  <User className="h-10 w-10 text-muted-foreground/40" />
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 flex items-center justify-center bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                <Camera className="h-5 w-5" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleAvatarUpload}
              />
            </div>
            <h2 className="font-heading text-lg font-bold text-foreground line-clamp-1">{user?.name}</h2>
            <p className="text-xs text-muted-foreground mb-4">{user?.email}</p>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">
              {user?.role} Account
            </div>
          </GlassCard>
        </div>

        {/* Edit Section */}
        <div className="md:col-span-2 space-y-6">
          <GlassCard>
            <div className="flex items-center gap-2 mb-6">
              <User className="h-4 w-4 text-primary" />
              <h2 className="font-heading text-base font-semibold text-foreground">Basic Information</h2>
            </div>
            <form onSubmit={handleUpdateName} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground ml-1">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-muted/40 border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                  placeholder="Enter your name"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground ml-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                  <input
                    type="email"
                    value={user?.email}
                    disabled
                    className="w-full bg-muted/20 border border-border/50 rounded-xl pl-11 pr-4 py-3 text-sm text-muted-foreground cursor-not-allowed"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 ml-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Email cannot be changed for security reasons.
                </p>
              </div>
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={updateProfileMutation.isPending || name === user?.name || !name.trim()}
                  className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updateProfileMutation.isPending ? "Updating..." : "Save Changes"}
                </button>
              </div>
            </form>
          </GlassCard>

          <GlassCard>
            <div className="flex items-center gap-2 mb-6">
              <Lock className="h-4 w-4 text-primary" />
              <h2 className="font-heading text-base font-semibold text-foreground">Security</h2>
            </div>
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground ml-1">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  className="w-full bg-muted/40 border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                  placeholder="••••••••"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground ml-1">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full bg-muted/40 border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                    placeholder="Minimal 6 characters"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground ml-1">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full bg-muted/40 border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                    placeholder="Repeat new password"
                  />
                </div>
              </div>
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={updatePasswordMutation.isPending || !currentPassword || !newPassword || newPassword.length < 6}
                  className="px-6 py-2.5 bg-foreground text-background rounded-xl text-sm font-bold shadow-lg shadow-foreground/5 hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updatePasswordMutation.isPending ? "Updating..." : "Update Password"}
                </button>
              </div>
            </form>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
