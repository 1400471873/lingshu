import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildPrompt } from "../prompt-builder";

// Mock prisma
vi.mock("../prisma", () => ({
  prisma: {
    contentTemplate: {
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from "../prisma";

describe("buildPrompt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("应正确替换模板中的 {{topic}} 占位符", async () => {
    const mockTemplate = {
      id: "1",
      platform: "xiaohongshu",
      contentType: "tuwen",
      name: "小红书图文",
      systemPrompt: "你是一个小红书博主",
      userPromptTemplate: "写一篇关于 {{topic}} 的笔记",
      temperature: 0.8,
    };

    (// eslint-disable-next-line @typescript-eslint/no-explicit-any
    prisma.contentTemplate.findUnique as any).mockResolvedValue(mockTemplate);

    const result = await buildPrompt("xiaohongshu", "tuwen", "减脂期怎么吃");

    expect(result.systemPrompt).toBe("你是一个小红书博主");
    expect(result.userPrompt).toBe("写一篇关于 减脂期怎么吃 的笔记");
    expect(result.temperature).toBe(0.8);
  });

  it("应在模板不存在时抛出错误", async () => {
    (// eslint-disable-next-line @typescript-eslint/no-explicit-any
    prisma.contentTemplate.findUnique as any).mockResolvedValue(null);

    await expect(
      buildPrompt("unknown", "unknown", "test")
    ).rejects.toThrow("未找到模板");
  });

  it("应替换所有出现的 {{topic}}", async () => {
    const mockTemplate = {
      id: "1",
      platform: "xiaohongshu",
      contentType: "tuwen",
      name: "小红书图文",
      systemPrompt: "sys",
      userPromptTemplate: "主题：{{topic}}\n再强调一遍：{{topic}}",
      temperature: 0.8,
    };

    (// eslint-disable-next-line @typescript-eslint/no-explicit-any
    prisma.contentTemplate.findUnique as any).mockResolvedValue(mockTemplate);

    const result = await buildPrompt("xiaohongshu", "tuwen", "减脂");

    expect(result.userPrompt).toBe("主题：减脂\n再强调一遍：减脂");
  });
});
