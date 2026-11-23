/* 语音：输入（Web Speech API 语音识别）+ 朗读（语音合成）
 * 语音输入：在「智能选款」「自定义定制」「售后服务」「客服解答」四处主操作按钮旁插麦克风按钮，
 *          说完话直接把文字填进对应输入框。
 * 语音朗读：客服解答里每条消息后加 🔊 按钮，可单条朗读；聊天底部有「朗读：开/关」开关，
 *          开启后新回复自动读出来（仅本机播放，不存音频）。
 * 依赖：HTTPS 或 localhost（浏览器才给麦克风权限）。
 */
window.VOICE = (function () {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const SS = window.speechSynthesis;
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
  const MIC_ICON = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="2.5" width="6" height="11.5" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0"/><path d="M12 17.5V21"/><path d="M8.5 21h7"/></svg>';
  const SPK_ICON = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9.5v5h3.2L12 18.5v-13L7.2 9.5H4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18 6a8.5 8.5 0 0 1 0 12"/></svg>';

  let rec = null, cur = null;
  let ttsAuto = false;
  try { ttsAuto = localStorage.getItem('xm_tts_auto') === '1'; } catch (e) { }

  const say = msg => {
    if (!msg) return;
    try { window.__toast ? window.__toast(msg) : console.log('[voice]', msg); } catch (e) { }
  };
  const langCode = () => {
    try { return LANG[(window.I18N && I18N.getLang()) || 'zh'] || 'zh-CN'; } catch (e) { return 'zh-CN'; }
  };
  const isSecure = () => window.isSecureContext || location.hostname === 'localhost' || location.hostname === '127.0.0.1';

  /* ---------------- 语音输入 ---------------- */
  function reset(btn) {
    if (!btn) return;
    btn.classList.remove('on');
    const s = btn.querySelector('span');
    if (s) s.textContent = btn.dataset.voiceLabel || '语音';
  }
  function stop() {
    try { rec && rec.abort(); } catch (e) { }
    rec = null;
    if (cur) reset(cur.btn);
    cur = null;
  }
  function start(input, btn) {
    if (!input) return;
    if (!SR) { say('当前浏览器不支持语音输入，建议用 Chrome / Edge / Safari 打开'); return; }
    if (!isSecure()) { say('语音输入需要 HTTPS 或 localhost，当前地址不满足'); return; }
    if (cur && cur.btn === btn) { stop(); return; }
    stop();

    cur = { input, btn };
    btn.classList.add('on');
    const s = btn.querySelector('span');
    if (s) s.textContent = '聆听中…';

    rec = new SR();
    rec.lang = langCode();
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

  /* ---------------- 语音朗读（TTS） ---------------- */
  function pickVoice(lang) {
    if (!SS) return null;
    const vs = SS.getVoices() || [];
    const want = (lang || 'zh-CN').toLowerCase();
    const pre = want.split('-')[0];
    return vs.find(v => v.lang && v.lang.toLowerCase() === want)
      || vs.find(v => v.lang && v.lang.toLowerCase().indexOf(pre) === 0)
      || null;
  }
  function speak(text, btn) {
    if (!SS) { say('当前浏览器不支持朗读'); return; }
    const t = String(text || '').trim();
    if (!t) return;
    try { SS.cancel(); } catch (e) { }
    const u = new SpeechSynthesisUtterance(t);
    const l = langCode();
    u.lang = l;
    const v = pickVoice(l);
    if (v) u.voice = v;
    u.rate = 1;
    u.pitch = 1;
    document.querySelectorAll('.tts-btn.on').forEach(b => b.classList.remove('on'));
    if (btn) btn.classList.add('on');
    u.onend = u.onerror = () => { if (btn) btn.classList.remove('on'); };
    try { SS.speak(u); } catch (e) { say('朗读失败：' + e.message); }
    if (SS.getVoices && !SS.getVoices().length) {
      // 部分浏览器首次 getVoices 为空，等语音列表就绪再说一次
      SS.onvoiceschanged = () => {
        const v2 = pickVoice(l);
        if (v2) { SS.cancel(); const u2 = new SpeechSynthesisUtterance(t); u2.lang = l; u2.voice = v2; SS.speak(u2); }
        SS.onvoiceschanged = null;
      };
    }
  }
  function stopSpeak() { try { SS && SS.cancel(); } catch (e) { } document.querySelectorAll('.tts-btn.on').forEach(b => b.classList.remove('on')); }

  function setAuto(on) {
    ttsAuto = !!on;
    try { localStorage.setItem('xm_tts_auto', ttsAuto ? '1' : '0'); } catch (e) { }
    paintToggle();
    if (!ttsAuto) stopSpeak();
  }
  function paintToggle() {
    const b = document.getElementById('ttsToggle');
    if (!b) return;
    b.textContent = ttsAuto ? '🔊' : '🔇';
    b.title = ttsAuto ? '新回复自动朗读：开（点一下关闭）' : '新回复自动朗读：关（点一下开启）';
    b.setAttribute('aria-label', b.title);
  }

  /* ---------------- 注入 ---------------- */
  const MIC_TARGETS = [
    { page: '#p-select', anchor: '[data-act="doMatch"]', input: '#p-select textarea', label: '语音' },
    { page: '#p-custom', anchor: '[data-act="customSubmit"]', input: '#cuNeed', label: '语音' },
    { page: '#p-aftersale', anchor: '[data-act="asSend"]', input: '#asDesc', label: '语音' },
    { page: null, anchor: '[data-act="csSend"]', input: '#csInput', label: '语音' }
  ];
  /* 聊天里可朗读的文本节点 */
  const TTS_SELECTOR = '.cs-msg .cs-b, .chat-msg .cm-t';

  function decorateMic() {
    MIC_TARGETS.forEach(t => {
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
      btn.innerHTML = MIC_ICON + '<span>' + t.label + '</span>';
      btn.addEventListener('click', ev => { ev.preventDefault(); start(input, btn); });
      anchor.insertAdjacentElement('beforebegin', btn);
    });
  }

  function decorateTts() {
    document.querySelectorAll(TTS_SELECTOR).forEach(el => {
      if (el.dataset.ttsDone) return;
      el.dataset.ttsDone = '1';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tts-btn';
      btn.title = '朗读这条';
      btn.innerHTML = SPK_ICON;
      btn.addEventListener('click', ev => { ev.stopPropagation(); ev.preventDefault(); speak(el.textContent, btn); });
      el.insertAdjacentElement('afterend', btn);
    });

    /* 聊天顶部的朗读开关（客户/员工都看得到） */
    if (!document.getElementById('ttsToggle')) {
      const head = document.querySelector('.chat-h') || document.getElementById('chatFoot');
      if (head) {
        const b = document.createElement('button');
        b.id = 'ttsToggle';
        b.type = 'button';
        b.className = 'chat-hist';
        b.style.cssText = 'width:24px;height:24px;margin-right:2px;padding:0;display:inline-flex;align-items:center;justify-content:center;font-size:12.5px;line-height:1;flex:none';
        b.addEventListener('click', () => setAuto(!ttsAuto));
        const anchor = document.getElementById('chatHist');
        if (anchor && anchor.parentNode === head) head.insertBefore(b, anchor);
        else head.appendChild(b);
        paintToggle();
      }
    }

    /* 自动朗读：只读最新一条对方消息（bot / 客户） */
    if (ttsAuto) {
      const list = document.querySelectorAll('.cs-msg.bot .cs-b, .chat-msg .cm-t');
      const last = list[list.length - 1];
      if (last && !last.dataset.spoken) {
        list.forEach(x => { x.dataset.spoken = '1'; });
        speak(last.textContent);
      }
    }
  }

  function decorate() { decorateMic(); decorateTts(); }

  let timer = null;
  if (window.MutationObserver) {
    const mo = new MutationObserver(() => { clearTimeout(timer); timer = setTimeout(decorate, 120); });
    const startObserve = () => { if (document.body) mo.observe(document.body, { childList: true, subtree: true }); };
    if (document.body) startObserve(); else document.addEventListener('DOMContentLoaded', startObserve);
  }
  document.addEventListener('DOMContentLoaded', decorate);
  setTimeout(decorate, 600);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopSpeak(); });

  return {
    supported: () => !!SR,
    ttsSupported: () => !!SS,
    decorate, stop, speak, stopSpeak, setAuto,
    get auto() { return ttsAuto; }
  };
})();
