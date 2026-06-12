/* ================================================================
   Wrimark v2.0.0 —— 前端逻辑
   ================================================================ */

const VERSION = '2.0.0';

// ---- 全局状态 ----
const state = {
    mode: 'splash',
    currentFile: null,
    isModified: false,
    autoSaveEnabled: false,
    autoSaveTimer: null,
    theme: 'light',
    previewStyle: 'default',
    editorFullscreen: false,
    previewFullscreen: false,
    findMatches: [],
    findMatchIndex: -1,
    settingsOpen: false,
    skipSplash: false,
    checkUpdateState: 'idle',
    outlineVisible: false,
    ribbonCollapsed: false,
    syncingScroll: false,
};

// ---- DOM 引用 ----
const $ = (sel) => document.querySelector(sel);

const dom = {
    splash: $('#splash'),
    home: $('#home'),
    editor: $('#editor'),
    editorContainer: $('#editorContainer'),
    editorTextarea: $('#editorTextarea'),
    lineNumbers: $('#lineNumbers'),
    editorPanel: $('#editorPanel'),
    previewPanel: $('#previewPanel'),
    previewContent: $('#previewContent'),
    divider: $('#divider'),
    wordCountPill: $('#wordCountPill'),
    pillContent: $('#pillContent'),
    autoSaveCheck: $('#autoSaveCheck'),
    ribbon: $('#ribbon'),
    ribbonPanels: $('#ribbonPanels'),
    ribbonCollapseBtn: $('#ribbonCollapseBtn'),
    outlineSidebar: $('#outlineSidebar'),
    outlineContent: $('#outlineContent'),
    settingsModal: $('#settingsModal'),
    unsavedModal: $('#unsavedModal'),
    findReplaceDialog: $('#findReplaceDialog'),
    frBox: $('#frBox'),
    frFindInput: $('#frFindInput'),
    frReplaceInput: $('#frReplaceInput'),
    frCount: $('#frCount'),
    frCaseSensitive: $('#frCaseSensitive'),
    frWholeWord: $('#frWholeWord'),
    frRegex: $('#frRegex'),
    themeSelect: $('#themeSelect'),
    viewThemeSelect: $('#viewThemeSelect'),
    previewStyleSelect: $('#previewStyleSelect'),
    headingSelect: $('#headingSelect'),
    homeClickable: $('#homeClickable'),
    homeSettingsBtn: $('#homeSettingsBtn'),
    editorSettingsBtn: $('#editorSettingsBtn'),
    btnEditorFullscreen: $('#btnEditorFullscreen'),
    btnPreviewFullscreen: $('#btnPreviewFullscreen'),
    btnOutline: $('#btnOutline'),
    btnOutlineRibbon: $('#btnOutlineRibbon'),
    checkUpdateLink: $('#checkUpdateLink'),
    btnSyntaxDocs: $('#btnSyntaxDocs'),
};

// ---- 工具函数 ----
function formatNumber(n) { return n.toLocaleString('zh-CN'); }
function getFileName(path) { return path.split(/[/\\]/).pop(); }

function debounce(fn, delay) {
    let timer;
    return function (...args) { clearTimeout(timer); timer = setTimeout(() => fn.apply(this, args), delay); };
}

// ---- API 通信 ----
const api = {
    call(method, ...args) {
        if (typeof pywebview !== 'undefined' && pywebview.api) {
            return pywebview.api[method](...args);
        }
        return mockApiCall(method, ...args);
    }
};

function mockApiCall(method, ...args) {
    const mocks = {
        get_version: () => VERSION,
        get_system_theme: () => window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
        get_initial_file: () => null,
        check_update: () => new Promise(r => setTimeout(() => r({status:'ok',version:VERSION}), 800)),
        open_url: (url) => window.open(url, '_blank'),
        export_html: () => ({status:'cancelled'}),
    };
    if (mocks[method]) return mocks[method](...args);
    return null;
}

// ---- 主题管理 ----
async function initTheme() {
    try { state.theme = (await api.call('get_system_theme')) || 'light'; } catch (e) { state.theme = 'light'; }
    applyTheme(state.theme);
}

function applyTheme(theme) {
    state.theme = theme;
    document.body.classList.toggle('dark', theme === 'dark');
    if (dom.themeSelect) dom.themeSelect.value = theme;
    if (dom.viewThemeSelect) dom.viewThemeSelect.value = theme;
    if (typeof mermaid !== 'undefined') {
        mermaid.initialize({ startOnLoad: false, theme: theme === 'dark' ? 'dark' : 'default', securityLevel: 'loose' });
    }
    if (state.mode === 'editor') renderPreviewDebounced();
}

function toggleTheme(theme) { applyTheme(theme); }

// ---- 预览风格 ----
function applyPreviewStyle(style) {
    state.previewStyle = style;
    dom.previewContent.classList.remove('github-style', 'vuepress-style');
    if (style === 'github') dom.previewContent.classList.add('github-style');
    if (style === 'vuepress') dom.previewContent.classList.add('vuepress-style');
    if (dom.previewStyleSelect) dom.previewStyleSelect.value = style;
    if (state.mode === 'editor') renderPreview();
}

