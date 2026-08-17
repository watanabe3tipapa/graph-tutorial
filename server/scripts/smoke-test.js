#!/usr/bin/env node

var fs = require('fs');
var path = require('path');

var DATA_DIR = path.join(__dirname, '..', 'data');
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

console.log('smoke-test: 保存済みデータの整合性を検証します');

// ---- ebpm-repos ----
var repos = load('ebpm-repos');
check(repos !== null, 'ebpm-repos: データファイルが存在しない');
if (repos) {
  check(Array.isArray(repos.repos) && repos.repos.length > 0, 'ebpm-repos: repos が空');
  if (Array.isArray(repos.repos)) {
    repos.repos.forEach(function(r, i) {
      check(r && r.owner && r.name, 'ebpm-repos[' + i + ']: owner/name が不足');
      check(r && r.category, 'ebpm-repos[' + i + ']: category が不足');
      if (r && r.stars !== null && typeof r.stars !== 'number') {
        failures.push('ebpm-repos[' + i + ']: stars が数値でない');
      }
    });
  }
}

// ---- population / estat-population ----
var population = load('population');
check(population !== null, 'population: データファイルが存在しない');
if (population) {
  check(Array.isArray(population.labels) && population.labels.length > 0, 'population: labels が空');
  check(
    Array.isArray(population.data) && population.data.length === population.labels.length,
    'population: labels と data の長さが不一致'
  );
}

var estat = load('estat-population');
if (estat) {
  check(Array.isArray(estat.labels) && estat.labels.length > 0, 'estat-population: labels が空');
  check(
    Array.isArray(estat.data) && estat.data.length === estat.labels.length,
    'estat-population: labels と data の長さが不一致'
  );
}

// ---- kitesurf-snapshot（任意: CF_ACCOUNT_ID / CF_TOKEN 設定時のみ生成される） ----
var kitesurf = load('kitesurf-snapshot');
if (kitesurf) {
  check(
    typeof kitesurf.readmeMarkdown === 'string' && kitesurf.readmeMarkdown.trim() !== '',
    'kitesurf-snapshot: readmeMarkdown が空'
  );
}

if (failures.length > 0) {
  console.error('smoke-test FAILED:');
  failures.forEach(function(f) {
    console.error('  - ' + f);
  });
  process.exit(1);
}

console.log('smoke-test OK');