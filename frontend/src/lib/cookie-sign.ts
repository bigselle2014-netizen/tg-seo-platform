export async function signCookieValue(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value))
  const b64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
  return encodeURIComponent(`${value}.${b64}`)
}
