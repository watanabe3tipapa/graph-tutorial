require('dotenv').config();

var fs = require('fs');
var path = require('path');
var createError = require('http-errors');
var express = require('express');
var logger = require('morgan');
var helmet = require('helmet');

var estat = require('./lib/estat');
var github = require('./lib/github');

var app = express();

app.use(helmet());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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

var distPath = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
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