// ---- Emoji 映射 ----
const EMOJI_MAP = {
    ':smile:': '😄',':smiley:': '😃',':grinning:': '😀',':laughing:': '😆',':joy:': '😂',':rofl:': '🤣',
    ':wink:': '😉',':blush:': '😊',':heart_eyes:': '😍',':kissing_heart:': '😘',':kiss:': '😗',
    ':relaxed:': '☺️',':sweat_smile:': '😅',':yum:': '😋',':stuck_out_tongue:': '😛',
    ':thinking:': '🤔',':neutral_face:': '😐',':expressionless:': '😑',':unamused:': '😒',
    ':sweat:': '😓',':pensive:': '😔',':confused:': '😕',':disappointed:': '😞',':worried:': '😟',
    ':triumph:': '😤',':rage:': '😡',':angry:': '😠',':cry:': '😢',':sob:': '😭',':scream:': '😱',
    ':sleeping:': '😴',':mask:': '😷',':sunglasses:': '😎',':nerd:': '🤓',':ghost:': '👻',
    ':alien:': '👽',':robot:': '🤖',':wave:': '👋',':clap:': '👏',':pray:': '🙏',
    ':thumbsup:': '👍',':thumbsdown:': '👎',':ok_hand:': '👌',':muscle:': '💪',':fist:': '✊',
    ':v:': '✌️',':point_up:': '☝️',':point_down:': '👇',':point_left:': '👈',':point_right:': '👉',
    ':fire:': '🔥',':star:': '⭐',':sparkles:': '✨',':zap:': '⚡',':boom:': '💥',
    ':heart:': '❤️',':broken_heart:': '💔',':heartbeat:': '💓',':two_hearts:': '💕',
    ':100:': '💯',':check:': '✔️',':x:': '❌',':warning:': '⚠️',':question:': '❓',
    ':bulb:': '💡',':memo:': '📝',':book:': '📖',':lock:': '🔒',':key:': '🔑',
    ':rocket:': '🚀',':airplane:': '✈️',':car:': '🚗',':bike:': '🚲',':house:': '🏠',
    ':sun:': '☀️',':moon:': '🌙',':cloud:': '☁️',':rain:': '🌧️',':snow:': '❄️',
    ':coffee:': '☕',':beer:': '🍺',':pizza:': '🍕',':cake:': '🎂',':apple:': '🍎',
    ':tada:': '🎉',':gift:': '🎁',':crown:': '👑',':gem:': '💎',':ring:': '💍',
    ':cat:': '🐱',':dog:': '🐶',':mouse:': '🐭',':rabbit:': '🐰',':bear:': '🐻',
    ':penguin:': '🐧',':fish:': '🐟',':bug:': '🐛',':snake:': '🐍',':turtle:': '🐢',
    ':art:': '🎨',':music:': '🎵',':movie:': '🎬',':game:': '🎮',':medal:': '🏅',
    ':mail:': '📧',':phone:': '📱',':tv:': '📺',':clock:': '🕐',':hourglass:': '⏳',
    ':+1:': '👍',':-1:': '👎',
};

function convertEmoji(text) {
    return text.replace(/:[\w+-]+:/g, function (m) { return EMOJI_MAP[m] || m; });
}

// ---- Markdown 预处理 ----
function preprocessMarkdown(text) {
    text = convertEmoji(text);
    text = text.replace(/(\*\*)(\p{P})/gu, function (m, stars, pct) {
        return pct === '*' ? m : stars + '\u200B' + pct;
    });
    text = text.replace(/(\p{P})(\*\*)/gu, function (m, pct, stars) {
        return pct === '*' ? m : pct + '\u200B' + stars;
    });
    text = text.replace(/(\*)(\p{P})/gu, function (m, star, pct) {
        return pct === '*' ? m : star + '\u200B' + pct;
    });
    text = text.replace(/(\p{P})(\*)/gu, function (m, pct, star) {
        return pct === '*' ? m : pct + '\u200B' + star;
    });
    return text;
}

// ---- 渲染 Markdown ----
function renderMarkdown(text) {
    if (!text || text.trim() === '') return '<p style="color:var(--text-muted)">预览内容将在此显示...</p>';
    var processed = preprocessMarkdown(text);
    if (typeof marked.setOptions === 'function') {
        marked.setOptions({ breaks: true, gfm: true });
    }
    var html;
    if (typeof marked.parse === 'function') {
        html = marked.parse(processed);
    } else if (typeof marked === 'function') {
        html = marked(processed);
    } else {
        html = '<p>Markdown 渲染库未加载</p>';
    }
    return html;
}

function renderMermaid() {
    var mermaidEls = dom.previewContent.querySelectorAll('pre code.language-mermaid');
    if (mermaidEls.length === 0) return;
    mermaidEls.forEach(function (codeEl) {
        var preEl = codeEl.parentElement;
        var mermaidDiv = document.createElement('div');
        mermaidDiv.className = 'mermaid';
        mermaidDiv.textContent = codeEl.textContent;
        preEl.replaceWith(mermaidDiv);
    });
    if (typeof mermaid !== 'undefined') {
        try { mermaid.run({ querySelector: '.mermaid' }); } catch (e) {}
    }
}

function renderPreview() {
    var html = renderMarkdown(dom.editorTextarea.value);
    dom.previewContent.innerHTML = html;
    if (typeof renderMathInElement === 'function') {
        try {
            renderMathInElement(dom.previewContent, {
                delimiters: [
                    { left: '$$', right: '$$', display: true },
                    { left: '$', right: '$', display: false },
                    { left: '\\[', right: '\\]', display: true },
                    { left: '\\(', right: '\\)', display: false },
                ],
                throwOnError: false,
            });
        } catch (e) {}
    }
    setTimeout(renderMermaid, 50);
}

const renderPreviewDebounced = debounce(renderPreview, 150);

// ---- 同步滚动 ----
function syncScrollToPreview() {
    if (state.syncingScroll) return;
    state.syncingScroll = true;
    var ta = dom.editorTextarea;
    if (ta.scrollHeight <= ta.clientHeight) { state.syncingScroll = false; return; }
    var ratio = ta.scrollTop / (ta.scrollHeight - ta.clientHeight);
    var pc = dom.previewContent;
    if (pc.scrollHeight > pc.clientHeight) {
        pc.scrollTop = ratio * (pc.scrollHeight - pc.clientHeight);
    }
    requestAnimationFrame(function () { state.syncingScroll = false; });
}

function syncScrollToEditor() {
    if (state.syncingScroll) return;
    state.syncingScroll = true;
    var pc = dom.previewContent;
    if (pc.scrollHeight <= pc.clientHeight) { state.syncingScroll = false; return; }
    var ratio = pc.scrollTop / (pc.scrollHeight - pc.clientHeight);
    var ta = dom.editorTextarea;
    if (ta.scrollHeight > ta.clientHeight) {
        ta.scrollTop = ratio * (ta.scrollHeight - ta.clientHeight);
    }
    requestAnimationFrame(function () { state.syncingScroll = false; });
}

// ---- 行号 ----
function updateLineNumbers() {
    var lines = dom.editorTextarea.value.split('\n').length;
    var nums = '';
    for (var i = 1; i <= lines; i++) { nums += i + '\n'; }
    var inner = dom.lineNumbers.querySelector('.line-numbers-inner');
    if (!inner) {
        inner = document.createElement('div');
        inner.className = 'line-numbers-inner';
        dom.lineNumbers.appendChild(inner);
    }
    inner.textContent = nums || '1';
    dom.lineNumbers.scrollTop = dom.editorTextarea.scrollTop;
}

