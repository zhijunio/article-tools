/* ============================================================
   样式预设库
   每个预设是一个"修饰函数"，接收 base style 对象并返回修改后的版本
   或者直接定义样式片段，在 renderer 中被合并
   ============================================================ */

window.PRESETS = {

  // ============ 全局 ============
  global: {
    fontFamily: [
      { id: 'serif-zh',  name: '书卷衬线', value: "'PingFang SC', 'Songti SC', 'Source Han Serif SC', 'Noto Serif CJK SC', serif" },
      { id: 'sans-zh',   name: '现代无衬线', value: "-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Helvetica Neue', sans-serif" },
      { id: 'fangsong',  name: '仿宋文艺', value: "'FangSong', 'STFangsong', '仿宋', serif" },
      { id: 'kaiti',     name: '楷体雅致', value: "'KaiTi', 'STKaiti', '楷体', serif" },
      { id: 'mixed',     name: '中西混排', value: "'Source Serif Pro', Georgia, 'PingFang SC', serif" },
      { id: 'rounded',   name: '圆润亲和', value: "'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif" },
    ],
  },

  // ============ H1（文题最粗 800，与 H2/700 拉开字重层）===========
  h1: [
    { id: 'plain',       name: '素净居中', style: 'text-align:center; font-size:{fs}px; font-weight:800; color:{c}; margin:28px 0 20px; line-height:1.4;' },
    { id: 'underline',   name: '下划装饰', style: 'text-align:center; font-size:{fs}px; font-weight:800; color:{c}; margin:28px 0 20px; padding-bottom:12px; border-bottom:2px solid {c}; line-height:1.4;' },
    { id: 'leftbar',     name: '左竖条', style: 'font-size:{fs}px; font-weight:800; color:{c}; margin:28px 0 20px; padding-left:14px; border-left:5px solid {c}; line-height:1.4;' },
    { id: 'diamond',     name: '左右菱形', style: 'text-align:center; font-size:{fs}px; font-weight:800; color:{c}; margin:28px 0 20px; line-height:1.4;', prefix: '◆ ', suffix: ' ◆' },
    { id: 'cardfill',    name: '卡片填充', style: 'text-align:center; font-size:{fs}px; font-weight:800; color:#fff; margin:28px 0 20px; padding:16px 18px; background:{c}; border-radius:10px; line-height:1.4;' },
    { id: 'softcard',    name: '柔和底色', style: 'font-size:{fs}px; font-weight:800; color:{c}; margin:28px 0 20px; padding:14px 18px; background:{cbg}; border-radius:8px; line-height:1.4;' },
    { id: 'numbered',    name: '数字徽章', style: 'font-size:{fs}px; font-weight:800; color:{c}; margin:28px 0 20px; display:flex; align-items:center; gap:8px; line-height:1.4;', badge: true },
    { id: 'doubleline',  name: '双细线', style: 'text-align:center; font-size:{fs}px; font-weight:800; color:{c}; margin:28px 0 20px; padding:14px 0; border-top:1px solid {c}; border-bottom:1px solid {c}; line-height:1.4;' },
    { id: 'tagline',     name: '标签形', style: 'font-size:{fs}px; font-weight:800; color:#fff; margin:28px 0 20px; display:inline-block; padding:8px 18px 8px 14px; background:{c}; border-radius:0 24px 24px 0; line-height:1.4;' },
    { id: 'bookmark',    name: '书签造型', style: 'font-size:{fs}px; font-weight:800; color:#fff; margin:28px 0 20px; display:inline-block; padding:10px 20px 10px 14px; background:{c}; clip-path:polygon(0 0, 100% 0, calc(100% - 14px) 50%, 100% 100%, 0 100%); line-height:1.4;' },
  ],

  // ============ H2（章级 700，与 H1/800、H3/600 各差一档）===========
  h2: [
    { id: 'plain',       name: '素净', style: 'font-size:{fs}px; font-weight:700; color:{c}; margin:28px 0 16px; line-height:1.45;' },
    { id: 'leftbar',     name: '左竖条', style: 'font-size:{fs}px; font-weight:700; color:{c}; margin:28px 0 16px; padding-left:14px; border-left:5px solid {c}; line-height:1.45;' },
    { id: 'bottomline',  name: '底边线', style: 'font-size:{fs}px; font-weight:700; color:{c}; margin:28px 0 16px; padding-bottom:8px; border-bottom:2px solid {c}; line-height:1.45;' },
    { id: 'numdot',      name: '数字前缀', style: 'font-size:{fs}px; font-weight:700; color:{c}; margin:28px 0 16px; line-height:1.45;', numPrefix: true },
    { id: 'pillsolid',   name: '胶囊填充', style: 'font-size:{fs}px; font-weight:700; color:#fff; margin:28px 0 16px; display:inline-block; padding:6px 16px; background:{c}; border-radius:999px; line-height:1.45;' },
    { id: 'pillsoft',    name: '胶囊柔色', style: 'font-size:{fs}px; font-weight:700; color:{c}; margin:28px 0 16px; display:inline-block; padding:6px 16px; background:{cbg}; border-radius:999px; line-height:1.45;' },
    { id: 'shortbar',    name: '短标色块', style: 'font-size:{fs}px; font-weight:700; color:{c}; margin:28px 0 16px; display:inline-block; padding:3px 10px; background:{cbg}; border-radius:4px; line-height:1.45;' },
    { id: 'withbg',      name: '背景块', style: 'font-size:{fs}px; font-weight:700; color:{c}; margin:28px 0 16px; padding:10px 14px; background:{cbg}; border-radius:6px; line-height:1.45;' },
  ],

  // ============ H3（小节 600，与 H2/700、H4/500 区分）===========
  h3: [
    { id: 'plain',       name: '素净', style: 'font-size:{fs}px; font-weight:600; color:{c}; margin:22px 0 12px; line-height:1.5;' },
    { id: 'bulletbefore',name: '圆点前缀', style: 'font-size:{fs}px; font-weight:600; color:{c}; margin:22px 0 12px; line-height:1.5;', prefix: '● ' },
    { id: 'underline',   name: '细左侧条', style: 'font-size:{fs}px; font-weight:600; color:{c}; margin:22px 0 12px; padding-left:8px; border-left:2px solid {c}; line-height:1.5;' },
    { id: 'leftbar',     name: '左细条', style: 'font-size:{fs}px; font-weight:600; color:{c}; margin:22px 0 12px; padding-left:10px; border-left:3px solid {c}; line-height:1.5;' },
    { id: 'emojibook',   name: '书本符号', style: 'font-size:{fs}px; font-weight:600; color:{c}; margin:22px 0 12px; line-height:1.5;', prefix: '📖 ' },
    { id: 'emojispark',  name: '闪光符号', style: 'font-size:{fs}px; font-weight:600; color:{c}; margin:22px 0 12px; line-height:1.5;', prefix: '✦ ' },
    { id: 'labelbg',     name: '标签背景', style: 'font-size:{fs}px; font-weight:600; color:{c}; margin:22px 0 12px; display:inline-block; padding:3px 10px; background:{cbg}; border-radius:4px; line-height:1.5;' },
    { id: 'numsquare',   name: '方块数字', style: 'font-size:{fs}px; font-weight:600; color:{c}; margin:22px 0 12px; display:flex; align-items:center; gap:10px; line-height:1.5;', badgeSq: true },
  ],

  // ============ H4（更细 500，正文约 400；「小型大写」同 500 + 字距）===========
  h4: [
    { id: 'plain',       name: '素净', style: 'font-size:{fs}px; font-weight:500; color:{c}; margin:18px 0 10px; line-height:1.55;' },
    { id: 'dot',         name: '圆点', style: 'font-size:{fs}px; font-weight:500; color:{c}; margin:18px 0 10px; line-height:1.55;', prefix: '· ' },
    { id: 'arrow',       name: '箭头', style: 'font-size:{fs}px; font-weight:500; color:{c}; margin:18px 0 10px; line-height:1.55;', prefix: '→ ' },
    { id: 'square',      name: '方块前缀', style: 'font-size:{fs}px; font-weight:500; color:{c}; margin:18px 0 10px; line-height:1.55;', prefix: '▪ ' },
    { id: 'italic',      name: '斜体雅致', style: 'font-size:{fs}px; font-weight:500; font-style:italic; color:{c}; margin:18px 0 10px; line-height:1.55;' },
    { id: 'caps',        name: '小型大写', style: 'font-size:{fs}px; font-weight:500; letter-spacing:2px; text-transform:uppercase; color:{c}; margin:18px 0 10px; line-height:1.55;' },
    { id: 'parenth',     name: '括号包裹', style: 'font-size:{fs}px; font-weight:500; color:{c}; margin:18px 0 10px; line-height:1.55;', prefix: '（', suffix: '）' },
    { id: 'softpill',    name: '柔色胶囊', style: 'font-size:{fs}px; font-weight:500; color:{c}; margin:18px 0 10px; display:inline-block; padding:2px 10px; background:{cbg}; border-radius:10px; line-height:1.55;' },
  ],

  // ============ 正文 paragraph ============
  p: [
    { id: 'normal',      name: '标准', style: 'font-size:{fs}px; line-height:{lh}; color:{c}; margin:14px 0; letter-spacing:{ls}px;' },
    { id: 'indent',      name: '首行缩进', style: 'font-size:{fs}px; line-height:{lh}; color:{c}; margin:14px 0; text-indent:2em; letter-spacing:{ls}px;' },
    { id: 'justify',     name: '两端对齐', style: 'font-size:{fs}px; line-height:{lh}; color:{c}; margin:14px 0; text-align:justify; letter-spacing:{ls}px;' },
    { id: 'loose',       name: '宽松行距', style: 'font-size:{fs}px; line-height:{lh}; color:{c}; margin:18px 0; letter-spacing:{ls}px;' },
  ],

  // ============ 引用 blockquote ============
  blockquote: [
    { id: 'leftbar',     name: '左竖条', style: 'border-left:2px solid {c}; padding:10px 16px; margin:16px 0; color:{tc}; font-size:{fs}px; line-height:1.75; background:#F4F5F6; border-radius:0 8px 8px 0;' },
    { id: 'outlined',    name: '边框卡片', style: 'padding:14px 18px; margin:16px 0; color:{tc}; font-size:{fs}px; line-height:1.75; background:transparent; border:1px solid {c}; border-radius:8px;' },
    { id: 'center',      name: '居中楷体', style: 'padding:14px 20px; margin:20px 40px; color:{tc}; font-size:{fs}px; line-height:1.85; text-align:center; font-style:italic; border-top:1px solid {c}; border-bottom:1px solid {c};' },
    { id: 'corner',      name: '双角装饰', style: 'padding:14px 16px; margin:16px 0; color:{tc}; font-size:{fs}px; line-height:1.75; background:{cbg}; border-top:2px solid {c}; border-bottom:2px solid {c};' },
    { id: 'dashedbox',   name: '虚线框', style: 'padding:12px 16px; margin:16px 0; color:{tc}; font-size:{fs}px; line-height:1.75; background:transparent; border:1px dashed {c}; border-radius:6px;' },
    { id: 'notice',      name: '提示样式', style: 'padding:12px 14px 12px 38px; margin:16px 0; color:{tc}; font-size:{fs}px; line-height:1.75; background:{cbg}; border-left:3px solid {c}; border-radius:0 4px 4px 0; position:relative;', notice: true },
  ],

  // ============ 代码块 pre（6 个常用） ============
  pre: [
    { id: 'github-light', name: '线框浅', style: 'background:#F6F8FA; color:#24292F; border:1px solid #D0D7DE; border-radius:6px; padding:14px 16px; font-size:{cfs}px; line-height:1.7; white-space:pre-wrap;word-break:break-word;overflow-wrap:anywhere; font-family:\'SF Mono\',\'JetBrains Mono\',Menlo,Consolas,monospace; margin:16px 0;' },
    { id: 'lightgrey',   name: '素浅灰', style: 'background:#F6F4EF; color:#2B2016; border-radius:8px; padding:14px 16px; font-size:{cfs}px; line-height:1.7; white-space:pre-wrap;word-break:break-word;overflow-wrap:anywhere; font-family:\'SF Mono\',\'JetBrains Mono\',Menlo,Consolas,monospace; margin:16px 0;' },
    { id: 'accent-bar',  name: '左色条', style: 'background:#F6F4EF; color:#2B2016; border-left:4px solid {c}; border-radius:0 6px 6px 0; padding:14px 16px; font-size:{cfs}px; line-height:1.7; white-space:pre-wrap;word-break:break-word;overflow-wrap:anywhere; font-family:\'SF Mono\',\'JetBrains Mono\',Menlo,Consolas,monospace; margin:16px 0;' },
    { id: 'subtle-border', name: '细框素', style: 'background:#FFFFFF; color:#2B2016; border:1px solid #E4DED2; border-radius:4px; padding:14px 16px; font-size:{cfs}px; line-height:1.7; white-space:pre-wrap;word-break:break-word;overflow-wrap:anywhere; font-family:\'SF Mono\',\'JetBrains Mono\',Menlo,Consolas,monospace; margin:16px 0;' },
    { id: 'dracula',     name: '深紫调', style: 'background:#282A36; color:#F8F8F2; border-radius:8px; padding:14px 16px; font-size:{cfs}px; line-height:1.7; white-space:pre-wrap;word-break:break-word;overflow-wrap:anywhere; font-family:\'SF Mono\',\'JetBrains Mono\',Menlo,Consolas,monospace; margin:16px 0;' },
    { id: 'ink-dark',    name: '墨色深', style: 'background:#2B2016; color:#EEE2D6; border-radius:8px; padding:14px 16px; font-size:{cfs}px; line-height:1.7; white-space:pre-wrap;word-break:break-word;overflow-wrap:anywhere; font-family:\'SF Mono\',\'JetBrains Mono\',Menlo,Consolas,monospace; margin:16px 0;' },
  ],

  // ============ 行内代码 code ============
  code: [
    { id: 'pill-soft',   name: '柔色胶囊', style: 'background:{cbg}; color:{tc}; padding:2px 6px; border-radius:4px; font-family:\'SF Mono\',Menlo,Consolas,monospace; font-size:0.9em;' },
    { id: 'filled',      name: '主色填充', style: 'background:{c}; color:#fff; padding:2px 6px; border-radius:4px; font-family:\'SF Mono\',Menlo,Consolas,monospace; font-size:0.9em;' },
    { id: 'outlined',    name: '描边', style: 'background:transparent; color:{tc}; border:1px solid {c}; padding:1px 6px; border-radius:4px; font-family:\'SF Mono\',Menlo,Consolas,monospace; font-size:0.9em;' },
    { id: 'underline',   name: '下划强调', style: 'background:transparent; color:{tc}; border-bottom:1px dashed {c}; padding:0 2px; font-family:\'SF Mono\',Menlo,Consolas,monospace; font-size:0.9em;' },
    { id: 'grey-ink',    name: '灰底墨字', style: 'background:#F0EBE0; color:#2B2016; padding:2px 6px; border-radius:3px; font-family:\'SF Mono\',Menlo,Consolas,monospace; font-size:0.9em;' },
    { id: 'mark',        name: '荧光笔', style: 'background:{cbg}; color:{tc}; padding:0 4px; font-family:\'SF Mono\',Menlo,Consolas,monospace; font-size:0.9em; font-weight:600;' },
  ],

  // ============ 无序列表 ul (li marker) ============
  ul: [
    { id: 'disc',        name: '实心圆', marker: '●', style: 'color:{c};' },
    { id: 'circle',      name: '空心圆', marker: '○', style: 'color:{c};' },
    { id: 'square',      name: '方块', marker: '■', style: 'color:{c};' },
    { id: 'check',       name: '对勾', marker: '✓', style: 'color:{c};' },
    { id: 'star-outline', name: '空心星', marker: '☆', style: 'color:{c};' },
    { id: 'plus',        name: '加号', marker: '+', style: 'color:{c};' },
  ],

  // ============ 有序列表 ol ============
  ol: [
    { id: 'arabic',      name: '阿拉伯数字', format: '{n}.', style: 'color:{c}; font-weight:600;' },
    { id: 'paren',       name: '括号', format: '{n})', style: 'color:{c}; font-weight:600;' },
    { id: 'circled',     name: '圆圈数字', format: 'circled', style: 'color:{c}; font-weight:700;' },
    { id: 'square',      name: '方块数字', format: 'square', style: 'color:#fff; background:{c}; padding:0 6px; border-radius:3px; font-weight:600; font-size:0.85em;' },
    { id: 'chinese',     name: '中文数字', format: 'chinese', style: 'color:{c}; font-weight:600;' },
    { id: 'bracket',     name: '方括号', format: '[{n}]', style: 'color:{c}; font-weight:600;' },
  ],

  // ============ 链接 a ============
  a: [
    { id: 'underline',   name: '下划线', style: 'color:{c}; text-decoration-line:underline; text-decoration-style:solid; text-decoration-thickness:1px; text-underline-offset:3px;' },
    { id: 'bold',        name: '加粗无下划线', style: 'color:{c}; text-decoration:none; font-weight:600;' },
    { id: 'dashed',      name: '虚下划线', style: 'color:{c}; text-decoration:none; border-bottom:1px dashed {c}; padding-bottom:1px;' },
    { id: 'highlight',   name: '荧光背景', style: 'color:{c}; text-decoration:none; background:{cbg}; padding:1px 3px; border-radius:2px;' },
    { id: 'plain',       name: '无装饰', style: 'color:{c}; text-decoration:none;' },
    { id: 'arrow',       name: '带箭头', style: 'color:{c}; text-decoration-line:underline; text-decoration-style:solid; text-decoration-thickness:1px; text-underline-offset:3px;', suffix: ' ↗' },
  ],

  // ============ 图片 img ============
  img: [
    { id: 'plain',       name: '直角素净', imgStyle: 'display:block; max-width:100%; margin:16px auto; border-radius:0;', capStyle: 'text-align:center; color:#9C8E7F; font-size:13px; margin:8px 0 16px; font-style:italic;' },
    { id: 'rounded',     name: '小圆角', imgStyle: 'display:block; max-width:100%; margin:16px auto; border-radius:8px;', capStyle: 'text-align:center; color:#9C8E7F; font-size:13px; margin:8px 0 16px; font-style:italic;' },
    { id: 'bigrounded',  name: '大圆角', imgStyle: 'display:block; max-width:100%; margin:16px auto; border-radius:16px;', capStyle: 'text-align:center; color:#9C8E7F; font-size:13px; margin:8px 0 16px; font-style:italic;' },
    { id: 'shadow',      name: '柔和阴影', imgStyle: 'display:block; max-width:100%; margin:16px auto; border-radius:8px; box-shadow:0 8px 24px rgba(0,0,0,0.12);', capStyle: 'text-align:center; color:#9C8E7F; font-size:13px; margin:8px 0 16px; font-style:italic;' },
    { id: 'bordered',    name: '边框素描', imgStyle: 'display:block; max-width:100%; margin:16px auto; border-radius:4px; border:1px solid #E4DED2; padding:6px; background:#fff;', capStyle: 'text-align:center; color:#9C8E7F; font-size:13px; margin:8px 0 16px; font-style:italic;' },
    { id: 'circle',      name: '圆形裁切', imgStyle: 'display:block; max-width:70%; margin:16px auto; border-radius:50%; aspect-ratio:1/1; object-fit:cover;', capStyle: 'text-align:center; color:#9C8E7F; font-size:13px; margin:8px 0 16px; font-style:italic;' },
  ],

  // ============ 分割线 hr ============
  hr: [
    { id: 'thin',        name: '细线', style: 'border:none; border-top:1px solid {c}; margin:24px 0;' },
    { id: 'thick',       name: '粗线', style: 'border:none; border-top:2px solid {c}; margin:24px 0;' },
    { id: 'dashed',      name: '虚线', style: 'border:none; border-top:1px dashed {c}; margin:24px 0;' },
    { id: 'dotted',      name: '点线', style: 'border:none; border-top:1px dotted {c}; margin:24px 0;' },
    { id: 'short',       name: '短线居中', style: 'border:none; height:2px; background:{c}; width:56px; margin:24px auto;' },
    { id: 'gradient',    name: '渐变淡出', style: 'border:none; height:1px; background:linear-gradient(90deg, transparent, {c}, transparent); margin:24px 0;' },
  ],

  // ============ 表格 table ============
  table: [
    { id: 'plain',       name: '素净', tableStyle: 'border-collapse:collapse; width:100%; margin:16px 0; font-size:14px; line-height:1.65;', thStyle: 'border:1px solid {hair}; padding:9px 12px; background:transparent; color:{c}; font-weight:600; text-align:left;', tdStyle: 'border:1px solid {hair}; padding:9px 12px;' },
    { id: 'zebra',       name: '斑马纹', tableStyle: 'border-collapse:collapse; width:100%; margin:16px 0; font-size:14px; line-height:1.65; border:1px solid {hair};', thStyle: 'padding:10px 12px; background:{c}; color:#fff; font-weight:600; text-align:left;', tdStyle: 'padding:9px 12px; border-bottom:1px solid {hair};', zebra: true, zebraColor: '{cbg}' },
    { id: 'borderless',  name: '无边框', tableStyle: 'border-collapse:collapse; width:100%; margin:16px 0; font-size:14px; line-height:1.65;', thStyle: 'padding:10px 12px; border-bottom:2px solid {c}; color:{c}; font-weight:600; text-align:left;', tdStyle: 'padding:9px 12px; border-bottom:1px solid {hair};' },
    { id: 'softbg',      name: '柔底表头', tableStyle: 'border-collapse:collapse; width:100%; margin:16px 0; font-size:14px; line-height:1.65; border:1px solid {hair};', thStyle: 'padding:10px 12px; background:{cbg}; color:{c}; font-weight:600; text-align:left; border-bottom:1px solid {hair};', tdStyle: 'padding:9px 12px; border-bottom:1px solid {hair};' },
    { id: 'outerframe',  name: '外框', tableStyle: 'border-collapse:collapse; width:100%; margin:16px 0; font-size:14px; line-height:1.65; border:1px solid {c};', thStyle: 'padding:10px 12px; background:{cbg}; color:{c}; font-weight:600; text-align:left; border-bottom:1px solid {c};', tdStyle: 'padding:9px 12px; border-top:1px solid {hair};' },
    { id: 'card',        name: '卡片式', tableStyle: 'border-collapse:collapse; width:100%; margin:16px 0; font-size:14px; line-height:1.65; border:1px solid {c};', thStyle: 'padding:10px 12px; background:{c}; color:#fff; font-weight:600; text-align:left;', tdStyle: 'padding:9px 12px; border-top:1px solid {hair};' },
  ],

};

