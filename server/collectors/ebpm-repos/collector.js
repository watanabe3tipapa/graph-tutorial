var cheerio = require('cheerio');

var SOURCE_URL = 'https://pelican-white-paper.pages.dev/ebpm-github-resources';

var CATEGORY_PREFIX_RE = /^\d+\./;

function normalizeText(raw) {
  var v = String(raw).trim();
  return v && v !== '-' ? v : null;
}

function normalizeStars(raw) {
  var v = String(raw).replace(/,/g, '').trim();
  if (!v || v === '-' || isNaN(parseInt(v, 10))) {
    return null;
  }
  return parseInt(v, 10);
}

function githubPathFromHref(href) {
  if (!href || href.indexOf('github.com') === -1) {
    return null;
  }
  var m = String(href).match(/github\.com\/([^/?]+)\/([^/?]+)/);
  if (!m) {
    return null;
  }
  return { owner: m[1], name: m[2] };
}

function findColumnIndex(headers, matchers, fallback) {
  for (var i = 0; i < headers.length; i++) {
    var h = String(headers[i]).trim().toLowerCase();
    for (var j = 0; j < matchers.length; j++) {
      if (h.indexOf(matchers[j]) !== -1) {
        return i;
      }
    }
  }
  return fallback;
}

function parseTable($, table) {
  var headers = [];
  table.find('thead th').each(function() {
    headers.push($(this).text().trim());
  });

  var colRepo = findColumnIndex(headers, ['リポジトリ', 'repository', 'repo'], 0);
  var colDesc = findColumnIndex(headers, ['説明', 'description'], 1);
  var colStars = findColumnIndex(headers, ['star'], 2);
  var colLang = findColumnIndex(headers, ['言語', 'language'], 3);
  var colLicense = findColumnIndex(headers, ['ライセンス', 'license'], 4);
  var maxCol = Math.max(colRepo, colDesc, colStars, colLang, colLicense);

  var rows = [];
  table.find('tbody tr').each(function() {
    var cells = $(this).find('td');
    if (cells.length <= maxCol) {
      return;
    }
    var gh = githubPathFromHref($(cells.get(colRepo)).find('a').attr('href'));
    if (!gh) {
      return;
    }
    rows.push({
      name: gh.name,
      owner: gh.owner,
      description: normalizeText($(cells.get(colDesc)).text()),
      stars: normalizeStars($(cells.get(colStars)).text()),
      language: normalizeText($(cells.get(colLang)).text()),
      license: normalizeText($(cells.get(colLicense)).text()),
      forks: null,
      pushedAt: null
    });
  });
  return rows;
}

function parseHtml(html) {
  var $ = cheerio.load(String(html));
  var categories = [];
  var repos = [];
  var seen = {};

  $('h2').each(function() {
    var title = $(this).text().trim();
    if (!CATEGORY_PREFIX_RE.test(title)) {
      return;
    }
    var category = title.replace(/^\d+\.\s*/, '').trim();
    var table = $(this).nextAll('table').first();
    if (table.length === 0) {
      return;
    }
    var parsed = parseTable($, table);
    if (parsed.length === 0) {
      return;
    }
    categories.push(category);
    parsed.forEach(function(repo) {
      var key = repo.owner + '/' + repo.name;
      if (seen[key]) {
        return;
      }
      seen[key] = true;
      repo.category = category;
      repos.push(repo);
    });
  });

  if (repos.length === 0) {
    throw new Error('リポジトリが1件も抽出できませんでした');
  }

  return {
    updatedAt: new Date().toISOString().slice(0, 10),
    sourceUrl: SOURCE_URL,
    note: 'pelican-white-paper.pages.dev の「EBPM 関連 GitHub リソース一覧」から収集したカタログ。',
    categories: categories,
    repos: repos
  };
}

function collect() {
  return fetch(SOURCE_URL)
    .then(function(response) {
      if (!response.ok) {
        throw new Error('HTTP ' + response.status);
      }
      return response.text();
    })
    .then(function(html) {
      return parseHtml(html);
    });
}

function validate(data) {
  if (!data || !Array.isArray(data.repos) || data.repos.length === 0) {
    throw new Error('repos が空です');
  }
  data.repos.forEach(function(repo) {
    if (!repo.owner || !repo.name || !repo.category) {
      throw new Error('owner/name/category が不足しているリポジトリがあります');
    }
  });
}

module.exports = {
  id: 'ebpm-repos',
  name: 'EBPM 関連 GitHub リソース',
  cron: '0 3 * * *',
  staleAfterMs: 30 * 24 * 60 * 60 * 1000,
  schema: {
    type: 'object',
    required: ['categories', 'repos', 'sourceUrl'],
    additionalProperties: true,
    properties: {
      categories: {
        type: 'array',
        minItems: 5,
        items: { type: 'string' }
      },
      repos: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          required: ['owner', 'name', 'category'],
          additionalProperties: true,
          properties: {
            owner: { type: 'string', pattern: '^[A-Za-z0-9_.-]+$' },
            name: { type: 'string', pattern: '^[A-Za-z0-9_.-]+$' },
            category: { type: 'string' },
            stars: { type: ['number', 'null'], minimum: 0 },
            description: { type: ['string', 'null'] },
            language: { type: ['string', 'null'] },
            license: { type: ['string', 'null'] }
          }
        }
      },
      sourceUrl: { type: 'string' }
    }
  },
  collect: collect,
  validate: validate,
  parseHtml: parseHtml
};