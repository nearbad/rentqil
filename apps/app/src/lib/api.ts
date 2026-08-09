const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
  }
}

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function getApiUrl() {
  return API_URL;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new ApiError('NETWORK', 'network request failed');
  }

  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    // fall through, handled below
  }

  if (!res.ok) {
    const err = (json as { error?: { code?: string; message?: string; details?: unknown } })?.error;
    throw new ApiError(err?.code ?? 'UNKNOWN', err?.message ?? `http ${res.status}`, err?.details);
  }
  return json as T;
}

// the browser hands us a Blob, react native hands us a file uri descriptor
export type UploadFile = Blob | { uri: string; name: string; type: string };

// multipart image upload, used by the owner cabinet
export async function apiUpload(file: UploadFile, name: string): Promise<{ url: string }> {
  const form = new FormData();
  if (file instanceof Blob) {
    form.append('file', file, name);
  } else {
    // react native's FormData reads the uri itself and ignores a third arg
    form.append('file', file as unknown as Blob);
  }
  let res: Response;
  try {
    res = await fetch(`${API_URL}/uploads`, {
      method: 'POST',
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      body: form,
    });
  } catch {
    throw new ApiError('NETWORK', 'network request failed');
  }
  const json = (await res.json().catch(() => null)) as
    | { url?: string; error?: { code?: string; message?: string } }
    | null;
  if (!res.ok || !json?.url) {
    throw new ApiError(json?.error?.code ?? 'UNKNOWN', json?.error?.message ?? `http ${res.status}`);
  }
  return { url: json.url };
}
