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

    this.apiCall('get', path, (err, reply) => {
      if (err)
        callback(new Error('usermeta.read(' + names + ') failed: ' + err));
      else
        callback(err, reply);
    });
  }

  write (userId, metaName, value, callback) {
    const token = `${this.secret}.${userId}`;
    const path = urlEscape`/auth/${token}/${metaName}`;

    this.apiCall('post', path, {value}, (err, reply) => {
      if (err)
        callback(new Error('usermeta.write(' + metaName + ') failed: ' + err));
      else
        callback(err, reply);
    });
  }

  hasKey (userId, metaName, callback) {
    this.read(userId, metaName, (err, reply) => {
      return err
        ? callback(err)
        : callback(null, reply[userId].hasOwnProperty(metaName));
    });
  }
}

module.exports = UsermetaClient;
