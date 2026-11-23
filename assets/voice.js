/* 语音输入：Web Speech API（Chrome / Edge / Safari）
 * 在「智能选款」「自定义定制」「售后服务」「客服解答」四处的主操作按钮旁插一个麦克风按钮，
 * 说完话直接把文字填进对应输入框；不支持或没权限时给出明确提示，不影响原有输入。
 * 依赖：HTTPS 或 localhost（浏览器才给麦克风权限）。
 */
window.VOICE = (function () {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const LANG = {
    zh: 'zh-CN', en: 'en-US', es: 'es-ES', pt: 'pt-BR', ar: 'ar-SA',
    ru: 'ru-RU', id: 'id-ID', vi: 'vi-VN', th: 'th-TH', tr: 'tr-TR'
  };
  const HINTS = {
    'not-allowed': '没有麦克风权限：点地址栏左侧的锁 → 允许麦克风，再试一次',
    'service-not-allowed': '浏览器禁用了语音服务，请到系统/浏览器设置里打开',
    'no-speech': '没听到声音，靠近麦克风再说一次',
    'audio-capture': '没有检测到麦克风设备',
    'network': '语音识别服务连不上（Chrome 用的服务在国内常被墙），建议换 Edge，或直接打字',
    'aborted': ''
  };
  const ICON = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="2.5" width="6" height="11.5" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0"/><path d="M12 17.5V21"/><path d="M8.5 21h7"/></svg>';

  let rec = null, cur = null;

  const say = msg => {
    if (!msg) return;
    try { window.__toast ? window.__toast(msg) : console.log('[voice]', msg); } catch (e) { }
  };
  const lang = () => {
    try { return LANG[(window.I18N && I18N.getLang()) || 'zh'] || 'zh-CN'; } catch (e) { return 'zh-CN'; }
  };

  function reset(btn) {
    if (!btn) return;
    btn.classList.remove('on');
    const s = btn.querySelector('span');
    if (s) s.textContent = btn.dataset.voiceLabel || '语音';
  }
  function stop() {
    try { rec && rec.abort(); } catch (e) { }
    rec = null;
    if (cur) { reset(cur.btn); }
    cur = null;
  }

  function start(input, btn) {
    if (!input) return;
    if (!SR) { say('当前浏览器不支持语音输入，建议用 Chrome / Edge / Safari 打开'); return; }
    if (!window.isSecureContext) { say('语音输入需要 HTTPS 或 localhost，当前地址不满足'); return; }
    if (cur && cur.btn === btn) { stop(); return; }
    stop();

    cur = { input, btn };
    btn.classList.add('on');
    const s = btn.querySelector('span');
    if (s) s.textContent = '聆听中…';

    rec = new SR();
    rec.lang = lang();
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;
    const base = (input.value || '').replace(/\s+$/, '');

    rec.onresult = e => {
      let txt = '';
      for (let i = e.resultIndex; i < e.results.length; i++) txt += e.results[i][0].transcript;
      input.value = base ? base + (/[\s，。；、]$/.test(base) ? '' : ' ') + txt : txt;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.focus();
    };
    rec.onerror = e => { say(HINTS[e.error] === '' ? '' : (HINTS[e.error] || ('语音识别失败：' + e.error))); };
    rec.onend = () => { if (cur) reset(cur.btn); rec = null; cur = null; };
    try { rec.start(); } catch (e) { say('启动语音失败：' + e.message); reset(btn); }
  }

  /* 四个入口：按钮插在各自的主操作按钮前，默认听写进指定输入框 */
  const TARGETS = [
    { page: '#p-select', anchor: '[data-act="doMatch"]', input: '#p-select textarea', label: '语音' },
    { page: '#p-custom', anchor: '[data-act="customSubmit"]', input: '#cuNeed', label: '语音' },
    { page: '#p-aftersale', anchor: '[data-act="asSend"]', input: '#asDesc', label: '语音' },
    { page: null, anchor: '[data-act="csSend"]', input: '#csInput', label: '语音' }
  ];

  function decorate() {
    TARGETS.forEach(t => {
      const scope = t.page ? document.querySelector(t.page) : document;
      if (!scope) return;
      const anchor = scope.querySelector(t.anchor);
      if (!anchor || anchor.dataset.voiceDone) return;
      const input = document.querySelector(t.input);
      if (!input) return;
      anchor.dataset.voiceDone = '1';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'voice-btn';
      btn.dataset.voiceLabel = t.label;
      btn.title = '语音输入（说完自动填进输入框）';
      btn.innerHTML = ICON + '<span>' + t.label + '</span>';
      btn.addEventListener('click', ev => { ev.preventDefault(); start(input, btn); });
      anchor.insertAdjacentElement('beforebegin', btn);
    });
  }

  let timer = null;
  if (window.MutationObserver) {
    const mo = new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(decorate, 120);
    });
    if (document.body) mo.observe(document.body, { childList: true, subtree: true });
  }
  document.addEventListener('DOMContentLoaded', decorate);
  setTimeout(decorate, 600);

  return { supported: () => !!SR, decorate, stop };
})();