// ---- 字数统计 ----
function countWords(text) {
    if (!text || text.trim() === '') return 0;
    return (text.match(/[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/g) || []).length +
           (text.match(/[a-zA-Z0-9]+/g) || []).length +
           (text.match(/[^\s\w\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/g) || []).length;
}

function countChars(text) { return text ? text.length : 0; }

function updateWordCountPill() {
    var ta = dom.editorTextarea;
    var text = ta.value;
    var totalWords = countWords(text);
    var totalChars = countChars(text);
    var totalLines = text ? text.split('\n').length : 0;
    var html = '';
    if (ta.selectionStart !== ta.selectionEnd) {
        var sel = text.substring(ta.selectionStart, ta.selectionEnd);
        var selWords = countWords(sel);
        var selChars = countChars(sel);
        html = '<span class="pill-selected">已选 ' + formatNumber(selWords) + ' 字 / ' + formatNumber(selChars) + ' 字符</span>' +
               '<span class="pill-sep">|</span>' +
               '共 ' + formatNumber(totalWords) + ' 字<span class="pill-sep"> | </span>' +
               formatNumber(totalChars) + ' 字符<span class="pill-sep"> | </span>' +
               formatNumber(totalLines) + ' 行';
    } else {
        html = formatNumber(totalWords) + ' 字<span class="pill-sep"> | </span>' +
               formatNumber(totalChars) + ' 字符<span class="pill-sep"> | </span>' +
               formatNumber(totalLines) + ' 行';
    }
    dom.pillContent.innerHTML = html;
}

// ---- 标题更新 ----
function updateTitle() {
    if (state.currentFile) {
        var prefix = state.isModified ? '*' : '';
        document.title = prefix + state.currentFile.name + ' - Wrimark  v' + VERSION;
    } else {
        document.title = 'Wrimark  v' + VERSION + '  (By Qcwwn Studio)';
    }
}

async function updateWindowTitle() {
    try { await api.call('set_modified', state.isModified); } catch (e) {}
}

// ---- 崩溃保护 ----
function crashSave() {
    try {
        var data = { content: dom.editorTextarea.value, filePath: state.currentFile ? state.currentFile.path : null, timestamp: Date.now() };
        localStorage.setItem('wrimark_crash_backup', JSON.stringify(data));
    } catch (e) {}
}

function crashRestore() {
    try {
        var raw = localStorage.getItem('wrimark_crash_backup');
        if (!raw) return false;
        var data = JSON.parse(raw);
        if (data.content && data.content.trim()) return data;
    } catch (e) {}
    return false;
}

function crashClear() { try { localStorage.removeItem('wrimark_crash_backup'); } catch (e) {} }

// ---- 模式切换 ----
function showHome() {
    state.mode = 'home';
    dom.splash.style.display = 'none';
    dom.home.style.display = '';
    dom.editor.style.display = 'none';
    dom.settingsModal.style.display = 'none';
    state.settingsOpen = false;
    resetCheckUpdate();
    updateSettingsBtnState();
    updateTitle();
    updateWindowTitle();
}

function showEditor() {
    state.mode = 'editor';
    dom.splash.style.display = 'none';
    dom.home.style.display = 'none';
    dom.editor.style.display = '';
    dom.editorTextarea.focus();
    updateLineNumbers();
    updateWordCountPill();
    updateTitle();
    updateWindowTitle();
    updateFullscreenBtnState();
    updateUndoRedoState();
    syncContentToPython();
    renderPreview();
}

// ---- 编辑器内容变化 ----
function onEditorInput(e) {
    if (!state.isModified) { state.isModified = true; updateTitle(); updateWindowTitle(); }
    updateLineNumbers();
    updateWordCountPill();
    renderPreviewDebounced();
    syncContentToPython();
    updateUndoRedoState();
    updateOutline();
    crashSaveDebounced();
}

const syncContentToPython = debounce(function () {
    api.call('update_content', dom.editorTextarea.value);
}, 300);

const crashSaveDebounced = debounce(crashSave, 2000);

function updateUndoRedoState() {
    // 始终启用，由浏览器自行判断是否有可撤销/重做的操作
    $('#btnUndo').disabled = false;
    $('#btnRedo').disabled = false;
}

// ---- 大纲视图 ----
function updateOutline() {
    var text = dom.editorTextarea.value;
    var lines = text.split('\n');
    var headings = [];
    for (var i = 0; i < lines.length; i++) {
        var m = lines[i].match(/^(#{1,6})\s+(.+)$/);
        if (m) headings.push({ level: m[1].length, text: m[2].trim(), line: i });
    }
    if (headings.length === 0) {
        dom.outlineContent.innerHTML = '<p class="outline-empty">暂无标题</p>';
        return;
    }
    var html = '';
    headings.forEach(function (h) {
        html += '<button class="outline-item lvl-h' + h.level + '" data-line="' + h.line + '" title="' +
                h.text.replace(/"/g, '&quot;') + '">' +
                (h.level <= 3 ? '<strong>' + h.text + '</strong>' : h.text) + '</button>';
    });
    dom.outlineContent.innerHTML = html;
    dom.outlineContent.querySelectorAll('.outline-item').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var line = parseInt(this.dataset.line);
            var ta = dom.editorTextarea;
            var lines = ta.value.split('\n');
            var pos = 0;
            for (var i = 0; i < line; i++) { pos += lines[i].length + 1; }
            ta.focus();
            ta.setSelectionRange(pos, pos);
            var lineH = parseFloat(getComputedStyle(ta).lineHeight) || 26;
            ta.scrollTop = Math.max(0, line * lineH - ta.clientHeight / 3);
        });
    });
}

function toggleOutline() {
    state.outlineVisible = !state.outlineVisible;
    dom.outlineSidebar.style.display = state.outlineVisible ? '' : 'none';
    if (state.outlineVisible) updateOutline();
}

// ---- 保存 ----
async function saveFile() {
    if (!state.currentFile) return await saveFileAs();
    try {
        var result = await api.call('save_file', dom.editorTextarea.value);
        if (result && result.status === 'ok') { state.isModified = false; updateTitle(); updateWindowTitle(); crashClear(); return true; }
        else if (result && result.status === 'error') { alert('保存失败：' + result.message); }
    } catch (e) { alert('保存失败：' + e.message); }
    return false;
}

async function saveFileAs() {
    try {
        var result = await api.call('save_file_as', dom.editorTextarea.value);
        if (result && result.status === 'ok') {
            state.currentFile = { path: result.path, name: getFileName(result.path) };
            state.isModified = false; updateTitle(); updateWindowTitle(); crashClear(); return true;
        }
    } catch (e) { alert('另存为失败：' + e.message); }
    return false;
}

// ---- 新建/打开 ----
async function newFile() {
    if (state.mode === 'editor' && state.isModified) {
        var action = await showUnsavedDialog();
        if (action === 'cancel') return;
        if (action === 'save') { if (!await saveFile()) return; }
    }
    try {
        var filepath = await api.call('new_file_dialog');
        if (filepath) {
            state.currentFile = { path: filepath, name: getFileName(filepath) };
            state.isModified = false; dom.editorTextarea.value = '';
            resetEditor(); showEditor(); crashClear();
        }
    } catch (e) { console.error('新建文件失败:', e); }
}

async function openFile() {
    if (state.mode === 'editor' && state.isModified) {
        var action = await showUnsavedDialog();
        if (action === 'cancel') return;
        if (action === 'save') { if (!await saveFile()) return; }
    }
    try {
        var result = await api.call('open_file_dialog');
        if (result && result.path) {
            if (result.error) { alert(result.error); return; }
            state.currentFile = { path: result.path, name: getFileName(result.path) };
            state.isModified = false; dom.editorTextarea.value = result.content;
            resetEditor(); showEditor(); crashClear();
            dom.editorTextarea.scrollTop = 0; dom.previewContent.scrollTop = 0;
        }
    } catch (e) { console.error('打开文件失败:', e); }
}

function resetEditor() {
    dom.editor.classList.remove('fullscreen-editor', 'fullscreen-preview');
    state.editorFullscreen = false; state.previewFullscreen = false;
    updateFullscreenBtnState();
}

// ---- 初始文件加载 ----
async function loadInitialFile() {
    for (var i = 0; i < 20; i++) {
        if (typeof pywebview !== 'undefined' && pywebview.api) break;
        await new Promise(function (r) { setTimeout(r, 50); });
    }
    try {
        var result = await api.call('get_initial_file');
        if (result && result.path && !result.error) {
            state.currentFile = { path: result.path, name: getFileName(result.path) };
            state.isModified = false; dom.editorTextarea.value = result.content;
            api.call('update_content', result.content);
            state.skipSplash = true; showEditor(); crashClear();
            dom.editorTextarea.scrollTop = 0; dom.previewContent.scrollTop = 0;
            return;
        }
    } catch (e) {}
    state.skipSplash = false;
    var backup = crashRestore();
    if (backup) state._crashBackup = backup;
}

// ---- 未保存对话框 ----
function showUnsavedDialog() {
    return new Promise(function (resolve) {
        dom.unsavedModal.style.display = '';
        function cleanup() {
            dom.unsavedModal.style.display = 'none';
            $('#unsavedSaveBtn').removeEventListener('click', onSave);
            $('#unsavedDiscardBtn').removeEventListener('click', onDiscard);
            $('#unsavedCancelBtn').removeEventListener('click', onCancel);
        }
        function onSave() { cleanup(); resolve('save'); }
        function onDiscard() { cleanup(); resolve('discard'); }
        function onCancel() { cleanup(); resolve('cancel'); }
        $('#unsavedSaveBtn').addEventListener('click', onSave);
        $('#unsavedDiscardBtn').addEventListener('click', onDiscard);
        $('#unsavedCancelBtn').addEventListener('click', onCancel);
    });
}

// ---- 导出 ----
async function exportHTML() {
    var htmlContent = buildExportHTML();
    try {
        var result = await api.call('export_html', htmlContent);
        if (result && result.status === 'ok') { alert('HTML 文件已导出到：\n' + result.path); }
    } catch (e) { console.error('导出失败:', e); }
}

function exportPDF() {
    var htmlContent = buildExportHTML();
    var win = window.open('', '_blank', 'width=800,height=600');
    win.document.write(htmlContent);
    win.document.close();
    win.onload = function () { setTimeout(function () { win.print(); }, 500); };
}

function buildExportHTML() {
    var bodyHtml = renderMarkdown(dom.editorTextarea.value);
    var style = '';
    if (state.previewStyle === 'github') style = 'github-style';
    if (state.previewStyle === 'vuepress') style = 'vuepress-style';
    return '<!DOCTYPE html>\n<html lang="zh-CN">\n<head>\n<meta charset="UTF-8">\n' +
           '<title>' + (state.currentFile ? state.currentFile.name : 'Wrimark Export') + '</title>\n' +
           '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">\n' +
           '<style>body{max-width:860px;margin:40px auto;padding:0 20px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.7;color:#333;}' +
           'h1,h2{border-bottom:1px solid #eee;padding-bottom:.3em;}code{background:#f4f4f4;padding:2px 6px;border-radius:3px;}' +
           'pre{background:#f4f4f4;padding:16px;border-radius:6px;overflow-x:auto;}blockquote{border-left:4px solid #1a73e8;margin:0;padding:0 1em;color:#555;background:#f5f6f8;}' +
           'table{border-collapse:collapse;width:100%;}th,td{border:1px solid #ddd;padding:8px 12px;}th{background:#f5f6f8;}' +
           'img{max-width:100%;}@media print{body{margin:0;max-width:none;}}</style>\n' +
           '</head>\n<body class="markdown-body ' + style + '">\n' + bodyHtml + '\n</body>\n</html>';
}

// ---- 全屏切换 ----
function toggleEditorFullscreen() {
    state.editorFullscreen = !state.editorFullscreen;
    state.previewFullscreen = false;
    if (state.editorFullscreen) {
        dom.editor.classList.add('fullscreen-editor');
        dom.editor.classList.remove('fullscreen-preview');
    } else { dom.editor.classList.remove('fullscreen-editor'); }
    updateFullscreenBtnState();
    dom.editorTextarea.focus();
}

function togglePreviewFullscreen() {
    state.previewFullscreen = !state.previewFullscreen;
    state.editorFullscreen = false;
    if (state.previewFullscreen) {
        dom.editor.classList.add('fullscreen-preview');
        dom.editor.classList.remove('fullscreen-editor');
    } else { dom.editor.classList.remove('fullscreen-preview'); }
    updateFullscreenBtnState();
}

function updateFullscreenBtnState() {
    if (dom.btnEditorFullscreen) {
        dom.btnEditorFullscreen.classList.toggle('fs-active', state.editorFullscreen);
    }
    if (dom.btnPreviewFullscreen) {
        dom.btnPreviewFullscreen.classList.toggle('fs-active', state.previewFullscreen);
    }
}

// ---- Ribbon 功能区 ----
function initRibbon() {
    dom.ribbon.querySelectorAll('.ribbon-tab').forEach(function (tab) {
        tab.addEventListener('click', function () {
            var panelName = this.dataset.tab;
            dom.ribbon.querySelectorAll('.ribbon-tab').forEach(function (t) { t.classList.remove('active'); });
            this.classList.add('active');
            dom.ribbon.querySelectorAll('.ribbon-panel').forEach(function (p) { p.classList.remove('active'); });
            var panel = dom.ribbon.querySelector('[data-panel="' + panelName + '"]');
            if (panel) panel.classList.add('active');
        });
    });

    dom.ribbonCollapseBtn.addEventListener('click', function () {
        state.ribbonCollapsed = !state.ribbonCollapsed;
        dom.ribbon.classList.toggle('collapsed', state.ribbonCollapsed);
        dom.ribbonCollapseBtn.classList.toggle('flipped', state.ribbonCollapsed);
        dom.ribbonCollapseBtn.title = state.ribbonCollapsed ? '展开功能区' : '折叠功能区';
    });

    // 格式化按钮 (data-fmt)
    dom.ribbon.querySelectorAll('.rb-btn[data-fmt]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var fmt = this.dataset.fmt;
            applyFormat(fmt);
        });
    });

    // 功能按钮 (data-action)
    dom.ribbon.querySelectorAll('.rb-btn[data-action]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var action = this.dataset.action;
            switch (action) {
                case 'new': newFile(); break;
                case 'open': openFile(); break;
                case 'save': saveFile(); break;
                case 'saveas': saveFileAs(); break;
                case 'exporthtml': exportHTML(); break;
                case 'outline': toggleOutline(); break;
            }
        });
    });

    // 标题选择
    dom.headingSelect.addEventListener('change', function () {
        var level = this.value;
        applyHeading(level);
        this.value = '';
    });

    // 大纲 ribbon 按钮
    if (dom.btnOutlineRibbon) {
        dom.btnOutlineRibbon.addEventListener('click', toggleOutline);
    }
}

