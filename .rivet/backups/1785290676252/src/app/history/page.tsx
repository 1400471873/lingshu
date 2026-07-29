"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Sparkles, Search, Trash2, ArrowLeft, Loader2 } from "lucide-react";

interface HistoryItem {
  id: string;
  topic: string;
  platform: string;
  contentType: string;
  preview: string;
  createdAt: string;
}

const platformLabels: Record<string, string> = {
  xiaohongshu: "📕 小红书",
  douyin: "🎵 抖音",
  gongzhonghao: "💬 公众号",
  weibo: "🔵 微博",
  bilibili: "📺 B站",
  zhihu: "💡 知乎",
  toutiao: "📰 头条",
};

const typeLabels: Record<string, string> = {
  tuwen: "图文",
  short_video: "短视频脚本",
  long_article: "长文",
  title: "标题",
  comment: "评论回复",
  live_script: "直播话术",
};

export default function HistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchHistory = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("search", q);
      params.set("limit", "50");
      const res = await fetch(`/api/history?${params}`);
      const data = await res.json();
      setItems(data.list || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory("");
  }, [fetchHistory]);

  const handleSearch = () => {
    fetchHistory(search);
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await fetch(`/api/history/${id}`, { method: "DELETE" });
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch {
      /* ignore */
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (d: string) => {
    return new Date(d).toLocaleString("zh-CN", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/60 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <Sparkles className="w-6 h-6 text-indigo-600" />
          <h1 className="text-xl font-bold">灵枢</h1>
          <span className="text-sm text-muted-foreground">历史记录</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Search */}
        <div className="flex gap-2">
          <Input
            placeholder="搜索主题..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <Button variant="outline" onClick={handleSearch}>
            <Search className="w-4 h-4" />
          </Button>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {search ? "没有匹配的记录" : "暂无生成记录，去首页创作吧"}
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm text-slate-500">
                          {platformLabels[item.platform] || item.platform}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {typeLabels[item.contentType] || item.contentType}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(item.createdAt)}
                        </span>
                      </div>
                      <h3 className="font-medium text-slate-900 truncate">
                        {item.topic}
                      </h3>
                      {item.preview && (
                        <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                          {item.preview}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-red-500 shrink-0"
                      onClick={() => handleDelete(item.id)}
                      disabled={deleting === item.id}
                    >
                      {deleting === item.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
