var estatLib = require('../../lib/estat');

function collect() {
  var appId = process.env.ESTAT_APP_ID;
  if (!appId) {
    return Promise.resolve({
      skipped: true,
      reason: 'ESTAT_APP_ID 未設定のためスキップ（フォールバックデータを使用）'
    });
  }
  return estatLib.fetchLivePopulation(appId).then(function(data) {
    return {
      source: data.source,
      unit: data.unit,
      labels: data.labels,
      data: data.data,
      isLive: true
    };
  });
}

function validate(data) {
  if (!data || !Array.isArray(data.labels) || !Array.isArray(data.data) || data.labels.length === 0) {
    throw new Error('labels/data が空です');
  }
}

module.exports = {
  id: 'estat-population',
  name: '日本の総人口（e-Stat）',
  cron: '0 4 * * *',
  staleAfterMs: 30 * 24 * 60 * 60 * 1000,
  schema: {
    type: 'object',
    required: ['labels', 'data', 'unit', 'source'],
    additionalProperties: true,
    properties: {
      labels: {
        type: 'array',
        minItems: 1,
        items: { type: 'string', pattern: '^\\d{4}$' }
      },
      data: {
        type: 'array',
        minItems: 1,
        items: { type: 'number', minimum: 10000000, maximum: 500000000 }
      },
      unit: { type: 'string' },
      source: { type: 'string' }
    }
  },
  collect: collect,
  validate: validate
};