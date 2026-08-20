var fs = require('fs');
var path = require('path');
var cron = require('node-cron');
var Ajv = require('ajv');
var audit = require('./audit');
var notify = require('./notify');

var COLLECTORS_DIR = path.join(__dirname, '..', 'collectors');
var DATA_DIR = path.join(__dirname, '..', 'data');

var DEFAULT_STALE_AFTER_MS = 24 * 60 * 60 * 1000;

var ajv = new Ajv({ allErrors: true });
var schemaCache = {};

// コレクタ定義の JSON Schema（optional）があれば構造検証する
function validateSchema(collector, data) {
  if (!collector.schema) {
    return;
  }
  if (!schemaCache[collector.id]) {
    schemaCache[collector.id] = ajv.compile(collector.schema);
  }
  if (!schemaCache[collector.id](data)) {
    throw new Error(
      'スキーマ検証に失敗: ' + ajv.errorsText(schemaCache[collector.id].errors)
    );
  }
}

function recordAudit(collector, options, result, startedAt) {
  audit.appendAudit({
    ts: new Date().toISOString(),
    collector: collector.id,
    source: options.source || 'unknown',
    status: result.status,
    error: result.error || null,
    keptExisting: result.keptExisting || null,
    durationMs: Math.round(Date.now() - startedAt)
  });
}

function discover() {
  if (!fs.existsSync(COLLECTORS_DIR)) {
    return [];
  }
  return fs
    .readdirSync(COLLECTORS_DIR)
    .filter(function(dir) {
      return fs.statSync(path.join(COLLECTORS_DIR, dir)).isDirectory();
    })
    .map(function(dir) {
      var p = path.join(COLLECTORS_DIR, dir, 'collector.js');
      if (!fs.existsSync(p)) {
        return null;
      }
      var collector = require(p);
      collector.dir = dir;
      return collector;
    })
    .filter(Boolean);
}

function dataFilePath(id) {
  return path.join(DATA_DIR, id + '.json');
}

function loadExisting(id) {
  var p = dataFilePath(id);
  if (!fs.existsSync(p)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    return null;
  }
}

function isStale(existing, collector) {
  if (!existing || !existing.collectedAt) {
    return true;
  }
  var ttl = collector.staleAfterMs || DEFAULT_STALE_AFTER_MS;
  return Date.now() - new Date(existing.collectedAt).getTime() > ttl;
}

function writeOutput(collector, data) {
  var payload = Object.assign({}, data, {
    id: collector.id,
    collectedAt: new Date().toISOString()
  });
  fs.writeFileSync(dataFilePath(collector.id), JSON.stringify(payload, null, 2) + '\n');
}

function runCollector(collector, opts) {
  var options = opts || {};
  var existing = loadExisting(collector.id);
  var startedAt = Date.now();

  return Promise.resolve()
    .then(function() {
      return collector.collect();
    })
    .then(function(data) {
      if (data && data.skipped) {
        var skipped = {
          id: collector.id,
          name: collector.name,
          status: 'skipped',
          reason: data.reason || 'skip 指示'
        };
        recordAudit(collector, options, skipped, startedAt);
        return skipped;
      }
      validateSchema(collector, data);
      if (collector.validate) {
        collector.validate(data);
      }
      writeOutput(collector, data);
      var ok = {
        id: collector.id,
        name: collector.name,
        status: 'ok',
        collectedAt: new Date().toISOString()
      };
      recordAudit(collector, options, ok, startedAt);
      return ok;
    })
    .catch(function(err) {
      if (options.force) {
        recordAudit(collector, options, { id: collector.id, status: 'error', error: err.message }, startedAt);
        notify.notifyFailure({ collector: collector, error: err, existing: existing });
        throw err;
      }
      console.error(
        '[collector:' + collector.id + '] 収集失敗。既存データを保持します:',
        err.message
      );
      var kept = {
        id: collector.id,
        name: collector.name,
        status: 'error',
        error: err.message,
        keptExisting: !!existing
      };
      recordAudit(collector, options, kept, startedAt);
      notify.notifyFailure({ collector: collector, error: err, existing: existing });
      return kept;
    });
}

function runAll(filterIds, opts) {
  var options = opts || {};
  var collectors = discover();
  var targets = collectors.filter(function(c) {
    return !filterIds || filterIds.indexOf(c.id) !== -1;
  });
  return Promise.all(targets.map(function(c) {
    return runCollector(c, { source: options.source || 'cli' });
  }));
}

function refreshStale() {
  var collectors = discover();
  var tasks = collectors.map(function(c) {
    if (isStale(loadExisting(c.id), c)) {
      console.log('[collector:' + c.id + '] データが古いため自動更新します');
      return runCollector(c, { source: 'startup' });
    }
    return Promise.resolve({ id: c.id, name: c.name, status: 'ok', reason: 'fresh' });
  });
  return Promise.all(tasks);
}

function startScheduler() {
  var collectors = discover();
  var scheduled = 0;
  collectors.forEach(function(c) {
    if (!c.cron) {
      return;
    }
    if (!cron.validate(c.cron)) {
      console.error('[collector:' + c.id + '] cron 式が不正:', c.cron);
      return;
    }
    cron.schedule(c.cron, function() {
      runCollector(c, { source: 'scheduler' }).then(function(result) {
        console.log('[scheduler] ' + JSON.stringify(result));
      });
    });
    scheduled += 1;
  });
  console.log('[scheduler] スケジュール済みコレクタ: ' + scheduled);
  return scheduled;
}

module.exports = {
  discover: discover,
  runAll: runAll,
  runCollector: runCollector,
  refreshStale: refreshStale,
  startScheduler: startScheduler,
  loadExisting: loadExisting,
  isStale: isStale
};