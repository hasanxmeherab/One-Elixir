// Keep the existing API error shape while using token refresh from UserContext.
export async function postCustomerJson(authFetch, url, body) {
  const response = await authFetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data?.message || 'Request failed');
    error.response = { status: response.status, data };
    throw error;
  }
  return { data };
}