/* ============================================================
   预设主题：6 款（与产品说明图一致）
   · 优雅蓝 / 清新绿 / 温暖橙 / 深邃紫 / 经典红 / 极简黑
   键名：youya · qingxin · wennuan · shensui · jingdian · jijian
   默认 youya
   旧版键 shujuan·keji·hupo·zhenghong 在 index.js 中迁移
   ============================================================ */
window.THEMES = {
  youya: {
    name: '优雅蓝',
    desc: '优雅蓝：适合产品、技术、资讯与通用长文',
    global: {
      bg: '#FFFFFF',
      ink: '#1E293B',
      brand: '#2563EB',
      brandSoft: '#DBEAFE',
      fontFamily: 'sans-zh',
      maxWidth: 335,
    },
    h1: { preset: 'softcard', color: '#2563EB', fontSize: 22 },
    h2: { preset: 'leftbar', color: '#2563EB', fontSize: 20 },
    h3: { preset: 'leftbar', color: '#2563EB', fontSize: 18 },
    h4: { preset: 'square', color: '#2563EB', fontSize: 16 },
    p:  { preset: 'normal', color: '#1E293B', fontSize: 15, lineHeight: 1.8, letterSpacing: 0.2 },
    blockquote: { preset: 'notice', textColor: '#000000', bgColor: '#FFFFFF', fontSize: 15 },
    pre: { preset: 'github-light' },
    code: { preset: 'pill-soft', color: '#2563EB', bgColor: '#DBEAFE' },
    ul: { preset: 'disc', color: '#2563EB' },
    ol: { preset: 'square', color: '#2563EB' },
    a: { preset: 'underline', color: '#2563EB' },
    img: { preset: 'shadow' },
    hr: { preset: 'gradient', color: '#2563EB' },
    table: { preset: 'zebra', color: '#2563EB', bgColor: '#F1F5F9' },
    bold: { color: '#2563EB' },
    italic: { color: '#334155' },
  },

  qingxin: {
    name: '清新绿',
    desc: '清新绿：适合生活服务、轻阅读与日常分享',
    global: {
      bg: '#FFFFFF',
      ink: '#14532D',
      brand: '#07C160',
      brandSoft: '#D1FAE5',
      fontFamily: 'sans-zh',
      maxWidth: 335,
    },
    h1: { preset: 'softcard', color: '#07C160', fontSize: 22 },
    h2: { preset: 'leftbar', color: '#07C160', fontSize: 20 },
    h3: { preset: 'leftbar', color: '#07C160', fontSize: 18 },
    h4: { preset: 'square', color: '#07C160', fontSize: 16 },
    p:  { preset: 'normal', color: '#14532D', fontSize: 15, lineHeight: 1.8, letterSpacing: 0.2 },
    blockquote: { preset: 'leftbar', textColor: '#000000', bgColor: '#FFFFFF', fontSize: 15 },
    pre: { preset: 'github-light' },
    code: { preset: 'pill-soft', color: '#07C160', bgColor: '#D1FAE5' },
    ul: { preset: 'check', color: '#07C160' },
    ol: { preset: 'arabic', color: '#07C160' },
    a: { preset: 'underline', color: '#07C160' },
    img: { preset: 'rounded' },
    hr: { preset: 'gradient', color: '#07C160' },
    table: { preset: 'zebra', color: '#07C160', bgColor: '#ECFDF5' },
    bold: { color: '#07C160' },
    italic: { color: '#166534' },
  },

  wennuan: {
    name: '温暖橙',
    desc: '温暖橙：适合故事、情感、亲子与生活向内容',
    global: {
      bg: '#FFFFFF',
      ink: '#5A3A16',
      brand: '#E08A2E',
      brandSoft: '#FCE7C7',
      fontFamily: 'serif-zh',
      maxWidth: 335,
    },
    h1: { preset: 'cardfill', color: '#E08A2E', fontSize: 22 },
    h2: { preset: 'pillsoft', color: '#E08A2E', fontSize: 20 },
    h3: { preset: 'labelbg', color: '#E08A2E', fontSize: 18 },
    h4: { preset: 'dot', color: '#E08A2E', fontSize: 16 },
    p:  { preset: 'loose', color: '#5A3A16', fontSize: 15, lineHeight: 1.9, letterSpacing: 0.4 },
    blockquote: { preset: 'corner', textColor: '#000000', bgColor: '#FFFFFF', fontSize: 15 },
    pre: { preset: 'accent-bar' },
    code: { preset: 'mark', color: '#E08A2E', bgColor: '#FCE7C7' },
    ul: { preset: 'circle', color: '#E08A2E' },
    ol: { preset: 'circled', color: '#E08A2E' },
    a: { preset: 'highlight', color: '#E08A2E', bgColor: '#FCE7C7' },
    img: { preset: 'rounded' },
    hr: { preset: 'short', color: '#E08A2E' },
    table: { preset: 'softbg', color: '#E08A2E', bgColor: '#FFF1DB' },
    bold: { color: '#E08A2E' },
    italic: { color: '#6B4A1E' },
  },

  shensui: {
    name: '深邃紫',
    desc: '深邃紫：适合品牌风、课程、知识付费与深度长文',
    global: {
      bg: '#FFFFFF',
      ink: '#1E1B4B',
      brand: '#5B21B6',
      brandSoft: '#EDE9FE',
      fontFamily: 'sans-zh',
      maxWidth: 335,
    },
    h1: { preset: 'softcard', color: '#5B21B6', fontSize: 22 },
    h2: { preset: 'leftbar', color: '#5B21B6', fontSize: 20 },
    h3: { preset: 'labelbg', color: '#5B21B6', fontSize: 18 },
    h4: { preset: 'softpill', color: '#5B21B6', fontSize: 16 },
    p:  { preset: 'normal', color: '#1E1B4B', fontSize: 15, lineHeight: 1.8, letterSpacing: 0.2 },
    blockquote: { preset: 'leftbar', textColor: '#000000', bgColor: '#FFFFFF', fontSize: 15 },
    pre: { preset: 'github-light' },
    code: { preset: 'pill-soft', color: '#5B21B6', bgColor: '#EDE9FE' },
    ul: { preset: 'square', color: '#5B21B6' },
    ol: { preset: 'paren', color: '#5B21B6' },
    a: { preset: 'dashed', color: '#5B21B6' },
    img: { preset: 'shadow' },
    hr: { preset: 'dashed', color: '#5B21B6' },
    table: { preset: 'softbg', color: '#5B21B6', bgColor: '#F5F3FF' },
    bold: { color: '#5B21B6' },
    italic: { color: '#4C1D95' },
  },

  jingdian: {
    name: '经典红',
    desc: '经典红：适合节庆、文化、政务与品牌红色调',
    global: {
      bg: '#FFFFFF',
      ink: '#5C0F0F',
      brand: '#C41E3A',
      brandSoft: '#FCE8E8',
      fontFamily: 'serif-zh',
      maxWidth: 335,
    },
    h1: { preset: 'doubleline', color: '#C41E3A', fontSize: 22 },
    h2: { preset: 'leftbar', color: '#C41E3A', fontSize: 20 },
    h3: { preset: 'leftbar', color: '#C41E3A', fontSize: 18 },
    h4: { preset: 'square', color: '#C41E3A', fontSize: 16 },
    p:  { preset: 'normal', color: '#5C0F0F', fontSize: 15, lineHeight: 1.85, letterSpacing: 0.3 },
    blockquote: { preset: 'leftbar', textColor: '#000000', bgColor: '#FFFFFF', fontSize: 15 },
    pre: { preset: 'accent-bar' },
    code: { preset: 'pill-soft', color: '#C41E3A', bgColor: '#FCE8E8' },
    ul: { preset: 'square', color: '#C41E3A' },
    ol: { preset: 'circled', color: '#C41E3A' },
    a: { preset: 'dashed', color: '#C41E3A' },
    img: { preset: 'bordered' },
    hr: { preset: 'gradient', color: '#C41E3A' },
    table: { preset: 'softbg', color: '#C41E3A', bgColor: '#FCE8E8' },
    bold: { color: '#C41E3A' },
    italic: { color: '#6B2424' },
  },

  jijian: {
    name: '极简黑',
    desc: '极简黑：适合公告、声明、条例与高密度正文',
    global: {
      bg: '#FFFFFF',
      ink: '#1A1A1A',
      brand: '#1A1A1A',
      brandSoft: '#F0F0F0',
      fontFamily: 'sans-zh',
      maxWidth: 335,
    },
    h1: { preset: 'plain', color: '#1A1A1A', fontSize: 22 },
    h2: { preset: 'shortbar', color: '#1A1A1A', fontSize: 20 },
    h3: { preset: 'plain', color: '#1A1A1A', fontSize: 18 },
    h4: { preset: 'caps', color: '#1A1A1A', fontSize: 16 },
    p:  { preset: 'normal', color: '#1A1A1A', fontSize: 15, lineHeight: 1.8, letterSpacing: 0.2 },
    blockquote: { preset: 'leftbar', textColor: '#000000', bgColor: '#FFFFFF', fontSize: 15 },
    pre: { preset: 'subtle-border' },
    code: { preset: 'grey-ink', color: '#1A1A1A', bgColor: '#F0F0F0' },
    ul: { preset: 'disc', color: '#1A1A1A' },
    ol: { preset: 'arabic', color: '#1A1A1A' },
    a: { preset: 'underline', color: '#1A1A1A' },
    img: { preset: 'plain' },
    hr: { preset: 'thin', color: '#CCCCCC' },
    table: { preset: 'borderless', color: '#1A1A1A', bgColor: '#FAFAFA' },
    bold: { color: '#1A1A1A' },
    italic: { color: '#4A4A4A' },
  },
};