// ---- 格式化操作（使用 execCommand('insertText') 保留撤销历史） ----
function applyFormat(fmt) {
    var ta = dom.editorTextarea;
    ta.focus();
    var start = ta.selectionStart;
    var end = ta.selectionEnd;
    var text = ta.value;

    switch (fmt) {
        case 'bold':
            wrapSelection(ta, '**', '**', '加粗文本');
            break;
        case 'italic':
            wrapSelection(ta, '*', '*', '斜体文本');
            break;
        case 'strikethrough':
            wrapSelection(ta, '~~', '~~', '删除线文本');
            break;
        case 'link':
            wrapSelection(ta, '[', '](url)', '链接文本');
            break;
        case 'image':
            wrapSelection(ta, '![', '](url)', '图片描述');
            break;
        case 'code':
            wrapSelection(ta, '`', '`', '代码');
            break;
        case 'codeblock':
            blockInsert(ta, '\n```\n', '\n```\n', '代码');
            break;
        case 'quote':
            prefixLines(ta, '> ');
            break;
        case 'divider':
            insertAtCursor(ta, '\n---\n');
            break;
        case 'highlight':
            wrapSelection(ta, '<mark>', '</mark>', '高亮文本');
            break;
        case 'ul':
            prefixLines(ta, '- ');
            break;
        case 'ol':
            prefixLines(ta, '1. ');
            break;
        case 'task':
            prefixLines(ta, '- [ ] ');
            break;
        case 'table':
            blockInsert(ta, '\n| 列1 | 列2 | 列3 |\n|-----|-----|-----|\n', '| 内容 | 内容 | 内容 |\n', '');
            break;
    }
    onEditorInput();
    ta.focus();
}

