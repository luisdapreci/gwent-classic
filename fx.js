"use strict";

// Purely visual effects: canvas particles, screen shake, card tilt and CSS effect triggers.
const fx = (() => {
	const TAU = Math.PI * 2;
	const MAX_PARTICLES = 900;
	const TILT_SELECTOR = ".card-preview > .card-lg, #carousel .card-lg, .card-array .card-lg:not(.empty), #card-leader > div, .title-fan > .card-lg";
	const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
	const classTimers = new WeakMap();
	const layers = [];
	let lastTime = 0;
	let tiltElem = null;

	const rand = (min, max) => min + Math.random() * (max - min);

	function enabled() {
		return Settings.effects.isEnabled() && !reducedMotion.matches;
	}

	// ---------------- particle factories ----------------

	function ember(layer, u) {
		return {
			kind: "glow",
			x: rand(0, layer.w), y: layer.h + u,
			vx: rand(-0.4, 0.4) * u, vy: -rand(2, 5) * u,
			wobble: rand(0.4, 1.2) * u, phase: rand(0, TAU),
			life: 0, max: rand(4, 8),
			size: rand(0.05, 0.14) * u,
			alpha: rand(0.5, 0.9),
			color: `hsl(${rand(18, 42)}, 100%, ${rand(55, 70)}%)`
		};
	}

	const WEATHER = {
		rain: {
			rate: 240,
			spawn: (z, u) => {
				const vy = rand(38, 50) * u;
				return {
					kind: "streak",
					x: z.x + rand(0, z.w), y: z.y - rand(0, u),
					vx: -0.12 * vy, vy,
					life: 0, max: 1, bottom: z.y + z.h,
					width: 0.05 * u, alpha: rand(0.35, 0.6) * z.alpha,
					color: "rgb(185, 210, 240)"
				};
			}
		},
		frost: {
			rate: 22,
			spawn: (z, u) => ({
				kind: "flake",
				x: z.x + rand(0, z.w), y: z.y - rand(0, u),
				vx: rand(-0.3, 0.3) * u, vy: rand(1.6, 3) * u,
				wobble: rand(0.4, 1) * u, phase: rand(0, TAU),
				life: 0, max: 6, bottom: z.y + z.h,
				size: rand(0.06, 0.16) * u, alpha: rand(0.6, 0.95) * z.alpha,
				color: "rgb(235, 245, 255)"
			})
		},
		fog: {
			rate: 1.4,
			spawn: (z, u) => ({
				kind: "fog",
				x: z.x + rand(0, z.w), y: z.y + rand(0.3, 0.7) * z.h,
				vx: rand(0.3, 0.9) * u * (Math.random() < 0.5 ? -1 : 1), vy: 0,
				life: 0, max: rand(6, 10),
				size: rand(2, 3.5) * u, alpha: 0.35 * z.alpha,
				color: "rgba(205, 205, 198, 0.5)"
			})
		}
	};

	const BURSTS = {
		fire: (cx, cy, r, u) => Array.from({length: 40}, () => {
			const angle = rand(0, TAU), speed = rand(3, 14) * u;
			return {
				kind: "glow",
				x: cx + rand(-0.4, 0.4) * r.width, y: cy + rand(-0.4, 0.4) * r.height,
				vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 3 * u,
				ay: -6 * u, drag: 2.2,
				life: 0, max: rand(0.5, 1.2),
				size: rand(0.08, 0.2) * u, alpha: 1,
				color: `hsl(${rand(10, 45)}, 100%, ${rand(55, 70)}%)`
			};
		}),
		gold: (cx, cy, r, u) => Array.from({length: 70}, () => {
			const angle = rand(0, TAU), speed = rand(6, 20) * u;
			return {
				kind: "glow",
				x: cx, y: cy,
				vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
				ay: 10 * u, drag: 2.4,
				life: 0, max: rand(0.9, 1.7),
				size: rand(0.07, 0.17) * u, alpha: 1,
				color: `hsl(${rand(38, 50)}, 90%, ${rand(60, 78)}%)`
			};
		}),
		shard: (cx, cy, r, u) => Array.from({length: 16}, () => {
			const angle = rand(0, TAU), speed = rand(3, 9) * u;
			return {
				kind: "shard",
				x: cx, y: cy,
				vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 2 * u,
				ay: 14 * u, drag: 1.2,
				rot: rand(0, TAU), spin: rand(-12, 12),
				life: 0, max: rand(0.6, 1),
				size: rand(0.25, 0.5) * u, alpha: 1,
				color: `hsl(${rand(355, 370) % 360}, 85%, ${rand(45, 62)}%)`
			};
		})
	};

	// ---------------- canvas layer ----------------

	class Layer {
		constructor(host, canvas, options) {
			this.host = host;
			this.canvas = canvas;
			this.ctx = canvas.getContext("2d");
			this.emberRate = options.emberRate;
			this.isActive = options.isActive;
			this.zones = options.zones || (() => []);
			this.particles = [];
			this.spawnAcc = {};
			this.dirty = false;
			this.w = this.h = 0;
			new ResizeObserver(() => this.resize()).observe(canvas);
		}

		resize() {
			const dpr = Math.min(window.devicePixelRatio || 1, 2);
			this.w = this.canvas.clientWidth;
			this.h = this.canvas.clientHeight;
			this.canvas.width = Math.round(this.w * dpr);
			this.canvas.height = Math.round(this.h * dpr);
			this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		}

		clear() {
			this.particles.length = 0;
			this.ctx.clearRect(0, 0, this.w, this.h);
			this.dirty = false;
		}

		accumulate(key, rate, dt) {
			const total = (this.spawnAcc[key] || 0) + rate * dt;
			const whole = Math.floor(total);
			this.spawnAcc[key] = total - whole;
			return whole;
		}

		add(list) {
			const room = MAX_PARTICLES - this.particles.length;
			if (room > 0)
				this.particles.push(...list.slice(0, room));
		}

		step(dt) {
			if (!this.w)
				return;
			const u = this.w / 100;
			const spawned = [];
			for (let i = this.accumulate("ember", this.emberRate, dt); i > 0; --i)
				spawned.push(ember(this, u));
			for (const zone of this.zones(this.canvas.getBoundingClientRect())) {
				const spawner = WEATHER[zone.type];
				const rate = spawner.rate * zone.alpha * (zone.w / (40 * u));
				for (let i = this.accumulate(zone.key, rate, dt); i > 0; --i)
					spawned.push(spawner.spawn(zone, u));
			}
			this.add(spawned);
			this.update(dt);
			this.draw();
			this.dirty = true;
		}

		update(dt) {
			const list = this.particles;
			for (let i = list.length - 1; i >= 0; --i) {
				const p = list[i];
				p.life += dt;
				if (p.drag) {
					const k = Math.max(0, 1 - p.drag * dt);
					p.vx *= k;
					p.vy *= k;
				}
				if (p.ax) p.vx += p.ax * dt;
				if (p.ay) p.vy += p.ay * dt;
				if (p.wobble) p.x += Math.sin(p.phase + p.life * 2.2) * p.wobble * dt;
				if (p.spin) p.rot += p.spin * dt;
				p.x += p.vx * dt;
				p.y += p.vy * dt;
				if (p.life >= p.max || (p.bottom !== undefined && p.y > p.bottom) || p.y < -this.h * 0.1) {
					list[i] = list[list.length - 1];
					list.pop();
				}
			}
		}

		draw() {
			const ctx = this.ctx;
			ctx.clearRect(0, 0, this.w, this.h);
			for (const p of this.particles) {
				const t = p.life / p.max;
				const a = p.alpha * Math.min(1, t * 6) * Math.min(1, (1 - t) * 2.5);
				if (a <= 0)
					continue;
				switch (p.kind) {
				case "glow":
					ctx.globalCompositeOperation = "lighter";
					ctx.fillStyle = p.color;
					ctx.globalAlpha = a * 0.18;
					ctx.beginPath();
					ctx.arc(p.x, p.y, p.size * 2.8, 0, TAU);
					ctx.fill();
					ctx.globalAlpha = a;
					ctx.beginPath();
					ctx.arc(p.x, p.y, p.size, 0, TAU);
					ctx.fill();
					break;
				case "streak":
					ctx.globalCompositeOperation = "source-over";
					ctx.globalAlpha = a;
					ctx.strokeStyle = p.color;
					ctx.lineWidth = p.width;
					ctx.beginPath();
					ctx.moveTo(p.x, p.y);
					ctx.lineTo(p.x - p.vx * 0.02, p.y - p.vy * 0.02);
					ctx.stroke();
					break;
				case "flake":
					ctx.globalCompositeOperation = "source-over";
					ctx.globalAlpha = a;
					ctx.fillStyle = p.color;
					ctx.beginPath();
					ctx.arc(p.x, p.y, p.size, 0, TAU);
					ctx.fill();
					break;
				case "fog": {
					ctx.globalCompositeOperation = "source-over";
					ctx.globalAlpha = a;
					const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
					g.addColorStop(0, p.color);
					g.addColorStop(1, "rgba(205, 205, 198, 0)");
					ctx.fillStyle = g;
					ctx.fillRect(p.x - p.size, p.y - p.size, p.size * 2, p.size * 2);
					break;
				}
				case "shard":
					ctx.globalCompositeOperation = "lighter";
					ctx.globalAlpha = a;
					ctx.fillStyle = p.color;
					ctx.save();
					ctx.translate(p.x, p.y);
					ctx.rotate(p.rot);
					ctx.fillRect(-p.size / 2, -p.size / 6, p.size, p.size / 3);
					ctx.restore();
					break;
				}
			}
			ctx.globalAlpha = 1;
			ctx.globalCompositeOperation = "source-over";
		}
	}

	function frame(time) {
		const dt = Math.min(0.05, (time - lastTime) / 1000) || 0;
		lastTime = time;
		const on = enabled();
		for (const layer of layers) {
			if (on && layer.isActive())
				layer.step(dt);
			else if (layer.dirty)
				layer.clear();
		}
		requestAnimationFrame(frame);
	}

	// ---------------- public API ----------------

	// Restarts a one-shot CSS animation class on an element
	function flash(elem, cls, ms) {
		if (!elem || !enabled())
			return;
		const timers = classTimers.get(elem) || {};
		clearTimeout(timers[cls]);
		elem.classList.remove(cls);
		void elem.offsetWidth;
		elem.classList.add(cls);
		timers[cls] = setTimeout(() => elem.classList.remove(cls), ms);
		classTimers.set(elem, timers);
	}

	function burst(elem, kind) {
		if (!elem || !enabled() || !BURSTS[kind])
			return;
		const layer = layers.find(l => l.host.contains(elem) && l.isActive());
		if (!layer || !layer.w)
			return;
		const r = elem.getBoundingClientRect();
		const base = layer.canvas.getBoundingClientRect();
		const cx = r.left + r.width / 2 - base.left;
		const cy = r.top + r.height / 2 - base.top;
		layer.add(BURSTS[kind](cx, cy, r, layer.w / 100));
	}

	const mainElem = document.querySelector("main");

	function shake() { flash(mainElem, "fx-shake", 450); }
	function sunlight() { flash(mainElem, "fx-sun", 1400); }
	function pulse(elem) { flash(elem, "fx-pulse", 450); }

	// ---------------- 3D card tilt ----------------

	function resetTilt() {
		if (!tiltElem)
			return;
		["--rx", "--ry", "--mx", "--my"].forEach(p => tiltElem.style.removeProperty(p));
		tiltElem.classList.remove("tilting");
		tiltElem = null;
	}

	function onPointerMove(e) {
		const target = e.target instanceof Element ? e.target.closest(TILT_SELECTOR) : null;
		if (target !== tiltElem)
			resetTilt();
		if (!target || !enabled())
			return;
		tiltElem = target;
		const r = target.getBoundingClientRect();
		const px = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
		const py = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
		target.style.setProperty("--rx", ((0.5 - py) * 16).toFixed(2) + "deg");
		target.style.setProperty("--ry", ((px - 0.5) * 20).toFixed(2) + "deg");
		target.style.setProperty("--mx", (px * 100).toFixed(1) + "%");
		target.style.setProperty("--my", (py * 100).toFixed(1) + "%");
		target.classList.add("tilting");
	}

	// ---------------- setup ----------------

	const deckMenu = document.getElementById("deck-customization");
	const titleScreen = document.getElementById("title-screen");
	const weatherElems = [...document.querySelectorAll("main .row-weather")];

	layers.push(new Layer(mainElem, document.getElementById("fx-canvas"), {
		emberRate: 3.5,
		isActive: () => deckMenu.classList.contains("hide"),
		zones: base => weatherElems.flatMap((el, i) => {
			const alpha = parseFloat(el.style.opacity) || 0;
			if (alpha < 0.02)
				return [];
			const r = el.getBoundingClientRect();
			return ["rain", "fog", "frost"].filter(t => el.classList.contains(t)).map(type => ({
				type, key: type + i, alpha,
				x: r.left - base.left, y: r.top - base.top, w: r.width, h: r.height
			}));
		})
	}));

	layers.push(new Layer(titleScreen, titleScreen.querySelector("canvas"), {
		emberRate: 9,
		isActive: () => !titleScreen.classList.contains("hide")
	}));

	document.addEventListener("pointermove", onPointerMove, {passive: true});
	["pointerup", "pointercancel"].forEach(t => document.addEventListener(t, e => e.pointerType !== "mouse" && resetTilt(), {passive: true}));
	document.documentElement.addEventListener("mouseleave", resetTilt);
	requestAnimationFrame(frame);

	return { burst, shake, sunlight, pulse, flash };
})();
