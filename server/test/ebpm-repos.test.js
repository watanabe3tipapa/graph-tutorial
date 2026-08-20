var test = require('node:test');
var assert = require('node:assert/strict');
var fs = require('fs');
var path = require('path');

var collector = require('../collectors/ebpm-repos/collector');

var fixture = fs.readFileSync(
  path.join(__dirname, '..', 'collectors', 'ebpm-repos', 'fixtures', 'source.html'),
  'utf8'
);

test('fixture から 8 カテゴリ / 38 リポジトリを抽出する', function() {
  var data = collector.parseHtml(fixture);
  assert.equal(data.categories.length, 8);
  assert.equal(data.repos.length, 38);
  data.repos.forEach(function(r) {
    assert.ok(r.owner && r.name && r.category, 'owner/name/category が不足: ' + JSON.stringify(r));
  });
});

test('重複リポジトリは1件に集約される（EBPMDB）', function() {
  var data = collector.parseHtml(fixture);
  var ebpmdb = data.repos.filter(function(r) {
    return /ebpmdb/i.test(r.name);
  });
  assert.equal(ebpmdb.length, 1);
});

test('github.com 以外のリンク行は除外される（STAPM）', function() {
  var data = collector.parseHtml(fixture);
  assert.ok(
    !data.repos.some(function(r) {
      return r.owner === 'stapm-platform';
    })
  );
});

test('カテゴリ見出し直後に別表が挿入されても、見出しと表の対応がずれない', function() {
  var broken = fixture.replace(
    '<h2>2. 差分の差分法（DiD）・合成制御法（SCM）関連</h2>',
    '<h2>追加メモ（番号なし）</h2><table><tbody>' +
      '<tr><td><a href="https://github.com/foo/bar">foo/bar</a></td><td>dummy</td><td>1</td><td>-</td><td>-</td></tr>' +
      '</tbody></table>\n<h2>2. 差分の差分法（DiD）・合成制御法（SCM）関連</h2>'
  );

  var data = collector.parseHtml(broken);
  assert.equal(data.categories.length, 8);
  assert.ok(
    !data.repos.some(function(r) {
      return r.owner === 'foo';
    }),
    '番号なしメモの表がカテゴリとして取り込まれていないこと'
  );
  var diD = data.repos.filter(function(r) {
    return r.category === '差分の差分法（DiD）・合成制御法（SCM）関連';
  });
  assert.ok(
    diD.some(function(r) {
      return r.name === 'synthdid';
    }),
    'カテゴリ2の実データ（synthdid）が正しく紐づくこと'
  );
  assert.ok(
    diD.some(function(r) {
      return r.name === 'diff-diff';
    })
  );
});

test('列見出しが違っても列の順序ではなく見出し名で列を特定する', function() {
  var renamed = fixture.replace(
    '<th>Stars</th>',
    '<th>GitHub Stars 数</th>'
  );
  var data = collector.parseHtml(renamed);
  var first = data.repos.filter(function(r) {
    return r.name === 'dowhy';
  })[0];
  assert.equal(first.stars, 8237);
});

test('validate() はパース結果を通す', function() {
  var data = collector.parseHtml(fixture);
  assert.doesNotThrow(function() {
    collector.validate(data);
  });
});