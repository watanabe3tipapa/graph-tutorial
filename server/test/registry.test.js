var test = require('node:test');
var assert = require('node:assert/strict');
var fs = require('fs');
var path = require('path');

var registry = require('../lib/collector-registry');
var notify = require('../lib/notify');
var audit = require('../lib/audit');

var AUDIT_PATH = path.join(__dirname, '..', 'data', 'audit.jsonl');
var NOTIFY_STATE_PATH = path.join(__dirname, '..', 'data', '.notify-state.json');
var DATA_DIR = path.join(__dirname, '..', 'data');

function auditLineCount() {
  if (!fs.existsSync(AUDIT_PATH)) {
    return 0;
  }
  return fs.readFileSync(AUDIT_PATH, 'utf8').split('\n').filter(Boolean).length;
}

function lastAuditEntry() {
  var lines = fs.readFileSync(AUDIT_PATH, 'utf8').split('\n').filter(Boolean);
  return JSON.parse(lines[lines.length - 1]);
}

function resetNotifyState(ids) {
  var state = {};
  try {
    state = JSON.parse(fs.readFileSync(NOTIFY_STATE_PATH, 'utf8'));
  } catch (e) {
    state = {};
  }
  ids.forEach(function(id) {
    state[id] = 0;
  });
  fs.writeFileSync(NOTIFY_STATE_PATH, JSON.stringify(state));
}

function removeOutput(id) {
  var p = path.join(DATA_DIR, id + '.json');
  if (fs.existsSync(p)) {
    fs.unlinkSync(p);
  }
}

test('JSON Schema: スキーマ違反データは収集失敗として扱われる', async function() {
  var collector = {
    id: 'schema-test-bad',
    name: 'Schema Test Bad',
    schema: {
      type: 'object',
      required: ['repos'],
      properties: {
        repos: { type: 'array', minItems: 1 }
      }
    },
    collect: function() {
      return Promise.resolve({ repos: [] });
    }
  };
  var result = await registry.runCollector(collector, { source: 'test' });
  assert.equal(result.status, 'error');
  assert.match(result.error, /スキーマ検証に失敗/);
});

test('JSON Schema: 適合データは正常に保存される', async function() {
  var collector = {
    id: 'schema-test-good',
    name: 'Schema Test Good',
    schema: {
      type: 'object',
      required: ['ok'],
      properties: { ok: { type: 'boolean' } }
    },
    collect: function() {
      return Promise.resolve({ ok: true });
    }
  };
  try {
    var result = await registry.runCollector(collector, { source: 'test' });
    assert.equal(result.status, 'ok');
    var saved = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'schema-test-good.json'), 'utf8'));
    assert.equal(saved.ok, true);
    assert.ok(saved.collectedAt);
  } finally {
    removeOutput('schema-test-good');
  }
});

test('監査ログ: 成功・失敗・スキップが source 付きで記録される', async function() {
  var before = auditLineCount();

  var okCollector = {
    id: 'audit-test-ok',
    name: 'Audit Test OK',
    collect: function() {
      return Promise.resolve({ ok: true });
    }
  };
  var skipCollector = {
    id: 'audit-test-skip',
    name: 'Audit Test Skip',
    collect: function() {
      return Promise.resolve({ skipped: true, reason: 'テスト' });
    }
  };
  var failCollector = {
    id: 'audit-test-fail',
    name: 'Audit Test Fail',
    collect: function() {
      return Promise.reject(new Error('boom'));
    }
  };

  try {
    await registry.runCollector(okCollector, { source: 'scheduler' });
    await registry.runCollector(skipCollector, { source: 'cli' });
    await registry.runCollector(failCollector, { source: 'api' });

    assert.equal(auditLineCount(), before + 3);
    var okEntry = lastAuditEntry();
    assert.equal(okEntry.collector, 'audit-test-fail');
    assert.equal(okEntry.status, 'error');
    assert.equal(okEntry.source, 'api');
    assert.equal(okEntry.error, 'boom');

    var entries = audit.readAudit(10);
    assert.ok(entries.some((e) => e.collector === 'audit-test-ok' && e.status === 'ok' && e.source === 'scheduler'));
    assert.ok(entries.some((e) => e.collector === 'audit-test-skip' && e.status === 'skipped' && e.source === 'cli'));
  } finally {
    removeOutput('audit-test-ok');
  }
});

test('失敗通知: ウェブフックに送信され、クールダウンで同一期間の再送は抑制される', async function() {
  resetNotifyState(['notify-test']);
  process.env.FAILURE_WEBHOOK_URL = 'https://example.com/hook';
  var calls = [];
  var origFetch = global.fetch;
  global.fetch = function(url, opts) {
    calls.push({ url: String(url), body: JSON.parse(opts.body) });
    return Promise.resolve({ ok: true });
  };

  var failCollector = {
    id: 'notify-test',
    name: 'Notify Test',
    collect: function() {
      return Promise.reject(new Error('boom'));
    }
  };

  try {
    await registry.runCollector(failCollector, { source: 'test' });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, 'https://example.com/hook');
    assert.equal(calls[0].body.collector, 'notify-test');
    assert.equal(calls[0].body.error, 'boom');

    await registry.runCollector(failCollector, { source: 'test' });
    assert.equal(calls.length, 1, 'クールダウン中は再送されない');
  } finally {
    global.fetch = origFetch;
    delete process.env.FAILURE_WEBHOOK_URL;
  }
});

test('失敗通知: ウェブフック未設定なら何も送信しない', async function() {
  resetNotifyState(['notify-nohook']);
  delete process.env.FAILURE_WEBHOOK_URL;
  var calls = [];
  var origFetch = global.fetch;
  global.fetch = function() {
    calls.push(1);
    return Promise.resolve({ ok: true });
  };
  try {
    var collector = {
      id: 'notify-nohook',
      name: 'Notify NoHook',
      collect: function() {
        return Promise.reject(new Error('boom'));
      }
    };
    await registry.runCollector(collector, { source: 'test' });
    assert.equal(calls.length, 0);
  } finally {
    global.fetch = origFetch;
  }
});