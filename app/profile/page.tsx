"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  User as UserIcon, 
  Mail, 
  MapPin, 
  Link as LinkIcon, 
  Save, 
  ArrowLeft,
  Camera,
  AtSign,
  FileText,
  Loader2,
  Database,
  Terminal
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

interface User {
  id: string;
  username: string;
  email: string;
  full_name: string | null;
  bio: string | null;
  profile_picture_url: string | null;
  website: string | null;
  location: string | null;
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<User>>({});
  const [logs, setLogs] = useState<{ query: string; timestamp: string; action: string }[]>([]);

  const addLog = (action: string, query: string) => {
    setLogs(prev => [{ 
      action, 
      query, 
      timestamp: new Date().toLocaleTimeString() 
    }, ...prev].slice(0, 10));
  };

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch("/api/users/profile");
        const data = await res.json();
        if (data.ok) {
          setUser(data.user);
          setFormData(data.user);
        } else {
          toast.error(data.error || "Gagal memuat profil");
          if (res.status === 401) router.push("/login");
        }
      } catch (err) {
        toast.error("Terjadi kesalahan sistem");
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [router]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/users/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.ok) {
        setUser(data.user);
        toast.success("Profil berhasil diperbarui!");
        addLog("Update Profile", `UPDATE users SET 
  username = $1, 
  full_name = $2, 
  bio = $3, 
  profile_picture_url = $4, 
  website = $5, 
  location = $6, 
  updated_at = NOW() 
WHERE id = $7;`);
      } else {
        toast.error(data.error || "Gagal memperbarui profil");
      }
    } catch (err) {
      toast.error("Terjadi kesalahan saat menyimpan");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#020617] font-sans pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-xl dark:bg-slate-900/80">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")} className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">Edit Profil</h1>
          </div>
          <Button 
            onClick={handleUpdate} 
            disabled={saving}
            className="rounded-full bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 px-6"
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Simpan Perubahan
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          
          {/* Left Side: Avatar & Summary */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="overflow-hidden border-none shadow-xl shadow-slate-200/50 dark:shadow-none ring-1 ring-slate-200 dark:ring-slate-800">
              <div className="h-24 bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600"></div>
              <CardContent className="relative pt-12 text-center">
                <div className="absolute left-1/2 top-0 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-3xl border-4 border-white bg-slate-100 p-1 shadow-2xl dark:border-slate-900 dark:bg-slate-800">
                  {formData.profile_picture_url ? (
                    <img 
                      src={formData.profile_picture_url} 
                      alt="Avatar" 
                      className="h-full w-full rounded-2xl object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username}`;
                      }}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
                      <UserIcon className="h-10 w-10" />
                    </div>
                  )}
                  <div className="absolute -bottom-2 -right-2 rounded-full bg-primary p-2 text-white shadow-lg shadow-primary/40 ring-2 ring-white dark:ring-slate-900">
                    <Camera className="h-4 w-4" />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-bold">{formData.full_name || "Nama Belum Diatur"}</h3>
                  <p className="text-sm text-slate-500 font-mono">@{formData.username}</p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {formData.location && (
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                        <MapPin className="mr-1 h-3 w-3" />
                        {formData.location}
                      </span>
                    )}
                    {formData.website && (
                      <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                        <LinkIcon className="mr-1 h-3 w-3" />
                         Web
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
              <Separator />
              <CardFooter className="bg-slate-50/50 dark:bg-slate-800/20 p-4">
                <p className="text-xs text-center w-full text-slate-500 italic">
                  ID: {user?.id}
                </p>
              </CardFooter>
            </Card>

            {/* Query Monitor for Profile */}
            <Card className="border-none shadow-2xl bg-slate-900 text-slate-300 overflow-hidden hidden lg:block">
              <CardHeader className="bg-slate-800 p-3">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 text-primary">
                  <Database className="h-3 w-3" />
                  Profile Query Log
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[300px]">
                  <div className="p-3 space-y-3">
                    {logs.map((log, i) => (
                      <div key={i} className="text-[9px] font-mono border-l-2 border-primary/30 pl-2 py-1">
                        <div className="flex justify-between text-slate-500 mb-1">
                          <span>{log.action}</span>
                          <span>{log.timestamp}</span>
                        </div>
                        <pre className="text-emerald-400 whitespace-pre-wrap">{log.query}</pre>
                      </div>
                    ))}
                    {logs.length === 0 && (
                      <div className="py-10 text-center opacity-30 italic text-[10px]">
                        Waiting for SQL execution...
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Right Side: Form */}
          <div className="lg:col-span-8">
            <form onSubmit={handleUpdate} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="md:col-span-2 border-none shadow-sm ring-1 ring-slate-200 dark:ring-slate-800">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <UserIcon className="h-5 w-5 text-primary" />
                    Informasi Dasar
                  </CardTitle>
                  <CardDescription>Ubah informasi identitas publik Anda</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="username" className="text-xs font-bold flex items-center gap-2">
                        <AtSign className="h-3 w-3" /> USERNAME
                      </Label>
                      <Input 
                        id="username" 
                        value={formData.username || ""} 
                        onChange={(e) => setFormData({...formData, username: e.target.value})}
                        placeholder="username"
                        className="rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="full_name" className="text-xs font-bold flex items-center gap-2">
                        <UserIcon className="h-3 w-3" /> NAMA LENGKAP
                      </Label>
                      <Input 
                        id="full_name" 
                        value={formData.full_name || ""} 
                        onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                        placeholder="Nama Lengkap Anda"
                        className="rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-xs font-bold flex items-center gap-2">
                      <Mail className="h-3 w-3" /> EMAIL (TIDAK DAPAT DIUBAH)
                    </Label>
                    <Input 
                      id="email" 
                      value={formData.email || ""} 
                      disabled
                      className="rounded-xl bg-slate-100/50 border-slate-200 opacity-70"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm ring-1 ring-slate-200 dark:ring-slate-800">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5 text-indigo-500" />
                    Tentang Anda
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label htmlFor="bio" className="text-xs font-bold">BIO SINGKAT</Label>
                    <Textarea 
                      id="bio" 
                      value={formData.bio || ""} 
                      onChange={(e) => setFormData({...formData, bio: e.target.value})}
                      placeholder="Ceritakan sedikit tentang Anda..."
                      className="min-h-[120px] rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white transition-all resize-none"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm ring-1 ring-slate-200 dark:ring-slate-800">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-emerald-500" />
                    Sosial & Lokasi
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="location" className="text-xs font-bold">LOKASI</Label>
                    <Input 
                      id="location" 
                      value={formData.location || ""} 
                      onChange={(e) => setFormData({...formData, location: e.target.value})}
                      placeholder="Contoh: Jakarta, Indonesia"
                      className="rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website" className="text-xs font-bold">WEBSITE / PORTFOLIO</Label>
                    <Input 
                      id="website" 
                      value={formData.website || ""} 
                      onChange={(e) => setFormData({...formData, website: e.target.value})}
                      placeholder="https://yourwebsite.com"
                      className="rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white transition-all"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="md:col-span-2 border-none shadow-sm ring-1 ring-slate-200 dark:ring-slate-800">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Camera className="h-5 w-5 text-rose-500" />
                    Foto Profil
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label htmlFor="pfp" className="text-xs font-bold">URL FOTO PROFIL</Label>
                    <div className="flex gap-2">
                      <Input 
                        id="pfp" 
                        value={formData.profile_picture_url || ""} 
                        onChange={(e) => setFormData({...formData, profile_picture_url: e.target.value})}
                        placeholder="https://images.unsplash.com/..."
                        className="rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white transition-all flex-1"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 italic">
                      Masukkan URL gambar. Anda bisa menggunakan layanan hosting gambar pihak ketiga.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </form>
          </div>
        </div>
      </main>

      {/* Floating Action Button for Mobile Save */}
      <div className="lg:hidden fixed bottom-6 right-6">
        <Button 
          onClick={handleUpdate} 
          disabled={saving}
          className="h-14 w-14 rounded-full shadow-2xl shadow-primary/40 bg-primary p-0"
        >
          {saving ? <Loader2 className="h-6 w-6 animate-spin" /> : <Save className="h-6 w-6" />}
        </Button>
      </div>

    </div>
  );
}
