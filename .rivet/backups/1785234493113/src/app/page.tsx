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
import { Sparkles, Copy, RefreshCw, Pencil, Check, X, Clock, Moon, Sun, Download } from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";

const platforms = [
  { value: "xiaohongshu", label: "📕 小红书" },
  { value: "douyin", label: "🎵 抖音" },
  { value: "gongzhonghao", label: "💬 公众号" },
  { value: "weibo", label: "🔵 微博" },
  { value: "bilibili", label: "📺 B站" },
  { value: "zhihu", label: "🤔 知乎" },
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
  const { setTheme, resolvedTheme } = useTheme();

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
        body: JSON.stringify({ topic: topic.trim(), platform, contentType }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "生成失败");
      }

      // 消费 SSE 流
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
            if (parsed.error) {
              throw new Error(parsed.error);
            }
            if (parsed.done) {
              setGenerationId(parsed.id);
            } else if (parsed.delta) {
              setResult((prev) => prev + parsed.delta);
            }
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

  const handleStartEdit = () => {
    setEditContent(result);
    setIsEditing(true);
    setIsEditing(true);
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

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent("");
  };

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

  const platformLabel = platforms.find((p) => p.value === platform)?.label || "";
  const ctLabel = contentTypes.find((c) => c.value === contentType)?.label || "";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Sparkles className="w-6 h-6 text-indigo-600" />
          <h1 className="text-xl font-bold text-slate-900">灵枢</h1>
          <span className="text-sm text-slate-500">AI 自媒体内容生产</span>
          <div className="ml-auto">
            <Link href="/history">
              <Button variant="ghost" size="sm">
                <Clock className="w-4 h-4 mr-1" />
                历史记录
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Input Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">创作你的内容</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Topic */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                主题 / 关键词
              </label>
              <Textarea
                placeholder="例如：减脂期怎么吃食堂、社恐怎么破冰、租房避坑指南..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                rows={3}
                className="resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                    handleGenerate();
                  }
                }}
              />
            </div>

            {/* Platform + ContentType */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  目标平台
                </label>
                <Select value={platform} onValueChange={(v) => v && setPlatform(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {platforms.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  内容类型
                </label>
                <Select value={contentType} onValueChange={(v) => v && setContentType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {contentTypes.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Generate Button */}
            <Button
              onClick={handleGenerate}
              disabled={!topic.trim() || loading}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  开始生成
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Error */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="py-4 text-red-700 text-sm">{error}</CardContent>
          </Card>
        )}

        {/* Result */}
        {result && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">
                生成结果 · {platformLabel} · {ctLabel}
              </CardTitle>
              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <Button variant="outline" size="sm" onClick={handleSaveEdit}>
                      <Check className="w-4 h-4 mr-1" />
                      保存
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                      <X className="w-4 h-4 mr-1" />
                      取消
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" size="sm" onClick={handleStartEdit}>
                      <Pencil className="w-4 h-4 mr-1" />
                      编辑
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleCopy}>
                      <Copy className="w-4 h-4 mr-1" />
                      {copied ? "已复制" : "复制"}
                    </Button>
                  </>
                )}
              </div>
            </CardHeader>
            <Separator />
            <CardContent className="py-6">
              {isEditing ? (
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="min-h-64 font-mono text-sm"
                />
              ) : (
                <div className="prose prose-slate max-w-none whitespace-pre-wrap text-sm leading-relaxed">
                  {result}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
