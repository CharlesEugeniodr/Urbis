const API_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3100';

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const token = sessionStorage.getItem('urbis_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) {
      sessionStorage.removeItem('urbis_token');
      window.location.href = '/login';
    }
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Erro na requisição da API');
  }

  return response.json();
}
