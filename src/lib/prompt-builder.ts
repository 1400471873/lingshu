import { getTemplate, ensureTables } from "./db";

export interface BuiltPrompt {
  systemPrompt: string;
  userPrompt: string;
  temperature: number;
}

export async function buildPrompt(
  platform: string,
  contentType: string,
  topic: string
): Promise<BuiltPrompt> {
  await ensureTables();
  const template = await getTemplate(platform, contentType);

  if (!template) {
    throw new Error(
      `未找到模板: platform=${platform}, contentType=${contentType}`
    );
  }

  const t = template as any;
  const userPrompt = (t.userPromptTemplate as string).replace(
    /\{\{topic\}\}/g,
    topic
  );

  return {
    systemPrompt: t.systemPrompt as string,
    userPrompt,
    temperature: t.temperature as number,
  };
}
