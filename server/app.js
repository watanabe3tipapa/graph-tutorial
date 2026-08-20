require('dotenv').config();

var fs = require('fs');
var path = require('path');
var crypto = require('crypto');
var createError = require('http-errors');
var express = require('express');
var logger = require('morgan');
var helmet = require('helmet');

var estat = require('./lib/estat');
var github = require('./lib/github');
var registry = require('./lib/collector-registry');
var audit = require('./lib/audit');

var app = express();

app.disable('etag');

if (process.env.TRUST_PROXY === '1') {
  app.set('trust proxy', true);
}

app.use(helmet());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use('/api', function(req, res, next) {
  res.set('Cache-Control', 'no-store');
  next();
});

// 管理 API（コレクタ一覧・実行）の認可境界:
// - ループバック接続はローカル運用（WEB-UI / CLI プロキシ）として許可
// - リモート接続は COLLECTOR_ADMIN_TOKEN が一致する場合のみ許可
// - 認証情報が未設定でリモートからの場合は拒否（fail closed）
function isLoopback(ip) {
  return (
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip === '::ffff:127.0.0.1'
  );
}

function safeEqual(a, b) {
  var ha = crypto.createHash('sha256').update(String(a)).digest();
  var hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

function requireAdmin(req, res, next) {
  if (isLoopback(req.ip)) {
    return next();
  }
  var token = process.env.COLLECTOR_ADMIN_TOKEN;
  if (!token) {
    return res.status(403).json({
      message:
        '管理 API はローカル（ループバック）からのみ利用できます。' +
        'リモートから実行するには COLLECTOR_ADMIN_TOKEN を設定し、' +
        'x-admin-token ヘッダで認証してください。'
    });
  }
  var supplied = req.get('x-admin-token');
  if (!supplied || !safeEqual(supplied, token)) {
    return res.status(401).json({ message: 'x-admin-token が不正です' });
  }
  return next();
}

app.get('/api/population', function(req, res, next) {
  estat.getPopulationData()
    .then(function(data) {
      res.json(data);
    })
    .catch(next);
});

app.get('/api/repos', function(req, res, next) {
  github.getRepos()
    .then(function(data) {
      res.json(data);
    })
    .catch(next);
});

app.get('/api/collectors', requireAdmin, function(req, res, next) {
  var list = registry.discover().map(function(c) {
    var existing = registry.loadExisting(c.id);
    return {
      id: c.id,
      name: c.name,
      cron: c.cron || null,
      collectedAt: existing ? existing.collectedAt : null,
      stale: registry.isStale(existing, c)
    };
  });
  res.json(list);
});

app.post('/api/collect/:id', requireAdmin, function(req, res, next) {
  var collector = registry.discover().filter(function(c) {
    return c.id === req.params.id;
  })[0];
  if (!collector) {
    return res.status(404).json({ message: 'collector not found: ' + req.params.id });
  }
  registry.runCollector(collector, { force: true, source: 'api' })
    .then(function(result) {
      res.json(result);
    })
    .catch(function(err) {
      res.status(500).json({ message: err.message });
    });
});

// 監査ログ（直近の実行履歴）は管理 API と同様に保護する
app.get('/api/audit', requireAdmin, function(req, res, next) {
  res.json({ entries: audit.readAudit(req.query.limit) });
});

var distPath = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath, { etag: false, lastModified: false }));
}

app.use(function(req, res, next) {
  next(createError(404));
});

app.use(function(err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  res.status(err.status || 500).json({
    message: err.message,
    error: req.app.get('env') === 'development' ? err : {}
  });
});

module.exports = app;