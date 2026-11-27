/**
 * ambience.js - Original synthesized "ship's engine" ambience for the Kobayashi console theme (Web Audio API, no recordings).
 * A low detuned drone, soft brown noise through a slowly drifting filter, and a faint high hum.
 * Browsers only allow audio after a click, so start() must be called from a click handler.
 * Ported from LITO Config; exposed as window.Ambience (this app uses classic scripts, not modules).
 */
const Ambience = (() => {

    let ctx = null, master = null, nodes = [];

    function brownNoise(ac, seconds = 4) {
      const buf = ac.createBuffer(1, ac.sampleRate * seconds, ac.sampleRate), d = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < d.length; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; }
      const src = ac.createBufferSource(); src.buffer = buf; src.loop = true; return src;
    }
    function lfo(ac, hz, depth, target) {
      const o = ac.createOscillator(), g = ac.createGain();
      o.frequency.value = hz; g.gain.value = depth; o.connect(g).connect(target); o.start(); nodes.push(o);
    }

    function isPlaying() { return !!ctx && ctx.state === 'running'; }

    function setVolume(v) {
      if (master) master.gain.setTargetAtTime(Math.max(0, Math.min(1, v)) * 0.5, ctx.currentTime, 0.3);
    }

    async function start(volume = 0.4) {
      if (ctx) { await ctx.resume(); setVolume(volume); return; }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) throw new Error('This browser has no Web Audio');
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);

      // 1. engine drone: two detuned low saws and a sub sine, warmly filtered
      const droneFilter = ctx.createBiquadFilter(); droneFilter.type = 'lowpass'; droneFilter.frequency.value = 140; droneFilter.Q.value = 0.7;
      const droneGain = ctx.createGain(); droneGain.gain.value = 0.32;
      droneFilter.connect(droneGain).connect(master);
      for (const [type, f, g] of [['sawtooth', 41.2, 0.5], ['sawtooth', 41.55, 0.5], ['sine', 20.6, 0.9]]) {
        const o = ctx.createOscillator(), og = ctx.createGain();
        o.type = type; o.frequency.value = f; og.gain.value = g; o.connect(og).connect(droneFilter); o.start(); nodes.push(o);
      }
      lfo(ctx, 0.05, 30, droneFilter.frequency); // the drone slowly breathes

      // 2. air / plasma rush: brown noise through a drifting band
      const noise = brownNoise(ctx), band = ctx.createBiquadFilter(), ng = ctx.createGain();
      band.type = 'lowpass'; band.frequency.value = 380; band.Q.value = 0.4; ng.gain.value = 0.55;
      noise.connect(band).connect(ng).connect(master); noise.start(); nodes.push(noise);
      lfo(ctx, 0.031, 140, band.frequency);
      lfo(ctx, 0.017, 0.15, ng.gain);

      // 3. a faint electrical hum far in the background
      const hum = ctx.createOscillator(), hg = ctx.createGain();
      hum.type = 'triangle'; hum.frequency.value = 246.9; hg.gain.value = 0.006;
      hum.connect(hg).connect(master); hum.start(); nodes.push(hum);
      lfo(ctx, 0.11, 0.004, hg.gain);

      setVolume(volume); // fades in
    }

    async function stop() {
      if (!ctx) return;
      master.gain.setTargetAtTime(0, ctx.currentTime, 0.25);
      await new Promise((r) => setTimeout(r, 900));
      await ctx.suspend();
    }

    return { start, stop, setVolume, isPlaying };
})();
