var fs = require('fs');
var path = require('path');

var GITHUB_API = 'https://api.github.com/repos';
var CACHE_TTL_MS = 60 * 60 * 1000;

var FALLBACK = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'data', 'ebpm-repos.json'), 'utf8')
);

var cache = {
  at: 0,
  repos: null,
  isLive: false
};

function headers() {
  var h = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  };
  var token = process.env.GITHUB_TOKEN;
  if (token) {
    h.Authorization = 'Bearer ' + token;
  }
  return h;
}

function fetchRepo(repo) {
  var url = GITHUB_API + '/' + repo.owner + '/' + repo.name;
  return fetch(url, { headers: headers() }).then(function(response) {
    if (!response.ok) {
      throw new Error('GitHub API error: HTTP ' + response.status + ' (' + repo.owner + '/' + repo.name + ')');
    }
    return response.json();
  });
}

function enrich(repos) {
  return Promise.all(
    repos.map(function(repo) {
      return fetchRepo(repo)
        .then(function(g) {
          return Object.assign({}, repo, {
            language: g.language || repo.language || 'その他',
            stars: g.stargazers_count,
            forks: g.forks_count,
            pushedAt: (g.pushed_at || '').slice(0, 10)
          });
        })
        .catch(function(err) {
          console.error('GitHub fetch failed for ' + repo.owner + '/' + repo.name + ':', err.message);
          return repo;
        });
    })
  );
}

function isCacheValid() {
  return cache.repos && Date.now() - cache.at < CACHE_TTL_MS;
}

function meta() {
  return {
    sourceUrl: FALLBACK.sourceUrl,
    updatedAt: FALLBACK.updatedAt,
    collectedAt: FALLBACK.collectedAt
  };
}

function getRepos() {
  if (!process.env.GITHUB_TOKEN) {
    return Promise.resolve(Object.assign({ categories: FALLBACK.categories, repos: FALLBACK.repos, isLive: false }, meta()));
  }

  if (isCacheValid()) {
    return Promise.resolve(Object.assign({ categories: cache.categories || FALLBACK.categories, repos: cache.repos, isLive: cache.isLive }, meta()));
  }

  return enrich(FALLBACK.repos)
    .then(function(repos) {
      cache = {
        at: Date.now(),
        repos: repos,
        categories: FALLBACK.categories,
        isLive: true
      };
      return Object.assign({ categories: FALLBACK.categories, repos: repos, isLive: true }, meta());
    })
    .catch(function(err) {
      console.error('GitHub API failed, using fallback data:', err.message);
      return Object.assign({ categories: FALLBACK.categories, repos: FALLBACK.repos, isLive: false }, meta());
    });
}

module.exports = { getRepos: getRepos };