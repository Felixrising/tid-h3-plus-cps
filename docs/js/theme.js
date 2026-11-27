/**
 * theme.js - Optional "Kobayashi console" theme: picker, playful button names and the engine-room hum.
 *
 * The default look is unchanged. The theme is chosen in the header and remembered in localStorage (h3p.theme).
 * With no saved choice it becomes the default every 8 September. The early part of that logic is an inline
 * script in index.html so the page never flashes the wrong theme.
 *
 * In the console theme the main buttons get fun names; hovering shows the plain name (and the usual tooltip).
 * Buttons whose text the app changes later (Connect / Disconnect) are watched and relabelled.
 */
const Theme = (() => {
    const THEME_KEY = 'h3p.theme', AMB_KEY = 'h3p.amb', VOL_KEY = 'h3p.ambVolume';

    const FUN_LABELS = {
        'Connect': 'Open hailing frequencies', 'Disconnect': 'Close channel',
        'Read': 'Scan for lifeforms', 'Write': 'Make it so',
        'Write All': 'Engage', 'Settings Only': 'Ship’s systems only', 'Channels Only': 'Comm channels only', 'FM Radio Only': 'Subspace radio only',
        'Load File': 'Retrieve from archive', 'Save File': 'Store in archive', 'Clear Log': 'Purge log',
        'Settings': 'Engineering', 'Channels': 'Communications', 'FM Channels': 'Subspace radio', 'Debug': 'Diagnostics',
        '♪ Ambience': '♪ Engines', '♪ Ambience on': '♪ Engines online',
    };

    const isOn = () => document.documentElement.dataset.theme === 'console';
    const store = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* private mode */ } };
    const load = (k) => { try { return localStorage.getItem(k); } catch { return null; } };

    /** Show the right text on one button. el.dataset.shown is the text we last wrote, so a change by the app is spotted. */
    function relabel(el) {
        const now = el.textContent.trim();
        if (el.dataset.shown !== now) { // first visit, or the app has set new plain text
            el.dataset.plain = now;
            if (!('tip' in el.dataset)) el.dataset.tip = el.getAttribute('title') || '';
        }
        const plain = el.dataset.plain, tip = el.dataset.tip, fun = isOn() && FUN_LABELS[plain];
        const text = fun || plain;
        if (now !== text) el.textContent = text;
        el.dataset.shown = text;
        const title = fun ? plain + (tip ? '. ' + tip : '') : tip;
        if (title) el.title = title; else el.removeAttribute('title');
    }
    const labelled = () => [...document.querySelectorAll('button')].filter((b) => b.dataset.plain || FUN_LABELS[b.textContent.trim()]);
    const relabelAll = () => labelled().forEach(relabel);

    // ---------- engine-room ambience (console theme only) ----------
    // On by default at 25%. Browsers block sound until the first click or key, so it is armed and starts then.
    // The button mutes it and that choice is remembered.
    const ambOn = () => load(AMB_KEY) !== 'off';
    let btnAmb, ambVol;

    async function toggleAmbience(on, remember = true) {
        if (remember) store(AMB_KEY, on ? 'on' : 'off');
        try { if (on) await Ambience.start(Number(ambVol.value)); else await Ambience.stop(); }
        catch (e) { console.error(e); on = false; }
        btnAmb.setAttribute('aria-pressed', String(on));
        btnAmb.dataset.tip = on ? 'Press to mute the engines' : 'Play a quiet engine hum, made live in your browser';
        btnAmb.textContent = on ? '♪ Ambience on' : '♪ Ambience';
        relabel(btnAmb);
    }

    function setTheme(t) {
        if (t) document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme;
        store(THEME_KEY, t || 'default'); // remembered even for Default, so 8 September doesn't override a choice
        relabelAll();
        if (t !== 'console' && Ambience.isPlaying()) toggleAmbience(false, false);
        else if (t === 'console' && ambOn()) toggleAmbience(true, false); // picking the theme is a click, so audio may start
    }

    function init() {
        const sel = document.getElementById('themeSel');
        btnAmb = document.getElementById('btnAmbience');
        ambVol = document.getElementById('ambVol');

        sel.value = document.documentElement.dataset.theme || '';
        sel.addEventListener('change', (e) => setTheme(e.target.value));
        ambVol.value = load(VOL_KEY) ?? '0.25';

        btnAmb.addEventListener('click', (e) => { e.stopPropagation(); toggleAmbience(!Ambience.isPlaying()); });
        ambVol.addEventListener('input', (e) => {
            if (!Ambience.isPlaying() && ambOn()) toggleAmbience(true, false);
            Ambience.setVolume(Number(e.target.value));
            store(VOL_KEY, e.target.value);
        });
        const arm = (e) => {
            if (e.target?.closest?.('#btnAmbience, #ambVol, #themeSel')) return; // those controls handle themselves
            if (isOn() && ambOn() && !Ambience.isPlaying()) toggleAmbience(true, false);
        };
        for (const ev of ['pointerdown', 'keydown']) document.addEventListener(ev, arm, { capture: true });

        relabelAll();
        // keep fun names when the app rewrites a button's text (e.g. Connect <-> Disconnect)
        new MutationObserver((muts) => {
            const seen = new Set();
            for (const m of muts) {
                const b = (m.target.nodeType === 1 ? m.target : m.target.parentElement)?.closest?.('button');
                if (b && !seen.has(b) && b.dataset.plain !== undefined && b.textContent.trim() !== b.dataset.shown) { seen.add(b); relabel(b); }
            }
        }).observe(document.body, { subtree: true, childList: true, characterData: true });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
    return { setTheme, FUN_LABELS };
})();
