/** Normalize copy/paste wrappers without logging or extracting values from shell commands. */
export function cloudflareToken(raw) {
  const unquote = (text) => {
    for (const [open, close] of [["\"", "\""], ["'", "'"], ["“", "”"], ["‘", "’"]])
      if (text.startsWith(open) && text.endsWith(close)) return text.slice(open.length, -close.length).trim();
    return text;
  };
  let token = unquote(raw.trim());
  token = token.replace(/^Authorization:\s*/i, "").replace(/^Bearer\s+/i, "");
  token = unquote(token.trim());
  if (!/^[A-Za-z0-9._~-]{20,512}$/.test(token))
    throw Error("CLOUDFLARE_API_TOKEN is not a plain API token. Copy only the token value from Cloudflare, not the token name, verification response, or curl command. The secret value is not logged.");
  return token;
}