// 包裹选中文本（保留撤销历史）
// 通过 execCommand('insertText') 执行插入，确保操作进入撤销栈
function execInsert(ta, text) {
    ta.focus();
    document.execCommand('insertText', false, text);
}

function wrapSelection(ta, before, after, placeholder) {
    ta.focus();
    var start = ta.selectionStart;
    var end = ta.selectionEnd;
    if (start !== end) {
        var sel = ta.value.substring(start, end);
        ta.setSelectionRange(start, end);
        execInsert(ta, before + sel + after);
        ta.setSelectionRange(start + before.length, end + before.length);
    } else {
        execInsert(ta, before + placeholder + after);
        ta.setSelectionRange(start + before.length, start + before.length + placeholder.length);
    }
}

function insertAtCursor(ta, text) {
    var pos = ta.selectionStart;
    execInsert(ta, text);
    ta.setSelectionRange(pos + text.length, pos + text.length);
}

function blockInsert(ta, before, after, placeholder) {
    ta.focus();
    var start = ta.selectionStart;
    var end = ta.selectionEnd;
    if (start !== end) {
        var sel = ta.value.substring(start, end);
        ta.setSelectionRange(start, end);
        execInsert(ta, before + sel + after);
        ta.setSelectionRange(start + before.length, end + before.length);
    } else {
        var ins = before + placeholder + after;
        execInsert(ta, ins);
        ta.setSelectionRange(start + before.length, start + before.length + placeholder.length);
    }
}

function prefixLines(ta, prefix) {
    ta.focus();
    var start = ta.selectionStart;
    var end = ta.selectionEnd;
    var text = ta.value;
    if (start !== end) {
        var lineStart = text.lastIndexOf('\n', start - 1) + 1;
        var selWithContext = text.substring(lineStart, end);
        var indented = selWithContext.split('\n').map(function (l) { return prefix + l; }).join('\n');
        ta.setSelectionRange(lineStart, end);
        execInsert(ta, indented);
        ta.setSelectionRange(lineStart, lineStart + indented.length);
    } else {
        var ls = text.lastIndexOf('\n', start - 1) + 1;
        ta.setSelectionRange(ls, ls);
        execInsert(ta, prefix);
        ta.setSelectionRange(start + prefix.length, start + prefix.length);
    }
}

