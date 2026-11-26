// Site-wide constants and the Chinese copy that goes with the data model in
// src/lib/categories.mjs. Nothing here is derived at runtime — it is all build
// time, so the pages are static files with no client-side config.

export const SITE_NAME = 'HelloTools';
export const SITE_URL = 'https://hellotools.distinctive.fun';
export const SITE_TAGLINE = '收录经得起用的开源工具';
export const SITE_DESCRIPTION =
  '一个讲究实用的开源工具导航：按用途分类整理 GitHub 上的开源软件与开发库，附活跃度、许可证与收录时间，只留你真会装的。';

export const REPO_URL = 'https://github.com/yuyu1025/hellotools';
export const DATA_SOURCE = 'https://hellogithub.com';

// Chinese labels for the categories declared in ./categories.mjs (which owns the
// ids, the health rules and the English blurbs used by the data scripts).
export const CATEGORY_COPY = {
  devtools: { label: '开发工具', blurb: '编辑器、终端、Git 界面、接口调试、包管理与代码检查。' },
  ai: { label: '人工智能', blurb: '本地模型、对话前端、图像与语音管线、可运行的 Agent 框架。' },
  media: { label: '影音图像', blurb: '播放器、剪辑、转码、录屏、直播与图像处理。' },
  network: { label: '网络', blurb: '代理、内网穿透、抓包、扫描、下载器，以及一切让字节流动的东西。' },
  privacy: { label: '隐私与自托管', blurb: '个人云、密码保险箱、加密笔记与反追踪。' },
  data: { label: '数据', blurb: '数据库、BI 看板、查询客户端、可视化与数据管道。' },
  productivity: { label: '效率', blurb: '笔记、文档、任务、邮件、日历、翻译与文献管理。' },
  desktop: { label: '桌面与系统', blurb: '窗口管理、启动器、文件管理、输入法与系统调优。' },
  sysops: { label: '运维部署', blurb: '容器、CI、监控告警、反向代理与自建基础设施。' },
  web: { label: 'Web 应用', blurb: '装在自己服务器上的网站：论坛、CMS、协作白板、短链与网盘。' },
  hardware: { label: '硬件与固件', blurb: '刷机固件、嵌入式工具链、IoT 网关、键盘与打印机固件。' },
  fun: { label: '有趣无用', blurb: '终端玩具、屏保、演示程序与生成艺术。就是为了好玩。' },
  library: { label: '开发库', blurb: '不直接运行，而是被 import 的代码：SDK、框架、解析器与语言工具。' },
};

export const STATE_COPY = {
  live: { label: '活跃', hint: '半年内有提交，issue 数量可控' },
  busy: { label: '繁忙', hint: '仍在维护，但 issue 堆积较多' },
  dormant: { label: '缓更', hint: '半年没有新提交' },
  stale: { label: '停更', hint: '一年以上没有新提交' },
  archived: { label: '已归档', hint: '作者已归档仓库，只读' },
};

export const NAV = [
  { href: '/tools', label: '全部工具' },
  { href: '/categories', label: '分类' },
  { href: '/recent', label: '新收录' },
  { href: '/about', label: '关于' },
];

// 「X 是一个 ___」用词，按分类给一个自然的名词。
export const SITE_NOUNS: Record<string, string> = {
  devtools: '面向开发者的工具',
  ai: '跑在本机或自己服务器上的 AI 工具',
  media: '影音图像类工具',
  network: '网络工具',
  privacy: '自托管 / 隐私类应用',
  data: '数据处理工具',
  productivity: '效率工具',
  desktop: '桌面端软件',
  sysops: '运维部署工具',
  web: '可以自己部署的 Web 应用',
  hardware: '硬件 / 固件项目',
  fun: '纯粹好玩的项目',
  library: '开发库',
};
