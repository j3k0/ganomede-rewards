'use strict';

const urlEscape = require('url-escape-tag');
const BaseClient = require('./BaseClient');

class UsermetaClient extends BaseClient {
  constructor ({protocol, hostname, port, pathnamePrefix, secret}) {
    super(`${protocol}://${hostname}:${port}${pathnamePrefix}`);
    this.secret = secret;
  }

  write (userId, metaName, value, callback) {
    const token = `${this.secret}.${userId}`;
    const path = urlEscape`/auth/${token}/${metaName}`;

    this.apiCall('post', path, {value}, callback);
  }
}

module.exports = UsermetaClient;
