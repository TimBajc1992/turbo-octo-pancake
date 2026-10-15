/** Read a literal Cloudflare credential from common copy/paste wrappers. Never execute input. */
export function cloudflareToken(raw) {
  const valid = (text) => /^[A-Za-z0-9._~-]{20,512}$/.test(text);
  const unquote = (text) => {
    for (const [open, close] of [["\"", "\""], ["'", "'"], ["“", "”"], ["‘", "’"]])
      if (text.startsWith(open) && text.endsWith(close)) return text.slice(open.length, -close.length).trim();
    return text;
  };
  let token = unquote(raw.trim());
  token = token.replace(/^(?:export\s+)?CLOUDFLARE_API_TOKEN\s*=\s*/i, "");
  token = unquote(token.trim()).replace(/^Authorization:\s*/i, "").replace(/^Bearer\s+/i, "");
  token = unquote(token.trim());
  if (valid(token)) return token;
  // A Cloudflare verification curl snippet can contain the literal token in its header.
  // Extract only a single unambiguous Authorization credential; never run the command.
  const candidates = [...raw.matchAll(/Authorization:\s*Bearer\s+([A-Za-z0-9._~-]{20,512})(?=[\s"'”’]|$)/gi)].map(match => match[1]);
  const unique = [...new Set(candidates)];
  if (unique.length === 1) return unique[0];
  let category = "unexpected characters or length";
  if (unique.length > 1) category = "multiple different Authorization tokens";
  else if (/\$\{?[A-Z_]+/.test(raw)) category = "a shell variable reference instead of a literal token";
  else if (/^\s*[\[{]/.test(raw)) category = "JSON or a verification response instead of the token value";
  else if (/curl\s/i.test(raw)) category = "a curl command without a usable literal Bearer token";
  else if (/^[\s*•.]+$/.test(raw)) category = "a masked placeholder instead of the token value";
  else if (token.length < 20) category = "a short value, possibly a name instead of the token value";
  else if (/\s/.test(token)) category = "internal whitespace or line breaks";
  throw Error(`CLOUDFLARE_API_TOKEN has ${category}. Copy the literal token value from Cloudflare. No secret value is logged.`);
}