function applyHeading(level) {
    var ta = dom.editorTextarea;
    ta.focus();
    var start = ta.selectionStart;
    var text = ta.value;
    var lineStart = text.lastIndexOf('\n', start - 1) + 1;
    var lineEnd = text.indexOf('\n', start);
    if (lineEnd === -1) lineEnd = text.length;
    var line = text.substring(lineStart, lineEnd);
    var cleanLine = line.replace(/^#{1,6}\s*/, '');
    var newLine = level ? '#'.repeat(parseInt(level.replace('h', ''))) + ' ' + cleanLine : cleanLine;
    ta.setSelectionRange(lineStart, lineEnd);
    execInsert(ta, newLine);
    onEditorInput();
}

// ---- 自动配对补全 ----
const PAIRS = { '(': ')', '[': ']', '{': '}', '"': '"', "'": "'", '`': '`', '（': '）', '【': '】', '《': '》', '「': '」' };

function handleAutoPair(e) {
    if (state.mode !== 'editor') return;
    var ta = dom.editorTextarea;
    if (document.activeElement !== ta) return;
    var paired = PAIRS[e.key];
    if (!paired) return;
    if (e.key === paired && ta.selectionStart < ta.value.length && ta.value[ta.selectionStart] === paired) {
        e.preventDefault();
        ta.setSelectionRange(ta.selectionStart + 1, ta.selectionStart + 1);
        return;
    }
    if (e.key !== paired) {
        var start = ta.selectionStart, end = ta.selectionEnd;
        e.preventDefault();
        if (start !== end) {
            var sel = ta.value.substring(start, end);
            ta.setSelectionRange(start, end);
            execInsert(ta, e.key + sel + paired);
            ta.setSelectionRange(start + 1, end + 1);
        } else {
            execInsert(ta, e.key + paired);
            ta.setSelectionRange(start + 1, start + 1);
        }
    }
}

// ---- 智能缩进 ----
function handleSmartIndent(e) {
    if (e.key !== 'Enter' || state.mode !== 'editor') return;
    var ta = dom.editorTextarea;
    if (document.activeElement !== ta) return;
    var start = ta.selectionStart;
    var text = ta.value;
    var lineStart = text.lastIndexOf('\n', start - 1) + 1;
    var currentLine = text.substring(lineStart, start);
    var listMatch = currentLine.match(/^(\s*)([-*+]|\d+[.)])\s+(\[[ x]\]\s+)?/);
    if (!listMatch) {
        var indentMatch = currentLine.match(/^(\s+)/);
        if (indentMatch && currentLine.trim() !== '') {
            e.preventDefault();
            execInsert(ta, '\n' + indentMatch[1]);
            onEditorInput();
        }
        return;
    }
    var indent = listMatch[1], marker = listMatch[2], task = listMatch[3] || '';
    if (currentLine.replace(/^\s*[-*+]\s+(\[[ x]\]\s+)?/, '').trim() === '') {
        e.preventDefault();
        var lineEnd = text.indexOf('\n', start);
        if (lineEnd === -1) lineEnd = text.length;
        ta.setSelectionRange(lineStart, lineEnd);
        execInsert(ta, '\n');
        ta.setSelectionRange(lineStart + 1, lineStart + 1);
        onEditorInput();
        return;
    }
    var newMarker = marker;
    if (/^\d+[.)]$/.test(marker)) {
        newMarker = (parseInt(marker) + 1) + marker.slice(-1);
    }
    e.preventDefault();
    execInsert(ta, '\n' + indent + newMarker + ' ' + task);
    onEditorInput();
}

// ---- 查找和替换 ----
function showFindReplace() {
    if (dom.frBox) {
        dom.frBox.style.removeProperty('left');
        dom.frBox.style.removeProperty('top');
        dom.frBox.style.transform = 'translateX(-50%)';
    }
    dom.findReplaceDialog.style.display = '';
    dom.frFindInput.focus(); dom.frFindInput.select();
    state.findMatches = []; state.findMatchIndex = -1;
    dom.frCount.textContent = '';
}

function hideFindReplace() { dom.findReplaceDialog.style.display = 'none'; }

function doFind() {
    var text = dom.editorTextarea.value;
    var query = dom.frFindInput.value;
    if (!query) { state.findMatches = []; state.findMatchIndex = -1; dom.frCount.textContent = ''; return; }
    var caseSensitive = dom.frCaseSensitive.checked;
    var wholeWord = dom.frWholeWord.checked;
    var useRegex = dom.frRegex.checked;
    var pattern = useRegex ? query : query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (!useRegex && wholeWord) pattern = '\\b' + pattern + '\\b';
    var flags = 'g' + (caseSensitive ? '' : 'i');
    var regex;
    try { regex = new RegExp(pattern, flags); } catch (e) { dom.frCount.textContent = '正则无效'; return; }
    state.findMatches = [];
    var match, lastIdx = -1;
    while ((match = regex.exec(text)) !== null) {
        if (match.index === lastIdx) { regex.lastIndex++; continue; }
        lastIdx = match.index;
        state.findMatches.push({ start: match.index, end: match.index + match[0].length, text: match[0] });
    }
    if (state.findMatches.length > 0) { state.findMatchIndex = 0; dom.frCount.textContent = '1 / ' + state.findMatches.length; scrollToMatch(0); }
    else { state.findMatchIndex = -1; dom.frCount.textContent = '无匹配'; }
}

function findNext() {
    if (state.findMatches.length === 0) { doFind(); return; }
    state.findMatchIndex = (state.findMatchIndex + 1) % state.findMatches.length;
    dom.frCount.textContent = (state.findMatchIndex + 1) + ' / ' + state.findMatches.length;
    scrollToMatch(state.findMatchIndex);
}

function scrollToMatch(index) {
    var match = state.findMatches[index];
    if (!match) return;
    dom.editorTextarea.focus();
    dom.editorTextarea.setSelectionRange(match.start, match.end);
    var textBefore = dom.editorTextarea.value.substring(0, match.start);
    var line = textBefore.split('\n').length;
    var lineHeight = parseFloat(getComputedStyle(dom.editorTextarea).lineHeight) || 26;
    dom.editorTextarea.scrollTop = Math.max(0, (line - 5) * lineHeight);
}

function replaceCurrent() {
    if (state.findMatches.length === 0 || state.findMatchIndex < 0) return;
    var match = state.findMatches[state.findMatchIndex];
    var replacement = dom.frReplaceInput.value;
    var ta = dom.editorTextarea;
    ta.focus();
    ta.setSelectionRange(match.start, match.end);
    execInsert(ta, replacement);
    onEditorInput(); doFind();
}

