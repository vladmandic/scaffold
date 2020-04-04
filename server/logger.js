/* eslint-disable no-console */

global.ring = [];
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const moment = require('moment');

const tags = [];
tags.blank = '';
tags.continue = ':       ';
tags.info = chalk.cyan('INFO: ');
tags.warn = chalk.yellow('WARN: ');
tags.data = chalk.green('DATA: ');
tags.error = chalk.red('ERROR: ');
tags.fatal = chalk.bold.red('FATAL: ');
tags.state = chalk.magenta('STATE: ');
let logStream = null;
let logFile = null;
let logFileOK = false;

function setLogFile(file) {
  logFile = file;
  const time = moment(Date.now()).format('YYYY-MM-DD HH:mm:ss');
  console.log(`${time} ${tags.state}Application log set to ${path.resolve(logFile)}`);
  logFileOK = true;
  logStream = fs.createWriteStream(path.resolve(logFile), { flags: 'a' });
  logStream.on('error', (e) => {
    console.log(`${time} ${tags.error}Cannot open application log ${logFile}: ${e.code}`);
    logFileOK = false;
  });
}

function log(tag, ...messages) {
  const head = tags[tag];
  let msg = '';
  messages.forEach((message) => {
    msg += typeof message === 'object' ? JSON.stringify(message) : message;
    msg += ' ';
  });
  const time = moment(Date.now()).format('YYYY-MM-DD HH:mm:ss');
  if (logFileOK) logStream.write(`${time} ${head}${msg}\n`);
  console.log(`${time} ${head}${msg}`);
  global.ring.push({ tag, time, msg });
  if (global.ring.length > 100) global.ring.shift();
}

function print(...messages) {
  const time = moment(Date.now()).format('YYYY-MM-DD HH:mm:ss');
  console.log(time, ...messages);
}

exports.file = (file) => setLogFile(file);
exports.console = (...message) => print(...message);
exports.blank = (...message) => log('blank', ...message);
exports.warn = (...message) => log('warn', ...message);
exports.info = (...message) => log('info', ...message);
exports.data = (...message) => log('data', ...message);
exports.error = (...message) => log('error', ...message);
exports.fatal = (...message) => log('fatal', ...message);
exports.state = (...message) => log('state', ...message);
