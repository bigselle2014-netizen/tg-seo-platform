"use client"

const BASE = "/api/mini"

export function getToken(): string | null {
  return typeof window !== "undefined" ? localStorage.getItem("mini_jwt") : null
}

export function setToken(token: string) {
  localStorage.setItem("mini_jwt", token)
}

export function clearToken() {
  localStorage.removeItem("mini_jwt")
}

export async function miniApiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken()
  const headers = new Headers(options.headers)
  if (token) headers.set("Authorization", `Bearer ${token}`)
  if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json")
  return fetch(`${BASE}${path}`, { ...options, headers })
}
