var SOURCE_URL = 'https://pelican-white-paper.pages.dev/ebpm-github-resources';

var CATEGORY_PREFIXES = ['1.', '2.', '3.', '4.', '5.', '6.', '7.', '8.'];

function stripTags(html) {
  return String(html)
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function normalizeStars(raw) {
  var v = stripTags(raw).replace(/,/g, '').trim();
  if (!v || v === '-' || isNaN(parseInt(v, 10))) {
    return null;
  }
  return parseInt(v, 10);
}

function normalizeText(raw) {
  var v = stripTags(raw).trim();
  return v && v !== '-' ? v : null;
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

function parseTable(tbody) {
  var rows = String(tbody).match(/<tr>([\s\S]*?)<\/tr>/g) || [];
  return rows
    .map(function(row) {
      var cells = String(row).match(/<td>([\s\S]*?)<\/td>/g) || [];
      if (cells.length < 5) {
        return null;
      }
      var linkMatch = cells[0].match(/href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/);
      if (!linkMatch) {
        return null;
      }
      var gh = githubPathFromHref(linkMatch[1]);
      if (!gh) {
        return null;
      }
      return {
        name: gh.name,
        owner: gh.owner,
        description: normalizeText(cells[1]),
        stars: normalizeStars(cells[2]),
        language: normalizeText(cells[3]),
        license: normalizeText(cells[4]),
        forks: null,
        pushedAt: null
      };
    })
    .filter(Boolean);
}

function collect() {
  return fetch(SOURCE_URL).then(function(response) {
    if (!response.ok) {
      throw new Error('HTTP ' + response.status);
    }
    return response.text();
  }).then(function(html) {
    var h2s = String(html).match(/<h2[^>]*>([\s\S]*?)<\/h2>/g) || [];
    var tables = String(html).match(/<table>([\s\S]*?)<\/table>/g) || [];

    var categories = [];
    var repos = [];
    var seen = {};

    for (var i = 0; i < h2s.length; i++) {
      var title = stripTags(h2s[i]);
      var isNumbered = CATEGORY_PREFIXES.some(function(p) {
        return title.indexOf(p) === 0;
      });
      if (!isNumbered) {
        continue;
      }
      var category = title.replace(/^\d+\.\s*/, '').trim();
      var table = tables[i];
      if (!table) {
        continue;
      }
      var parsed = parseTable(table);
      if (parsed.length === 0) {
        continue;
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
    }

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
  collect: collect,
  validate: validate
};