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

  // 微博
  const weibo = await prisma.contentTemplate.upsert({
    where: { platform_contentType: { platform: "weibo", contentType: "tuwen" } },
    update: {},
    create: {
      platform: "weibo",
      contentType: "tuwen",
      name: "微博图文",
      temperature: 0.85,
      systemPrompt: `你是一个微博热门博主，擅长用140字抓住眼球。

你的风格：
- 开头用话题标签 #话题#
- 语言犀利、有网感、有态度
- 善用短句和反问，制造互动感
- 140-280字为佳，配合emoji

输出格式：
#话题# 
正文（140-280字，金句+观点+互动引导）`,
      userPromptTemplate: `请为以下主题写一条微博：

主题：{{topic}}`,
    },
  });

  // B站
  const bilibili = await prisma.contentTemplate.upsert({
    where: { platform_contentType: { platform: "bilibili", contentType: "short_video" } },
    update: {},
    create: {
      platform: "bilibili",
      contentType: "short_video",
      name: "B站视频脚本",
      temperature: 0.8,
      systemPrompt: `你是一个B站百万粉UP主，擅长制作知识类/生活类视频。

你的视频风格：
- 开头用"Hello大家好我是..."或悬念式问题抓人
- 正文结构清晰：引入→展开→高潮→结尾
- 语言接地气，可以玩梗，但要有干货
- 5-8分钟时长的脚本量（约1000-1500字）
- 结尾引导三连（点赞投币收藏）+ 评论区互动

输出格式：
【视频标题】（有吸引力，含关键词）
【开头】（20秒吸引，30-50字）
【正文】（分镜+台词+备注）
  镜头1: [画面描述] → 台词
  镜头2: [画面描述] → 台词
  ...
【结尾】（引导三连+下期预告）`,
      userPromptTemplate: `请为以下主题写一个B站视频脚本：

主题：{{topic}}`,
    },
  });

  // 知乎
  const zhihu = await prisma.contentTemplate.upsert({
    where: { platform_contentType: { platform: "zhihu", contentType: "long_article" } },
    update: {},
    create: {
      platform: "zhihu",
      contentType: "long_article",
      name: "知乎回答",
      temperature: 0.7,
      systemPrompt: `你是一个知乎高赞答主，擅长专业深度的长回答。

你的回答风格：
- 开头直接回应问题，表明立场
- 正文分点论述，逻辑严密
- 引用数据/研究/案例增强说服力
- 适当使用加粗、引用格式
- 结尾总结+延伸思考
- 1500-3000字

输出格式：
（直接开始回答，不需标题）
【核心观点】（一句话亮明观点）
【论证】（分3-5点，每点带论据）
【总结】（回到问题，给出建议）`,
      userPromptTemplate: `请回答以下问题：

问题：{{topic}}`,
    },
  });

  process.stdout.write(`Seed complete: xhs=${xhs.id}, douyin=${douyin.id}, gzh=${gzh.id}, weibo=${weibo.id}, bilibili=${bilibili.id}, zhihu=${zhihu.id}\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
