type ReservedKeys = { success?: never; error?: never }

export type ApiOk<T extends Record<string, unknown> & ReservedKeys> = T & { success: true }
export type ApiErr = { success: false; error: string }
export type ApiResult<T extends Record<string, unknown> & ReservedKeys> = ApiOk<T> | ApiErr

export async function apiFetch<T extends Record<string, unknown> & ReservedKeys>(
  input: string,
  init?: RequestInit & { json?: unknown },
): Promise<ApiResult<T>> {
  const headers = new Headers(init?.headers)
  if (init?.json !== undefined) headers.set('Content-Type', 'application/json')

  let res: Response
  try {
    res = await fetch(input, {
      ...init,
      headers,
      credentials: 'include',
      body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
    })
  } catch {
    return { success: false, error: 'Falha de conexão com o servidor' }
  }

  const text = await res.text().catch(() => '')
  const data = ((): unknown => {
    if (!text) return null
    try {
      return JSON.parse(text) as unknown
    } catch {
      return text
    }
  })()
  if (!res.ok) {
    const err =
      (data as { error?: string } | null)?.error ??
      (typeof data === 'string' && data.length ? data : null) ??
      `Erro ${res.status}`
    return { success: false, error: err }
  }

  return (data ?? { success: true }) as ApiOk<T>
}
