const API = {
  token: localStorage.getItem('mutatio_token') || '',
  setToken(t) {
    this.token = t || '';
    if (t) localStorage.setItem('mutatio_token', t);
    else localStorage.removeItem('mutatio_token');
  },
  async req(path, opts = {}) {
    const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
    if (this.token) headers.Authorization = `Bearer ${this.token}`;
    const res = await fetch(`/api${path}`, { ...opts, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || res.statusText);
    return data;
  },
  health: () => API.req('/health'),
  world: () => API.req('/v1/world'),
  catalog: () => API.req('/v1/catalog'),
  events: () => API.req('/v1/events'),
  proposals: () => API.req('/v1/proposals'),
  posts: () => API.req('/v1/posts'),
  register: (body) => API.req('/v1/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => API.req('/v1/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  me: () => API.req('/v1/me'),
  cbn: () => API.req('/v1/me/cbn'),
  createProposal: (body) => API.req('/v1/proposals', { method: 'POST', body: JSON.stringify(body) }),
  vote: (id, value) => API.req(`/v1/proposals/${id}/vote`, { method: 'POST', body: JSON.stringify({ value }) }),
  resolve: (id) => API.req(`/v1/proposals/${id}/resolve`, { method: 'POST', body: '{}' }),
  comment: (id, body) => API.req(`/v1/posts/${id}/comments`, { method: 'POST', body: JSON.stringify({ body }) }),
};
