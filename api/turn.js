// Mints short-lived Cloudflare TURN credentials so players behind strict NATs (mobile data, CGNAT) can connect.
// Set CF_TURN_KEY_ID and CF_TURN_API_TOKEN in the Vercel project's environment variables.
module.exports = async (req, res) => {
	res.setHeader("Cache-Control", "no-store");
	const id = process.env.CF_TURN_KEY_ID;
	const token = process.env.CF_TURN_API_TOKEN;
	if (!id || !token)
		return res.status(503).json({ error: "TURN not configured" });
	try {
		const r = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(id)}/credentials/generate-ice-servers`, {
			method: "POST",
			headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
			body: JSON.stringify({ ttl: 86400 })
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
