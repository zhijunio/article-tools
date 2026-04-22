/* ============================================================
   应用主逻辑
   ============================================================ */

(function () {
  const P = window.PRESETS;
  const THEMES = window.THEMES;
  /** 顶栏 6 枚主题按钮顺序（与产品图一致） */
  const BUILTIN_THEME_ORDER = ['youya', 'qingxin', 'wennuan', 'shensui', 'jingdian', 'jijian'];
  let themePresetButtonsBound = false;
  const STORAGE_KEY = 'mp_md_formatter_v1';

  // ============ IndexedDB 图片存储（与 index.html 共用库名，便于数据互通） ============
  class ImageStore {
    constructor() {
      this.dbName = 'WechatEditorImages';
      this.storeName = 'images';
      this.version = 1;
      this.db = null;
    }
    async init() {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(this.dbName, this.version);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          this.db = request.result;
          resolve();
        };
        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains(this.storeName)) {
            const objectStore = db.createObjectStore(this.storeName, { keyPath: 'id' });
            objectStore.createIndex('createdAt', 'createdAt', { unique: false });
            objectStore.createIndex('name', 'name', { unique: false });
          }
        };
      });
    }
    async saveImage(id, blob, metadata = {}) {
      if (!this.db) await this.init();
      return new Promise((resolve, reject) => {
        const tx = this.db.transaction([this.storeName], 'readwrite');
        const objectStore = tx.objectStore(this.storeName);
        const imageData = {
          id,
          blob,
          name: metadata.name || 'image',
          originalSize: metadata.originalSize || 0,
          compressedSize: blob.size,
          createdAt: Date.now(),
          ...metadata,
        };
        const request = objectStore.put(imageData);
        request.onsuccess = () => resolve(id);
        request.onerror = () => reject(request.error);
      });
    }
    async getImage(id) {
      if (!this.db) await this.init();
      return new Promise((resolve, reject) => {
        const tx = this.db.transaction([this.storeName], 'readonly');
        const request = tx.objectStore(this.storeName).get(id);
        request.onsuccess = () => {
          const result = request.result;
          if (result && result.blob) resolve(URL.createObjectURL(result.blob));
          else resolve(null);
        };
        request.onerror = () => reject(request.error);
      });
    }
    async getImageBlob(id) {
      if (!this.db) await this.init();
      return new Promise((resolve, reject) => {
        const tx = this.db.transaction([this.storeName], 'readonly');
        const request = tx.objectStore(this.storeName).get(id);
        request.onsuccess = () => {
          const result = request.result;
          resolve(result && result.blob ? result.blob : null);
        };
        request.onerror = () => reject(request.error);
      });
    }
    async getImageRecord(id) {
      if (!this.db) await this.init();
      return new Promise((resolve, reject) => {
        const tx = this.db.transaction([this.storeName], 'readonly');
        const request = tx.objectStore(this.storeName).get(id);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
    }
  }

  class ImageCompressor {
    constructor(options = {}) {
      this.maxWidth = options.maxWidth || 1920;
      this.maxHeight = options.maxHeight || 1920;
      this.quality = options.quality || 0.85;
      this.mimeType = options.mimeType || 'image/jpeg';
    }
    async compress(file) {
      return new Promise((resolve, reject) => {
        if (file.type === 'image/gif' || file.type === 'image/svg+xml') {
          resolve(file);
          return;
        }
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('文件读取失败'));
        reader.onload = (e) => {
          const img = new Image();
          img.onerror = () => reject(new Error('图片加载失败'));
          img.onload = () => {
            try {
              const canvas = document.createElement('canvas');
              let width = img.width;
              let height = img.height;
              let scale = 1;
              if (width > this.maxWidth) scale = this.maxWidth / width;
              if (height > this.maxHeight) scale = Math.min(scale, this.maxHeight / height);
              width = Math.floor(width * scale);
              height = Math.floor(height * scale);
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              ctx.fillStyle = '#fff';
              ctx.fillRect(0, 0, width, height);
              ctx.drawImage(img, 0, 0, width, height);
              canvas.toBlob(
                (blob) => {
                  if (!blob) reject(new Error('Canvas toBlob 失败'));
                  else if (blob.size < file.size) resolve(blob);
                  else resolve(file);
                },
                file.type === 'image/png' ? 'image/png' : this.mimeType,
                this.quality
              );
            } catch (err) {
              reject(err);
            }
          };
          img.src = e.target.result;
        };
        reader.readAsDataURL(file);
      });
    }
    static formatSize(bytes) {
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
      return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }
  }

  const imageStore = new ImageStore();
  const imageCompressor = new ImageCompressor({ maxWidth: 1920, maxHeight: 1920, quality: 0.85 });
  /** @type {Set<string>} blob: URLs created for preview — revoked before each re-render */
  const activePreviewObjectUrls = new Set();
  let turndownService = null;

  function revokeAllPreviewObjectUrls() {
    activePreviewObjectUrls.forEach((u) => {
      try { URL.revokeObjectURL(u); } catch (_e) {}
    });
    activePreviewObjectUrls.clear();
  }

  function preprocessMarkdown(content) {
    if (!content) return content;
    content = content.replace(/^[ ]{0,3}(\*[ ]*\*[ ]*\*[\* ]*)[ \t]*$/gm, '***');
    content = content.replace(/^[ ]{0,3}(-[ ]*-[ ]*-[- ]*)[ \t]*$/gm, '---');
    content = content.replace(/^[ ]{0,3}(_[ ]*_[ ]*_[_ ]*)[ \t]*$/gm, '___');
    content = content.replace(/\*\*\s+\*\*/g, ' ');
    content = content.replace(/\*{4,}/g, '');
    content = content.replace(/\*\*([）」』》〉】〕〗］｝"'。，、；：？！])/g, '**\u200B$1');
    content = content.replace(/([（「『《〈【〔〖［｛"'])\*\*/g, '$1\u200B**');
    content = content.replace(/__\s+__/g, ' ');
    content = content.replace(/_{4,}/g, '');
    content = content.replace(/^(\s*(?:\d+\.|-|\*)\s+[^:\n]+)\n\s*:\s*(.+?)$/gm, '$1: $2');
    content = content.replace(/^(\s*(?:\d+\.|-|\*)\s+.+?:)\s*\n\s+(.+?)$/gm, '$1 $2');
    content = content.replace(/^(\s*(?:\d+\.|-|\*)\s+[^:\n]+)\n:\s*(.+?)$/gm, '$1: $2');
    content = content.replace(/^(\s*(?:\d+\.|-|\*)\s+.+?)\n\n\s+(.+?)$/gm, '$1 $2');
    return content;
  }

  async function processImageProtocol(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const images = doc.querySelectorAll('img');
    for (const img of images) {
      const src = img.getAttribute('src');
      if (src && src.startsWith('img://')) {
        const imageId = src.replace('img://', '');
        try {
          const objectURL = await imageStore.getImage(imageId);
          if (objectURL) {
            activePreviewObjectUrls.add(objectURL);
            img.setAttribute('src', objectURL);
            img.setAttribute('data-image-id', imageId);
          } else {
            img.setAttribute('src', 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="120"%3E%3Crect fill="%23eee" width="200" height="120"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em" font-size="12"%3E图片丢失%3C/text%3E%3C/svg%3E');
          }
        } catch (err) {
          console.warn('img:// 加载失败', imageId, err);
          img.setAttribute('src', 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="120"%3E%3Crect fill="%23fee" width="200" height="120"/%3E%3Ctext fill="%23c00" x="50%25" y="50%25" text-anchor="middle" dy=".3em" font-size="12"%3E加载失败%3C/text%3E%3C/svg%3E');
        }
      }
    }
    return doc.body.innerHTML;
  }

  function withTimeout(promise, ms, label) {
    return Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error(label || 'timeout')), ms)),
    ]);
  }

  async function recompressForClipboard(blob) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(blob);
      img.onload = () => {
        try {
          const maxDim = 1200;
          let w = img.naturalWidth;
          let h = img.naturalHeight;
          const ratio = Math.min(maxDim / w, maxDim / h, 1);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
          canvas.toBlob(
            (result) => {
              URL.revokeObjectURL(url);
              if (result && result.size < blob.size) resolve(result);
              else resolve(blob);
            },
            'image/jpeg',
            0.6
          );
        } catch (e) {
          URL.revokeObjectURL(url);
          reject(e);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('图片加载失败'));
      };
      img.src = url;
    });
  }

  async function compressForClipboard(blob, mimeType) {
    if (blob.size > 1024 * 1024 && mimeType !== 'image/gif') {
      try {
        return await recompressForClipboard(blob);
      } catch (_e) {
        return blob;
      }
    }
    return blob;
  }

  // ============ 默认设置 ============
  function defaultSettings() {
    return JSON.parse(JSON.stringify(THEMES.youya));
  }

  // ============ State ============
  let state = {
    md: '',
    settings: defaultSettings(),
    customThemes: {}, // { id: {name, settings} }
    currentThemeKey: 'youya', // youya | qingxin | wennuan | shensui | jingdian | jijian | custom:id
    settingsPaneCollapsed: false,
    scrollSyncEnabled: true,
  };

  // ============ Persistence ============
  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        md: state.md,
        settings: state.settings,
        customThemes: state.customThemes,
        currentThemeKey: state.currentThemeKey,
        settingsPaneCollapsed: state.settingsPaneCollapsed,
        scrollSyncEnabled: state.scrollSyncEnabled,
      }));
    } catch (e) {}
  }

  /** 非空白字符足够多才算「有正文」，避免仅空格/换行的脏数据跳过示例文 */
  function isValidMdContent(s) {
    if (!s || typeof s !== 'string') return false;
    if (s === 'false') return false;
    return s.replace(/\s/g, '').length >= 10;
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      // 只接受有效的 markdown 字符串（至少 10 个非空白字符）
      if (parsed.md && typeof parsed.md === 'string' && isValidMdContent(parsed.md)) {
        state.md = parsed.md;
      }
      if (parsed.settings) state.settings = parsed.settings;
      if (parsed.customThemes) state.customThemes = parsed.customThemes;
      if (parsed.currentThemeKey) state.currentThemeKey = parsed.currentThemeKey;
      // mint/retro 已移除 → 转为自定义主题存档，避免重复创建先检查是否已存在
      if (state.currentThemeKey === 'mint' || state.currentThemeKey === 'retro') {
        const archiveName = state.currentThemeKey === 'mint' ? '薄荷青绿（已存档）' : '酒红复古（已存档）';
        const existingId = Object.keys(state.customThemes).find(id => state.customThemes[id].name === archiveName);
        if (existingId) {
          state.currentThemeKey = 'custom:' + existingId;
        } else {
          const id = 'legacy_' + Date.now();
          state.customThemes[id] = {
            name: archiveName,
            settings: JSON.parse(JSON.stringify(state.settings)),
          };
          state.currentThemeKey = 'custom:' + id;
        }
        save();
      }
      if (typeof parsed.settingsPaneCollapsed === 'boolean') state.settingsPaneCollapsed = parsed.settingsPaneCollapsed;
      if (typeof parsed.scrollSyncEnabled === 'boolean') state.scrollSyncEnabled = parsed.scrollSyncEnabled;
      if (state.settings && state.settings.global && state.settings.global.maxWidth == null) {
        state.settings.global.maxWidth = 335;
      }
      normalizeBlockquoteColors();
      migrateBuiltInThemeKey();
      return true;
    } catch (e) { return false; }
  }

  /** 旧版 5 主题等键名 → 当前 6 主题；无效键回退 youya */
  function migrateBuiltInThemeKey() {
    const legacy = {
      shujuan: 'wennuan',
      keji: 'youya',
      hupo: 'wennuan',
      zhenghong: 'jingdian',
      claude: 'youya',
      minimal: 'jijian',
      tech: 'youya',
      warm: 'wennuan',
      hong: 'jingdian',
    };
    const k = state.currentThemeKey;
    if (!k || k.startsWith('custom:')) return;
    const nk = THEMES[k] ? k : (legacy[k] && THEMES[legacy[k]] ? legacy[k] : 'youya');
    if (nk !== k) {
      state.currentThemeKey = nk;
      state.settings = JSON.parse(JSON.stringify(THEMES[nk]));
      syncBoldColorToBrand();
      normalizeBlockquoteColors();
      save();
    } else if (!THEMES[k]) {
      state.currentThemeKey = 'youya';
      state.settings = JSON.parse(JSON.stringify(THEMES.youya));
      syncBoldColorToBrand();
      normalizeBlockquoteColors();
      save();
    }
  }

  // ============ 示例文章 ============
  // 唯一数据源：同目录 sample.md（fetch）。本地请用静态服务打开目录，否则浏览器无法读本地文件。
  // 可选：在 index.html 里增加 <script type="text/plain" id="editor-sample-md">…</script>（勿含 </script> 字样），会作为第二顺位。
  const SAMPLE_MD_FALLBACK =
    '# Markdown 排版器\n\n' +
    '未能加载 `sample.md`。请在本目录执行 `python3 -m http.server` 后用 **http://** 打开页面；直接 **file://** 打开时浏览器禁止读取同目录文件。\n\n' +
    '[GitHub · article-tools](https://github.com/zhijunio/article-tools)';

  let sampleMdPromise = null;
  function loadSampleMd() {
    if (sampleMdPromise) return sampleMdPromise;
    sampleMdPromise = (async () => {
      try {
        const url = new URL('sample.md', window.location.href);
        const res = await fetch(url.toString(), { cache: 'no-cache' });
        if (res.ok) {
          const text = await res.text();
          if (isValidMdContent(text)) return text;
        }
      } catch (e) {
        console.warn('加载 sample.md 失败', e);
      }
      const embedded = document.getElementById('editor-sample-md');
      if (embedded && isValidMdContent(embedded.textContent)) {
        return embedded.textContent;
      }
      return SAMPLE_MD_FALLBACK;
    })();
    return sampleMdPromise;
  }

  // ============ 渲染预览 ============
  async function renderPreview() {
    revokeAllPreviewObjectUrls();
    const md = preprocessMarkdown(state.md || '');
    let html = window.renderMarkdown(md, state.settings);
    try {
      html = await processImageProtocol(html);
    } catch (e) {
      console.warn('processImageProtocol', e);
    }
    const box = document.getElementById('preview-content');
    if (box) box.innerHTML = html;
    applyPreviewBg();
    updateMeta();
    save();
    const editor = document.getElementById('editor');
    const preview = document.getElementById('preview-scroll-root');
    if (editor && preview) {
      requestAnimationFrame(() => syncScrollRatio(editor, preview));
    }
  }

  function applyPreviewBg() {
    const frame = document.querySelector('.preview-frame');
    if (frame && state.settings.global && state.settings.global.bg) {
      frame.style.background = state.settings.global.bg;
    }
  }

  /** 跳过围栏代码块，取首个 ATX 一级标题行（单独一个 #） */
  function extractFirstH1FromMarkdown(md) {
    if (!md || typeof md !== 'string') return '';
    const lines = md.split(/\r?\n/);
    let inFence = false;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim().startsWith('```')) {
        inFence = !inFence;
        continue;
      }
      if (inFence) continue;
      const m = line.match(/^\s{0,3}#(?!#)\s*(.*)$/);
      if (m) {
        const t = m[1].trim().replace(/\s+#+\s*$/, '');
        if (t) return t;
      }
    }
    return '';
  }

  /** 标题栏展示用：去掉常见行内 md 符号 */
  function titlePlainForPreview(line) {
    if (!line) return '';
    let s = String(line);
    s = s.replace(/\*\*([^*]+)\*\*/g, '$1');
    s = s.replace(/\*([^*]+)\*/g, '$1');
    s = s.replace(/`([^`]+)`/g, '$1');
    s = s.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
    return s.trim() || '';
  }

  function updateMeta() {
    const md = state.md || '';
    const text = md.replace(/[#*_`~\->[\]()]/g, '');
    const chars = text.replace(/\s/g, '').length;
    const el = document.getElementById('meta-chars');
    if (el) el.textContent = chars + ' 字';

    const titleEl = document.getElementById('preview-article-title');
    if (titleEl) {
      const h1 = extractFirstH1FromMarkdown(md);
      titleEl.textContent = h1 ? titlePlainForPreview(h1) : '文章标题';
    }
  }

  // ============ Toast ============
  let toastTimer;
  function toast(msg, durationMs) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), durationMs || 1800);
  }

  function blobToDataURL(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  async function imageUrlToDataURL(url) {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error('图片加载失败：' + res.status);
    }
    const blob = await res.blob();
    return blobToDataURL(blob);
  }

  async function convertImageNodeToDataURL(img) {
    const imageId = img.getAttribute('data-image-id');
    if (imageId) {
      try {
        const record = await withTimeout(imageStore.getImageRecord(imageId), 8000, 'IndexedDB 读取超时');
        if (record && record.blob) {
          const mime = record.mimeType || record.blob.type || 'image/jpeg';
          const processed = await compressForClipboard(record.blob, mime);
          return blobToDataURL(processed);
        }
      } catch (e) {
        console.warn('本地图转 Base64 失败', imageId, e);
      }
    }
    const src = (img.getAttribute('src') || '').trim();
    if (!src) return null;
    if (src.startsWith('data:image/')) return src;
    if (src.startsWith('blob:')) {
      try {
        const res = await fetch(src);
        const blob = await res.blob();
        const processed = await compressForClipboard(blob, blob.type || 'image/jpeg');
        return blobToDataURL(processed);
      } catch (e) {
        console.warn('blob 图转 Base64 失败', e);
        return null;
      }
    }
    const absoluteUrl = new URL(src, window.location.href).href;
    return imageUrlToDataURL(absoluteUrl);
  }

  async function buildWechatCopyPayload() {
    const preview = document.getElementById('preview-content');
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div id="copy-root">${preview.innerHTML}</div>`, 'text/html');
    const root = doc.getElementById('copy-root');

    Array.from(root.querySelectorAll('a[href]')).forEach((a) => {
      const href = (a.getAttribute('href') || '').trim();
      let text = (a.textContent || '').trim();
      if (!text) {
        const image = a.querySelector('img');
        if (image) text = (image.getAttribute('alt') || '').trim() || '图片';
      }
      if (!href && !text) {
        a.remove();
        return;
      }
      const plain = href && text ? `${text} ${href}` : href || text;
      a.parentNode.replaceChild(doc.createTextNode(plain), a);
    });

    const images = Array.from(root.querySelectorAll('img'));
    let successCount = 0;
    let failCount = 0;
    for (const img of images) {
      try {
        const dataURL = await convertImageNodeToDataURL(img);
        if (dataURL) {
          img.setAttribute('src', dataURL);
          successCount++;
        }
      } catch (error) {
        failCount++;
        console.warn('图片转 Base64 失败:', img.getAttribute('src'), error);
      }
    }

    return {
      html: root.innerHTML,
      plain: root.innerText || root.textContent || '',
      imageCount: images.length,
      successCount,
      failCount,
    };
  }

  function clipboardFallback(html) {
    const container = document.createElement('div');
    container.contentEditable = 'true';
    container.innerHTML = html;
    container.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0;';
    document.body.appendChild(container);

    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(container);
    sel.removeAllRanges();
    sel.addRange(range);
    document.execCommand('copy');
    sel.removeAllRanges();
    container.remove();
  }

  function syncScrollRatio(from, to) {
    const maxFrom = from.scrollHeight - from.clientHeight;
    const ratio = maxFrom > 0 ? from.scrollTop / maxFrom : 0;
    const maxTo = to.scrollHeight - to.clientHeight;
    to.scrollTop = ratio * Math.max(0, maxTo);
  }

  function bindScrollSync() {
    const editor = document.getElementById('editor');
    const preview = document.getElementById('preview-scroll-root');
    if (!editor || !preview) return;

    let locked = false;
    const sync = (from, to) => {
      if (!state.scrollSyncEnabled) return;
      if (locked) return;
      locked = true;
      syncScrollRatio(from, to);
      requestAnimationFrame(() => {
        locked = false;
      });
    };

    editor.addEventListener('scroll', () => sync(editor, preview), { passive: true });
    preview.addEventListener('scroll', () => sync(preview, editor), { passive: true });
  }

  function updateScrollSyncUI() {
    const track = document.getElementById('sync-scroll-track');
    const btn = document.getElementById('sync-scroll-switch');
    if (track) track.classList.toggle('on', state.scrollSyncEnabled);
    if (btn) btn.setAttribute('aria-pressed', String(state.scrollSyncEnabled));
  }

  function toggleScrollSync() {
    state.scrollSyncEnabled = !state.scrollSyncEnabled;
    updateScrollSyncUI();
    save();
  }

  function setSettingsPaneCollapsed(collapsed) {
    state.settingsPaneCollapsed = collapsed;
    const main = document.querySelector('.main');
    const toggle = document.getElementById('settings-toggle');
    if (main) {
      main.classList.toggle('settings-collapsed', collapsed);
    }
    if (toggle) {
      toggle.setAttribute('aria-expanded', String(!collapsed));
      toggle.setAttribute('aria-label', collapsed ? '展开样式调节' : '折叠样式调节');
      toggle.textContent = '▸';
    }
    save();
  }

  // ============ 复制 ============
  async function copyRichText() {
    try {
      const previewEl = document.getElementById('preview-content');
      const imgN = previewEl ? previewEl.querySelectorAll('img').length : 0;
      if (imgN > 0) toast('正在处理图片…', 12000);
      const payload = await buildWechatCopyPayload();
      if (navigator.clipboard && window.ClipboardItem) {
        const item = new ClipboardItem({
          'text/html': new Blob([payload.html], { type: 'text/html' }),
          'text/plain': new Blob([payload.plain], { type: 'text/plain' }),
        });
        await navigator.clipboard.write([item]);
      } else {
        clipboardFallback(payload.html);
      }
      if (payload.imageCount > 0 && payload.failCount > 0) {
        toast(`✓ 已复制到公众号，${payload.failCount} 张图片保留原链接`);
      } else {
        toast('✓ 已复制到公众号');
      }
    } catch (e) {
      toast('复制失败：' + e.message);
    }
  }

  async function copyHTML() {
    const html = document.getElementById('preview-content').innerHTML;
    try {
      await navigator.clipboard.writeText(html);
      toast('✓ 已复制 HTML 源码');
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = html;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      toast('✓ 已复制 HTML 源码');
    }
  }

  // ============ 主题切换 ============
  function syncBoldColorToBrand() {
    if (state.settings?.bold) {
      state.settings.bold.color = state.settings.global?.brand;
    }
  }

  /** 引用正文/背景固定为黑字白底，同步到 state 便于导出 JSON 一致 */
  function normalizeBlockquoteColors() {
    if (!state.settings?.blockquote) return;
    const bq = state.settings.blockquote;
    bq.textColor = '#000000';
    bq.bgColor = '#FFFFFF';
    delete bq.color;
  }

  function applyTheme(key) {
    state.currentThemeKey = key;
    if (key.startsWith('custom:')) {
      const id = key.slice(7);
      if (state.customThemes[id]) {
        state.settings = JSON.parse(JSON.stringify(state.customThemes[id].settings));
      }
    } else if (THEMES[key]) {
      state.settings = JSON.parse(JSON.stringify(THEMES[key]));
    }
    syncBoldColorToBrand();
    normalizeBlockquoteColors();
    renderPreview();
    buildSettingsPanel();
    updateThemeSelect();
  }

  function updateThemeDescription() {
    const el = document.getElementById('theme-desc');
    if (!el) return;
    if (state.currentThemeKey.startsWith('custom:')) {
      el.textContent = '自定义 · 侧栏底部可管理、导出 JSON';
      return;
    }
    const t = THEMES[state.currentThemeKey];
    el.textContent = t?.desc ?? '';
  }

  function updateThemeSelect() {
    const row = document.getElementById('theme-preset-btns');
    if (row) {
      if (!themePresetButtonsBound) {
        row.innerHTML = '';
        BUILTIN_THEME_ORDER.forEach((k) => {
          const t = THEMES[k];
          if (!t) return;
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'theme-preset-btn';
          btn.dataset.themeKey = k;
          btn.setAttribute('role', 'radio');
          btn.setAttribute('aria-checked', 'false');
          btn.title = t.name;
          btn.setAttribute('aria-label', t.desc ? `${t.name}。${t.desc}` : t.name);
          if (t.global && t.global.brand) btn.style.setProperty('--chip', t.global.brand);
          btn.addEventListener('click', () => applyTheme(k));
          row.appendChild(btn);
        });
        themePresetButtonsBound = true;
      }
      row.querySelectorAll('.theme-preset-btn').forEach((btn) => {
        const k = btn.dataset.themeKey;
        const on = state.currentThemeKey === k;
        btn.classList.toggle('is-active', on);
        btn.setAttribute('aria-checked', on ? 'true' : 'false');
      });
    }

    const customSel = document.getElementById('theme-select-custom');
    if (customSel) {
      customSel.innerHTML = '';
      const entries = Object.entries(state.customThemes);
      if (entries.length) {
        const ph = document.createElement('option');
        ph.value = '';
        ph.textContent = '已存…';
        customSel.appendChild(ph);
        entries.forEach(([id, t]) => {
          const opt = document.createElement('option');
          opt.value = 'custom:' + id;
          opt.textContent = t.name;
          opt.title = t.name;
          customSel.appendChild(opt);
        });
        customSel.hidden = false;
        if (state.currentThemeKey.startsWith('custom:')) {
          customSel.value = state.currentThemeKey;
        } else {
          customSel.value = '';
        }
      } else {
        customSel.hidden = true;
        customSel.value = '';
      }
    }

    updateThemeDescription();
  }

  // ============ 保存自定义主题 ============
  function saveCustomTheme(name) {
    const id = 'c_' + Date.now();
    state.customThemes[id] = {
      name: name,
      settings: JSON.parse(JSON.stringify(state.settings)),
    };
    state.currentThemeKey = 'custom:' + id;
    save();
    updateThemeSelect();
    toast('✓ 主题「' + name + '」已保存');
  }

  function deleteCustomTheme(id) {
    delete state.customThemes[id];
    if (state.currentThemeKey === 'custom:' + id) {
      state.currentThemeKey = 'youya';
      applyTheme('youya');
    }
    save();
    updateThemeSelect();
    renderThemeList();
  }

  function renameCustomTheme(id, newName) {
    if (state.customThemes[id]) {
      state.customThemes[id].name = newName;
      save();
      updateThemeSelect();
      renderThemeList();
    }
  }

  function renderThemeList() {
    const wrap = document.getElementById('theme-list');
    if (!wrap) return;
    wrap.innerHTML = '';
    const entries = Object.entries(state.customThemes);
    if (!entries.length) {
      wrap.innerHTML = '<div style="font-size:11.5px; color:var(--ink-faint); padding:6px 2px;">尚无自定义主题。调整样式后点击「保存当前主题」。</div>';
      return;
    }
    entries.forEach(([id, t]) => {
      const item = document.createElement('div');
      item.className = 'theme-list-item';
      item.innerHTML = `
        <span class="name">${t.name}</span>
        <span class="controls">
          <button data-act="apply">应用</button>
          <button data-act="rename">重命名</button>
          <button data-act="del" class="del">删除</button>
        </span>
      `;
      item.querySelector('[data-act="apply"]').addEventListener('click', () => applyTheme('custom:' + id));
      item.querySelector('[data-act="rename"]').addEventListener('click', () => {
        const n = prompt('新名称', t.name);
        if (n && n.trim()) renameCustomTheme(id, n.trim());
      });
      item.querySelector('[data-act="del"]').addEventListener('click', () => {
        if (confirm('删除主题「' + t.name + '」？')) deleteCustomTheme(id);
      });
      wrap.appendChild(item);
    });
  }

  // ============ 导入/导出 JSON ============
  function exportJSON() {
    const data = {
      version: 1,
      currentSettings: state.settings,
      customThemes: state.customThemes,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'mp-theme-' + Date.now() + '.json';
    a.click();
    toast('✓ 已导出主题文件');
  }

  function importJSON(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (data.customThemes) {
          Object.assign(state.customThemes, data.customThemes);
        }
        if (data.currentSettings) {
          const id = 'import_' + Date.now();
          state.customThemes[id] = {
            name: '导入的主题',
            settings: JSON.parse(JSON.stringify(data.currentSettings)),
          };
          state.settings = JSON.parse(JSON.stringify(data.currentSettings));
          state.currentThemeKey = 'custom:' + id;
          syncBoldColorToBrand();
          normalizeBlockquoteColors();
        }
        save();
        renderPreview();
        buildSettingsPanel();
        updateThemeSelect();
        renderThemeList();
        toast('✓ 导入完成');
      } catch (e) {
        toast('导入失败：JSON 格式错误');
      }
    };
    reader.readAsText(file);
  }

  // ============ Turndown + 智能粘贴 / 拖拽图片 ============
  function initTurndownService() {
    if (typeof TurndownService === 'undefined') {
      console.warn('Turndown 未加载，富文本粘贴将使用纯文本');
      return;
    }
    turndownService = new TurndownService({
      headingStyle: 'atx',
      bulletListMarker: '-',
      codeBlockStyle: 'fenced',
      fence: '```',
      emDelimiter: '*',
      strongDelimiter: '**',
      linkStyle: 'inlined',
    });
    turndownService.keep(['table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td']);
    turndownService.addRule('table', {
      filter: 'table',
      replacement: (_content, node) => {
        const rows = Array.from(node.querySelectorAll('tr'));
        if (rows.length === 0) return '';
        let markdown = '\n\n';
        let headerProcessed = false;
        rows.forEach((row, index) => {
          const cells = Array.from(row.querySelectorAll('td, th'));
          const cellContents = cells.map((cell) => cell.textContent.replace(/\n/g, ' ').trim());
          if (cellContents.length > 0) {
            markdown += '| ' + cellContents.join(' | ') + ' |\n';
            if (index === 0 || (!headerProcessed && row.querySelector('th'))) {
              markdown += '| ' + cells.map(() => '---').join(' | ') + ' |\n';
              headerProcessed = true;
            }
          }
        });
        return markdown + '\n';
      },
    });
    turndownService.addRule('image', {
      filter: 'img',
      replacement: (_content, node) => {
        const alt = node.alt || '图片';
        const src = node.src || '';
        const title = node.title || '';
        if (src.startsWith('data:image')) {
          const type = src.match(/data:image\/(\w+);/)?.[1] || 'image';
          return `![${alt}](data:image/${type};base64,...)${title ? ` "${title}"` : ''}\n`;
        }
        return `![${alt}](${src})${title ? ` "${title}"` : ''}\n`;
      },
    });
  }

  function isMarkdown(text) {
    if (!text) return false;
    const patterns = [
      /^#{1,6}\s+/m,
      /\*\*[^*]+\*\*/,
      /\*[^*\n]+\*/,
      /\[[^\]]+\]\([^)]+\)/,
      /!\[[^\]]*\]\([^)]+\)/,
      /^[\*\-\+]\s+/m,
      /^\d+\.\s+/m,
      /^>\s+/m,
      /`[^`]+`/,
      /```[\s\S]*?```/,
      /^\|.*\|$/m,
      /<!--.*?-->/,
      /^---+$/m,
    ];
    const matchCount = patterns.filter((pattern) => pattern.test(text)).length;
    return matchCount >= 2 || text.includes('<!-- img:');
  }

  /** 粘贴场景：纯文本是否已是 Markdown 源码（含短片段，避免再走 HTML→Turndown） */
  function isLikelyMarkdownSource(text) {
    if (!text) return false;
    if (isMarkdown(text)) return true;
    const t = text.trim();
    if (t.length < 2) return false;
    if (/^#{1,6}\s+/m.test(t)) return true;
    if (/```/.test(t)) return true;
    if (/^\s*[\*\-\+]\s+/m.test(t)) return true;
    if (/^\s*\d+\.\s+/m.test(t)) return true;
    if (/^>\s+/m.test(t)) return true;
    if (/\[[^\]]+\]\([^)]+\)/.test(t) || /!\[[^\]]*\]\([^)]+\)/.test(t)) return true;
    if (/^---+$/m.test(t)) return true;
    return false;
  }

  function isIDEFormattedHTML(htmlData, textData) {
    if (!htmlData || !textData) return false;
    const ideSignatures = [
      /<meta\s+charset=['"]utf-8['"]/i,
      /<div\s+class=["']ace_line["']/,
      /style=["'][^"']*font-family:\s*['"]?(?:Consolas|Monaco|Menlo|Courier)/i,
      function (html) {
        const hasDivSpan = /<(?:div|span)[\s>]/.test(html);
        const hasSemanticTags = /<(?:p|h[1-6]|strong|em|ul|ol|li|blockquote)[\s>]/i.test(html);
        return hasDivSpan && !hasSemanticTags;
      },
      function (html) {
        const strippedHtml = html.replace(/<[^>]+>/g, '').trim();
        return strippedHtml === textData.trim();
      },
    ];
    let matchCount = 0;
    for (const signature of ideSignatures) {
      if (typeof signature === 'function') {
        if (signature(htmlData)) matchCount++;
      } else if (signature.test(htmlData)) {
        matchCount++;
      }
    }
    return matchCount >= 2;
  }

  function insertTextAtCursor(textarea, text) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    if (typeof textarea.setRangeText === 'function') {
      textarea.focus();
      textarea.setRangeText(text, start, end, 'end');
    } else {
      const value = textarea.value;
      textarea.value = value.substring(0, start) + text + value.substring(end);
    }
    state.md = textarea.value;
    const pos = start + text.length;
    textarea.selectionStart = textarea.selectionEnd = pos;
    textarea.focus();
    renderPreview();
  }

  function getLineBounds(value, cursorPos) {
    let a = cursorPos;
    while (a > 0 && value[a - 1] !== '\n') a--;
    let b = cursorPos;
    while (b < value.length && value[b] !== '\n') b++;
    return [a, b];
  }

  /**
   * 用 setRangeText 替换选区，便于 **Ctrl/⌘+Z 按步撤销**；直写 value 在多数浏览器会冲掉撤销栈。
   */
  function replaceEditorRange(textarea, start, end, text) {
    if (typeof textarea.setRangeText === 'function') {
      textarea.focus();
      textarea.setRangeText(text, start, end, 'end');
    } else {
      const v = textarea.value;
      textarea.value = v.substring(0, start) + text + v.substring(end);
    }
    state.md = textarea.value;
    return start + text.length;
  }

  function wrapEditorSelection(textarea, before, after, emptyLabel) {
    const s0 = textarea.selectionStart;
    const s1 = textarea.selectionEnd;
    const v = textarea.value;
    const sel = v.substring(s0, s1);
    const mid = sel || emptyLabel;
    const ins = before + mid + after;
    const endPos = replaceEditorRange(textarea, s0, s1, ins);
    if (!sel && emptyLabel) {
      textarea.selectionStart = s0 + before.length;
      textarea.selectionEnd = s0 + before.length + emptyLabel.length;
    } else {
      textarea.selectionStart = s0;
      textarea.selectionEnd = endPos;
    }
    renderPreview();
  }

  /**
   * 两侧相同、定长标记（**、~~）：再按同快捷键可取消
   * @param {string} m  如 '**' 或 '~~'，m.length === 2d，前后各 d 个字符
   */
  function togglePairedDelimiters(textarea, m, emptyLabel) {
    const s0 = textarea.selectionStart;
    const s1 = textarea.selectionEnd;
    const v = textarea.value;
    const d = m.length;
    const sel = v.substring(s0, s1);
    if (s0 < s1) {
      if (sel.startsWith(m) && sel.endsWith(m) && sel.length > 2 * d) {
        const inner = sel.slice(d, -d);
        replaceEditorRange(textarea, s0, s1, inner);
        textarea.selectionStart = s0;
        textarea.selectionEnd = s0 + inner.length;
        renderPreview();
        return;
      }
      if (s0 >= d && s1 + d <= v.length && v.substring(s0 - d, s0) === m && v.substring(s1, s1 + d) === m) {
        const inner = v.substring(s0, s1);
        replaceEditorRange(textarea, s0 - d, s1 + d, inner);
        const i0 = s0 - d;
        textarea.selectionStart = i0;
        textarea.selectionEnd = i0 + inner.length;
        renderPreview();
        return;
      }
      wrapEditorSelection(textarea, m, m, emptyLabel);
      return;
    }
    const pos = s0;
    for (let L = 0; L < v.length; ) {
      const open = v.indexOf(m, L);
      if (open === -1) break;
      const close = v.indexOf(m, open + d);
      if (close === -1) break;
      const endSpan = close + d;
      if (pos >= open && pos < endSpan) {
        const inner = v.substring(open + d, close);
        replaceEditorRange(textarea, open, endSpan, inner);
        const c = open + inner.length;
        textarea.selectionStart = c;
        textarea.selectionEnd = c;
        renderPreview();
        return;
      }
      L = endSpan;
    }
    wrapEditorSelection(textarea, m, m, emptyLabel);
  }

  function toggleBoldAtSelection(textarea) {
    togglePairedDelimiters(textarea, '**', '加粗');
  }

  /** 斜体 *…*，跳过 **；再按 I 可取消 */
  function toggleItalicAtSelection(textarea) {
    const s0 = textarea.selectionStart;
    const s1 = textarea.selectionEnd;
    const v = textarea.value;
    const sel = v.substring(s0, s1);
    if (s0 < s1) {
      if (sel.length >= 2 && !sel.startsWith('**') && !sel.endsWith('**') && sel[0] === '*' && sel[sel.length - 1] === '*') {
        if (sel.length < 2 || (sel[1] !== '*' && sel[sel.length - 2] !== '*')) {
          const inner = sel.slice(1, -1);
          replaceEditorRange(textarea, s0, s1, inner);
          textarea.selectionStart = s0;
          textarea.selectionEnd = s0 + inner.length;
          renderPreview();
          return;
        }
      }
      if (s0 >= 1 && s1 + 1 <= v.length && v[s0 - 1] === '*' && v[s1] === '*' && (s0 < 2 || v[s0 - 2] !== '*') && (s1 + 1 >= v.length || v[s1 + 1] !== '*')) {
        const inner = v.substring(s0, s1);
        replaceEditorRange(textarea, s0 - 1, s1 + 1, inner);
        const i0 = s0 - 1;
        textarea.selectionStart = i0;
        textarea.selectionEnd = i0 + inner.length;
        renderPreview();
        return;
      }
      wrapEditorSelection(textarea, '*', '*', '斜体');
      return;
    }
    const pos = s0;
    for (let i = 0; i < v.length; ) {
      if (i + 1 < v.length && v[i] === '*' && v[i + 1] === '*') {
        i += 2;
        continue;
      }
      if (v[i] !== '*') {
        i++;
        continue;
      }
      const L = i;
      let j = L + 1;
      let R = -1;
      while (j < v.length) {
        if (j + 1 < v.length && v[j] === '*' && v[j + 1] === '*') {
          j += 2;
          continue;
        }
        if (v[j] === '*') {
          R = j;
          break;
        }
        j++;
      }
      if (R === -1) break;
      const endSpan = R + 1;
      if (pos >= L && pos < endSpan) {
        const inner = v.substring(L + 1, R);
        replaceEditorRange(textarea, L, endSpan, inner);
        const c = L + inner.length;
        textarea.selectionStart = c;
        textarea.selectionEnd = c;
        renderPreview();
        return;
      }
      i = endSpan;
    }
    wrapEditorSelection(textarea, '*', '*', '斜体');
  }

  function toggleStrikethroughAtSelection(textarea) {
    togglePairedDelimiters(textarea, '~~', '删除');
  }

  /** 行内 `，跳过 ``` 围栏；再按 ` 可取消 */
  function toggleInlineCodeAtSelection(textarea) {
    const s0 = textarea.selectionStart;
    const s1 = textarea.selectionEnd;
    const v = textarea.value;
    const sel = v.substring(s0, s1);
    if (s0 < s1) {
      if (sel[0] === '`' && sel[sel.length - 1] === '`' && sel.length > 1 && !sel.startsWith('``') && !sel.endsWith('``')) {
        const inner = sel.slice(1, -1);
        if (!inner.includes('`')) {
          replaceEditorRange(textarea, s0, s1, inner);
          textarea.selectionStart = s0;
          textarea.selectionEnd = s0 + inner.length;
          renderPreview();
          return;
        }
      }
      if (s0 >= 1 && s1 + 1 <= v.length && v[s0 - 1] === '`' && v[s1] === '`' && v[s0] !== '`' && v[s1 - 1] !== '`') {
        const inner = v.substring(s0, s1);
        if (!inner.includes('`')) {
          replaceEditorRange(textarea, s0 - 1, s1 + 1, inner);
          const i0 = s0 - 1;
          textarea.selectionStart = i0;
          textarea.selectionEnd = i0 + inner.length;
          renderPreview();
          return;
        }
      }
      wrapEditorSelection(textarea, '`', '`', 'code');
      return;
    }
    const pos = s0;
    const n = v.length;
    let i = 0;
    while (i < n) {
      if (i + 2 < n && v[i] === '`' && v[i + 1] === '`' && v[i + 2] === '`') {
        const e = v.indexOf('```', i + 3);
        if (e === -1) { i = n; break; }
        i = e + 3;
        continue;
      }
      if (v[i] !== '`') {
        i++;
        continue;
      }
      if (i + 1 < n && v[i] === '`' && v[i + 1] === '`') {
        i += 2;
        continue;
      }
      const L = i;
      let R = v.indexOf('`', L + 1);
      while (R !== -1) {
        if (R + 2 < n && v[R] === '`' && v[R + 1] === '`' && v[R + 2] === '`') {
          R = v.indexOf('`', R + 1);
          continue;
        }
        break;
      }
      if (R === -1) break;
      const endSpan = R + 1;
      if (pos >= L && pos < endSpan) {
        const inner = v.substring(L + 1, R);
        replaceEditorRange(textarea, L, endSpan, inner);
        const c = L + inner.length;
        textarea.selectionStart = c;
        textarea.selectionEnd = c;
        renderPreview();
        return;
      }
      i = endSpan;
    }
    wrapEditorSelection(textarea, '`', '`', 'code');
  }

  /**
   * 从 t0 处的 `[` 起解析为 `[text](url)`；url 内可含成对括号
   * @returns {{ start: number, end: number, text: string, href: string } | null}
   */
  function tryParseMdInlineLinkAt(v, t0) {
    if (t0 < 0 || t0 >= v.length || v[t0] !== '[') return null;
    const mid = v.indexOf('](', t0);
    if (mid === -1) return null;
    const textPart = v.substring(t0 + 1, mid);
    let d = 0;
    for (let i = mid + 2; i < v.length; i++) {
      const c = v[i];
      if (c === '(') d++;
      else if (c === ')') {
        if (d === 0) {
          return { start: t0, end: i + 1, text: textPart, href: v.substring(mid + 2, i) };
        }
        d--;
      }
    }
    return null;
  }

  /** 选区/光标若完全落在同一段行内 [text](url) 上则返回其范围 */
  function findEnclosingMdLinkAt(v, a, b) {
    const s0 = Math.min(a, b);
    const s1 = Math.max(a, b);
    for (let t0 = s0; t0 >= 0; t0--) {
      if (v[t0] !== '[') continue;
      const link = tryParseMdInlineLinkAt(v, t0);
      if (!link) continue;
      if (a === b) {
        if (a >= link.start && a < link.end) return link;
      } else {
        if (s0 >= link.start && s1 <= link.end) return link;
      }
    }
    return null;
  }

  /** 链接 [text](url) 已存在则去 Markdown、只留文案；否则插入链接 */
  function toggleLinkAtSelection(textarea) {
    const s0 = textarea.selectionStart;
    const s1 = textarea.selectionEnd;
    const v = textarea.value;
    if (s0 < s1) {
      if (v[s0] === '[') {
        const link = tryParseMdInlineLinkAt(v, s0);
        if (link && link.end === s1) {
          replaceEditorRange(textarea, s0, s1, link.text);
          textarea.selectionStart = s0;
          textarea.selectionEnd = s0 + link.text.length;
          renderPreview();
          return;
        }
      }
      const encl = findEnclosingMdLinkAt(v, s0, s1);
      if (encl) {
        replaceEditorRange(textarea, encl.start, encl.end, encl.text);
        const c0 = encl.start;
        textarea.selectionStart = c0;
        textarea.selectionEnd = c0 + encl.text.length;
        renderPreview();
        return;
      }
      insertLinkAtSelection(textarea);
      return;
    }
    const cur = findEnclosingMdLinkAt(v, s0, s0);
    if (cur) {
      replaceEditorRange(textarea, cur.start, cur.end, cur.text);
      const c = cur.start + cur.text.length;
      textarea.selectionStart = c;
      textarea.selectionEnd = c;
      renderPreview();
      return;
    }
    insertLinkAtSelection(textarea);
  }

  function insertLinkAtSelection(textarea) {
    const s0 = textarea.selectionStart;
    const s1 = textarea.selectionEnd;
    const v = textarea.value;
    const sel = v.substring(s0, s1);
    if (sel) {
      const ins = `[${sel}](https://)`;
      replaceEditorRange(textarea, s0, s1, ins);
      const pos = s0 + ins.length - 1;
      textarea.selectionStart = pos;
      textarea.selectionEnd = pos;
    } else {
      const ins = '[链接文字](https://)';
      replaceEditorRange(textarea, s0, s1, ins);
      textarea.selectionStart = s0 + 1;
      textarea.selectionEnd = s0 + 1 + 4;
    }
    renderPreview();
  }

  /** 当前行标题层级 0–4，与 setCurrentLineHeading 的 # 条带一致 */
  function lineHeadingLevelAndContent(line) {
    const content = line.replace(/^\s{0,3}#{0,4}\s*/, '');
    const led = line.length - content.length;
    if (led === 0) return { level: 0, content: line };
    const mt = line.match(/^\s{0,3}(#+)/);
    if (!mt) return { level: 0, content: line };
    return { level: Math.min(4, mt[1].length), content };
  }

  function setCurrentLineHeading(textarea, level) {
    if (level < 0 || level > 4) return;
    const v = textarea.value;
    const pos = textarea.selectionStart;
    const [l0, l1] = getLineBounds(v, pos);
    const line = v.substring(l0, l1);
    const { level: cur, content } = lineHeadingLevelAndContent(line);
    if (level > 0 && cur === level) {
      const newLine = content;
      replaceEditorRange(textarea, l0, l1, newLine);
      textarea.selectionStart = textarea.selectionEnd = l0 + newLine.length;
      renderPreview();
      return;
    }
    const newLine = level === 0
      ? content
      : (content ? '#'.repeat(level) + ' ' + content : '#'.repeat(level) + ' ');
    replaceEditorRange(textarea, l0, l1, newLine);
    textarea.selectionStart = textarea.selectionEnd = l0 + newLine.length;
    renderPreview();
  }

  function toggleBlockquoteAtLine(textarea) {
    const v = textarea.value;
    const pos = textarea.selectionStart;
    const [l0, l1] = getLineBounds(v, pos);
    const line = v.substring(l0, l1);
    const newLine = /^\s*>/.test(line)
      ? line.replace(/^\s*>\s?/, '')
      : (line.trim() === '' ? '> ' : `> ${line.replace(/^\s*>\s*/, '')}`);
    replaceEditorRange(textarea, l0, l1, newLine);
    textarea.selectionStart = textarea.selectionEnd = l0 + newLine.length;
    renderPreview();
  }

  function insertFencedCodeBlock(textarea) {
    const s0 = textarea.selectionStart;
    const s1 = textarea.selectionEnd;
    const v = textarea.value;
    const sel = v.substring(s0, s1);
    const block = '```\n' + (sel || '') + '\n```\n';
    replaceEditorRange(textarea, s0, s1, block);
    if (!sel) {
      textarea.selectionStart = s0 + 4;
      textarea.selectionEnd = s0 + 4;
    } else {
      textarea.selectionStart = s0;
      textarea.selectionEnd = s0 + block.length;
    }
    renderPreview();
  }

  /** 选区为完整 ```…``` 时拆围栏，否则包一层 */
  function toggleFencedCodeAtSelection(textarea) {
    const s0 = textarea.selectionStart;
    const s1 = textarea.selectionEnd;
    const v = textarea.value;
    if (s0 < s1) {
      const sel = v.substring(s0, s1);
      const m = sel.match(/^```[a-zA-Z0-9_+-]*\r?\n([\s\S]*)\r?\n```\s*$/);
      if (m) {
        const inner = m[1];
        replaceEditorRange(textarea, s0, s1, inner);
        textarea.selectionStart = s0;
        textarea.selectionEnd = s0 + inner.length;
        renderPreview();
        return;
      }
    }
    insertFencedCodeBlock(textarea);
  }

  const GFM_TABLE_3COL =
    '|  |  |  |\n' +
    '| --- | --- | --- |\n' +
    '|  |  |  |\n';

  /** 在当前位置插入 GFM 水平线（`---`）；有选区时在选区后插入。 */
  function insertHorizontalRuleAtCursor(textarea) {
    const s0 = textarea.selectionStart;
    const s1 = textarea.selectionEnd;
    const v = textarea.value;
    const after = '\n\n---\n\n';
    if (s0 !== s1) {
      const end = replaceEditorRange(textarea, s1, s1, after);
      textarea.selectionStart = textarea.selectionEnd = end;
      renderPreview();
      return;
    }
    const [l0, l1] = getLineBounds(v, s0);
    const line = v.substring(l0, l1);
    if (line.trim() === '') {
      const ins = '---\n';
      replaceEditorRange(textarea, l0, l1, ins);
      textarea.selectionStart = textarea.selectionEnd = l0 + ins.length;
    } else {
      const end = replaceEditorRange(textarea, l1, l1, after);
      textarea.selectionStart = textarea.selectionEnd = end;
    }
    renderPreview();
  }

  /**
   * 插入三列 GFM 空表。有选区时在选区末尾后插入；光标在空行时整行替换为表。
   */
  function insertTableGfm3ColAtCursor(textarea) {
    const s0 = textarea.selectionStart;
    const s1 = textarea.selectionEnd;
    const v = textarea.value;
    const prefix = '\n\n';
    if (s0 !== s1) {
      replaceEditorRange(textarea, s1, s1, prefix + GFM_TABLE_3COL);
      const c = s1 + prefix.length + 2;
      textarea.selectionStart = textarea.selectionEnd = c;
      renderPreview();
      return;
    }
    const [l0, l1] = getLineBounds(v, s0);
    const line = v.substring(l0, l1);
    if (line.trim() === '') {
      replaceEditorRange(textarea, l0, l1, GFM_TABLE_3COL);
      textarea.selectionStart = textarea.selectionEnd = l0 + 2;
    } else {
      replaceEditorRange(textarea, l1, l1, prefix + GFM_TABLE_3COL);
      const c = l1 + prefix.length + 2;
      textarea.selectionStart = textarea.selectionEnd = c;
    }
    renderPreview();
  }

  function indentOrOutdentLine(textarea, outdent) {
    const s0 = textarea.selectionStart;
    const s1 = textarea.selectionEnd;
    const v = textarea.value;
    if (s0 === s1) {
      const [l0, l1] = getLineBounds(v, s0);
      const line = v.substring(l0, l1);
      const pos = s0;
      if (outdent) {
        const m = /^(  |\t)/.exec(line);
        if (!m) {
          renderPreview();
          return;
        }
        const newLine = line.replace(/^(  |\t)/, '') || line;
        const removed = line.length - newLine.length;
        replaceEditorRange(textarea, l0, l1, newLine);
        let p;
        if (removed > 0 && pos < l0 + removed) {
          p = l0;
        } else {
          p = pos - removed;
        }
        textarea.selectionStart = textarea.selectionEnd = p;
      } else {
        const newLine = '  ' + line;
        replaceEditorRange(textarea, l0, l1, newLine);
        textarea.selectionStart = textarea.selectionEnd = pos + 2;
      }
    } else {
      const seg = v.substring(s0, s1);
      const lines = seg.split('\n');
      const modLines = lines.map((ln) => (outdent ? ln.replace(/^(  |\t)/, '') || ln : '  ' + ln));
      const newSeg = modLines.join('\n');
      if (outdent) {
        replaceEditorRange(textarea, s0, s1, newSeg);
        textarea.setSelectionRange(s0, s0 + newSeg.length);
      } else {
        replaceEditorRange(textarea, s0, s1, newSeg);
        const n0 = s0 + 2;
        const n1 = s0 + newSeg.length;
        textarea.setSelectionRange(n0, n1);
      }
    }
    renderPreview();
  }

  const HOTKEY_HELP_SECTIONS = [
    {
      title: '文字与链接（已包裹时多数可再按同键取消）',
      items: [
        { k: '⌘/Ctrl + B', d: '加粗' },
        { k: '⌘/Ctrl + I', d: '斜体' },
        { k: '⌘/Ctrl + E', d: '删除线' },
        { k: '⌘/Ctrl + K', d: '链接；光标在链接内可整段去 Markdown' },
        { k: '⌘/Ctrl + `', d: '行内代码' },
      ],
    },
    {
      title: '代码与引用',
      items: [
        { k: '⌘/Ctrl + Shift + K', d: '代码块' },
        { n: '选区为整段代码围栏时再次按下可拆围栏' },
        { k: '⌘/Ctrl + Shift + >', d: '行首加引用' },
        { n: '行首已有 > 时再次可减一层' },
        { n: '顶栏可插入水平线（---）与三列 GFM 表格' },
      ],
    },
    {
      title: '标题（需同时按 ⌘/Ctrl + Alt，减少与浏览器标签快捷键冲突）',
      items: [
        { k: 'Alt + 1～4', d: '一级～四级标题' },
        { n: '与当前行已是同级标题时，再按同数字键可恢复为正文' },
        { k: 'Alt + 0', d: '本行恢复为正文' },
      ],
    },
    {
      title: '缩进、存盘、帮助',
      items: [
        { k: 'Tab / Shift+Tab', d: '行首增加/减少缩进' },
        { n: '不加 Ctrl/⌘' },
        { k: '⌘/Ctrl + S', d: '保存到本机' },
        { k: '⌘/Ctrl + /  或  ⌘/Ctrl + ?', d: '打开本说明窗口' },
      ],
    },
  ];

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function buildHotkeyHelpHtml() {
    return HOTKEY_HELP_SECTIONS.map((sec) => {
      const li = sec.items.map((it) => {
        if (it.n && !it.k) {
          return `<li class="hotkey-line hotkey-line--note">${escapeHtml(it.n)}</li>`;
        }
        if (it.k) {
          const sub = it.n ? ` <span class="hotkey-sub">${escapeHtml(it.n)}</span>` : '';
          return `<li class="hotkey-line"><span class="hotkey-keys">${escapeHtml(it.k)}</span> <span class="hotkey-desc">${escapeHtml(it.d || '')}</span>${sub}</li>`;
        }
        return '';
      }).join('');
      return (
        `<section class="hotkey-sec">` +
        `<h3 class="hotkey-sec__title">${escapeHtml(sec.title)}</h3>` +
        `<ul class="hotkey-sec__list">${li}</ul></section>`
      );
    }).join('');
  }

  let hotkeyDialogLastFocus = null;
  function openHotkeyHelpModal() {
    const root = document.getElementById('hotkey-dialog');
    const body = document.getElementById('hotkey-dialog-body');
    if (!root || !body) return;
    if (!root.hidden) return;
    if (!body.dataset.filled) {
      body.innerHTML = buildHotkeyHelpHtml();
      body.dataset.filled = '1';
    }
    hotkeyDialogLastFocus = document.activeElement;
    root.hidden = false;
    root.setAttribute('aria-hidden', 'false');
    const tbtn = document.getElementById('btn-hotkey-help');
    if (tbtn) tbtn.setAttribute('aria-expanded', 'true');
    document.body.classList.add('hotkey-dialog-open');
    const close = document.getElementById('hotkey-dialog-close');
    if (close) close.focus();
  }

  function closeHotkeyHelpModal() {
    const root = document.getElementById('hotkey-dialog');
    if (!root) return;
    root.hidden = true;
    root.setAttribute('aria-hidden', 'true');
    const tbtn = document.getElementById('btn-hotkey-help');
    if (tbtn) tbtn.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('hotkey-dialog-open');
    if (hotkeyDialogLastFocus && typeof hotkeyDialogLastFocus.focus === 'function') {
      try {
        hotkeyDialogLastFocus.focus();
      } catch (_e) {
        /* empty */
      }
    }
  }

  function bindHotkeyDialog() {
    const root = document.getElementById('hotkey-dialog');
    const body = document.getElementById('hotkey-dialog-body');
    if (!root || !body) return;
    const btn = document.getElementById('btn-hotkey-help');
    const close = document.getElementById('hotkey-dialog-close');
    const backdrop = document.getElementById('hotkey-dialog-backdrop');
    if (btn) btn.addEventListener('click', () => openHotkeyHelpModal());
    if (close) close.addEventListener('click', () => closeHotkeyHelpModal());
    if (backdrop) backdrop.addEventListener('click', () => closeHotkeyHelpModal());
    document.addEventListener('keydown', (e) => {
      if (e.isComposing) return;
      if (e.key === 'Escape' && root && !root.hidden) {
        e.preventDefault();
        closeHotkeyHelpModal();
      }
    });
  }

  /** 编辑区顶栏：与快捷键共用同一套插入/切换逻辑；mousedown 防止焦点抢走选区 */
  function bindEditorToolbar(textarea) {
    const bar = document.querySelector('.editor-toolbar');
    if (!bar) return;
    const run = {
      bold: () => toggleBoldAtSelection(textarea),
      italic: () => toggleItalicAtSelection(textarea),
      strike: () => toggleStrikethroughAtSelection(textarea),
      code: () => toggleInlineCodeAtSelection(textarea),
      link: () => toggleLinkAtSelection(textarea),
      codeblock: () => toggleFencedCodeAtSelection(textarea),
      quote: () => toggleBlockquoteAtLine(textarea),
      hr: () => insertHorizontalRuleAtCursor(textarea),
      table: () => insertTableGfm3ColAtCursor(textarea),
      h1: () => setCurrentLineHeading(textarea, 1),
      h2: () => setCurrentLineHeading(textarea, 2),
      h3: () => setCurrentLineHeading(textarea, 3),
      h4: () => setCurrentLineHeading(textarea, 4),
      p: () => setCurrentLineHeading(textarea, 0),
      indent: () => indentOrOutdentLine(textarea, false),
      outdent: () => indentOrOutdentLine(textarea, true),
    };
    bar.querySelectorAll('[data-action]').forEach((btn) => {
      const key = btn.dataset.action;
      const fn = run[key];
      if (!fn) return;
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
      });
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        textarea.focus();
        fn();
      });
    });
  }

  function bindEditorHotkeys(textarea) {
    const onKey = (e) => {
      if (e.isComposing) return;
      if (e.defaultPrevented) return;
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) {
        if (e.key === 'Tab') {
          e.preventDefault();
          indentOrOutdentLine(textarea, e.shiftKey);
        }
        return;
      }
      if (e.key === 'b' && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        toggleBoldAtSelection(textarea);
        return;
      }
      if (e.key === 'i' && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        toggleItalicAtSelection(textarea);
        return;
      }
      if (e.key === 'e' && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        toggleStrikethroughAtSelection(textarea);
        return;
      }
      if (e.shiftKey && (e.key === 'K' || e.key === 'k' || e.code === 'KeyK')) {
        e.preventDefault();
        e.stopPropagation();
        toggleFencedCodeAtSelection(textarea);
        return;
      }
      if (!e.shiftKey && (e.key === 'k' || e.key === 'K' || e.code === 'KeyK')) {
        e.preventDefault();
        e.stopPropagation();
        toggleLinkAtSelection(textarea);
        return;
      }
      if (e.key === '`' || e.code === 'Backquote') {
        e.preventDefault();
        e.stopPropagation();
        toggleInlineCodeAtSelection(textarea);
        return;
      }
      if (e.key === 's' && !e.shiftKey) {
        e.preventDefault();
        save();
        toast('已保存到本机', 1200);
        return;
      }
      if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        e.preventDefault();
        e.stopPropagation();
        openHotkeyHelpModal();
        return;
      }
      if (e.key === '/' && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        openHotkeyHelpModal();
        return;
      }
      if (mod && e.key === '>' && e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        toggleBlockquoteAtLine(textarea);
        return;
      }
      if (mod && e.altKey && (e.key === '0' || e.key === '1' || e.key === '2' || e.key === '3' || e.key === '4')) {
        e.preventDefault();
        e.stopPropagation();
        setCurrentLineHeading(textarea, e.key === '0' ? 0 : parseInt(e.key, 10));
        return;
      }
    };
    textarea.addEventListener('keydown', onKey, { capture: true });
  }

  async function handleImageUpload(file, textarea) {
    if (!file.type.startsWith('image/')) {
      toast('请上传图片文件');
      return;
    }
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast('图片大小不能超过 10MB');
      return;
    }
    const imageName = file.name.replace(/\.[^/.]+$/, '') || '图片';
    const originalSize = file.size;
    try {
      toast('正在压缩图片…', 4000);
      const compressedBlob = await imageCompressor.compress(file);
      const compressedSize = compressedBlob.size;
      const compressionRatio = ((1 - compressedSize / originalSize) * 100).toFixed(0);
      const imageId = `img-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
      await imageStore.saveImage(imageId, compressedBlob, {
        name: imageName,
        originalName: file.name,
        originalSize,
        compressedSize,
        compressionRatio,
        mimeType: compressedBlob.type || file.type,
      });
      const markdownImage = `![${imageName}](img://${imageId})`;
      if (textarea) {
        const currentPos = textarea.selectionStart;
        const newPos = replaceEditorRange(textarea, currentPos, currentPos, markdownImage);
        textarea.selectionStart = textarea.selectionEnd = newPos;
        textarea.focus();
      } else {
        state.md = (state.md || '') + '\n' + markdownImage;
        const ed = document.getElementById('editor');
        if (ed) ed.value = state.md;
      }
      renderPreview();
      if (Number(compressionRatio) > 10) {
        toast(`已保存 (${ImageCompressor.formatSize(originalSize)} → ${ImageCompressor.formatSize(compressedSize)})`);
      } else {
        toast(`已保存 (${ImageCompressor.formatSize(compressedSize)})`);
      }
    } catch (error) {
      console.error(error);
      toast('图片处理失败：' + error.message);
    }
  }

  async function handleSmartPaste(event) {
    const clipboardData = event.clipboardData || event.originalEvent?.clipboardData;
    if (!clipboardData) return;

    if (clipboardData.files && clipboardData.files.length > 0) {
      const file = clipboardData.files[0];
      if (file && file.type && file.type.startsWith('image/')) {
        event.preventDefault();
        await handleImageUpload(file, event.target);
        return;
      }
    }

    const items = clipboardData.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'file' && item.type && item.type.indexOf('image') !== -1) {
          event.preventDefault();
          const file = item.getAsFile();
          if (file) {
            await handleImageUpload(file, event.target);
            return;
          }
        }
      }
    }

    const htmlData = clipboardData.getData('text/html');
    const textData = clipboardData.getData('text/plain');

    if (textData && /^\[Image\s*#?\d*\]$/i.test(textData.trim())) {
      toast('请使用截图工具或拖拽文件插入图片');
      event.preventDefault();
      return;
    }

    const isFromIDE = isIDEFormattedHTML(htmlData, textData);
    if (isFromIDE && textData && isLikelyMarkdownSource(textData.trim())) {
      return;
    }

    if (htmlData && htmlData.trim() !== '' && turndownService) {
      if (textData && isLikelyMarkdownSource(textData.trim())) {
        return;
      }

      const hasPreTag = /<pre[\s>]/.test(htmlData);
      const hasCodeTag = /<code[\s>]/.test(htmlData);
      const isMainlyCode = (hasPreTag || hasCodeTag) && !htmlData.includes('<p') && !htmlData.includes('<div');

      if (isMainlyCode) {
        return;
      }

      if (htmlData.includes('file:///') || htmlData.includes('src="file:')) {
        toast('本地图片请拖拽文件到编辑区');
        event.preventDefault();
        return;
      }

      event.preventDefault();
      try {
        let markdown = turndownService.turndown(htmlData);
        markdown = markdown.replace(/\n{3,}/g, '\n\n');
        const textarea = event.target;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newPos = replaceEditorRange(textarea, start, end, markdown);
        textarea.selectionStart = textarea.selectionEnd = newPos;
        textarea.focus();
        renderPreview();
        toast('已智能转换为 Markdown');
      } catch (error) {
        console.error(error);
        if (textData) insertTextAtCursor(event.target, textData);
      }
    } else if (textData && isLikelyMarkdownSource(textData.trim())) {
      return;
    }
  }

  // ============ 随机换色 / 随机风格 ============
  const HUE_SETS = [
    // [brand, brandSoft, textOnBrand, paraColor]
    ['#C96442', '#F5E3D7', '#FFFFFF', '#3D2E20'], // 暖橙
    ['#2563EB', '#DBEAFE', '#FFFFFF', '#1E293B'], // 科技蓝
    ['#059669', '#D1FAE5', '#FFFFFF', '#064E3B'], // 翠绿
    ['#7C3AED', '#EDE9FE', '#FFFFFF', '#1F1147'], // 紫
    ['#DB2777', '#FCE7F3', '#FFFFFF', '#500724'], // 玫粉
    ['#B87333', '#F5E0C3', '#FFFFFF', '#4A3728'], // 铜
    ['#0F766E', '#CCFBF1', '#FFFFFF', '#134E4A'], // 青
    ['#9333EA', '#F3E8FF', '#FFFFFF', '#3B0764'], // 亮紫
    ['#DC2626', '#FEE2E2', '#FFFFFF', '#450A0A'], // 中国红
    ['#CC0000', '#FFEBEE', '#FFFFFF', '#5C0000'], // 标准红
    ['#1A1A1A', '#F0F0F0', '#FFFFFF', '#1A1A1A'], // 黑白
    ['#7A3B2E', '#E8D9C0', '#FFFFFF', '#3A2E1F'], // 复古红棕
    ['#0B3D66', '#DBEAFE', '#FFFFFF', '#0B3D66'], // 深蓝印
  ];

  function randomizeColors() {
    const pick = HUE_SETS[Math.floor(Math.random() * HUE_SETS.length)];
    const [brand, brandSoft, , ink] = pick;
    const g = state.settings.global;
    g.brand = brand;
    g.brandSoft = brandSoft;
    g.ink = ink;

    // 标题使用主色
    ['h1','h2','h3','h4'].forEach(h => {
      if (state.settings[h]) state.settings[h].color = brand;
    });
    // 引用块固定黑字白底
    if (state.settings.blockquote) {
      state.settings.blockquote.textColor = '#000000';
      state.settings.blockquote.bgColor = '#FFFFFF';
    }
    // 其他元素使用主色/柔底
    const colorOnly = ['ul', 'ol', 'hr', 'bold'];
    const colorAndBg = { code: brandSoft, a: brandSoft, table: brandSoft };

    colorOnly.forEach(k => {
      if (state.settings[k]) state.settings[k].color = brand;
    });
    Object.entries(colorAndBg).forEach(([k, bg]) => {
      if (state.settings[k]) {
        state.settings[k].color = brand;
        state.settings[k].bgColor = bg;
      }
    });

    renderPreview();
    buildSettingsPanel();
    toast('🎨 色系已换');
  }

  function randomizeStyle() {
    const randPreset = (arr) => arr[Math.floor(Math.random() * arr.length)].id;
    const E = state.settings;

    ['h1','h2','h3','h4','p','blockquote','pre','code','ul','ol','a','img','hr','table']
      .forEach(k => { if (E[k]) E[k].preset = randPreset(P[k]); });

    renderPreview();
    buildSettingsPanel();
    toast('🎲 风格已随机');
  }

  // ============ 样式面板 ============
  function buildSettingsPanel() {
    const root = document.getElementById('settings-body');
    root.innerHTML = '';

    // 1. 全局
    root.appendChild(makeAccordion('global', '全局样式', buildGlobalSection));
    // 2. H1-H4
    root.appendChild(makeAccordion('h1', '一级标题 H1', () => buildHeadingSection(1)));
    root.appendChild(makeAccordion('h2', '二级标题 H2', () => buildHeadingSection(2)));
    root.appendChild(makeAccordion('h3', '三级标题 H3', () => buildHeadingSection(3)));
    root.appendChild(makeAccordion('h4', '四级标题 H4', () => buildHeadingSection(4)));
    // 3. 正文
    root.appendChild(makeAccordion('p', '正文段落', buildParagraphSection));
    // 4. 加粗/斜体
    root.appendChild(makeAccordion('emph', '加粗 / 斜体', buildEmphSection));
    // 5. 引用
    root.appendChild(makeAccordion('bq', '引用 Blockquote', buildBlockquoteSection));
    // 6. 代码
    root.appendChild(makeAccordion('pre', '代码块', buildPreSection));
    // 7. 行内代码
    root.appendChild(makeAccordion('code', '行内代码', buildCodeSection));
    // 8. 列表
    root.appendChild(makeAccordion('list', '列表', buildListSection));
    // 9. 链接
    root.appendChild(makeAccordion('a', '链接', buildLinkSection));
    // 10. 图片
    root.appendChild(makeAccordion('img', '图片', buildImgSection));
    // 11. 分割线
    root.appendChild(makeAccordion('hr', '分割线', buildHrSection));
    // 12. 表格
    root.appendChild(makeAccordion('table', '表格', buildTableSection));
    // 13. 主题管理（无标题行，仅按钮与列表）
    const themesWrap = document.createElement('div');
    themesWrap.className = 'settings-themes-only';
    themesWrap.appendChild(buildThemesSection());
    root.appendChild(themesWrap);
  }

  /** 可折叠区块 */
  function makeAccordion(key, title, builder) {
    const wrap = document.createElement('div');
    wrap.className = 'accordion-item';
    wrap.dataset.key = key;

    const head = document.createElement('button');
    head.type = 'button';
    head.className = 'accordion-head';
    head.innerHTML = `<span>${title}</span><span class="chevron">▸</span>`;
    head.addEventListener('click', () => wrap.classList.toggle('open'));
    wrap.appendChild(head);

    const body = document.createElement('div');
    body.className = 'accordion-body';
    body.appendChild(builder());
    wrap.appendChild(body);
    return wrap;
  }

  // ============ 各个 section ============

  function makeField(label, input, valText) {
    const f = document.createElement('div');
    f.className = 'field';
    const l = document.createElement('div');
    l.className = 'field-label';
    l.innerHTML = `<span>${label}</span>${valText ? `<span class="val">${valText}</span>` : ''}`;
    f.appendChild(l);
    f.appendChild(input);
    return f;
  }

  function slider(min, max, step, value, onChange, fmt) {
    const wrap = document.createElement('div');
    const inp = document.createElement('input');
    inp.type = 'range';
    inp.min = min; inp.max = max; inp.step = step; inp.value = value;
    const val = document.createElement('span');
    val.className = 'val';
    val.textContent = fmt ? fmt(value) : value;
    inp.addEventListener('input', () => {
      val.textContent = fmt ? fmt(inp.value) : inp.value;
      onChange(Number(inp.value));
    });
    wrap.appendChild(inp);
    wrap._val = val;
    return wrap;
  }

  function sliderField(label, min, max, step, value, onChange, fmt) {
    const s = slider(min, max, step, value, onChange, fmt);
    return makeFieldInline(label, s, s._val);
  }
  function makeFieldInline(label, control, valEl) {
    const f = document.createElement('div');
    f.className = 'field';
    const l = document.createElement('div');
    l.className = 'field-label';
    const ls = document.createElement('span'); ls.textContent = label;
    l.appendChild(ls);
    if (valEl) l.appendChild(valEl);
    f.appendChild(l);
    f.appendChild(control);
    return f;
  }

  function colorField(label, value, onChange) {
    const wrap = document.createElement('div');
    wrap.className = 'color-pick';
    const c = document.createElement('input');
    c.type = 'color';
    c.value = value;
    const t = document.createElement('input');
    t.type = 'text';
    t.value = value;
    const sync = (v) => {
      c.value = v;
      t.value = v;
      onChange(v);
    };
    c.addEventListener('input', () => { t.value = c.value; onChange(c.value); });
    t.addEventListener('change', () => {
      if (/^#[0-9a-f]{6}$/i.test(t.value) || /^#[0-9a-f]{3}$/i.test(t.value)) sync(t.value);
      else t.value = c.value;
    });
    wrap.appendChild(c); wrap.appendChild(t);
    return makeFieldInline(label, wrap);
  }

  function seg(options, activeId, onChange) {
    const wrap = document.createElement('div');
    wrap.className = 'seg';
    options.forEach(o => {
      const b = document.createElement('button');
      b.textContent = o.name;
      if (o.id === activeId) b.classList.add('active');
      b.addEventListener('click', () => {
        wrap.querySelectorAll('button').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        onChange(o.id);
      });
      wrap.appendChild(b);
    });
    return wrap;
  }

  // 样式预设网格
  function presetGrid(presets, activeId, onChange, sampleText) {
    const grid = document.createElement('div');
    grid.className = 'preset-grid';
    presets.forEach(p => {
      const btn = document.createElement('button');
      btn.className = 'preset-chip' + (p.id === activeId ? ' active' : '');
      btn.innerHTML = `
        <span class="preview-sample">${sampleText ? sampleText(p) : p.name}</span>
        <span class="preset-name">${p.name}</span>
      `;
      btn.addEventListener('click', () => {
        grid.querySelectorAll('.preset-chip').forEach(x => x.classList.remove('active'));
        btn.classList.add('active');
        onChange(p.id);
      });
      grid.appendChild(btn);
    });
    return grid;
  }

  function update(field, value) {
    // set nested via path
    const parts = field.split('.');
    let o = state.settings;
    while (parts.length > 1) o = o[parts.shift()];
    o[parts[0]] = value;
    renderPreview();
  }

  // -- 全局
  function buildGlobalSection() {
    const box = document.createElement('div');
    const s = state.settings.global;

    box.appendChild(colorField('背景色', s.bg, v => { update('global.bg', v); applyPreviewBg(); }));
    box.appendChild(colorField('主色调', s.brand, v => {
      state.settings.global.brand = v;
      // cascade brand color to all brand-driven fields
      ['h1','h2','h3','h4'].forEach(k => { if (state.settings[k]) state.settings[k].color = v; });
      // 引用装饰色与 global.brand 一致，不设 blockquote.color
      ['code','ul','ol','a','hr','table'].forEach(k => { if (state.settings[k]) state.settings[k].color = v; });
      if (state.settings.bold) state.settings.bold.color = v;
      renderPreview();
      buildSettingsPanel();
    }));
    box.appendChild(colorField('主色柔底', s.brandSoft, v => {
      state.settings.global.brandSoft = v;
      // 引用块背景固定为白，不随柔底联动；code / 链接 / 表格仍用柔底
      ['code','a','table'].forEach(k => { if (state.settings[k]) state.settings[k].bgColor = v; });
      renderPreview();
      buildSettingsPanel();
    }));

    // 字体族
    const ffWrap = document.createElement('select');
    ffWrap.className = 'txt';
    P.global.fontFamily.forEach(f => {
      const o = document.createElement('option');
      o.value = f.id; o.textContent = f.name;
      if (s.fontFamily === f.id) o.selected = true;
      ffWrap.appendChild(o);
    });
    ffWrap.addEventListener('change', () => update('global.fontFamily', ffWrap.value));
    box.appendChild(makeFieldInline('字体族', ffWrap));

    const mw = s.maxWidth != null ? s.maxWidth : 335;
    box.appendChild(sliderField('内容最大宽度', 280, 400, 1, mw, (v) => update('global.maxWidth', v), (v) => v + 'px'));

    return box;
  }

  // -- 标题通用
  function buildHeadingSection(level) {
    const key = 'h' + level;
    const s = state.settings[key];
    const box = document.createElement('div');

    box.appendChild(presetGrid(
      P[key], s.preset,
      id => update(key + '.preset', id),
      (p) => `<span style="font-size:${Math.min(s.fontSize, 15)}px; font-weight:700; color:${s.color};">${p.name.slice(0,4)}</span>`
    ));

    box.appendChild(sliderField('字号', 14, 32, 1, s.fontSize, v => update(key + '.fontSize', v), v => v + 'px'));
    box.appendChild(colorField('颜色', s.color, v => update(key + '.color', v)));
    return box;
  }

  // -- 正文
  function buildParagraphSection() {
    const s = state.settings.p;
    const box = document.createElement('div');

    box.appendChild(presetGrid(
      P.p, s.preset, id => update('p.preset', id),
      (p) => '<span style="font-size:13px;color:#000">' + p.name + '</span>'
    ));
    box.appendChild(sliderField('字号', 12, 22, 1, s.fontSize, v => update('p.fontSize', v), v => v + 'px'));
    box.appendChild(sliderField('行距', 1.4, 2.2, 0.05, s.lineHeight, v => update('p.lineHeight', v), v => Number(v).toFixed(2)));
    box.appendChild(sliderField('字间距', 0, 2, 0.1, s.letterSpacing, v => update('p.letterSpacing', v), v => Number(v).toFixed(1) + 'px'));
    const pNote = document.createElement('div');
    pNote.style.cssText = 'font-size:11px;color:var(--ink-faint);margin-top:8px;line-height:1.45';
    pNote.textContent = '正文段落与列表文字固定为黑色（#000），与主题主色无关。';
    box.appendChild(pNote);
    return box;
  }

  // -- 加粗 斜体
  function buildEmphSection() {
    const box = document.createElement('div');
    const bNote = document.createElement('div');
    bNote.style.cssText = 'font-size:11px;color:var(--ink-faint);margin-bottom:12px;line-height:1.45';
    bNote.textContent = '加粗颜色与「全局样式 → 主色调」一致。';
    box.appendChild(bNote);
    box.appendChild(colorField('斜体颜色', state.settings.italic.color, v => update('italic.color', v)));
    return box;
  }

  // -- 引用
  function buildBlockquoteSection() {
    const s = state.settings.blockquote;
    const box = document.createElement('div');
    const note = document.createElement('div');
    note.style.cssText = 'font-size:11px;color:var(--ink-faint);margin-bottom:10px;line-height:1.45';
    note.textContent = '引用内文字与背景固定为黑字、白底。左边线、引号/提示图标等装饰色与「全局 → 主色调」一致。';
    box.appendChild(note);
    box.appendChild(presetGrid(P.blockquote, s.preset, id => update('blockquote.preset', id)));
    box.appendChild(sliderField('字号', 12, 20, 1, s.fontSize, v => update('blockquote.fontSize', v), v => v + 'px'));
    return box;
  }

  // -- 代码块
  function buildPreSection() {
    const s = state.settings.pre;
    const box = document.createElement('div');
    box.appendChild(presetGrid(P.pre, s.preset, id => update('pre.preset', id)));
    return box;
  }

  // -- 行内代码
  function buildCodeSection() {
    const s = state.settings.code;
    const box = document.createElement('div');
    box.appendChild(presetGrid(P.code, s.preset, id => update('code.preset', id),
      (p) => `<code style="background:${s.bgColor}; color:${s.color}; padding:1px 5px; border-radius:3px; font-size:11px;">code</code>`));
    box.appendChild(colorField('文字色', s.color, v => update('code.color', v)));
    box.appendChild(colorField('背景色', s.bgColor, v => update('code.bgColor', v)));
    return box;
  }

  // -- 列表
  function buildListSection() {
    const s = state.settings;
    const box = document.createElement('div');

    const ulH = document.createElement('div');
    ulH.style.cssText = 'font-size:11.5px; color:var(--ink-soft); font-weight:600; margin:4px 0 8px;';
    ulH.textContent = '无序列表符号';
    box.appendChild(ulH);
    box.appendChild(presetGrid(P.ul, s.ul.preset, id => update('ul.preset', id),
      (p) => `<span style="color:${s.ul.color}; font-size:14px;">${p.marker} 列表项</span>`));
    box.appendChild(colorField('符号颜色', s.ul.color, v => update('ul.color', v)));

    const olH = document.createElement('div');
    olH.style.cssText = 'font-size:11.5px; color:var(--ink-soft); font-weight:600; margin:18px 0 8px;';
    olH.textContent = '有序列表编号';
    box.appendChild(olH);
    box.appendChild(presetGrid(P.ol, s.ol.preset, id => update('ol.preset', id),
      (p) => `<span style="color:${s.ol.color}; font-size:12px;">${p.name}</span>`));
    box.appendChild(colorField('编号颜色', s.ol.color, v => update('ol.color', v)));
    return box;
  }

  // -- 链接
  function buildLinkSection() {
    const s = state.settings.a;
    const box = document.createElement('div');
    box.appendChild(presetGrid(P.a, s.preset, id => update('a.preset', id)));
    box.appendChild(colorField('颜色', s.color, v => update('a.color', v)));
    return box;
  }

  // -- 图片
  function buildImgSection() {
    const s = state.settings.img;
    const box = document.createElement('div');
    box.appendChild(presetGrid(P.img, s.preset, id => update('img.preset', id)));
    return box;
  }

  // -- 分割线
  function buildHrSection() {
    const s = state.settings.hr;
    const box = document.createElement('div');
    box.appendChild(presetGrid(P.hr, s.preset, id => update('hr.preset', id),
      (p) => p.decorative ? `<span style="color:${s.color}; font-size:12px; letter-spacing:6px;">${p.decorative}</span>` : `<span style="color:${s.color}; font-size:11px;">${p.name}</span>`));
    box.appendChild(colorField('颜色', s.color, v => update('hr.color', v)));
    return box;
  }

  // -- 表格
  function buildTableSection() {
    const s = state.settings.table;
    const box = document.createElement('div');
    box.appendChild(presetGrid(P.table, s.preset, id => update('table.preset', id)));
    box.appendChild(colorField('主色', s.color, v => update('table.color', v)));
    box.appendChild(colorField('柔底色', s.bgColor, v => update('table.bgColor', v)));
    return box;
  }

  // -- 主题
  function buildThemesSection() {
    const box = document.createElement('div');

    const save = document.createElement('button');
    save.className = 'btn primary';
    save.style.width = '100%';
    save.textContent = '保存当前样式为新主题';
    save.addEventListener('click', () => {
      const n = prompt('为这套主题起个名字：', '我的主题 ' + (Object.keys(state.customThemes).length + 1));
      if (n && n.trim()) saveCustomTheme(n.trim());
    });
    box.appendChild(save);

    const row = document.createElement('div');
    row.style.cssText = 'display:flex; gap:6px; margin-top:8px;';
    const exp = document.createElement('button');
    exp.className = 'btn'; exp.style.flex = '1'; exp.textContent = '导出 JSON';
    exp.addEventListener('click', exportJSON);
    const imp = document.createElement('button');
    imp.className = 'btn'; imp.style.flex = '1'; imp.textContent = '导入 JSON';
    imp.addEventListener('click', () => document.getElementById('import-file').click());
    row.appendChild(exp); row.appendChild(imp);
    box.appendChild(row);

    const list = document.createElement('div');
    list.id = 'theme-list';
    list.className = 'theme-list';
    box.appendChild(list);

    // defer render
    setTimeout(renderThemeList, 0);
    return box;
  }

  // ============ 绑定顶栏 ============
  function bindTopbar() {
    const themeCustom = document.getElementById('theme-select-custom');
    if (themeCustom) {
      themeCustom.addEventListener('change', (e) => {
        const v = e.target.value;
        if (v) applyTheme(v);
      });
    }
    document.getElementById('btn-copy-rich').addEventListener('click', copyRichText);
    document.getElementById('btn-copy-html').addEventListener('click', copyHTML);
    document.getElementById('btn-rand-color').addEventListener('click', randomizeColors);
    document.getElementById('btn-rand-style').addEventListener('click', randomizeStyle);
    document.getElementById('btn-reset').addEventListener('click', () => {
      if (confirm('重置为优雅蓝主题？自定义主题不会被删除。')) {
        localStorage.clear();
        location.reload();
      }
    });
    document.getElementById('sync-scroll-switch').addEventListener('click', () => {
      toggleScrollSync();
    });
    document.getElementById('btn-sample').addEventListener('click', () => {
      void (async () => {
        sampleMdPromise = null;
        const md = await loadSampleMd();
        const ed = document.getElementById('editor');
        ed.value = md;
        state.md = md;
        await renderPreview();
        toast('已填入示例 Markdown');
      })();
    });
    document.getElementById('import-file').addEventListener('change', e => {
      const f = e.target.files[0];
      if (f) importJSON(f);
      e.target.value = '';
    });
    document.getElementById('settings-toggle').addEventListener('click', () => {
      setSettingsPaneCollapsed(!state.settingsPaneCollapsed);
    });
  }

  // ============ 初始化 ============
  async function init() {
    initTurndownService();
    try {
      await imageStore.init();
    } catch (e) {
      console.warn('IndexedDB 初始化失败', e);
    }

    load();
    syncBoldColorToBrand();
    // 如果没有数据或数据无效，使用示例文章（sample.md）
    const hasValidMd = isValidMdContent(state.md);
    if (!hasValidMd) {
      state.md = await loadSampleMd();
    }

    const ed = document.getElementById('editor');
    ed.value = state.md;
    ed.addEventListener('input', (e) => {
      state.md = e.target.value;
      renderPreview();
    });
    ed.addEventListener('paste', (e) => {
      void handleSmartPaste(e);
    });
    ed.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      ed.classList.add('editor-dragover');
    });
    ed.addEventListener('dragleave', () => ed.classList.remove('editor-dragover'));
    ed.addEventListener('drop', (e) => {
      e.preventDefault();
      ed.classList.remove('editor-dragover');
      const file = e.dataTransfer.files && e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        void handleImageUpload(file, ed);
      } else if (e.dataTransfer.files && e.dataTransfer.files.length) {
        toast('只支持拖拽图片文件');
      }
    });

    bindHotkeyDialog();
    bindEditorHotkeys(ed);
    bindEditorToolbar(ed);

    bindTopbar();
    bindScrollSync();
    updateScrollSyncUI();
    buildSettingsPanel();
    updateThemeSelect();
    setSettingsPaneCollapsed(state.settingsPaneCollapsed);
    await renderPreview();

    if (!hasValidMd) toast('欢迎！已加载示例内容，开始编辑吧');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      void init();
    });
  } else {
    void init();
  }
})();
