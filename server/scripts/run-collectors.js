#!/usr/bin/env node

var registry = require('../lib/collector-registry');

var args = process.argv.slice(2);
var ids = [];
var force = false;

for (var i = 0; i < args.length; i++) {
  if (args[i] === '--collector' && args[i + 1]) {
    ids.push(args[i + 1]);
    i += 1;
  } else if (args[i] === '--force') {
    force = true;
  } else if (args[i] === '--list') {
    registry.discover().forEach(function(c) {
      console.log(c.id + '\t' + (c.name || '') + '\t' + (c.cron || '-'));
    });
    process.exit(0);
  } else {
    console.error('不明な引数: ' + args[i]);
    process.exit(1);
  }
}

var targets = registry.discover().filter(function(c) {
  return ids.length === 0 || ids.indexOf(c.id) !== -1;
});

if (targets.length === 0) {
  console.error('対象コレクタがありません: ' + (ids.join(', ') || 'all'));
  process.exit(1);
}

Promise.all(
  targets.map(function(c) {
    return registry.runCollector(c, { force: force });
  })
).then(function(results) {
  results.forEach(function(r) {
    var line = '[' + r.status + '] ' + (r.name || r.id);
    if (r.reason) {
      line += ' (' + r.reason + ')';
    }
    if (r.collectedAt) {
      line += ' 更新: ' + r.collectedAt;
    }
    if (r.error) {
      line += ' エラー: ' + r.error;
    }
    if (r.keptExisting) {
      line += '（既存データ保持）';
    }
    console.log(line);
  });
  var failed = results.filter(function(r) { return r.status === 'error'; });
  process.exit(failed.length ? 1 : 0);
});