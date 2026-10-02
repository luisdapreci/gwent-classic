"use strict"

// Non-enumerable so it doesn't show up in for...in over arrays
Object.defineProperty(Array.prototype, "remove", {
	value: function(elem)
	{
		const index = this.indexOf(elem);
		if (index !== -1)
			this.splice(index, 1);
	},
	writable: true,
	configurable: true
});

function isEmpty(obj)
{
	for (const property in obj)
	{
		if (Object.hasOwn(obj, property))
			return false;
	}
	return true;
}

class RGBA
{
	constructor(r, g, b, a = 1)
	{
		this.r = r;
		this.g = g;
		this.b = b;
		this.a = a;
	}
	setAlpha(a)
	{
		this.a = a;
	}
	toString()
	{
		const hasAlpha = this.a < 1;
		return (hasAlpha ? "rgba(" : "rgb(") 
		+ this.r + ',' + this.g + ',' + this.b
		+ (hasAlpha ? "," + this.a : "")
		+ ")";
	}
}

// returns val or the min/max it is closest to. Flips inverted min/max values.
function clamp(min, max, val)
{
	if (min > max)
		return clamp(max, min, val);
	return Math.min(max, Math.max(min, val));
}

// Returns the linear interpolation of t from a to b (unclamped)
function lerp(a, b, t)
{
	return (1-t)*a + t*b;
}

// Returns the normalized value of t from the range [a,b]
function inverseLerp(a, b, t)
{
	return (t - a) / (b - a);
}

// Returns the lerp() of [y,z] using the normalized value of t in [a,b] as the param
function map(a, b, y, z, t)
{
	return lerp(y, z, inverseLerp(a, b, t));
}


// Returns true if n is an Number
function isNumber(n) { 
	return !isNaN(parseFloat(n)) && isFinite(n);
}

// Returns true if s is a String
function isString(s){
	return typeof(s) === 'string' || s instanceof String;
}

// Interprets passed string as an interger. Empty strings return 0, null string return NaN
function toInteger(str)
{
	if (str === '')
		return 0;
	else if (!str)
		return NaN;
	return Number.parseInt(str);
}

// Returns a random integer in the range [0,n)
function randomInt(n, rng = Math.random)  {
	return Math.floor(rng() * n);
}

// Deterministic Math.random replacement (cyrb128 seed hash + sfc32) so online clients roll the same numbers
function seededRandom(seed) {
	let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
	for (let i = 0; i < seed.length; i++) {
		const k = seed.charCodeAt(i);
		h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
		h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
		h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
		h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
	}
	h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
	h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
	h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
	h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
	let a = (h1 ^ h2 ^ h3 ^ h4) >>> 0, b = (h2 ^ h1) >>> 0, c = (h3 ^ h1) >>> 0, d = (h4 ^ h1) >>> 0;
	return () => {
		const t = (a + b | 0) + d | 0;
		d = d + 1 | 0;
		a = b ^ b >>> 9;
		b = c + (c << 3) | 0;
		c = (c << 21 | c >>> 11) + t | 0;
		return (t >>> 0) / 4294967296;
	};
}
