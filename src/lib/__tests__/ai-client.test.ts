import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock process.env and global fetch
beforeEach(() => {
  vi.stubEnv("DEEPSEEK_API_KEY", "sk-test-key");
  vi.restoreAllMocks();
});

describe("generateWithDeepSeek", () => {
  it("应正确调用 DeepSeek API 并返回内容", async () => {
    // Dynamic import to pick up env after stub
    const { generateWithDeepSeek } = await import("../ai-client");

    const mockResponse = {
      choices: [{ message: { content: "这是生成的文案内容" } }],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await generateWithDeepSeek("sys", "user", 0.8);

    expect(result).toBe("这是生成的文案内容");
    expect(global.fetch).toHaveBeenCalledTimes(1);

    const callArgs = (// eslint-disable-next-line @typescript-eslint/no-explicit-any
    global.fetch as any).mock.calls[0];
    const body = JSON.parse(callArgs[1].body);
    expect(body.model).toBe("deepseek-chat");
    expect(body.messages).toHaveLength(2);
  });

  it("应在 API Key 未配置时抛出错误", async () => {
    vi.stubEnv("DEEPSEEK_API_KEY", "");
    const { generateWithDeepSeek } = await import("../ai-client");

    await expect(
      generateWithDeepSeek("sys", "user")
    ).rejects.toThrow("未配置 DEEPSEEK_API_KEY");
  });

  it("应在 API 返回错误时重试", async () => {
    vi.stubEnv("DEEPSEEK_API_KEY", "sk-test");
    const { generateWithDeepSeek } = await import("../ai-client");

    let callCount = 0;
    global.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount < 3) {
        return Promise.resolve({
          ok: false,
          status: 500,
          text: () => Promise.resolve("Server Error"),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [{ message: { content: "重试后成功" } }],
          }),
      });
    });

    const result = await generateWithDeepSeek("sys", "user");
    expect(result).toBe("重试后成功");
    expect(callCount).toBe(3);
  }, 10000);
});
