'use strict';

const urlEscape = require('url-escape-tag');
const BaseClient = require('./BaseClient');
const {toArray} = require('../utils');

class UsermetaClient extends BaseClient {
  constructor ({protocol, hostname, port, pathnamePrefix, secret}) {
    super(`${protocol}://${hostname}:${port}${pathnamePrefix}`);
    this.secret = secret;
  }

  read (userIdsArg, metaNamesArg, callback) {
    const userIds = toArray(userIdsArg).join(',');
    const names = toArray(metaNamesArg).join(',');
    const path = urlEscape`/${userIds}/${names}?secret=${this.secret}`;

    this.apiCall('get', path, callback);
  }

  write (userId, metaName, value, callback) {
    const token = `${this.secret}.${userId}`;
    const path = urlEscape`/auth/${token}/${metaName}`;

    this.apiCall('post', path, {value}, callback);
  }
}

module.exports = UsermetaClient;
