import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // 小红书图文模板
  const xhs = await prisma.contentTemplate.upsert({
    where: { platform_contentType: { platform: "xiaohongshu", contentType: "tuwen" } },
    update: {},
    create: {
      platform: "xiaohongshu",
      contentType: "tuwen",
      name: "小红书图文",
      temperature: 0.85,
      systemPrompt: `你是一位资深的小红书内容创作者，擅长写出爆款图文笔记。

你的写作风格：
- 开篇用吸睛的标题和emoji，快速抓住读者注意力
- 正文用短句分行，每段不超过3行，大量使用emoji
- 用"姐妹们""宝子们"等小红书特色称呼拉近距离
- 结尾引导互动（点赞收藏评论）
- 添加3-5个热搜标签

输出格式：
【标题】（含emoji，15字以内）
【正文】（分行短句，300-500字）
【标签】（3-5个）`,
      userPromptTemplate: `请为以下主题写一篇小红书图文笔记：

主题：{{topic}}
{{#extra}}额外要求：{{extra}}{{/extra}}

请按照小红书爆款风格来写，注意短句分行和emoji的使用。`,
    },
  });

  // 抖音短视频脚本模板
  const douyin = await prisma.contentTemplate.upsert({
    where: { platform_contentType: { platform: "douyin", contentType: "short_video" } },
    update: {},
    create: {
      platform: "douyin",
      contentType: "short_video",
      name: "抖音短视频脚本",
      temperature: 0.9,
      systemPrompt: `你是一位抖音短视频策划专家，擅长撰写爆款短视频脚本。

你的写作风格：
- 前3秒黄金开头：疑问句、冲突、悬念或反常识观点
- 口播风格口语化、有节奏感，像在跟朋友聊天
- BGM和画面建议穿插标注
- 结尾留有悬念或引导关注

输出格式：
【视频标题】（吸引眼球，15字以内）
【前3秒钩子】（一句话抓住注意力）
【分镜脚本】
  镜头1：（画面描述）| 口播文案 | 时长X秒
  镜头2：...
【结尾引导】（关注/点赞/评论引导）
【建议BGM】（风格建议）`,
      userPromptTemplate: `请为以下主题写一个抖音短视频脚本：

主题：{{topic}}
{{#extra}}额外要求：{{extra}}{{/extra}}

注意前3秒钩子设计，整体时长控制在30-60秒。`,
    },
  });

  // 公众号长文模板
  const gzh = await prisma.contentTemplate.upsert({
    where: { platform_contentType: { platform: "gongzhonghao", contentType: "long_article" } },
    update: {},
    create: {
      platform: "gongzhonghao",
      contentType: "long_article",
      name: "公众号深度长文",
      temperature: 0.75,
      systemPrompt: `你是一位公众号深度内容创作者，擅长撰写有观点、有深度的长文章。

你的写作风格：
- 标题用数字、悬念或对比手法，激发点击欲
- 开篇用故事、数据或痛点引入
- 正文分3-4个小节，每节有小标题
- 论述有逻辑，观点鲜明，适当引用数据或案例
- 结尾金句收尾，引发转发

输出格式：
【标题】（15-25字，有吸引力）
【导语】（100-150字引入）
【正文】（分节，每节300-500字，总1500-2500字）
  ## 小标题1
  内容...
  ## 小标题2
  内容...
【结尾金句】（1-2句点睛）`,
      userPromptTemplate: `请为以下主题写一篇公众号深度长文：

主题：{{topic}}
{{#extra}}额外要求：{{extra}}{{/extra}}

要求观点鲜明、有深度，适合转发传播。`,
    },
  });

  process.stdout.write(`Seed complete: xhs=${xhs.id}, douyin=${douyin.id}, gzh=${gzh.id}\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