function replaceAll() {
    if (!dom.frFindInput.value) return;
    var query = dom.frFindInput.value;
    var caseSensitive = dom.frCaseSensitive.checked;
    var wholeWord = dom.frWholeWord.checked;
    var useRegex = dom.frRegex.checked;
    var pattern = useRegex ? query : query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (!useRegex && wholeWord) pattern = '\\b' + pattern + '\\b';
    var flags = 'g' + (caseSensitive ? '' : 'i');
    var regex;
    try { regex = new RegExp(pattern, flags); } catch (e) { return; }
    var count = (dom.editorTextarea.value.match(regex) || []).length;
    dom.editorTextarea.value = dom.editorTextarea.value.replace(regex, dom.frReplaceInput.value);
    onEditorInput();
    dom.frCount.textContent = '已替换 ' + count + ' 处';
    state.findMatches = []; state.findMatchIndex = -1;
}

// ---- 搜索弹窗拖拽 ----
function initFindDrag() {
    var box = dom.frBox;
    var handle = document.getElementById('frDragHandle');
    if (!box || !handle) return;
    var isDragging, startX, startY, startLeft, startTop;
    handle.addEventListener('mousedown', function (e) {
        if (e.target.tagName === 'BUTTON') return;
        isDragging = true; startX = e.clientX; startY = e.clientY;
        var rect = box.getBoundingClientRect();
        startLeft = rect.left; startTop = rect.top;
        box.style.transform = 'none'; box.style.left = startLeft + 'px'; box.style.top = startTop + 'px';
        document.body.style.userSelect = 'none'; e.preventDefault();
    });
    document.addEventListener('mousemove', function (e) {
        if (!isDragging) return;
        box.style.left = (startLeft + e.clientX - startX) + 'px';
        box.style.top = (startTop + e.clientY - startY) + 'px';
    });
    document.addEventListener('mouseup', function () { if (isDragging) { isDragging = false; document.body.style.userSelect = ''; } });
}

// ---- 设置弹窗 ----
function showSettings() {
    state.settingsOpen = true;
    if (dom.themeSelect) dom.themeSelect.value = state.theme;
    resetCheckUpdate();
    dom.settingsModal.style.display = '';
    updateSettingsBtnState();
}

function hideSettings() {
    state.settingsOpen = false;
    dom.settingsModal.style.display = 'none';
    updateSettingsBtnState();
}

function updateSettingsBtnState() {
    if (dom.homeSettingsBtn) dom.homeSettingsBtn.classList.toggle('disabled', state.settingsOpen);
}

// ---- 检查更新 ----
function resetCheckUpdate() {
    state.checkUpdateState = 'idle';
    if (dom.checkUpdateLink) { dom.checkUpdateLink.textContent = '检查更新'; dom.checkUpdateLink.className = 'check-update-link'; dom.checkUpdateLink.onclick = null; }
}

async function checkUpdate() {
    if (state.checkUpdateState === 'checking') return;
    state.checkUpdateState = 'checking';
    if (dom.checkUpdateLink) { dom.checkUpdateLink.textContent = '正在检查更新...'; dom.checkUpdateLink.className = 'check-update-link updating'; }
    try {
        var result = await api.call('check_update');
        state.checkUpdateState = 'done';
        if (result && result.status === 'ok') {
            if (result.version && result.version !== VERSION) {
                if (dom.checkUpdateLink) {
                    dom.checkUpdateLink.textContent = '立即更新';
                    dom.checkUpdateLink.className = 'check-update-link has-update';
                    dom.checkUpdateLink.onclick = function (e) { e.preventDefault(); api.call('open_url', 'http://studio.qcwwn.cn/Wrimark'); };
                }
            } else {
                if (dom.checkUpdateLink) { dom.checkUpdateLink.textContent = '当前已是最新版本'; dom.checkUpdateLink.className = 'check-update-link success'; }
            }
        } else {
            state.checkUpdateState = 'idle';
            if (dom.checkUpdateLink) { dom.checkUpdateLink.textContent = '检查更新失败，点击重试'; dom.checkUpdateLink.className = 'check-update-link failed'; dom.checkUpdateLink.onclick = checkUpdate; }
        }
    } catch (e) {
        state.checkUpdateState = 'idle';
        if (dom.checkUpdateLink) { dom.checkUpdateLink.textContent = '检查更新失败，点击重试'; dom.checkUpdateLink.className = 'check-update-link failed'; dom.checkUpdateLink.onclick = checkUpdate; }
    }
}

// ---- Tab 缩进 ----
function handleTabKey(e) {
    e.preventDefault();
    var ta = dom.editorTextarea;
    ta.focus();
    var start = ta.selectionStart, end = ta.selectionEnd;
    if (start !== end) {
        var text = ta.value;
        var lineStart = text.lastIndexOf('\n', start - 1) + 1;
        var selWithContext = text.substring(lineStart, end);
        var indented = selWithContext.split('\n').map(function (l) { return '    ' + l; }).join('\n');
        ta.setSelectionRange(lineStart, end);
        execInsert(ta, indented);
        ta.setSelectionRange(lineStart, lineStart + indented.length);
    } else {
        execInsert(ta, '    ');
        ta.setSelectionRange(start + 4, start + 4);
    }
    onEditorInput();
}

// ---- 自动保存 ----
function toggleAutoSave() {
    state.autoSaveEnabled = dom.autoSaveCheck.checked;
    if (state.autoSaveEnabled) startAutoSave(); else stopAutoSave();
}

function startAutoSave() {
    stopAutoSave();
    state.autoSaveTimer = setInterval(async function () {
        if (state.isModified && state.currentFile && state.mode === 'editor') {
            try { await api.call('save_file', dom.editorTextarea.value); state.isModified = false; updateTitle(); updateWindowTitle(); crashClear(); } catch (e) {}
        }
    }, 60000);
}

function stopAutoSave() { if (state.autoSaveTimer) { clearInterval(state.autoSaveTimer); state.autoSaveTimer = null; } }

