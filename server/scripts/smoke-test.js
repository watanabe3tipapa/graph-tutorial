#!/usr/bin/env node

var fs = require('fs');
var path = require('path');

var DATA_DIR = path.join(__dirname, '..', 'data');
var MAX_FRESHNESS_DAYS = 90;
var failures = [];

function check(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}

function load(id) {
  var p = path.join(DATA_DIR, id + '.json');
  if (!fs.existsSync(p)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    failures.push(id + ': JSON のパースに失敗');
    return null;
  }
}

function freshnessDays(iso) {
  if (!iso) {
    return Infinity;
  }
  var t = new Date(iso).getTime();
  if (isNaN(t)) {
    return Infinity;
  }
  return (Date.now() - t) / (24 * 60 * 60 * 1000);
}

function checkFreshness(id, iso) {
  var days = freshnessDays(iso);
  check(days <= MAX_FRESHNESS_DAYS, id + ': データが古い（' + Math.round(days) + '日 / 上限 ' + MAX_FRESHNESS_DAYS + '日）');
}

function checkPopulation(id, data) {
  check(Array.isArray(data.labels) && data.labels.length > 0, id + ': labels が空');
  check(
    Array.isArray(data.data) && data.data.length === data.labels.length,
    id + ': labels と data の長さが不一致'
  );
  check(typeof data.unit === 'string' && data.unit.trim() !== '', id + ': unit が不足');
  check(typeof data.source === 'string' && data.source.trim() !== '', id + ': source が不足');
  checkFreshness(id, data.collectedAt);

  if (!Array.isArray(data.labels) || !Array.isArray(data.data)) {
    return;
  }
  var seenYear = {};
  data.labels.forEach(function(year, i) {
    check(typeof year === 'string' && /^\d{4}$/.test(year), id + ': ラベルが年（4桁）でない: ' + year);
    check(!seenYear[year], id + ': 年が重複: ' + year);
    seenYear[year] = true;
    var v = data.data[i];
    check(typeof v === 'number' && isFinite(v), id + '[' + year + ']: 値が数値でない');
    check(typeof v === 'number' && v >= 10000000 && v <= 500000000, id + '[' + year + ']: 値が想定範囲外: ' + v);
  });
}

console.log('smoke-test: 保存済みデータの整合性を検証します');

// ---- ebpm-repos ----
var repos = load('ebpm-repos');
check(repos !== null, 'ebpm-repos: データファイルが存在しない');
if (repos) {
  check(Array.isArray(repos.repos) && repos.repos.length > 0, 'ebpm-repos: repos が空');
  check(
    Array.isArray(repos.categories) && repos.categories.length >= 5 && repos.categories.length <= 20,
    'ebpm-repos: カテゴリ数が想定範囲外（5〜20）: ' + (repos.categories || []).length
  );
  check(
    repos.repos.length >= 20 && repos.repos.length <= 200,
    'ebpm-repos: 件数が想定範囲外（20〜200）: ' + repos.repos.length
  );
  checkFreshness('ebpm-repos', repos.collectedAt);

  if (Array.isArray(repos.repos)) {
    var seenKeys = {};
    var seenCategories = {};
    repos.repos.forEach(function(r, i) {
      var idx = 'ebpm-repos[' + i + ']';
      check(r && r.owner && r.name, idx + ': owner/name が不足');
      check(r && r.category, idx + ': category が不足');
      if (r) {
        check(
          /^[A-Za-z0-9_.-]+$/.test(r.owner) && /^[A-Za-z0-9_.-]+$/.test(r.name),
          idx + ': owner/name に不正な文字: ' + (r.owner || '') + '/' + (r.name || '')
        );
        var key = r.owner + '/' + r.name;
        check(!seenKeys[key], idx + ': リポジトリが重複: ' + key);
        seenKeys[key] = true;
        check(
          r.stars === null || (typeof r.stars === 'number' && r.stars >= 0 && r.stars <= 1000000),
          idx + ': stars が想定範囲外: ' + r.stars
        );
        seenCategories[r.category] = true;
      }
    });
    check(
      Object.keys(seenCategories).length === repos.categories.length,
      'ebpm-repos: categories 一覧と repos 内の category が不一致'
    );
  }
  check(
    Array.isArray(repos.categories) && new Set(repos.categories).size === repos.categories.length,
    'ebpm-repos: categories に重複がある'
  );
}

// ---- population / estat-population ----
var population = load('population');
check(population !== null, 'population: データファイルが存在しない');
if (population) {
  checkPopulation('population', population);
}

var estat = load('estat-population');
if (estat) {
  checkPopulation('estat-population', estat);
}

// ---- kitesurf-snapshot（任意: CF_ACCOUNT_ID / CF_TOKEN 設定時のみ生成される） ----
var kitesurf = load('kitesurf-snapshot');
if (kitesurf) {
  check(
    typeof kitesurf.readmeMarkdown === 'string' && kitesurf.readmeMarkdown.trim().length >= 100,
    'kitesurf-snapshot: readmeMarkdown が空または短すぎる'
  );
  checkFreshness('kitesurf-snapshot', kitesurf.collectedAt);
}

if (failures.length > 0) {
  console.error('smoke-test FAILED:');
  failures.forEach(function(f) {
    console.error('  - ' + f);
  });
  process.exit(1);
}

console.log('smoke-test OK');