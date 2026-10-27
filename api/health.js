// Open /api/health to see what is set up. It never shows secret values.
const { redis, findEnv } = require("./_store");

module.exports = async (req, res) => {
  const { url, token } = findEnv();
  const out = {
    database_address_found: !!url,
    database_token_found: !!token,
    export_key_set: !!(process.env.EXPORT_KEY && process.env.EXPORT_KEY.length >= 16),
    database_reachable: false,
    settings_names_seen: Object.keys(process.env).filter((k) => /KV|REDIS|UPSTASH|EXPORT_KEY/.test(k)).sort()
  };
  if (url && token) {
    try { out.database_reachable = (await redis(["PING"])) === "PONG"; } catch (e) { out.database_error = e.message; }
  }
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json(out);
};
