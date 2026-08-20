var test = require('node:test');
var assert = require('node:assert/strict');
var http = require('http');

// X-Forwarded-For でリモート接続を模擬するため TRUST_PROXY を有効化してから app を読み込む
process.env.TRUST_PROXY = '1';

var app = require('../app');

function listen() {
  return new Promise(function(resolve) {
    var server = http.createServer(app);
    server.listen(0, '127.0.0.1', function() {
      resolve({ server: server, port: server.address().port });
    });
  });
}

function getCollectors(port, headers) {
  return fetch('http://127.0.0.1:' + port + '/api/collectors', {
    method: 'GET',
    headers: headers || {}
  }).then(function(res) {
    return res.json().then(function(body) {
      return { status: res.status, body: body };
    });
  });
}

test('管理 API: ループバックからの取得は許可される', async function() {
  var ctx = await listen();
  try {
    var res = await getCollectors(ctx.port);
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body));
  } finally {
    ctx.server.close();
  }
});

test('管理 API: トークン未設定でリモートからは 403 で拒否される', async function() {
  delete process.env.COLLECTOR_ADMIN_TOKEN;
  var ctx = await listen();
  try {
    var res = await getCollectors(ctx.port, { 'X-Forwarded-For': '203.0.113.1' });
    assert.equal(res.status, 403);
    assert.match(res.body.message, /ループバック/);
  } finally {
    ctx.server.close();
  }
});

test('管理 API: リモートは x-admin-token 一致で許可される', async function() {
  process.env.COLLECTOR_ADMIN_TOKEN = 'secret123';
  var ctx = await listen();
  try {
    var res = await getCollectors(ctx.port, {
      'X-Forwarded-For': '203.0.113.1',
      'x-admin-token': 'secret123'
    });
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body));
  } finally {
    ctx.server.close();
  }
});

test('管理 API: リモートで x-admin-token 不一致は 401 で拒否される', async function() {
  process.env.COLLECTOR_ADMIN_TOKEN = 'secret123';
  var ctx = await listen();
  try {
    var res = await getCollectors(ctx.port, {
      'X-Forwarded-For': '203.0.113.1',
      'x-admin-token': 'wrong'
    });
    assert.equal(res.status, 401);
  } finally {
    ctx.server.close();
  }
});

test('閲覧 API: リモートからも人口データを取得できる（認証不要）', async function() {
  delete process.env.COLLECTOR_ADMIN_TOKEN;
  var ctx = await listen();
  try {
    var res = await fetch('http://127.0.0.1:' + ctx.port + '/api/population', {
      headers: { 'X-Forwarded-For': '203.0.113.1' }
    });
    assert.equal(res.status, 200);
    var body = await res.json();
    assert.ok(Array.isArray(body.labels));
    assert.ok(Array.isArray(body.data));
  } finally {
    ctx.server.close();
  }
});