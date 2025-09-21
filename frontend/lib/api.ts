const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000';

export async function apiGet<T = any>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiPost<T = any>(path: string, body: any): Promise<T> {
  const url = `${API_BASE}${path}`
  console.log('API POST:', url, body)
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  console.log('API Response:', res.status, res.statusText)
  if (!res.ok) {
    const errorText = await res.text()
    console.error('API Error:', errorText)
    throw new Error(errorText);
  }
  return res.json();
}

export async function apiPostForm<T = any>(path: string, formData: FormData): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export { API_BASE };


