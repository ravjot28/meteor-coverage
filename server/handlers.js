import Conf from './context/conf';
import Instrumenter from './services/instrumenter';
import Core from './services/core';
import ReportService from './report/report-service';
import fs from 'fs';
import path from 'path';

showCoverage = function (params, req, res, next) {
  let options = {
    'filepath': params.query.p
  };
  let reportService = new ReportService();
  reportService.generateReport(res, 'http', options);
};

getAsset = function (params, req, res, next) {
  var assetsDir = path.join(path.resolve('.'), 'assets/packages/lmieulet_meteor-coverage/assets/'),
    filename = params.filename;
  fs.exists(path.join(assetsDir, filename), function (exists) {
    if (!exists) {
      fs.exists(path.join(assetsDir, '/vendor/', filename), function (exists) {
        /* istanbul ignore else */
        if (!exists) return next();
        fs.readFile(assetsDir + '/vendor/' + filename, function (err, fileContent) {
          /* istanbul ignore else */
          if (err) {
            console.error(err);
            return next();
          }
          res.end(fileContent);
        });
      });
    } else {
      fs.readFile(assetsDir + '/' + filename, function (err, fileContent) {
        /* istanbul ignore else */
        if (err) {
          console.error(err);
          return next();
        }
        res.end(fileContent);
      });
    }
  });
};

addClientCoverage = function (params, req, res, next) {
  var body = req.body;
  /* istanbul ignore else */
  if (!body) {
    res.writeHead(400);
    res.end();
  }

  var clientCoverage;
  for (var property in body) {
    /* istanbul ignore else */
    if (body.hasOwnProperty(property)) {
      clientCoverage = body[property];
    }
  }
  if (clientCoverage) {
    Core.mergeCoverageWith(clientCoverage);
    res.end('{"type":"success"}');
  } else {
    res.writeHead(400);
    res.end('Nothing has been imported');
  }
};

exportFile = function (params, req, res, next) {
  var _type = params.type;
  /* istanbul ignore next: ternary operator */
  type = Conf.reportTypes.allowed.indexOf(_type) > -1 ? _type : 'coverage';
  try {
    let reportService = new ReportService();
    reportService.generateReport(res, type, {});
  } catch (e) {
    Log.error('Failed to export', e, e.stack);
    res.writeHead(400);
    res.end('Nothing has been export');
  }
};
importCoverage = function (params, req, res, next) {
  try {
    Core.importCoverage(res);
  } catch (e) {
    Log.error('Failed to import', e, e.stack);
    res.writeHead(400);
    res.end('No file has been import');
  }
};

instrumentClientJs = function (params, req, res, next) {
  var fileurl = req.url.split('?')[0];
  if (Instrumenter.shallInstrumentClientScript(fileurl)) {
    var path,
      pathLabel;
          // Either a package
    if (req.url.indexOf('/packages') === 0) {
      path = '../web.browser';
      pathLabel = path + fileurl;
    } else if (req.url.indexOf('/app') === 0) {
              // Or the app/app.js
      path = '../web.browser';
      pathLabel = path + fileurl;
    } else {
              // Or a public file
      path = '../web.browser/app';
      pathLabel = path + fileurl;
    }
    res.setHeader('Content-type', 'application/javascript');
    fs.exists(path + fileurl, function (exists) {
      /* istanbul ignore else */
      if (!exists) return next();
      fs.readFile(path + fileurl, 'utf8', function (err, fileContent) {
        /* istanbul ignore else */
        if (err) return next();
        Instrumenter.instrumentJs(fileContent, pathLabel, function (err, data) {
          /* istanbul ignore else */
          if (err) throw err;
          res.end(data);
        });
      });
    });
  } else {
    next();
  }
};

export default Handlers = {
  showCoverage,
  getAsset,
  addClientCoverage,
  instrumentClientJs,
  exportFile,
  importCoverage
};
