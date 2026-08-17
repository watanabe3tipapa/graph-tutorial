var fs = require('fs');
var path = require('path');

var ESTAT_ENDPOINT = 'https://api.e-stat.go.jp/rest/3.0/app/json/getStatsData';
var STATS_DATA_ID = '0003448233';

var FALLBACK = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'data', 'population.json'), 'utf8')
);
var SNAPSHOT_PATH = path.join(__dirname, '..', 'data', 'estat-population.json');

function normalizeValue(value) {
  return parseInt(String(value).replace(/,/g, ''), 10);
}

function loadSnapshot() {
  if (!fs.existsSync(SNAPSHOT_PATH)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(SNAPSHOT_PATH, 'utf8'));
  } catch (e) {
    return null;
  }
}

function writeSnapshot(data) {
  fs.writeFileSync(
    SNAPSHOT_PATH,
    JSON.stringify(Object.assign({}, data, { isLive: true }), null, 2) + '\n'
  );
}

function fetchLivePopulation(appId) {
  return new Promise(function(resolve, reject) {
    var params = new URLSearchParams({
      appId: appId,
      statsDataId: STATS_DATA_ID,
      lang: 'J',
      metaGetFlg: 'Y',
      cntGetFlg: 'N'
    });
    var url = ESTAT_ENDPOINT + '?' + params.toString();

    fetch(url)
      .then(function(response) {
        if (!response.ok) {
          throw new Error('e-Stat API error: HTTP ' + response.status);
        }
        return response.json();
      })
      .then(function(json) {
        var dataInf = json.GET_STATS_DATA.STATISTICAL_DATA.DATA_INF.VALUE;
        var yearMap = {};
        dataInf.forEach(function(item) {
          var year = item['@time'];
          var value = normalizeValue(item['$']);
          if (year && !isNaN(value)) {
            yearMap[year] = value;
          }
        });
        var years = Object.keys(yearMap).sort();
        resolve({
          source: FALLBACK.source,
          unit: FALLBACK.unit,
          labels: years,
          data: years.map(function(y) { return yearMap[y]; }),
          isLive: true,
          collectedAt: new Date().toISOString()
        });
      })
      .catch(function(err) {
        reject(err);
      });
  });
}

function getPopulationData() {
  var snapshot = loadSnapshot();
  if (snapshot && Array.isArray(snapshot.data) && snapshot.data.length > 0) {
    return Promise.resolve(Object.assign({}, snapshot, { isLive: true }));
  }

  var appId = process.env.ESTAT_APP_ID;
  if (!appId) {
    return Promise.resolve(Object.assign({}, FALLBACK, { isLive: false }));
  }

  return fetchLivePopulation(appId)
    .then(function(data) {
      writeSnapshot(data);
      return data;
    })
    .catch(function(err) {
      console.error('e-Stat API failed, using fallback data:', err.message);
      return Object.assign({}, FALLBACK, { isLive: false });
    });
}

module.exports = { getPopulationData: getPopulationData, fetchLivePopulation: fetchLivePopulation };