const DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1";
const MAX_RETRIES = 2;

interface ChatMessage {
  role: "system" | "user";
  content: string;
}

interface ChatCompletionResponse {
  choices: Array<{
    message: { content: string };
  }>;
}

/**
 * DeepSeek API 客户端（兼容 OpenAI 格式）。
 * 封装调用、错误处理和重试逻辑。
 */
export async function generateWithDeepSeek(
  systemPrompt: string,
  userPrompt: string,
  temperature: number = 0.8
): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey || apiKey === "your_key_here") {
    throw new Error(
      "未配置 DEEPSEEK_API_KEY。请将 .env.example 复制为 .env.local 并填入你的 API Key。"
    );
  }

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages,
          temperature,
          max_tokens: 2048,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `DeepSeek API 返回错误 ${response.status}: ${errorBody}`
        );
      }

      const data: ChatCompletionResponse = await response.json();
      return data.choices[0]?.message?.content ?? "";
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < MAX_RETRIES) {
        // 等待后重试
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }

  throw lastError ?? new Error("DeepSeek API 调用失败");
}
