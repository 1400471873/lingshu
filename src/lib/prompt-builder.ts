import { prisma } from "./prisma";

export interface BuiltPrompt {
  systemPrompt: string;
  userPrompt: string;
  temperature: number;
}

/**
 * 根据平台和内容类型构建 prompt。
 * 从数据库读取模板，用 topic 替换占位符 {{topic}}。
 */
export async function buildPrompt(
  platform: string,
  contentType: string,
  topic: string
): Promise<BuiltPrompt> {
  const template = await prisma.contentTemplate.findUnique({
    where: {
      platform_contentType: { platform, contentType },
    },
  });

  if (!template) {
    throw new Error(
      `未找到模板: platform=${platform}, contentType=${contentType}`
    );
  }

  const userPrompt = template.userPromptTemplate.replace(
    /\{\{topic\}\}/g,
    topic
  );

  return {
    systemPrompt: template.systemPrompt,
    userPrompt,
    temperature: template.temperature,
  };
}
