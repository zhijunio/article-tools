/* ============================================================
   Renderer: Markdown -> HTML with inline styles
   生成后可直接粘贴到公众号后台
   ============================================================ */

(function () {
  const P = window.PRESETS;
  /** 各主题下正文段落、列表文字与容器继承色统一为纯黑（标题/主色装饰不变） */
  const BODY_TEXT_COLOR = '#000000';
  /** 相对「正文设置字号」略小一档：行内/块级代码、引用与正文同基准（0.9≈90%） */
  const CODE_FONT_RATIO = 0.9;

  function toCircled(n) {
    const map = ['⓪','①','②','③','④','⑤','⑥','⑦','⑧','⑨','⑩','⑪','⑫','⑬','⑭','⑮','⑯','⑰','⑱','⑲','⑳'];
    return map[n] || (n + '.');
  }
  function toChinese(n) {
    const map = ['零','一','二','三','四','五','六','七','八','九','十'];
    if (n <= 10) return map[n] + '、';
    if (n < 20) return '十' + map[n-10] + '、';
    if (n === 20) return '二十、';
    return n + '、';
  }
  function toSquareNum(n) {
    // 使用方块内的数字
    return String(n);
  }
  function fillStyle(tpl, vars) {
    return String(tpl).replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : ''));
  }

  function escapeAttr(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;');
  }
  function escapeHtmlText(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /**
   * marked 9+ 传入的 codespan 文本已带 HTML 实体（如 ' → &#39;、< → &lt;）。
   * 若直接对 & 再转义会得到 &amp;#39;，页面上会显示成字面量「&#39;」等错误。
   * 先还原为真实字符，再按文本节点做安全转义。
   *
   * 安全说明：此处 t.innerHTML = str 是安全的 — str 来自 marked 解析器的 codespan 输出，
   * 仅含 HTML 实体而非恶意脚本；且解码后还会经 escapeCodeTextContent() 再次转义。
   */
  function decodeMarkedInlineCode(s) {
    const str = String(s ?? '');
    if (typeof document !== 'undefined') {
      const t = document.createElement('textarea');
      t.innerHTML = str;  // 安全：仅解码 HTML 实体，非用户输入
      return t.value;
    }
    return str
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;|&#(?:0*39|x27);/gi, "'")
      .replace(/&amp;/g, '&');
  }

  function escapeCodeTextContent(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // ============ 找预设 ============
  function find(list, id) {
    return list.find(p => p.id === id) || list[0];
  }

  // ============ 构建每种元素的 inline style ============
  function buildHeading(level, cfg, settings) {
    const list = P['h' + level] || P.h2;
    const preset = find(list, cfg.preset);
    const headingColor = (settings && settings.global && settings.global.brand) ? settings.global.brand : cfg.color;
    const style = fillStyle(preset.style, {
      fs: cfg.fontSize,
      c: headingColor,
      cbg: settings.global.brandSoft,
    });
    return { preset, style, color: headingColor };
  }

  function buildParagraph(cfg) {
    const preset = find(P.p, cfg.preset);
    const vars = {
      fs: cfg.fontSize,
      c: BODY_TEXT_COLOR,
      lh: cfg.lineHeight,
      ls: cfg.letterSpacing,
    };
    return fillStyle(preset.style, vars);
  }

  function buildBlockquote(cfg, brand, bodyFontSize) {
    const preset = find(P.blockquote, cfg.preset);
    // 引用正文与背景固定黑字白底；装饰色与主色一致；字号 = 正文（段落）字号 × 比例（与代码块一致）
    const pfs = Number(bodyFontSize) > 0
      ? Number(bodyFontSize)
      : (Number(cfg.fontSize) > 0 ? Number(cfg.fontSize) : 15);
    const bfs = Math.max(10, Math.round(pfs * CODE_FONT_RATIO));
    const vars = {
      c: brand,
      tc: '#000000',
      cbg: '#FFFFFF',
      fs: bfs,
    };
    return { preset, style: fillStyle(preset.style, vars) };
  }

  function buildPre(cfg, globalCfg, bodyFontSize) {
    const preset = find(P.pre, cfg.preset);
    const c = (globalCfg && globalCfg.brand) || cfg.color || '#C96442';
    const pfs = Number(bodyFontSize) > 0 ? Number(bodyFontSize) : 15;
    const cfs = Math.max(10, Math.round(pfs * CODE_FONT_RATIO));
    return { preset, style: fillStyle(preset.style, { c, cfs }) };
  }

  function buildCode(cfg, globalCfg) {
    const preset = find(P.code, cfg.preset);
    const c = (globalCfg && globalCfg.brand) || cfg.color;
    const cbg = (globalCfg && globalCfg.brandSoft) || cfg.bgColor;
    // 字色与段落一致；{c} 仅用于主色底/描边等，避免行内码与加粗主色「叠在一起」
    const tc = BODY_TEXT_COLOR;
    return fillStyle(preset.style, { c, cbg, tc });
  }

  function buildLink(cfg, globalCfg) {
    const preset = find(P.a, cfg.preset);
    const c = (globalCfg && globalCfg.brand) || cfg.color;
    const cbg = (globalCfg && globalCfg.brandSoft) || cfg.bgColor || '#F5E3D7';
    return { preset, style: fillStyle(preset.style, { c, cbg }) };
  }

  function buildHr(cfg, globalCfg) {
    const preset = find(P.hr, cfg.preset);
    const c = (globalCfg && globalCfg.brand) || cfg.color;
    return { preset, style: fillStyle(preset.style, { c }) };
  }

  function buildImg(cfg) {
    const preset = find(P.img, cfg.preset);
    const align = cfg.align || 'center';
    const alignSide = align === 'right'
      ? 'margin-left:auto;margin-right:0;'
      : align === 'left'
        ? 'margin-left:0;margin-right:auto;'
        : 'margin-left:auto;margin-right:auto;';
    const figAlign = align === 'right'
      ? 'display:block;margin-left:auto;margin-right:0;'
      : align === 'left'
        ? 'display:block;margin-left:0;margin-right:auto;'
        : 'display:block;margin-left:auto;margin-right:auto;';
    return {
      imgStyle: `${preset.imgStyle}${alignSide}`,
      capStyle: preset.capStyle,
      figStyle: figAlign,
    };
  }

  function buildTable(cfg, globalCfg) {
    const preset = find(P.table, cfg.preset);
    const c = (globalCfg && globalCfg.brand) || cfg.color;
    const cbg = (globalCfg && globalCfg.brandSoft) || cfg.bgColor;
    const textAlign = cfg.textAlign || 'left';
    const align = cfg.align || 'left';
    const widthMode = cfg.widthMode || 'fit';
    const widthStyle = widthMode === 'content' ? 'width:auto;max-width:100%;' : 'width:100%;';
    const alignStyle = align === 'right'
      ? 'margin-left:auto;margin-right:0;'
      : align === 'center'
        ? 'margin-left:auto;margin-right:auto;'
        : 'margin-left:0;margin-right:auto;';
    // 网格线统一用主题色，避免表头 {c} 与单元格 hair 分两色
    const vars = { c, cbg, hair: c };
    return {
      preset,
      tableStyle: `${fillStyle(preset.tableStyle, vars)}${widthStyle}${alignStyle}`,
      textAlign,
      thStyle: fillStyle(preset.thStyle, vars),
      tdStyle: fillStyle(preset.tdStyle, vars),
      zebra: preset.zebra,
      zebraColor: preset.zebraColor ? fillStyle(preset.zebraColor, vars) : null,
    };
  }

  // ============ 自定义 marked renderer ============
  function makeRenderer(settings) {
    const renderer = new marked.Renderer();
    const g = settings.global;

    // --- 标题（须单次赋值；marked 会传入 depth，不能 forEach 覆盖） ---
    renderer.heading = function (text, lvl) {
      // 每个标题都推进「大纲」计数，使数字前缀/徽章在父级区块下从 1 重计
      if (!renderer._hCount) renderer._hCount = {};
      for (let d = lvl + 1; d <= 6; d++) {
        renderer._hCount[d] = 0;
      }
      renderer._hCount[lvl] = (renderer._hCount[lvl] || 0) + 1;
      const hCount = renderer._hCount[lvl];

      const key = 'h' + lvl;
      const cfg = settings[key] || settings.h2;
      const { preset, style, color } = buildHeading(lvl, cfg, settings);
      let content = text;

      if (preset.prefix) content = preset.prefix + content;
      if (preset.suffix) content = content + preset.suffix;

      // 徽章类预设：badge(圆形) / badgeSq(方形) / numPrefix(数字前缀)
      const getBadgeStyle = (isRound) => {
        const size = isRound ? 24 : 20;
        const fontSize = isRound ? 13 : 11;
        return `display:inline-flex; align-items:center; justify-content:center; min-width:${size}px; height:${size}px; border-radius:${isRound ? '50%' : '4px'}; background:${color}; color:#fff; font-size:${fontSize}px; font-weight:700; flex-shrink:0;`;
      };

      if (preset.badge) {
        return `<h${lvl} style="${style}"><span style="${getBadgeStyle(true)}">${hCount}</span><span>${text}</span></h${lvl}>`;
      }
      if (preset.badgeSq) {
        return `<h${lvl} style="${style}"><span style="${getBadgeStyle(false)}">${hCount}</span><span>${text}</span></h${lvl}>`;
      }
      if (preset.numPrefix) {
        const prefixStyle = `color:${color}; margin-right:8px; font-family:Georgia,serif;`;
        return `<h${lvl} style="${style}"><span style="${prefixStyle}">${String(hCount).padStart(2,'0')}</span>${content}</h${lvl}>`;
      }

      return `<h${lvl} style="${style}">${content}</h${lvl}>`;
    };

    // --- 段落 ---
    renderer.paragraph = function (text) {
      const style = buildParagraph(settings.p);
      return `<p style="${style}">${text}</p>`;
    };

    // --- 引用 ---
    renderer.blockquote = function (quote) {
      const brand = g.brand;
      const { preset, style } = buildBlockquote(settings.blockquote, brand, settings.p && settings.p.fontSize);

      let inner = quote;
      if (preset.notice) {
        inner = `<span style="float:left; margin-left:-28px; margin-top:-2px; font-size:15px; line-height:1; color:${brand}; pointer-events:none;">💡</span>${quote}`;
      }

      // 去掉嵌套 p 的 margin
      inner = inner.replace(/<p style="[^"]*">/g, '<p style="margin:0;">');

      return `<blockquote style="${style}">${inner}</blockquote>`;
    };

    // --- 代码块（highlight.js 着色，失败则纯文本转义） ---
    renderer.code = function (code, lang) {
      const { style, preset: prePreset } = buildPre(settings.pre, settings.global, settings.p && settings.p.fontSize);
      const preStyle = style;
      const isPreDark = prePreset.id === 'dracula' || prePreset.id === 'ink-dark';
      const preClass = isPreDark ? 'is-pre-dark' : '';
      const esc = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      let inner = esc;
      if (typeof hljs !== 'undefined' && hljs.highlight) {
        try {
          const l = (lang || '').trim().toLowerCase();
          if (l && hljs.getLanguage && hljs.getLanguage(l)) {
            inner = hljs.highlight(code, { language: l }).value;
          } else {
            inner = hljs.highlightAuto(code).value;
          }
        } catch (_e) {
          try {
            inner = hljs.highlightAuto(code).value;
          } catch (_e2) {
            inner = esc;
          }
        }
      }
      // 深色 pre 上 global 的 github.min.css 字色过暗，由 #preview-content pre.is-pre-dark 下覆盖
      const codeColor = isPreDark ? '#e6edf3' : 'inherit';
      const codeShell = `background:transparent;padding:0;color:${codeColor};font-family:inherit;font-size:inherit;white-space:pre-wrap;word-break:break-word;overflow-wrap:anywhere`;
      const preOpen = preClass
        ? `<pre class="${preClass}" style="${preStyle}">`
        : `<pre style="${preStyle}">`;
      return `${preOpen}<code class="hljs" style="${codeShell}">${inner}</code></pre>`;
    };

    // --- 行内代码 ---
    renderer.codespan = function (code) {
      const style = buildCode(settings.code, settings.global);
      const raw = decodeMarkedInlineCode(code);
      const esc = escapeCodeTextContent(raw);
      return `<code style="${style}">${esc}</code>`;
    };

    // --- 列表 ---
    renderer.list = function (body, ordered, start) {
      if (ordered) {
        const cfg = settings.ol;
        const preset = find(P.ol, cfg.preset);
        // 给每个 li 加序号（我们在 listitem 里处理，这里用 data 传递）
        const containerStyle = `margin:14px 0; padding-left:0; list-style:none; color:${BODY_TEXT_COLOR};`;
        return `<ol data-ol-start="${start || 1}" data-ol-preset="${preset.id}" data-ol-color="${cfg.color}" style="${containerStyle}">${body}</ol>`;
      } else {
        const cfg = settings.ul;
        const preset = find(P.ul, cfg.preset);
        const containerStyle = `margin:14px 0; padding-left:0; list-style:none; color:${BODY_TEXT_COLOR};`;
        return `<ul data-ul-marker="${preset.marker}" data-ul-color="${cfg.color}" style="${containerStyle}">${body}</ul>`;
      }
    };

    renderer.listitem = function (text) {
      // 使用 flex 布局让序号对齐
      const itemStyle = `display:flex; gap:8px; align-items:flex-start; margin:6px 0; line-height:${settings.p.lineHeight}; font-size:${settings.p.fontSize}px; color:${BODY_TEXT_COLOR};`;
      // 嵌套段落去掉外 margin
      const inner = text.replace(/<p style="[^"]*">/g, '<span style="display:inline;">').replace(/<\/p>/g, '</span>');
      return `<li style="${itemStyle}"><!--LI_MARKER_PLACEHOLDER--><span style="flex:1;">${inner}</span></li>`;
    };

    // --- 链接 ---
    renderer.link = function (href, title, text) {
      const { preset, style } = buildLink(settings.a, settings.global);
      let display = text;
      if (preset.suffix) display = display + preset.suffix;
      return `<a href="${href}" style="${style}">${display}</a>`;
    };

    // --- 图片 ---
    renderer.image = function (href, title, text) {
      const preset = buildImg(settings.img);
      const rawAlt = text || '';
      const imgHtml = `<img src="${escapeAttr(href)}" alt="${escapeAttr(rawAlt)}" style="${preset.imgStyle}">`;
      if (text) {
        return `<figure style="margin:0;${preset.figStyle}">${imgHtml}<figcaption style="${preset.capStyle}">${escapeHtmlText(text)}</figcaption></figure>`;
      }
      return imgHtml;
    };

    // --- hr ---
    renderer.hr = function () {
      const { preset, style } = buildHr(settings.hr, settings.global);
      if (preset.decorative) {
        return `<p style="${style}">${preset.decorative}</p>`;
      }
      return `<hr style="${style}">`;
    };

    // --- 粗体、斜体、删除线 ---
    renderer.strong = function (text) {
      const brand = settings.global && settings.global.brand ? settings.global.brand : '#000000';
      return `<strong style="font-weight:700; color:${brand};">${text}</strong>`;
    };
    renderer.em = function (text) {
      // 与正文同色：斜体靠字形强调；加粗已用主色，避免整段主色过花
      return `<em style="font-style:italic; color:inherit;">${text}</em>`;
    };
    renderer.del = function (text) {
      // 已删除内容不用主色「高亮」；与所在块字色一致即可
      return `<del style="text-decoration:line-through; color:inherit;">${text}</del>`;
    };

    // --- 表格 ---
    renderer.table = function (header, body) {
      const t = buildTable(settings.table, settings.global);
      let bodyOut = body;
      if (t.zebra && t.zebraColor) {
        // 为偶数行注入背景
        let rowIdx = 0;
        bodyOut = body.replace(/<tr>/g, () => {
          rowIdx++;
          return rowIdx % 2 === 0 ? `<tr style="background:${t.zebraColor};">` : '<tr>';
        });
      }
      return `<table style="${t.tableStyle}"><thead>${header}</thead><tbody>${bodyOut}</tbody></table>`;
    };
    renderer.tablerow = function (content) { return `<tr>${content}</tr>`; };
    renderer.tablecell = function (content, flags) {
      const t = buildTable(settings.table, settings.global);
      const style = flags.header ? t.thStyle : t.tdStyle;
      const alignStyle = `text-align:${t.textAlign || flags.align || 'left'};`;
      return `<${flags.header ? 'th' : 'td'} style="${style}${alignStyle}">${content}</${flags.header ? 'th' : 'td'}>`;
    };

    renderer.br = function () { return '<br>'; };

    return renderer;
  }

  // ============ 后处理：替换列表 marker 占位 ============
  function applyListMarkers(html) {
    const tpl = document.createElement('div');
    tpl.innerHTML = html;

    // UL
    tpl.querySelectorAll('ul[data-ul-marker]').forEach(ul => {
      const marker = ul.getAttribute('data-ul-marker');
      const color = ul.getAttribute('data-ul-color');
      ul.querySelectorAll(':scope > li').forEach(li => {
        const span = document.createElement('span');
        span.setAttribute('style', `color:${color}; flex-shrink:0; width:1.3em; text-align:left; line-height:inherit;`);
        span.textContent = marker;
        const placeholder = li.querySelector('li > *:first-child') || li.firstChild;
        // 替换占位注释
        const walker = document.createNodeIterator(li, NodeFilter.SHOW_COMMENT);
        let n;
        while ((n = walker.nextNode())) {
          if (n.nodeValue === 'LI_MARKER_PLACEHOLDER') {
            n.parentNode.replaceChild(span, n);
            break;
          }
        }
      });
    });

    // OL
    tpl.querySelectorAll('ol[data-ol-start]').forEach(ol => {
      const start = parseInt(ol.getAttribute('data-ol-start') || '1', 10);
      const presetId = ol.getAttribute('data-ol-preset');
      const color = ol.getAttribute('data-ol-color');
      const preset = window.PRESETS.ol.find(p => p.id === presetId) || window.PRESETS.ol[0];
      let i = start - 1;
      ol.querySelectorAll(':scope > li').forEach(li => {
        i++;
        let labelText;
        if (preset.format === 'circled') labelText = toCircled(i);
        else if (preset.format === 'chinese') labelText = toChinese(i);
        else if (preset.format === 'square') labelText = String(i);
        else labelText = preset.format.replace('{n}', i);

        const span = document.createElement('span');
        const styleStr = preset.style.replace(/\{c\}/g, color);
        span.setAttribute('style', styleStr + ' flex-shrink:0; min-width:1.8em; text-align:left; line-height:inherit;');
        span.textContent = labelText;
        const walker = document.createNodeIterator(li, NodeFilter.SHOW_COMMENT);
        let n;
        while ((n = walker.nextNode())) {
          if (n.nodeValue === 'LI_MARKER_PLACEHOLDER') {
            n.parentNode.replaceChild(span, n);
            break;
          }
        }
      });
    });

    // 清理 data-* 属性
    tpl.querySelectorAll('[data-ul-marker], [data-ul-color], [data-ol-start], [data-ol-preset], [data-ol-color]').forEach(el => {
      el.removeAttribute('data-ul-marker');
      el.removeAttribute('data-ul-color');
      el.removeAttribute('data-ol-start');
      el.removeAttribute('data-ol-preset');
      el.removeAttribute('data-ol-color');
    });

    return tpl.innerHTML;
  }

  // ============ 对外主渲染函数 ============
  window.renderMarkdown = function (md, settings) {
    marked.setOptions({
      gfm: true,
      breaks: false,
      smartypants: false,
    });
    const renderer = makeRenderer(settings);
    let html = marked.parse(md, { renderer });
    html = applyListMarkers(html);

    // 包裹一层外容器
    const g = settings.global;
    const fontFamily = (P.global.fontFamily.find(f => f.id === g.fontFamily) || P.global.fontFamily[0]).value;
    const mw = (g.maxWidth != null && g.maxWidth !== '') ? `max-width:${g.maxWidth}px;margin:0 auto;` : '';
    const wrapperStyle = `color:${BODY_TEXT_COLOR}; background:${g.bg || 'transparent'}; font-family:${fontFamily}; font-size:${settings.p.fontSize}px; line-height:${settings.p.lineHeight}; max-width:100%; word-wrap:break-word; overflow-wrap:break-word; padding:0;${mw}`;
    return `<section style="${wrapperStyle}">${html}</section>`;
  };

})();
