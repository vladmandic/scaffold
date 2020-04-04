const express = require('express');
const useragent = require('useragent');
const compression = require('compression');
const log = require('./logger.js');
const serverVersion = require('../package.json').version;

// Initialize the API.
const api = express({ maxAge: 0 });
api.disable('x-powered-by');
api.disable('etag');
api.use(compression());
api.on('mount', () => log.state('Mounting module API to /api'));

// System APIs
api.get('/sys/config', (req, res) => res.send(global.config));
api.get('/sys/version', (req, res) => { res.send(`${serverVersion}`); });
api.get('/sys/agent', async (req, res) => res.send(useragent.lookup(req.headers['user-agent'], req.query.jsuseragent).toJSON()));
api.get('/sys/log', (req, res) => {
  log.state(`Client: ${req.client.remoteAddress} ${req.query.msg}`);
  res.sendStatus(200);
});
api.get('/sys/list', async (req, res) => {
  const apis = [];
  for (const r of api.router.stack.filter) {
    apis.push({ method: Object.keys(r.route.methods)[0].toUpperCase(), path: r.route.path });
  }
  res.send(apis);
});

if (!module.parent) {
  //
} else {
  module.exports = api;
}
