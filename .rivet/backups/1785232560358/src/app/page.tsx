"use client";

import { useState } from "react";
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
import { Sparkles, Copy, RefreshCw } from "lucide-react";

const platforms = [
  { value: "xiaohongshu", label: "📕 小红书" },
  { value: "douyin", label: "🎵 抖音" },
  { value: "gongzhonghao", label: "💬 公众号" },
  { value: "weibo", label: "🔵 微博" },
];

const contentTypes = [
  { value: "tuwen", label: "图文文案" },
  { value: "short_video", label: "短视频脚本" },
  { value: "long_article", label: "长文" },
];

export default function Home() {
  const [topic, setTopic] = useState("");
  const [platform, setPlatform] = useState("xiaohongshu");
  const [contentType, setContentType] = useState("tuwen");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setError("");
    setResult("");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim(), platform, contentType }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "生成失败");
      }

      setResult(data.content);
    } catch (err) {
      setError(err instanceof Error ? err.message : "未知错误");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
                <Select value={platform} onValueChange={(v) => setPlatform(v)}>
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
                <Select value={contentType} onValueChange={(v) => setContentType(v)}>
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
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
              >
                <Copy className="w-4 h-4 mr-1" />
                {copied ? "已复制" : "复制"}
              </Button>
            </CardHeader>
            <Separator />
            <CardContent className="py-6">
              <div className="prose prose-slate max-w-none whitespace-pre-wrap text-sm leading-relaxed">
                {result}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
