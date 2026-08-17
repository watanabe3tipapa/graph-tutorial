require('dotenv').config();

var fs = require('fs');
var path = require('path');
var createError = require('http-errors');
var express = require('express');
var logger = require('morgan');
var helmet = require('helmet');

var estat = require('./lib/estat');
var github = require('./lib/github');
var registry = require('./lib/collector-registry');

var app = express();

app.disable('etag');

app.use(helmet());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use('/api', function(req, res, next) {
  res.set('Cache-Control', 'no-store');
  next();
});

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

app.get('/api/collectors', function(req, res, next) {
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

app.post('/api/collect/:id', function(req, res, next) {
  var collector = registry.discover().filter(function(c) {
    return c.id === req.params.id;
  })[0];
  if (!collector) {
    return res.status(404).json({ message: 'collector not found: ' + req.params.id });
  }
  registry.runCollector(collector, { force: true })
    .then(function(result) {
      res.json(result);
    })
    .catch(function(err) {
      res.status(500).json({ message: err.message });
    });
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