"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Terminal, Clock, Send, Copy, Download, Pencil, Check, X, PanelLeftClose, PanelLeft, RefreshCw, Search, Sparkles, User, Plus, Trash2 } from "lucide-react";
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<"generate" | "analyze" | "style">("generate");
  const [analyzeInput, setAnalyzeInput] = useState("");
  const [analyzeResult, setAnalyzeResult] = useState<any>(null);
  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  const [styles, setStyles] = useState<any[]>([]);
  const [styleName, setStyleName] = useState("");
  const [styleSamples, setStyleSamples] = useState("");
  const [selectedStyleId, setSelectedStyleId] = useState<string | null>(null);
  const [styleProfile, setStyleProfile] = useState<any>(null);
  const [styleLoading, setStyleLoading] = useState(false);
  const [stylesLoaded, setStylesLoaded] = useState(false);


  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (stylesLoaded) return;
    fetch("/api/style").then(r => r.json()).then(data => {
      setStyles(data.styles || []);
      setStylesLoaded(true);
    }).catch(() => {});
  }, [stylesLoaded]);

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
        body: JSON.stringify({ topic: topic.trim(), platform, contentType, model, styleId: selectedStyleId }),
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
          try {
            const parsed = JSON.parse(trimmed.slice(6));
            if (parsed.error) throw new Error(parsed.error);
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
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "未知错误");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    const content = isEditing ? editContent : result;
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = () => {
    const content = isEditing ? editContent : result;
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = (topic.trim().slice(0, 20) || "灵枢文案") + ".md";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleStartEdit = () => {
    setEditContent(result);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    if (!generationId) return;
    try {
      const res = await fetch("/api/history/" + generationId, {
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


  const handleCreateStyle = async () => {
    if (!styleName.trim() || !styleSamples.trim()) return;
    setStyleLoading(true);
    const samples = styleSamples.split("\n").filter(s => s.trim());
    if (samples.length < 1) { setError("请至少提供1条文案样本"); setStyleLoading(false); return; }
    try {
      // 先提取风格画像
      const extractRes = await fetch("/api/style/extract", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ samples }),
      });
      const profile = await extractRes.json();
      if (!extractRes.ok) throw new Error(profile.error);
      setStyleProfile(profile);
      // 再创建保存
      const res = await fetch("/api/style", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: styleName.trim(), samples }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStyles(prev => [{ ...data, profile, createdAt: new Date().toISOString() }, ...prev]);
      setStyleName(""); setStyleSamples("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建失败");
    } finally { setStyleLoading(false); }
  };
  const handleDeleteStyle = async (id: string) => {
    await fetch("/api/style", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setStyles(prev => prev.filter(s => s.id !== id));
    if (selectedStyleId === id) setSelectedStyleId(null);
  };

  const handleAnalyze = async () => {
    if (!analyzeInput.trim() || analyzeInput.trim().length < 10) {
      setError("请至少输入 10 字的文案内容");
      return;
    }
    setAnalyzeLoading(true);
    setError("");
    setAnalyzeResult(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: analyzeInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAnalyzeResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "分析失败");
    } finally { setAnalyzeLoading(false); }
  };

  if (!mounted) return null;

  const platformInfo = platforms.find((p) => p.value === platform);
  const ctInfo = contentTypes.find((c) => c.value === contentType);
  const modelInfo = models.find((m) => m.value === model);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* HEADER */}
      <header className="h-12 border-b border-slate-800 bg-slate-900/80 backdrop-blur flex items-center px-4 shrink-0 z-30">
        <Button
          variant="ghost"
          size="sm"
          className="text-slate-400 hover:text-slate-200"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
        </Button>
        <div className="flex items-center gap-2 ml-2">
          <Terminal className="w-4 h-4 text-amber-500" />
          <span className="font-semibold text-sm">灵枢</span>
          <span className="text-xs text-slate-600">v1.0</span>
        </div>
        <div className="flex items-center gap-0.5 ml-4 bg-slate-800/50 rounded-lg p-0.5">
          <button
            onClick={() => setTab("generate")}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              tab === "generate" ? "bg-amber-500/20 text-amber-400" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Sparkles className="w-3 h-3 inline mr-1" />生成
          </button>
          <button
            onClick={() => setTab("analyze")}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              tab === "analyze" ? "bg-amber-500/20 text-amber-400" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Search className="w-3 h-3 inline mr-1" />拆解
          </button>
          <button
            onClick={() => setTab("style")}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              tab === "style" ? "bg-amber-500/20 text-amber-400" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <User className="w-3 h-3 inline mr-1" />风格
          </button>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Link href="/history">
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-200 text-xs">
              <Clock className="w-3.5 h-3.5 mr-1" />历史
            </Button>
          </Link>
        </div>
      </header>

      {/* BODY */}
      <div className="flex-1 flex overflow-hidden">
        {/* Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/60 z-10 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* SIDEBAR */}
        <aside
          className={`${
            sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          } fixed lg:relative inset-y-0 left-0 z-20 lg:z-0 w-56 border-r border-slate-800 bg-slate-950 lg:bg-slate-900/50 overflow-y-auto shrink-0 transition-transform duration-200`}
        >
          <div className="p-3 space-y-5 pt-14 lg:pt-3">
            {/* Platform */}
            <div>
              <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2 px-1">平台</h3>
              <div className="space-y-0.5">
                {platforms.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => setPlatform(p.value)}
                    className={
                      "w-full text-left px-3 py-1.5 rounded text-sm transition-colors " +
                      (platform === p.value
                        ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50")
                    }
                  >
                    <span className="mr-2">{p.emoji}</span>
                    {p.label}
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
                    className={
                      "w-full text-left px-3 py-1.5 rounded text-sm transition-colors " +
                      (contentType === c.value
                        ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50")
                    }
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <Separator className="bg-slate-800" />

            {/* Model */}
            <div>
              <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2 px-1">模型</h3>
              <div className="space-y-0.5">
                {models.map((m) => (
                  <button
                    key={m.value}
                    onClick={() => setModel(m.value)}
                    className={
                      "w-full text-left px-3 py-1.5 rounded text-sm transition-colors " +
                      (model === m.value
                        ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50")
                    }
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <Separator className="bg-slate-800" />

            {/* Style */}
            <div>
              <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2 px-1">风格（可选）</h3>
              <div className="space-y-0.5">
                <button
                  onClick={() => setSelectedStyleId(null)}
                  className={
                    "w-full text-left px-3 py-1.5 rounded text-sm transition-colors " +
                    (!selectedStyleId
                      ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50")
                  }
                >
                  不使用风格
                </button>
                {styles.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedStyleId(s.id)}
                    className={
                      "w-full text-left px-3 py-1.5 rounded text-sm transition-colors " +
                      (selectedStyleId === s.id
                        ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50")
                    }
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* MAIN */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
            {tab === "generate" && (<>
            {/* INPUT AREA */}
            <div className="space-y-4">
              <div className="text-center space-y-1 mb-6">
                <h1 className="text-2xl font-bold tracking-tight">
                  AI 内容<span className="text-amber-400">引擎</span>
                </h1>
                <p className="text-sm text-slate-500">输入主题，选择平台，一键生成适配风格的文案</p>
              </div>

              <div className="relative">
                <Textarea
                  placeholder="输入你的主题或关键词，例如：减脂期怎么吃食堂、社恐如何破冰、租房避坑指南..."
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  rows={4}
                  className="resize-none bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-600 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 rounded-xl text-base py-4 px-5"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleGenerate();
                  }}
                />
                <div className="absolute bottom-3 right-3 flex items-center gap-2">
                  <span className="text-xs text-slate-600 mr-1">Ctrl+Enter</span>
                  <Button
                    onClick={handleGenerate}
                    disabled={!topic.trim() || loading}
                    size="sm"
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-medium rounded-lg"
                  >
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              {/* Selected params */}
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  {platformInfo?.emoji} {platformInfo?.label}
                </span>
                <span>&middot;</span>
                <span>{ctInfo?.label}</span>
                <span>&middot;</span>
                <span>{modelInfo?.label}</span>
                {selectedStyleId && (
                  <>
                    <span>&middot;</span>
                    <span className="text-amber-400">{styles.find(s => s.id === selectedStyleId)?.name || "风格"}</span>
                  </>
                )}
              </div>
            </div>

            {/* ERROR */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* LOADING */}
            {loading && !result && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
                <div className="inline-flex items-center gap-2 text-slate-500">
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-500" />
                  正在生成...
                </div>
              </div>
            )}

            {/* RESULT */}
            {result && (
              <div ref={resultRef} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-slate-900/50">
                  <span className="text-xs text-slate-500 font-medium">生成结果</span>
                  <div className="flex items-center gap-1">
                    {isEditing ? (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleSaveEdit}
                          className="h-7 text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                        >
                          <Check className="w-3.5 h-3.5 mr-1" />保存
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCancelEdit}
                          className="h-7 text-xs text-slate-500 hover:text-slate-300"
                        >
                          <X className="w-3.5 h-3.5 mr-1" />取消
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleStartEdit}
                          className="h-7 text-xs text-slate-500 hover:text-slate-300"
                        >
                          <Pencil className="w-3.5 h-3.5 mr-1" />编辑
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCopy}
                          className="h-7 text-xs text-slate-500 hover:text-slate-300"
                        >
                          <Copy className="w-3.5 h-3.5 mr-1" />
                          {copied ? "已复制" : "复制"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleExport}
                          className="h-7 text-xs text-slate-500 hover:text-slate-300"
                        >
                          <Download className="w-3.5 h-3.5 mr-1" />导出
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                <div className="p-6">
                  {isEditing ? (
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="min-h-96 font-mono text-sm bg-slate-950 border-slate-700 text-slate-100 resize-none"
                    />
                  ) : (
                    <div className="prose-result max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="h-12" />
            </>)}

            {tab === "analyze" && (<>
            <div className="space-y-4">
              <div className="text-center space-y-1 mb-6">
                <h1 className="text-2xl font-bold tracking-tight">
                  爆款<span className="text-amber-400">拆解</span>
                </h1>
                <p className="text-sm text-slate-500">粘贴一篇爆款文案，AI 分析它的结构和套路</p>
              </div>
              <Textarea
                placeholder="粘贴链接或文案（公众号/知乎直接抓，小红书请手动复制文本）..."
                value={analyzeInput}
                onChange={(e) => setAnalyzeInput(e.target.value)}
                rows={8}
                className="resize-none bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-600 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 rounded-xl text-sm py-4 px-5"
              />
              <Button onClick={handleAnalyze} disabled={analyzeLoading || analyzeInput.trim().length < 10}
                className="w-full bg-amber-500/10 border border-amber-500/40 text-amber-400 hover:bg-amber-500/20 font-mono text-sm">
                {analyzeLoading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                {analyzeLoading ? "分析中..." : "拆解分析"}
              </Button>
            </div>
            {analyzeResult && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden mt-6">
              <div className="p-5 space-y-4 text-sm">
                <div><span className="text-amber-400 font-medium">标题公式：</span><span className="text-slate-300">{analyzeResult.titleFormula}</span></div>
                <div><span className="text-amber-400 font-medium">正文结构：</span><span className="text-slate-300 whitespace-pre-wrap">{analyzeResult.structure}</span></div>
                <div><span className="text-amber-400 font-medium">关键词：</span><span className="text-slate-300">{analyzeResult.keywords?.join(" · ")}</span></div>
                <div><span className="text-amber-400 font-medium">语气风格：</span><span className="text-slate-300">{analyzeResult.tone}</span></div>
                <div><span className="text-amber-400 font-medium">钩子：</span><span className="text-slate-300">{analyzeResult.hooks?.join(" | ")}</span></div>
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
                  <span className="text-amber-400 font-medium">可复用建议：</span><span className="text-slate-300 whitespace-pre-wrap">{analyzeResult.suggestions}</span>
                </div>
              </div>
            </div>
            )}
            <div className="h-12" />
            </>)}
            {tab === "style" && (<>
            <div className="space-y-4">
              <div className="text-center space-y-1 mb-6">
                <h1 className="text-2xl font-bold tracking-tight">
                  风格<span className="text-amber-400">克隆</span>
                </h1>
                <p className="text-sm text-slate-500">上传你的历史文案，AI 学习你的写作风格</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-mono">风格名称</label>
                <input value={styleName} onChange={(e) => setStyleName(e.target.value)}
                  placeholder="例如：我的小红书风格"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-amber-500/50 focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-mono">文案链接（每行一个）</label>
                <Textarea value={styleSamples} onChange={(e) => setStyleSamples(e.target.value)}
                  placeholder="粘贴你的小红书/公众号文章链接，每行一个..."
                  rows={10}
                  className="resize-none bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-600 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 rounded-xl text-sm py-4 px-5"
                />
              </div>
                <Button onClick={handleCreateStyle} disabled={styleLoading || !styleName.trim() || styleSamples.trim().split("\n").filter((s: string) => s.trim()).length < 1}
                className="w-full bg-amber-500/10 border border-amber-500/40 text-amber-400 hover:bg-amber-500/20 font-mono text-sm">
                <Plus className="w-4 h-4 mr-2" />
                {styleLoading ? "提取中..." : "提取风格"}
              </Button>
              {styles.length > 0 && (
              <div className="space-y-3 mt-6">
                <h3 className="text-sm font-medium text-slate-400">已保存的风格</h3>
                {styles.map((s: any) => (
                  <div key={s.id} className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-slate-200">{s.name}</span>
                      <span className="text-xs text-slate-500 ml-2">{new Date(s.createdAt).toLocaleDateString("zh-CN")}</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteStyle(s.id)}
                      className="text-slate-500 hover:text-red-400 h-7">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
              )}
            </div>
            <div className="h-12" />
            </>)}

          </div>
        </main>
      </div>
    </div>
  );
}
