import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { Camera, Save, User, Loader2, LogOut } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/page-header";
import { useCurrentUser } from "@/hooks/use-current-user";
import { getUploadUrl, deleteStorageObject } from "@/lib/upload.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — Enigma College" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: user } = useCurrentUser();
  const fetchUpload = useServerFn(getUploadUrl);
  const deleteObject = useServerFn(deleteStorageObject);

  const [name, setName] = useState(user.name || "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user.avatar ?? null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be under 2MB");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/avatar.${ext}`;
      const { token } = await fetchUpload({
        data: { bucket: "avatars", path, contentType: file.type },
      });
      const { error } = await supabase.storage
        .from("avatars")
        .uploadToSignedUrl(path, token, file);
      if (error) throw error;

      // Delete old avatar if it existed and was different
      if (avatarUrl && avatarUrl.includes("avatars/")) {
        const oldPath = avatarUrl.split("avatars/")[1]?.split("?")[0];
        if (oldPath && oldPath !== path) {
          await deleteObject({ data: { bucket: "avatars", path: oldPath } }).catch(() => {});
        }
      }

      const { data: publicData } = supabase.storage.from("avatars").getPublicUrl(path);
      setAvatarUrl(publicData.publicUrl);
      toast.success("Avatar uploaded");
    } catch (err: any) {
      toast.error(err?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ name, avatar: avatarUrl })
        .eq("id", user.id);
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["current-user"] });
      toast.success("Profile saved");
    } catch (err: any) {
      toast.error(err?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await supabase.auth.signOut();
      qc.clear();
      navigate({ to: "/auth", replace: true });
    } catch (err: any) {
      toast.error(err?.message || "Failed to sign out");
      setSigningOut(false);
    }
  }

  const initials = (name || user.email || "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="max-w-xl mx-auto p-4 md:p-8 space-y-6">
      <PageHeader title="Settings" />

      <Card className="p-6 shadow-card space-y-6">
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={() => fileRef.current?.click()}
            className="relative h-24 w-24 rounded-full bg-secondary text-primary grid place-items-center text-2xl font-bold overflow-hidden border-2 border-border hover:border-primary transition"
            disabled={uploading}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <User className="h-10 w-10" />
            )}
            {uploading && (
              <div className="absolute inset-0 bg-black/40 grid place-items-center">
                <Loader2 className="h-6 w-6 text-white animate-spin" />
              </div>
            )}
            <div className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary text-primary-foreground grid place-items-center border-2 border-background">
              <Camera className="h-4 w-4" />
            </div>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <p className="text-xs text-muted-foreground">Tap the circle to upload an avatar</p>
        </div>

        <div className="space-y-3">
          <div>
            <Label htmlFor="name">Display name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={user.email || ""} disabled />
          </div>
          <div>
            <Label>Roles</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {user.roles.map((r) => (
                <span
                  key={r}
                  className="px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-semibold uppercase tracking-wide"
                >
                  {r}
                </span>
              ))}
            </div>
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save profile
        </Button>
      </Card>

      <Card className="p-6 shadow-card">
        <h2 className="font-semibold text-sm mb-1">Sign out</h2>
        <p className="text-xs text-muted-foreground mb-4">
          You will be returned to the login screen.
        </p>
        <Button
          variant="outline"
          onClick={handleSignOut}
          disabled={signingOut}
          className="w-full border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
        >
          {signingOut ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <LogOut className="h-4 w-4 mr-2" />
          )}
          Sign out
        </Button>
      </Card>
    </div>
  );
}
