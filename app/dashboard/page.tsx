"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { 
  Heart, 
  MessageSquare, 
  Share2, 
  LogOut, 
  Send,
  User as UserIcon,
  Clock,
  TrendingUp,
  Hash,
  RefreshCw,
  UserPlus,
  UserCheck,
  Terminal,
  Code2,
  Database
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Post {
  id: string; // Changed to string for UUID
  content: string;
  username: string;
  profile_picture_url: string | null;
  likes_count: number;
  created_at: string;
  is_liked: boolean;
}

interface SuggestedUser {
  id: string;
  username: string;
  profile_picture_url: string | null;
  is_following: boolean;
}

export default function DashboardPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);
  const [newContent, setNewContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  
  // Query Documentation Logs
  const [logs, setLogs] = useState<{ query: string; timestamp: string; action: string }[]>([]);

  const addLog = (action: string, query: string) => {
    setLogs(prev => [{ 
      action, 
      query, 
      timestamp: new Date().toLocaleTimeString() 
    }, ...prev].slice(0, 10)); // Keep last 10
  };

  const fetchPosts = useCallback(async () => {
    try {
      const res = await fetch("/api/posts");
      const data = await res.json();
      if (data.ok) {
        setPosts(data.posts);
      }
    } catch (err) {
      toast.error("Gagal mengambil status");
    } finally {
      setFetching(false);
    }
  }, []);

  const fetchSuggestedUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      if (data.ok) {
        setSuggestedUsers(data.users);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
    fetchSuggestedUsers();
  }, [fetchPosts, fetchSuggestedUsers]);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newContent }),
      });
      const data = await res.json();
      if (data.ok) {
        setNewContent("");
        toast.success("Status berhasil dibagikan!");
        addLog("Create Post", "INSERT INTO posts (user_id, content) VALUES ($1, $2) RETURNING *;");
        fetchPosts();
      } else {
        toast.error(data.error);
      }
    } catch (err) {
      toast.error("Gagal mengirim status");
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (postId: string) => {
    try {
      const res = await fetch(`/api/posts/${postId}/like`, { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        if (data.liked) {
          addLog("Like Post", "INSERT INTO likes (user_id, post_id) VALUES ($1, $2);\n-- TRIGGER: UPDATE posts SET likes_count = likes_count + 1 WHERE id = $2;");
        } else {
          addLog("Unlike Post", "DELETE FROM likes WHERE user_id = $1 AND post_id = $2;\n-- TRIGGER: UPDATE posts SET likes_count = likes_count - 1 WHERE id = $2;");
        }
        
        setPosts(prev => prev.map(p => {
          if (p.id === postId) {
            return {
              ...p,
              is_liked: data.liked,
              likes_count: data.liked ? p.likes_count + 1 : p.likes_count - 1
            };
          }
          return p;
        }));
      }
    } catch (err) {
      toast.error("Gagal menyukai status");
    }
  };

  const handleFollow = async (userId: string, isFollowing: boolean) => {
    try {
      const res = await fetch(`/api/users/${userId}/follow`, { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        if (data.following) {
          addLog("Follow User", "INSERT INTO follows (follower_id, following_id) VALUES ($1, $2) ON CONFLICT DO NOTHING;");
          toast.success("Berhasil mengikuti!");
        } else {
          addLog("Unfollow User", "DELETE FROM follows WHERE follower_id = $1 AND following_id = $2;");
          toast.info("Berhenti mengikuti");
        }
        
        setSuggestedUsers(prev => prev.map(u => 
          u.id === userId ? { ...u, is_following: data.following } : u
        ));
      }
    } catch (err) {
      toast.error("Gagal mengubah relasi");
    }
  };

  const handleLogout = async () => {
    toast.info("Logging out...");
    setTimeout(() => {
      router.push("/login");
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#020617] font-sans pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-xl dark:bg-slate-900/80">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2 text-primary">
            <Share2 className="h-7 w-7" />
            <span className="text-2xl font-black tracking-tight">ST_SHARE</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => {
              fetchPosts();
              fetchSuggestedUsers();
            }} className="rounded-full hover:bg-primary/10 hover:text-primary transition-colors">
              <RefreshCw className={`h-5 w-5 ${fetching ? 'animate-spin' : ''}`} />
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <Button 
              variant="outline" 
              className="rounded-full border-indigo-200 text-indigo-500 hover:bg-indigo-50 dark:border-indigo-900/50 dark:hover:bg-indigo-900/10" 
              onClick={() => router.push("/profile")}
            >
              <UserIcon className="mr-2 h-4 w-4" />
              Profil
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <Button 
              variant="outline" 
              className="rounded-full border-red-200 text-red-500 hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-900/10" 
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Keluar
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          
          {/* Left Sidebar - Profile & Suggested Users */}
          <div className="hidden space-y-6 lg:col-span-3 lg:block">
            <Card className="overflow-hidden border-none shadow-sm ring-1 ring-slate-200 dark:ring-slate-800">
              <div className="h-16 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500"></div>
              <CardContent className="relative pt-10 text-center">
                <div className="absolute left-1/2 top-0 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-2xl border-4 border-white bg-slate-100 p-0.5 shadow-xl dark:border-slate-900 dark:bg-slate-800">
                  <div className="flex h-full w-full items-center justify-center rounded-xl bg-primary/10">
                    <UserIcon className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <h3 className="font-bold">Profil Anda</h3>
                <p className="text-xs text-slate-500 mb-3">@{posts[0]?.username || "User"}</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full rounded-xl text-xs"
                  onClick={() => router.push("/profile")}
                >
                  Edit Profil
                </Button>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm ring-1 ring-slate-200 dark:ring-slate-800">
              <CardHeader className="pb-3 px-4">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-primary" />
                  Saran Teman
                </CardTitle>
              </CardHeader>
              <CardContent className="px-2 pb-2">
                <div className="space-y-1">
                  {suggestedUsers.length > 0 ? suggestedUsers.map(user => (
                    <div key={user.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden flex items-center justify-center font-bold text-xs">
                          {user.profile_picture_url ? (
                            <img src={user.profile_picture_url} alt={user.username} className="h-full w-full object-cover" />
                          ) : (
                            user.username[0].toUpperCase()
                          )}
                        </div>
                        <span className="text-sm font-medium">@{user.username}</span>
                      </div>
                      <Button 
                        size="sm" 
                        variant={user.is_following ? "outline" : "default"} 
                        className="h-8 w-8 p-0 rounded-full"
                        onClick={() => handleFollow(user.id, user.is_following)}
                      >
                        {user.is_following ? <UserCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                      </Button>
                    </div>
                  )) : (
                    <p className="p-4 text-center text-xs text-muted-foreground italic">Tidak ada saran baru</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Center Timeline */}
          <div className="lg:col-span-6 space-y-6">
            <Card className="border-none shadow-xl shadow-indigo-500/5 ring-1 ring-slate-200 dark:ring-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
              <CardContent className="p-0">
                <div className="bg-slate-50/50 dark:bg-slate-800/50 p-4 border-b">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <Code2 className="h-4 w-4 text-primary" />
                    Buat Status Baru
                  </h3>
                </div>
                <div className="p-4">
                  <div className="flex gap-4">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Terminal className="h-5 w-5 text-primary" />
                    </div>
                    <form onSubmit={handleCreatePost} className="flex-1 space-y-3">
                      <Textarea 
                        placeholder="Apa rancangan status Anda?" 
                        className="min-h-[100px] border-none bg-transparent focus-visible:ring-0 text-lg p-0 resize-none"
                        value={newContent}
                        onChange={(e) => setNewContent(e.target.value)}
                      />
                      <div className="flex items-center justify-end">
                        <Button type="submit" className="px-8 rounded-xl font-bold transition-all hover:scale-105 active:scale-95" disabled={loading || !newContent.trim()}>
                          {loading ? 'Processing...' : 'Eksekusi Post'}
                          <Send className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    </form>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Posts */}
            <div className="space-y-6">
              {posts.map((post) => (
                <Card key={post.id} className="border-none shadow-sm ring-1 ring-slate-200 bg-white dark:bg-slate-900 overflow-hidden group">
                  <CardHeader className="flex flex-row items-center gap-3 space-y-0 p-4">
                    <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center font-bold text-primary ring-1 ring-slate-200 dark:ring-slate-700">
                      {post.profile_picture_url ? (
                        <img src={post.profile_picture_url} alt={post.username} className="h-full w-full object-cover" />
                      ) : (
                        post.username[0].toUpperCase()
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">@{post.username}</h4>
                      <p className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(post.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </CardHeader>
                  <CardContent className="px-14 pb-4 pt-0">
                    <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                      {post.content}
                    </p>
                  </CardContent>
                  <Separator className="opacity-50" />
                  <CardFooter className="p-2 px-4 flex justify-between bg-slate-50/30 dark:bg-slate-800/10">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleLike(post.id)}
                      className={`gap-2 rounded-lg ${post.is_liked ? 'text-red-500 bg-red-50/50 dark:bg-red-500/10' : 'text-slate-500'}`}
                    >
                      <Heart className={`h-4 w-4 ${post.is_liked ? 'fill-current' : ''}`} />
                      <span className="font-bold text-xs">{post.likes_count}</span>
                    </Button>
                    <Button variant="ghost" size="sm" className="gap-2 rounded-lg text-slate-500">
                      <MessageSquare className="h-4 w-4" />
                      <span className="font-bold text-xs">0</span>
                    </Button>
                    <Button variant="ghost" size="sm" className="rounded-lg text-slate-500">
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>

          {/* Right Sidebar - Query Logs & Trends */}
          <div className="hidden space-y-6 lg:col-span-3 lg:block">
            {/* Query Documentation Panel */}
            <Card className="border-none shadow-2xl shadow-primary/10 ring-2 ring-primary/20 bg-slate-900 text-slate-50 overflow-hidden h-[600px] sticky top-24 flex flex-col">
              <CardHeader className="bg-slate-800 p-4 shrink-0">
                <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-indigo-400">
                  <Database className="h-4 w-4" />
                  DB Action Documentation
                </CardTitle>
                <CardDescription className="text-[10px] text-slate-400">
                  SQL Implementation via pg pool
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="p-4 space-y-4">
                    {logs.length > 0 ? logs.map((log, i) => (
                      <div key={i} className="space-y-2 animate-in fade-in slide-in-from-right-2 duration-300">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-md font-bold uppercase">
                            {log.action}
                          </span>
                          <span className="text-[9px] text-slate-500 font-mono italic">
                            {log.timestamp}
                          </span>
                        </div>
                        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 shadow-inner group relative">
                          <pre className="text-[10px] font-mono whitespace-pre-wrap leading-relaxed text-emerald-400 overflow-x-auto">
                            {log.query}
                          </pre>
                        </div>
                      </div>
                    )) : (
                      <div className="flex flex-col items-center justify-center py-20 text-slate-600 space-y-2">
                        <Terminal className="h-10 w-10 opacity-20" />
                        <p className="text-[10px] font-mono italic">
                          Menunggu aksi pengguna...
                        </p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
              <div className="p-4 bg-slate-950/50 border-t border-slate-800 shrink-0">
                <div className="flex items-center gap-2 text-[9px] font-mono text-slate-500">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  System Monitoring Active
                </div>
              </div>
            </Card>
          </div>

        </div>
      </main>
      
      {/* Mobile Float Query Monitor */}
      <div className="lg:hidden fixed bottom-4 right-4 z-50">
         <Button size="icon" className="h-12 w-12 rounded-full shadow-2xl shadow-primary/50">
            <Database className="h-6 w-6" />
         </Button>
      </div>
    </div>
  );
}
