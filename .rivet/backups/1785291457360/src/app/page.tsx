"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Terminal, Clock, Send, Copy, Download, Pencil, Check, X, PanelLeftClose, PanelLeft, RefreshCw } from "lucide-react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const platforms = [
  { value: "xiaohongshu", label: "小红书", emoji: "📕" },
  { value: "douyin", label: "抖音", emoji: "🎵" },
  { value: "gongzhonghao", label: "公众号", emoji: "💬" },
  { value: "weibo", label: "微博", emoji: "🔵" },
  { value: "bilibili", label: "B站", emoji: "📺" },
  { value: "zhihu", label: "知乎", emoji: "🤔" },
];

const contentTypes = [
  { value: "tuwen", label: "图文文案" },
  { value: "short_video", label: "短视频脚本" },
  { value: "long_article", label: "长文" },
  { value: "title", label: "爆款标题" },
  { value: "comment", label: "评论区回复" },
  { value: "live_script", label: "直播话术" },
];

const models = [
  { value: "deepseek-chat", label: "DeepSeek V3" },
  { value: "deepseek-reasoner", label: "DeepSeek R1" },
];

export default function Home() {
  const [topic, setTopic] = useState("");
  const [platform, setPlatform] = useState("xiaohongshu");
  const [contentType, setContentType] = useState("tuwen");
  const [model, setModel] = useState("deepseek-chat");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [mounted, setMounted] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);
  useEffect(() => { setMounted(true); }, []);

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setError("");
    setResult("");
    setIsEditing(false);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim(), platform, contentType, model }),
      });
      if (!res.ok) { const errData = await res.json(); throw new Error(errData.error || "生成失败"); }
      const reader = res.body?.getReader();
      if (!reader) throw new Error("无法读取响应流");
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;
          try {
            const parsed = JSON.parse(trimmed.slice(6));
            if (parsed.error) throw new Error(parsed.error);
            if (parsed.done) setGenerationId(parsed.id);
            else if (parsed.delta) setResult((prev) => prev + parsed.delta);
          } catch (e) { if (e instanceof SyntaxError) continue; throw e; }
        }
      }
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "未知错误");
    } finally { setLoading(false); }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(isEditing ? editContent : result);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = () => {
    const content = isEditing ? editContent : result;
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${topic.trim().slice(0, 20) || "灵枢文案"}.md`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleStartEdit = () => { setEditContent(result); setIsEditing(true); };
  const handleCancelEdit = () => { setIsEditing(false); };
  const handleSaveEdit = async () => {
    if (!generationId) return;
    try {
      const res = await fetch(`/api/history/${generationId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: editContent }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(editContent); setIsEditing(false);
    } catch (err) { setError(err instanceof Error ? err.message : "保存失败"); }
  };

  if (!mounted) return null;

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* ===== HEADER ===== */}
      <header className="h-12 border-b border-slate-800 bg-slate-900/80 backdrop-blur flex items-center px-4 shrink-0 z-10">
        <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-200" onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
        </Button>
        <div className="flex items-center gap-2 ml-2">
          <Terminal className="w-4 h-4 text-amber-500" />
          <span className="font-semibold text-sm">灵枢</span>
          <span className="text-xs text-slate-600">v1.0</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Link href="/history">
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-200 text-xs">
              <Clock className="w-3.5 h-3.5 mr-1" />历史
            </Button>
          </Link>
        </div>
      </header>

      {/* ===== BODY ===== */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className={`${sidebarOpen ? "w-56" : "w-0"} border-r border-slate-800 bg-slate-900/50 overflow-y-auto shrink-0 transition-all duration-200`}>
          {sidebarOpen && (
            <div className="p-3 space-y-5">
              {/* Platform */}
              <div>
                <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2 px-1">平台</h3>
                <div className="space-y-0.5">
                  {platforms.map((p) => (
                    <button
                      key={p.value}
                      onClick={() => setPlatform(p.value)}
                      className={`w-full text-left px-3 py-1.5 rounded text-sm transition-colors ${
                        platform === p.value
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                          : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                      }`}
                    >
                      <span className="mr-2">{p.emoji}</span>{p.label}
                    </button>
                  ))}
                </div>
              </div>

              <Separator className="bg-slate-800" />

              {/* Content Type */}
              <div>
                <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2 px-1">内容类型</h3>
                <div className="space-y-0.5">
                  {contentTypes.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setContentType(c.value)}
                      className={`w-full text-left px-3 py-1.5 rounded text-sm transition-colors ${
                        contentType === c.value
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                          : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <Separator className="bg-slate-800" />

              {/* Model */}
              <div>
        
