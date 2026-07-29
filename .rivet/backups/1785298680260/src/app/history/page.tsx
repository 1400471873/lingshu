"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Search, Trash2, ArrowLeft, Loader2, X, ExternalLink, Terminal } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface HistoryItem {
  id: string;
  topic: string;
  platform: string;
  contentType: string;
  preview: string;
  createdAt: string;
}

interface HistoryDetail {
  id: string;
  topic: string;
  platform: string;
  contentType: string;
  content: string;
  createdAt: string;
}

const platformLabels: Record<string, string> = {
  xiaohongshu: "小红书", douyin: "抖音", gongzhonghao: "公众号",
  weibo: "微博", bilibili: "B站", zhihu: "知乎",
};

const typeLabels: Record<string, string> = {
  tuwen: "图文", short_video: "短视频脚本", long_article: "长文",
  title: "标题", comment: "评论回复", live_script: "直播话术",
};

export default function HistoryPage() {
  const router = useRouter();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [detail, setDetail] = useState<HistoryDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchHistory = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("search", q);
      params.set("limit", "50");
      const res = await fetch(`/api/history?${params}`);
      const data = await res.json();
      setItems(data.list || []);
    } catch { setItems([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchHistory(""); }, [fetchHistory]);

  const handleSearch = () => fetchHistory(search);

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await fetch(`/api/history/${id}`, { method: "DELETE" });
      setItems((prev) => prev.filter((i) => i.id !== id));
      if (detail?.id === id) setDetail(null);
    } catch { /* ignore */ }
    finally { setDeleting(null); }
  };

  const handleViewDetail = async (id: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/history/${id}`);
      const data = await res.json();
      if (res.ok) setDetail(data);
    } catch { /* ignore */ }
    finally { setDetailLoading(false); }
  };

  const handleReuse = (item: HistoryDetail | HistoryItem) => {
    router.push(`/?topic=${encodeURIComponent(item.topic)}&platform=${item.platform}&type=${item.contentType}`);
  };

  const formatDate = (d: string) => new Date(d).toLocaleString("zh-CN", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <header className="h-12 border-b border-slate-800 bg-slate-900/80 backdrop-blur flex items-center px-4 shrink-0 z-10">
        <Link href="/">
          <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-200">
            <ArrowLeft className="w-4 h-4 mr-1" />返回
          </Button>
        </Link>
        <div className="flex items-center gap-2 ml-3">
          <Terminal className="w-4 h-4 text-amber-500" />
          <span className="font-semibold text-sm">历史记录</span>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
          {/* Search */}
          <div className="flex gap-2">
            <Input
              className="bg-slate-800/50 border-slate-700 text-slate-100 placeholder:text-slate-500"
              placeholder="搜索主题..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <Button variant="outline" onClick={handleSearch} className="border-slate-700 text-slate-400 hover:text-slate-200">
              <Search className="w-4 h-4" />
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              {search ? "没有匹配的记录" : "暂无生成记录，去首页创作吧"}
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <Card
                  key={item.id}
                  className="bg-slate-900 border-slate-800 hover:border-amber-500/30 transition-all cursor-pointer"
                  onClick={() => handleViewDetail(item.id)}
                >
                  <CardContent className="py-3 px-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs text-amber-400">{platformLabels[item.platform] || item.platform}</span>
                          <span className="text-xs text-slate-600">·</span>
                          <span className="text-xs text-slate-600">{typeLabels[item.contentType] || item.contentType}</span>
                          <span className="text-xs text-slate-600">{formatDate(item.createdAt)}</span>
                        </div>
                        <h3 className="text-sm font-medium text-slate-200 truncate">{item.topic}</h3>
                        {item.preview && (
                          <p className="text-xs text-slate-500 mt-1 line-clamp-1">{item.preview}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-slate-600 hover:text-red-400 shrink-0 h-7 w-7"
                        onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                        disabled={deleting === item.id}
                      >
                        {deleting === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {detail && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setDetail(null)}>
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <h3 className="font-medium text-sm text-slate-200 truncate">{detail.topic}</h3>
                <span className="text-xs text-amber-400 shrink-0">{platformLabels[detail.platform]}</span>
                <span className="text-xs text-slate-600">{typeLabels[detail.contentType]}</span>
              </div>
              <div className="flex items-center gap-1 ml-2 shrink-0">
                <Button variant="ghost" size="sm" className="text-xs text-slate-400 hover:text-slate-200" onClick={() => handleReuse(detail)}>
                  <ExternalLink className="w-3.5 h-3.5 mr-1" />复用
                </Button>
                <Button variant="ghost" size="sm" className="text-xs text-slate-500 hover:text-slate-300" onClick={() => setDetail(null)}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
            <div className="overflow-y-auto p-5 flex-1 prose-result max-w-none text-sm">
              {detailLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-slate-500" /></div>
              ) : (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{detail.content}</ReactMarkdown>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
