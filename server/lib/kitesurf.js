var CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID || '';
var CF_TOKEN = process.env.CF_TOKEN || '';

function hasCredentials() {
  return Boolean(CF_ACCOUNT_ID && CF_TOKEN);
}

function endpoint(action) {
  return (
    'https://api.cloudflare.com/client/v4/accounts/' +
    encodeURIComponent(CF_ACCOUNT_ID) +
    '/browser-run/' +
    action +
    '?browser=kitesurf'
  );
}

function request(action, url) {
  return fetch(endpoint(action), {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + CF_TOKEN,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ url: url }),
    signal: AbortSignal.timeout(60000)
  })
    .then(function(response) {
      if (!response.ok) {
        throw new Error('Cloudflare Kitesurf error: HTTP ' + response.status);
      }
      return response.json();
    })
    .then(function(data) {
      if (!data || data.success === false) {
        var message = data && Array.isArray(data.errors) && data.errors.length
          ? data.errors.map(function(e) { return e.message; }).join('; ')
          : 'Cloudflare Kitesurf request failed';
        throw new Error(message);
      }
      return data.result;
    });
}

function fetchMarkdown(url) {
  return request('markdown', url).then(function(result) {
    return typeof result === 'string' ? result : JSON.stringify(result);
  });
}

module.exports = {
  hasCredentials: hasCredentials,
  fetchMarkdown: fetchMarkdown
};
