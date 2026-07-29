"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Sparkles, Copy, RefreshCw, Pencil, Check, X, Clock, Download, Terminal } from "lucide-react";
import Link from "next/link";

const platforms = [
  { value: "xiaohongshu", label: "小红书" },
  { value: "douyin", label: "抖音" },
  { value: "gongzhonghao", label: "公众号" },
  { value: "weibo", label: "微博" },
  { value: "bilibili", label: "B站" },
  { value: "zhihu", label: "知乎" },
];

const contentTypes = [
  { value: "tuwen", label: "图文文案" },
  { value: "short_video", label: "短视频脚本" },
  { value: "long_article", label: "长文" },
  { value: "title", label: "爆款标题" },
  { value: "comment", label: "评论区回复" },
  { value: "live_script", label: "直播话术" },
];

export default function Home() {
  const [topic, setTopic] = useState("");
  const [platform, setPlatform] = useState("xiaohongshu");
  const [contentType, setContentType] = useState("tuwen");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [model, setModel] = useState("deepseek-chat");
  const [mounted, setMounted] = useState(false);
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
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "生成失败");
      }
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
          const jsonStr = trimmed.slice(6);
          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.error) throw new Error(parsed.error);
            if (parsed.done) setGenerationId(parsed.id);
            else if (parsed.delta) setResult((prev) => prev + parsed.delta);
          } catch (e) {
            if (e instanceof SyntaxError) continue;
            throw e;
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "未知错误");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(isEditing ? editContent : result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStartEdit = () => { setEditContent(result); setIsEditing(true); };
  const handleCancelEdit = () => { setIsEditing(false); setEditContent(""); };

  const handleSaveEdit = async () => {
    if (!generationId) return;
    try {
      const res = await fetch(`/api/history/${generationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editContent }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(editContent);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    }
  };

  const handleExportMarkdown = () => {
    const content = isEditing ? editContent : result;
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${topic.trim().slice(0, 20) || "灵枢文案"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const platformLabel = platforms.find((p) => p.value === platform)?.label || "";
  const ctLabel = contentTypes.find((c) => c.value === contentType)?.label || "";

  if (!mounted) return null;

  return (
    <div className="min-h-screen">
      {/* === HEADER === */}
      <header className="border-b border-border/50 bg-card/60 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-glow/20 flex items-center justify-center">
              <Terminal className="w-4 h-4 text-primary" />
            </div>
            <span className="font-bold text-base tracking-tight">
              灵枢
              <span className="text-muted-foreground font-normal text-xs ml-1.5">v1.0</span>
            </span>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <Link href="/history">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground text-xs">
                <Clock className="w-3.5 h-3.5 mr-1" />
                历史
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* === MAIN === */}
      <main className="max-w-4xl mx-auto px-4 py-12 space-y-8">
        {/* Hero */}
        <div className="text-center space-y-3 mb-4">
          <h1 className="text-3xl font-bold tracking-tight">
            AI 内容<span className="text-primary glow-text">引擎</span>
          </h1>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            输入主题，选择平台，一键生成适配风格的文案和脚本
          </p>
        </div>

        {/* === INPUT CARD === */}
        <Card className="bg-card/80 border-border/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <span className="text-primary font-mono text-xs">&gt;_</span>
              输入生成参数
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Topic */}
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-mono">
                $ topic
              </label>
              <Textarea
                placeholder="减脂期怎么吃食堂 · 社恐怎么破冰 · 租房避坑指南 ..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                rows={3}
                className="resize-none bg-input/50 border-border/50 font-mono text-sm placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleGenerate();
                }}
              />
            </div>

            {/* Platform + ContentType */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-mono">
                  $ platform
                </label>
                <Select value={platform} onValueChange={(v) => v && setPlatform(v)}>
                  <SelectTrigger className="bg-input/50 border-border/50 font-mono text-sm h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border/50">
                    {platforms.map((p)