// ---- 事件绑定 ----
function bindEvents() {
    $('#btnNewFile').addEventListener('click', newFile);
    $('#btnOpenFile').addEventListener('click', openFile);
    dom.homeClickable.addEventListener('click', showSettings);
    dom.homeSettingsBtn.addEventListener('click', showSettings);

    dom.editorTextarea.addEventListener('input', onEditorInput);
    dom.editorTextarea.addEventListener('scroll', function () {
        dom.lineNumbers.scrollTop = dom.editorTextarea.scrollTop;
        syncScrollToPreview();
    });
    dom.editorTextarea.addEventListener('mouseup', function () { updateWordCountPill(); });
    dom.editorTextarea.addEventListener('keyup', function () {
        updateWordCountPill(); updateLineNumbers(); updateUndoRedoState();
    });
    dom.editorTextarea.addEventListener('keydown', function (e) {
        handleAutoPair(e);
        handleSmartIndent(e);
        if (e.key === 'Tab' && !e.ctrlKey && !e.metaKey) { handleTabKey(e); }
    });
    dom.previewContent.addEventListener('scroll', syncScrollToEditor);

    $('#btnUndo').addEventListener('click', function () { document.execCommand('undo'); updateUndoRedoState(); onEditorInput(); });
    $('#btnRedo').addEventListener('click', function () { document.execCommand('redo'); updateUndoRedoState(); onEditorInput(); });
    $('#btnSave').addEventListener('click', saveFile);
    $('#btnSaveAs').addEventListener('click', saveFileAs);
    $('#btnSearch').addEventListener('click', function () { if (state.mode === 'editor') showFindReplace(); });
    dom.btnEditorFullscreen.addEventListener('click', toggleEditorFullscreen);
    dom.btnPreviewFullscreen.addEventListener('click', togglePreviewFullscreen);
    dom.btnOutline.addEventListener('click', toggleOutline);
    dom.autoSaveCheck.addEventListener('change', toggleAutoSave);
    dom.editorSettingsBtn.addEventListener('click', showSettings);

    // 语法文档按钮
    if (dom.btnSyntaxDocs) {
        dom.btnSyntaxDocs.addEventListener('click', function () {
            api.call('open_url', 'http://docs.qcwwn.cn/markdown');
        });
    }

    // 视图主题选择
    if (dom.viewThemeSelect) {
        dom.viewThemeSelect.addEventListener('change', function () {
            toggleTheme(dom.viewThemeSelect.value);
        });
    }

    // 预览链接 → 外部浏览器
    dom.previewContent.addEventListener('click', function (e) {
        var link = e.target.closest('a');
        if (link && link.href && !link.href.startsWith('javascript:')) {
            e.preventDefault();
            api.call('open_url', link.href);
        }
    });

    // 设置弹窗
    $('#settingsCloseBtn').addEventListener('click', hideSettings);
    dom.settingsModal.addEventListener('click', function (e) { if (e.target === dom.settingsModal) hideSettings(); });
    dom.themeSelect.addEventListener('change', function () { toggleTheme(dom.themeSelect.value); });

    // 预览风格选择（视图选项卡）
    if (dom.previewStyleSelect) {
        dom.previewStyleSelect.addEventListener('change', function () {
            applyPreviewStyle(dom.previewStyleSelect.value);
        });
    }

    // 设置弹窗中的外部链接
    dom.settingsModal.querySelectorAll('.external-link').forEach(function (el) {
        el.addEventListener('click', function (e) {
            e.preventDefault();
            var href = this.dataset.href || this.getAttribute('href');
            if (href) api.call('open_url', href);
        });
    });

    // 检查更新
    if (dom.checkUpdateLink) {
        dom.checkUpdateLink.addEventListener('click', function (e) { e.preventDefault(); checkUpdate(); });
    }

    // 查找替换
    $('#frSearchBtn').addEventListener('click', doFind);
    dom.frFindInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); doFind(); } });
    $('#frFindNext').addEventListener('click', findNext);
    $('#frReplace').addEventListener('click', replaceCurrent);
    $('#frReplaceAll').addEventListener('click', replaceAll);
    $('#frCloseBtn').addEventListener('click', hideFindReplace);

    // 大纲关闭
    $('#outlineCloseBtn').addEventListener('click', toggleOutline);

    // 键盘快捷键
    document.addEventListener('keydown', handleKeyboardShortcuts);
}

function handleKeyboardShortcuts(e) {
    var ctrl = e.ctrlKey || e.metaKey;
    var ta = dom.editorTextarea;
    var editing = state.mode === 'editor' && document.activeElement === ta;

    if (ctrl && !e.shiftKey && e.key === 's') { e.preventDefault(); if (state.mode === 'editor') saveFile(); return; }
    if (ctrl && e.shiftKey && e.key === 'S') { e.preventDefault(); if (state.mode === 'editor') saveFileAs(); return; }
    if (ctrl && !e.shiftKey && e.key === 'f') { e.preventDefault(); if (state.mode === 'editor') showFindReplace(); return; }
    if (ctrl && !e.shiftKey && e.key === 'h') { e.preventDefault(); if (state.mode === 'editor') { showFindReplace(); dom.frReplaceInput.focus(); } return; }
    if (ctrl && !e.shiftKey && e.key === 'b') { e.preventDefault(); if (editing) { applyFormat('bold'); } return; }
    if (ctrl && !e.shiftKey && e.key === 'i') { e.preventDefault(); if (editing) { applyFormat('italic'); } return; }
    if (ctrl && !e.shiftKey && e.key === 'k') { e.preventDefault(); if (editing) { applyFormat('link'); } return; }
    if (ctrl && !e.shiftKey && e.key === 'n') { e.preventDefault(); newFile(); return; }
    if (ctrl && !e.shiftKey && e.key === 'o') { e.preventDefault(); openFile(); return; }
    if (ctrl && !e.shiftKey && e.key === 'z') { if (editing) { document.execCommand('undo'); updateUndoRedoState(); onEditorInput(); } return; }
    if (ctrl && !e.shiftKey && e.key === 'y') { if (editing) { document.execCommand('redo'); updateUndoRedoState(); onEditorInput(); } return; }
    if (ctrl && e.shiftKey && e.key === 'Z') { if (editing) { document.execCommand('redo'); updateUndoRedoState(); onEditorInput(); } return; }
}

// ---- 初始化 ----
async function init() {
    if (typeof mermaid !== 'undefined') {
        mermaid.initialize({
            startOnLoad: false,
            theme: document.body.classList.contains('dark') ? 'dark' : 'default',
            securityLevel: 'loose',
        });
    }

    bindEvents();
    initFindDrag();
    initRibbon();
    await initTheme();

    await loadInitialFile();

    if (!state.skipSplash) {
        setTimeout(function () {
            dom.splash.classList.add('fade-out');
            setTimeout(function () { showHome(); }, 400);
        }, 2200);
    }

    setTimeout(function () {
        if (state._crashBackup && state.mode === 'editor') {
            if (confirm('检测到上次未正常保存的内容。\n\n是否恢复？')) {
                dom.editorTextarea.value = state._crashBackup.content;
                onEditorInput();
            }
            delete state._crashBackup;
            crashClear();
        }
    }, 500);
}

document.addEventListener('DOMContentLoaded', init);
