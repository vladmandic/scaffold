/* eslint-disable global-require */
const path = require('path');
const fs = require('fs');
const log = require('./logger.js');
const config = require('../config.json');
const nodeconfig = require('../package.json');

function exit() {
  log.warn('Server exiting...');
  process.exit();
}

async function main() {
  log.info(`${nodeconfig.name} server v${nodeconfig.version}`);
  log.info(`Platform: ${process.platform} Arch: ${process.arch} Node: ${process.version}`);
  log.file(`${nodeconfig.name}.log`);
  process.on('SIGINT', exit);
  process.on('SIGHUP', exit);
  process.on('SIGTERM', exit);

  const express = require('express');
  const app = express();
  app.disable('x-powered-by');
  app.disable('etag');
  const helmet = require('helmet');
  app.use(helmet());
  const compression = require('compression');
  app.use(compression());
  const csp = require('helmet-csp');
  app.use(csp({
    directives: {
      defaultSrc: ["'self'"],
      frameSrc: ["'none'"],
      mediaSrc: ["'none'"],
      objectSrc: ["'none'"],
      manifestSrc: ["'self'"],
      workerSrc: ["'self'"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ['http:', 'https:', 'data:', 'blob:'],
      upgradeInsecureRequests: config.httpsForce,
    },
    loose: false,
    reportOnly: false,
    setAllHeaders: false,
    disableAndroid: false,
    browserSniff: true,
  }));

  app.use((req, res, next) => { // default handler
    // Allow only GET, POST and HEAD methods & Force HTTP->HTTPS redirects
    if (req.method !== 'GET' && req.method !== 'POST' && req.method !== 'HEAD') return res.sendStatus(405);
    if (config.httpsForce && !req.secure) return res.redirect(`https://${req.hostname}:${config.httpsPort}${req.url}`);
    res.on('finish', () => log.data(`${req.protocol}/${req.httpVersion} code:${res.statusCode} src:${req.client.remoteFamily}/${req.ip} ${req.method} ${req.headers.host}${req.url}`));
    next();
    return true;
  });

  log.state('Mounting static /public as /');
  app.use(express.static(path.join(__dirname, '../public')));
  log.state('Mounting static /images');
  app.use('/images', express.static(path.join(__dirname, '../images'), { maxAge: '365d', cacheControl: true }));
  log.state('Mounting static /scripts');
  app.use('/scripts', express.static(path.join(__dirname, '../scripts'), { maxAge: '365d', cacheControl: true }));

  log.state('Routing page / to /public/index.html');
  app.get('/', (req, res) => res.sendFile('index.html', { root: path.join(__dirname, '../public') }));

  const pages = [];
  for (const file of fs.readdirSync('public/')) {
    if (file.toLowerCase().endsWith('.html')) {
      const name = file.split('.')[0];
      app.get(`/page/${name}`, (req, res) => res.sendFile(file, { root: path.join(__dirname, '../public') }));
      log.state(`Routing page /page/${name} to /public/${file}`);
      pages.push({ name, file });
    }
  }

  const api = require('./api.js');
  app.use('/api', api);

  app.use((req, res, next) => { // catch unhandled requests and instead throw error 404
    if (!req.url.includes('/socket.io/') && !req.url.includes('.map')) {
      const err = new Error(`not found: ${req.url}`);
      err.status = 404;
      next(err);
    }
  });

  app.use((err, req, res, next) => { // callback with error signature for middleware
    log.data(`${req.protocol}/${req.httpVersion} code:${err.status} src:${req.client.remoteFamily}/${req.ip} ${req.method} ${req.headers.host}${req.url} Message:${err.message}`);
    res.status(err.status || 500).send(`<p style="background:#555555; color: lightcoral; font-family: roboto; font-size: 20px; padding: 10px"> error code: ${err.status} ${err.message} </p>`);
    next();
  });

  async function logConnection(sock) {
    if (sock.remoteAddress === sock.localAddress) return;
    log.data(`socket ${config.httpsPort ? 'SSL' : 'Clear'} ${sock.remoteFamily} ${sock.remoteAddress}:${sock.remotePort} -> ${sock.localAddress}:${sock.localPort}`);
  }

  // Initialize HTTP & HTTPS Servers
  let serverHTTP;
  if (config.httpPort && config.httpPort > 0) {
    try {
      const optionsHTTP = { maxHeaderSize: 65536 };
      const http = require('http');
      serverHTTP = http.createServer(optionsHTTP, app);
      serverHTTP.on('error', (err) => log.error(err.message));
      serverHTTP.on('listening', () => log.state(`Server HTTP listening on ${serverHTTP.address().family} ${serverHTTP.address().address}:${serverHTTP.address().port}`));
      serverHTTP.on('close', () => log.warn('Server HTTP closed'));
      serverHTTP.on('connection', (sock) => logConnection(sock));
      serverHTTP.listen(config.httpPort);
    } catch (err) {
      log.error(`Server HTTP failed: ${err}`);
    }
  }

  let serverHTTPS;
  if (config.httpsPort && config.httpsPort > 0) {
    if (!fs.existsSync(path.join(__dirname, config.sslKey)) || !fs.existsSync(path.join(__dirname, config.sslCrt))) {
      log.error('Missing SSL Key or CRT files');
    } else {
      try {
        const optionsHTTPS = {
          maxHeaderSize: 65536,
          key: fs.readFileSync(path.join(__dirname, config.sslKey), 'utf8'),
          cert: fs.readFileSync(path.join(__dirname, config.sslCrt), 'utf8'),
          requestCert: false,
          rejectUnauthorized: false,
        };
        const https = require('https');
        serverHTTPS = https.createServer(optionsHTTPS, app);
        serverHTTPS.on('error', (err) => log.error(err.message));
        serverHTTPS.on('listening', () => log.state(`Server HTTPS listening on ${serverHTTPS.address().family} ${serverHTTPS.address().address}:${serverHTTPS.address().port}`));
        serverHTTPS.on('close', () => log.warn('Server HTTPS closed'));
        serverHTTPS.on('connection', (sock) => logConnection(sock));
        serverHTTPS.listen(config.httpsPort);
        if (config.httpsForce) log.info('Forcing redirect of unsecure requests');
      } catch (err) {
        log.error(`Server HTTPS failed: ${err}`);
      }
    }
  }

  if (!serverHTTP.listening && !serverHTTPS.listening) log.fatal('Server not listening');
}

main();
