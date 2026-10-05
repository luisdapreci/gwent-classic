// Mints short-lived Cloudflare TURN credentials so players behind strict NATs (mobile data, CGNAT) can connect.
// Set CF_TURN_KEY_ID and CF_TURN_API_TOKEN in the Vercel project's environment variables.

// Only the game's own pages may ask (fetch sends Origin cross-origin, Referer same-origin); keeps other sites from
// hotlinking the relay. Not a hard limit: non-browser clients can forge both headers.
function fromOwnSite(req) {
	const host = req.headers["x-forwarded-host"] || req.headers.host;
	const source = req.headers.origin || req.headers.referer;
	try {
		return !!host && !!source && new URL(source).host === host;
	} catch (err) {
		return false;
	}
}

module.exports = async (req, res) => {
	res.setHeader("Cache-Control", "no-store");
	if (!fromOwnSite(req))
		return res.status(403).json({ error: "Forbidden" });
	const id = process.env.CF_TURN_KEY_ID;
	const token = process.env.CF_TURN_API_TOKEN;
	if (!id || !token)
		return res.status(503).json({ error: "TURN not configured" });
	try {
		const r = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(id)}/credentials/generate-ice-servers`, {
			method: "POST",
			headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
			// The client caches these for 4 h (Online.iceConfig)
			body: JSON.stringify({ ttl: 21600 })
		});
		if (!r.ok)
			return res.status(502).json({ error: "TURN provider error" });
		const { iceServers } = await r.json();
		// Browsers block port 53, those URLs only add a timeout
		const servers = iceServers.map(s => ({ ...s, urls: [].concat(s.urls).filter(u => !/:53(\?|$)/.test(u)) }));
		res.status(200).json({ iceServers: servers });
	} catch (err) {
		res.status(502).json({ error: "TURN provider unreachable" });
	}
};
