var kitesurf = require('../../lib/kitesurf');

var SOURCE_URL = 'https://github.com/watanabe3tipapa/graph-tutorial';

function collect() {
  if (!kitesurf.hasCredentials()) {
    return Promise.resolve({
      skipped: true,
      reason: 'CF_ACCOUNT_ID / CF_TOKEN 未設定のためスキップ'
    });
  }
  return kitesurf.fetchMarkdown(SOURCE_URL).then(function(markdown) {
    return {
      sourceUrl: SOURCE_URL,
      note: 'Cloudflare Kitesurf（Browser Run）の /markdown Quick Action で取得した README。',
      readmeMarkdown: markdown,
      isLive: true
    };
  });
}

function validate(data) {
  if (!data || typeof data.readmeMarkdown !== 'string' || data.readmeMarkdown.trim() === '') {
    throw new Error('readmeMarkdown が空です');
  }
}

module.exports = {
  id: 'kitesurf-snapshot',
  name: 'graph-tutorial スナップショット（Cloudflare Kitesurf）',
  cron: '0 5 * * *',
  staleAfterMs: 30 * 24 * 60 * 60 * 1000,
  collect: collect,
  validate: validate
};
