"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.properties = properties;
exports._preparePasswordHash = _preparePasswordHash;
exports._ensureStorageTokenExists = _ensureStorageTokenExists;
exports.writeToSocket = writeToSocket;
exports._collectionNamePrimary = _collectionNamePrimary;
exports._removeAllOfCollection = _removeAllOfCollection;
exports.create = create;
exports.getPouchLocation = getPouchLocation;
exports.removeDatabase = removeDatabase;
exports.checkAdapter = checkAdapter;
exports.isInstanceOf = isInstanceOf;
exports.dbCount = dbCount;
exports["default"] = exports.RxDatabase = void 0;

var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));

var _randomToken = _interopRequireDefault(require("random-token"));

var _customIdleQueue = _interopRequireDefault(require("custom-idle-queue"));

var _broadcastChannel = _interopRequireDefault(require("broadcast-channel"));

var _pouchDb = _interopRequireDefault(require("./pouch-db"));

var _util = require("./util");

var _rxError = _interopRequireDefault(require("./rx-error"));

var _rxCollection = _interopRequireDefault(require("./rx-collection"));

var _rxSchema = _interopRequireDefault(require("./rx-schema"));

var _rxChangeEvent = _interopRequireDefault(require("./rx-change-event"));

var _overwritable = _interopRequireDefault(require("./overwritable"));

var _hooks = require("./hooks");

var _rxjs = require("rxjs");

var _operators = require("rxjs/operators");

/**
 * stores the combinations
 * of used database-names with their adapters
 * so we can throw when the same database is created more then once
 * @type {Object<string, array>} map with {dbName -> array<adapters>}
 */
var USED_COMBINATIONS = {};
var DB_COUNT = 0;

var RxDatabase =
/*#__PURE__*/
function () {
  function RxDatabase(name, adapter, password, multiInstance, queryChangeDetection, options, pouchSettings) {
    if (typeof name !== 'undefined') DB_COUNT++;
    this.name = name;
    this.adapter = adapter;
    this.password = password;
    this.multiInstance = multiInstance;
    this.queryChangeDetection = queryChangeDetection;
    this.options = options;
    this.pouchSettings = pouchSettings;
    this.idleQueue = new _customIdleQueue["default"]();
    this.token = (0, _randomToken["default"])(10);
    this._subs = [];
    this.destroyed = false; // cache for collection-objects

    this.collections = {}; // rx

    this.subject = new _rxjs.Subject();
    this.observable$ = this.subject.asObservable().pipe((0, _operators.filter)(function (cEvent) {
      return _rxChangeEvent["default"].isInstanceOf(cEvent);
    }));
  }

  var _proto = RxDatabase.prototype;

  _proto.dangerousRemoveCollectionInfo = function dangerousRemoveCollectionInfo() {
    var colPouch = this._collectionsPouch;
    return colPouch.allDocs().then(function (docsRes) {
      return Promise.all(docsRes.rows.map(function (row) {
        return {
          _id: row.key,
          _rev: row.value.rev
        };
      }).map(function (doc) {
        return colPouch.remove(doc._id, doc._rev);
      }));
    });
  };

  /**
   * spawns a new pouch-instance
   * @param {string} collectionName
   * @param {string} schemaVersion
   * @param {Object} [pouchSettings={}] pouchSettings
   * @type {Object}
   */
  _proto._spawnPouchDB = function _spawnPouchDB(collectionName, schemaVersion) {
    var pouchSettings = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    return _spawnPouchDB2(this.name, this.adapter, collectionName, schemaVersion, pouchSettings, this.pouchSettings);
  };

  /**
   * @return {Promise}
   */
  _proto.waitForLeadership = function waitForLeadership() {
    if (!this.multiInstance) return Promise.resolve(true);
    return this.leaderElector.waitForLeadership();
  }
  /**
   * This is the main handle-point for all change events
   * ChangeEvents created by this instance go:
   * RxDocument -> RxCollection -> RxDatabase.$emit -> MultiInstance
   * ChangeEvents created by other instances go:
   * MultiInstance -> RxDatabase.$emit -> RxCollection -> RxDatabase
   */
  ;

  _proto.$emit = function $emit(changeEvent) {
    if (!changeEvent) return; // emit into own stream

    this.subject.next(changeEvent); // write to socket if event was created by this instance

    if (changeEvent.data.it === this.token) {
      writeToSocket(this, changeEvent);
    }
  }
  /**
   * @return {Observable} observable
   */
  ;

  /**
   * removes the collection-doc from this._collectionsPouch
   * @return {Promise}
   */
  _proto.removeCollectionDoc = function removeCollectionDoc(name, schema) {
    var _this = this;

    var docId = _collectionNamePrimary(name, schema);

    return this._collectionsPouch.get(docId).then(function (doc) {
      return _this.lockedRun(function () {
        return _this._collectionsPouch.remove(doc);
      });
    });
  }
  /**
   * create or fetch a collection
   * @param {{name: string, schema: Object, pouchSettings = {}, migrationStrategies = {}}} args
   * @return {Collection}
   */
  ;

  _proto.collection =
  /*#__PURE__*/
  function () {
    var _collection = (0, _asyncToGenerator2["default"])(
    /*#__PURE__*/
    _regenerator["default"].mark(function _callee(args) {
      var _this2 = this;

      var internalPrimary, schemaHash, collectionDoc, pouch, oneDoc, collection, cEvent;
      return _regenerator["default"].wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              if (!(typeof args === 'string')) {
                _context.next = 2;
                break;
              }

              return _context.abrupt("return", this.collections[args]);

            case 2:
              args.database = this;
              (0, _hooks.runPluginHooks)('preCreateRxCollection', args);

              if (!(args.name.charAt(0) === '_')) {
                _context.next = 6;
                break;
              }

              throw _rxError["default"].newRxError('DB2', {
                name: args.name
              });

            case 6:
              if (!this.collections[args.name]) {
                _context.next = 8;
                break;
              }

              throw _rxError["default"].newRxError('DB3', {
                name: args.name
              });

            case 8:
              if (args.schema) {
                _context.next = 10;
                break;
              }

              throw _rxError["default"].newRxError('DB4', {
                name: args.name,
                args: args
              });

            case 10:
              internalPrimary = _collectionNamePrimary(args.name, args.schema); // check unallowed collection-names

              if (!properties().includes(args.name)) {
                _context.next = 13;
                break;
              }

              throw _rxError["default"].newRxError('DB5', {
                name: args.name
              });

            case 13:
              args.schema = _rxSchema["default"].create(args.schema); // check schemaHash

              schemaHash = args.schema.hash;
              collectionDoc = null;
              _context.prev = 16;
              _context.next = 19;
              return this.lockedRun(function () {
                return _this2._collectionsPouch.get(internalPrimary);
              });

            case 19:
              collectionDoc = _context.sent;
              _context.next = 24;
              break;

            case 22:
              _context.prev = 22;
              _context.t0 = _context["catch"](16);

            case 24:
              if (!(collectionDoc && collectionDoc.schemaHash !== schemaHash)) {
                _context.next = 31;
                break;
              }

              // collection already exists with different schema, check if it has documents
              pouch = this._spawnPouchDB(args.name, args.schema.version, args.pouchSettings);
              _context.next = 28;
              return pouch.find({
                selector: {
                  _id: {}
                },
                limit: 1
              });

            case 28:
              oneDoc = _context.sent;

              if (!(oneDoc.docs.length !== 0)) {
                _context.next = 31;
                break;
              }

              throw _rxError["default"].newRxError('DB6', {
                name: args.name,
                previousSchemaHash: collectionDoc.schemaHash,
                schemaHash: schemaHash
              });

            case 31:
              _context.next = 33;
              return _rxCollection["default"].create(args);

            case 33:
              collection = _context.sent;

              if (!(Object.keys(collection.schema.encryptedPaths).length > 0 && !this.password)) {
                _context.next = 36;
                break;
              }

              throw _rxError["default"].newRxError('DB7', {
                name: args.name
              });

            case 36:
              if (collectionDoc) {
                _context.next = 44;
                break;
              }

              _context.prev = 37;
              _context.next = 40;
              return this.lockedRun(function () {
                return _this2._collectionsPouch.put({
                  _id: internalPrimary,
                  schemaHash: schemaHash,
                  schema: collection.schema.normalized,
                  version: collection.schema.version
                });
              });

            case 40:
              _context.next = 44;
              break;

            case 42:
              _context.prev = 42;
              _context.t1 = _context["catch"](37);

            case 44:
              cEvent = _rxChangeEvent["default"].create('RxDatabase.collection', this);
              cEvent.data.v = collection.name;
              cEvent.data.col = '_collections';
              this.$emit(cEvent);
              this.collections[args.name] = collection;

              this.__defineGetter__(args.name, function () {
                return _this2.collections[args.name];
              });

              return _context.abrupt("return", collection);

            case 51:
            case "end":
              return _context.stop();
          }
        }
      }, _callee, this, [[16, 22], [37, 42]]);
    }));

    function collection(_x) {
      return _collection.apply(this, arguments);
    }

    return collection;
  }()
  /**
   * delete all data of the collection and its previous versions
   * @param  {string}  collectionName
   * @return {Promise}
   */
  ;

  _proto.removeCollection =
  /*#__PURE__*/
  function () {
    var _removeCollection = (0, _asyncToGenerator2["default"])(
    /*#__PURE__*/
    _regenerator["default"].mark(function _callee2(collectionName) {
      var _this3 = this;

      var knownVersions, pouches;
      return _regenerator["default"].wrap(function _callee2$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
              if (!this.collections[collectionName]) {
                _context2.next = 3;
                break;
              }

              _context2.next = 3;
              return this.collections[collectionName].destroy();

            case 3:
              _context2.next = 5;
              return _removeAllOfCollection(this, collectionName);

            case 5:
              knownVersions = _context2.sent;
              // get all relevant pouchdb-instances
              pouches = knownVersions.map(function (v) {
                return _this3._spawnPouchDB(collectionName, v);
              }); // remove documents

              return _context2.abrupt("return", Promise.all(pouches.map(function (pouch) {
                return _this3.lockedRun(function () {
                  return pouch.destroy();
                });
              })));

            case 8:
            case "end":
              return _context2.stop();
          }
        }
      }, _callee2, this);
    }));

    function removeCollection(_x2) {
      return _removeCollection.apply(this, arguments);
    }

    return removeCollection;
  }()
  /**
   * runs the given function between idleQueue-locking
   * @return {any}
   */
  ;

  _proto.lockedRun = function lockedRun(fun) {
    return this.idleQueue.wrapCall(fun);
  };

  _proto.requestIdlePromise = function requestIdlePromise() {
    return this.idleQueue.requestIdlePromise();
  }
  /**
   * export to json
   * @param {boolean} decrypted
   * @param {?string[]} collections array with collectionNames or null if all
   */
  ;

  _proto.dump = function dump() {
    throw _rxError["default"].pluginMissing('json-dump');
  }
  /**
   * import json
   * @param {Object} dump
   */
  ;

  _proto.importDump = function importDump() {
    throw _rxError["default"].pluginMissing('json-dump');
  }
  /**
   * spawn server
   */
  ;

  _proto.server = function server() {
    throw _rxError["default"].pluginMissing('server');
  }
  /**
   * destroys the database-instance and all collections
   * @return {Promise}
   */
  ;

  _proto.destroy =
  /*#__PURE__*/
  function () {
    var _destroy = (0, _asyncToGenerator2["default"])(
    /*#__PURE__*/
    _regenerator["default"].mark(function _callee3() {
      var _this4 = this;

      return _regenerator["default"].wrap(function _callee3$(_context3) {
        while (1) {
          switch (_context3.prev = _context3.next) {
            case 0:
              if (!this.destroyed) {
                _context3.next = 2;
                break;
              }

              return _context3.abrupt("return");

            case 2:
              (0, _hooks.runPluginHooks)('preDestroyRxDatabase', this);
              DB_COUNT--;
              this.destroyed = true;

              if (this.broadcastChannel) {
                /**
                 * The broadcast-channel gets closed lazy
                 * to ensure that all pending change-events
                 * get emitted
                 */
                setTimeout(function () {
                  return _this4.broadcastChannel.close();
                }, 1000);
              }

              if (!this._leaderElector) {
                _context3.next = 9;
                break;
              }

              _context3.next = 9;
              return this._leaderElector.destroy();

            case 9:
              this._subs.map(function (sub) {
                return sub.unsubscribe();
              }); // destroy all collections


              _context3.next = 12;
              return Promise.all(Object.keys(this.collections).map(function (key) {
                return _this4.collections[key];
              }).map(function (col) {
                return col.destroy();
              }));

            case 12:
              // remove combination from USED_COMBINATIONS-map
              _removeUsedCombination(this.name, this.adapter);

            case 13:
            case "end":
              return _context3.stop();
          }
        }
      }, _callee3, this);
    }));

    function destroy() {
      return _destroy.apply(this, arguments);
    }

    return destroy;
  }()
  /**
   * deletes the database and its stored data
   * @return {Promise}
   */
  ;

  _proto.remove = function remove() {
    var _this5 = this;

    return this.destroy().then(function () {
      return removeDatabase(_this5.name, _this5.adapter);
    });
  };

  (0, _createClass2["default"])(RxDatabase, [{
    key: "leaderElector",
    get: function get() {
      if (!this._leaderElector) this._leaderElector = _overwritable["default"].createLeaderElector(this);
      return this._leaderElector;
    }
  }, {
    key: "isLeader",
    get: function get() {
      if (!this.multiInstance) return true;
      return this.leaderElector.isLeader;
    }
  }, {
    key: "$",
    get: function get() {
      return this.observable$;
    }
  }]);
  return RxDatabase;
}();
/**
 * returns all possible properties of a RxDatabase-instance
 * @return {string[]} property-names
 */


exports.RxDatabase = RxDatabase;
var _properties = null;

function properties() {
  if (!_properties) {
    var pseudoInstance = new RxDatabase();
    var ownProperties = Object.getOwnPropertyNames(pseudoInstance);
    var prototypeProperties = Object.getOwnPropertyNames(Object.getPrototypeOf(pseudoInstance));
    _properties = [].concat(ownProperties, prototypeProperties);
  }

  return _properties;
}
/**
 * checks if an instance with same name and adapter already exists
 * @param       {string}  name
 * @param       {any}  adapter
 * @throws {RxError} if used
 */


function _isNameAdapterUsed(name, adapter) {
  if (!USED_COMBINATIONS[name]) return false;
  var used = false;
  USED_COMBINATIONS[name].forEach(function (ad) {
    if (ad === adapter) used = true;
  });

  if (used) {
    throw _rxError["default"].newRxError('DB8', {
      name: name,
      adapter: adapter,
      link: 'https://pubkey.github.io/rxdb/rx-database.html#ignoreduplicate'
    });
  }
}

function _removeUsedCombination(name, adapter) {
  if (!USED_COMBINATIONS[name]) return;
  var index = USED_COMBINATIONS[name].indexOf(adapter);
  USED_COMBINATIONS[name].splice(index, 1);
}
/**
 * validates and inserts the password-hash
 * to ensure there is/was no other instance with a different password
 */


function _preparePasswordHash(_x3) {
  return _preparePasswordHash2.apply(this, arguments);
}
/**
 * to not confuse multiInstance-messages with other databases that have the same
 * name and adapter, but do not share state with this one (for example in-memory-instances),
 * we set a storage-token and use it in the broadcast-channel
 */


function _preparePasswordHash2() {
  _preparePasswordHash2 = (0, _asyncToGenerator2["default"])(
  /*#__PURE__*/
  _regenerator["default"].mark(function _callee4(rxDatabase) {
    var pwHash, pwHashDoc;
    return _regenerator["default"].wrap(function _callee4$(_context4) {
      while (1) {
        switch (_context4.prev = _context4.next) {
          case 0:
            if (rxDatabase.password) {
              _context4.next = 2;
              break;
            }

            return _context4.abrupt("return", false);

          case 2:
            pwHash = (0, _util.hash)(rxDatabase.password);
            pwHashDoc = null;
            _context4.prev = 4;
            _context4.next = 7;
            return rxDatabase._adminPouch.get('_local/pwHash');

          case 7:
            pwHashDoc = _context4.sent;
            _context4.next = 12;
            break;

          case 10:
            _context4.prev = 10;
            _context4.t0 = _context4["catch"](4);

          case 12:
            /**
             * if pwHash was not saved, we save it,
             * this operation might throw because another instance runs save at the same time,
             * also we do not await the output because it does not mather
             */
            if (!pwHashDoc) {
              rxDatabase._adminPouch.put({
                _id: '_local/pwHash',
                value: pwHash
              })["catch"](function () {
                return null;
              });
            } // different hash was already set by other instance


            if (!(pwHashDoc && rxDatabase.password && pwHash !== pwHashDoc.value)) {
              _context4.next = 17;
              break;
            }

            _context4.next = 16;
            return rxDatabase.destroy();

          case 16:
            throw _rxError["default"].newRxError('DB1', {
              passwordHash: (0, _util.hash)(rxDatabase.password),
              existingPasswordHash: pwHashDoc.value
            });

          case 17:
            return _context4.abrupt("return", true);

          case 18:
          case "end":
            return _context4.stop();
        }
      }
    }, _callee4, null, [[4, 10]]);
  }));
  return _preparePasswordHash2.apply(this, arguments);
}

function _ensureStorageTokenExists(_x4) {
  return _ensureStorageTokenExists2.apply(this, arguments);
}
/**
 * writes the changeEvent to the broadcastChannel
 * @param  {RxChangeEvent} changeEvent
 * @return {Promise<boolean>}
 */


function _ensureStorageTokenExists2() {
  _ensureStorageTokenExists2 = (0, _asyncToGenerator2["default"])(
  /*#__PURE__*/
  _regenerator["default"].mark(function _callee5(rxDatabase) {
    var storageTokenDoc2;
    return _regenerator["default"].wrap(function _callee5$(_context5) {
      while (1) {
        switch (_context5.prev = _context5.next) {
          case 0:
            _context5.prev = 0;
            _context5.next = 3;
            return rxDatabase._adminPouch.get('_local/storageToken');

          case 3:
            _context5.next = 16;
            break;

          case 5:
            _context5.prev = 5;
            _context5.t0 = _context5["catch"](0);
            _context5.prev = 7;
            _context5.next = 10;
            return rxDatabase._adminPouch.put({
              _id: '_local/storageToken',
              value: (0, _randomToken["default"])(10)
            });

          case 10:
            _context5.next = 14;
            break;

          case 12:
            _context5.prev = 12;
            _context5.t1 = _context5["catch"](7);

          case 14:
            _context5.next = 16;
            return new Promise(function (res) {
              return setTimeout(res, 0);
            });

          case 16:
            _context5.next = 18;
            return rxDatabase._adminPouch.get('_local/storageToken');

          case 18:
            storageTokenDoc2 = _context5.sent;
            return _context5.abrupt("return", storageTokenDoc2.value);

          case 20:
          case "end":
            return _context5.stop();
        }
      }
    }, _callee5, null, [[0, 5], [7, 12]]);
  }));
  return _ensureStorageTokenExists2.apply(this, arguments);
}

function writeToSocket(rxDatabase, changeEvent) {
  if (rxDatabase.multiInstance && !changeEvent.isIntern() && rxDatabase.broadcastChannel) {
    var socketDoc = changeEvent.toJSON();
    delete socketDoc.db;
    var sendOverChannel = {
      db: rxDatabase.token,
      // database-token
      st: rxDatabase.storageToken,
      // storage-token
      d: socketDoc
    };
    return rxDatabase.broadcastChannel.postMessage(sendOverChannel);
  } else return Promise.resolve(false);
}
/**
 * returns the primary for a given collection-data
 * used in the internal pouchdb-instances
 * @param {string} name
 * @param {RxSchema} schema
 */


function _collectionNamePrimary(name, schema) {
  return name + '-' + schema.version;
}
/**
 * removes all internal docs of a given collection
 * @param  {string}  collectionName
 * @return {Promise<string[]>} resolves all known collection-versions
 */


function _removeAllOfCollection(rxDatabase, collectionName) {
  return rxDatabase.lockedRun(function () {
    return rxDatabase._collectionsPouch.allDocs({
      include_docs: true
    });
  }).then(function (data) {
    var relevantDocs = data.rows.map(function (row) {
      return row.doc;
    }).filter(function (doc) {
      var name = doc._id.split('-')[0];

      return name === collectionName;
    });
    return Promise.all(relevantDocs.map(function (doc) {
      return rxDatabase.lockedRun(function () {
        return rxDatabase._collectionsPouch.remove(doc);
      });
    })).then(function () {
      return relevantDocs.map(function (doc) {
        return doc.version;
      });
    });
  });
}

function _prepareBroadcastChannel(rxDatabase) {
  // broadcastChannel
  rxDatabase.broadcastChannel = new _broadcastChannel["default"]('RxDB:' + rxDatabase.name + ':' + 'socket');
  rxDatabase.broadcastChannel$ = new _rxjs.Subject();

  rxDatabase.broadcastChannel.onmessage = function (msg) {
    if (msg.st !== rxDatabase.storageToken) return; // not same storage-state

    if (msg.db === rxDatabase.token) return; // same db

    var changeEvent = _rxChangeEvent["default"].fromJSON(msg.d);

    rxDatabase.broadcastChannel$.next(changeEvent);
  }; // TODO only subscribe when sth is listening to the event-chain


  rxDatabase._subs.push(rxDatabase.broadcastChannel$.subscribe(function (cE) {
    rxDatabase.$emit(cE);
  }));
}
/**
 * do the async things for this database
 */


function prepare(_x5) {
  return _prepare.apply(this, arguments);
}

function _prepare() {
  _prepare = (0, _asyncToGenerator2["default"])(
  /*#__PURE__*/
  _regenerator["default"].mark(function _callee6(rxDatabase) {
    var _ref2, storageToken;

    return _regenerator["default"].wrap(function _callee6$(_context6) {
      while (1) {
        switch (_context6.prev = _context6.next) {
          case 0:
            rxDatabase._adminPouch = _internalAdminPouch(rxDatabase.name, rxDatabase.adapter, rxDatabase.pouchSettings);
            rxDatabase._collectionsPouch = _internalCollectionsPouch(rxDatabase.name, rxDatabase.adapter, rxDatabase.pouchSettings); // ensure admin-pouch is useable

            _context6.next = 4;
            return rxDatabase._adminPouch.info();

          case 4:
            _context6.next = 6;
            return Promise.all([_ensureStorageTokenExists(rxDatabase), _preparePasswordHash(rxDatabase)]);

          case 6:
            _ref2 = _context6.sent;
            storageToken = _ref2[0];
            rxDatabase.storageToken = storageToken;

            if (rxDatabase.multiInstance) {
              _prepareBroadcastChannel(rxDatabase);
            }

          case 10:
          case "end":
            return _context6.stop();
        }
      }
    }, _callee6);
  }));
  return _prepare.apply(this, arguments);
}

function create(_ref) {
  var name = _ref.name,
      adapter = _ref.adapter,
      password = _ref.password,
      _ref$multiInstance = _ref.multiInstance,
      multiInstance = _ref$multiInstance === void 0 ? true : _ref$multiInstance,
      _ref$queryChangeDetec = _ref.queryChangeDetection,
      queryChangeDetection = _ref$queryChangeDetec === void 0 ? false : _ref$queryChangeDetec,
      _ref$ignoreDuplicate = _ref.ignoreDuplicate,
      ignoreDuplicate = _ref$ignoreDuplicate === void 0 ? false : _ref$ignoreDuplicate,
      _ref$options = _ref.options,
      options = _ref$options === void 0 ? {} : _ref$options,
      _ref$pouchSettings = _ref.pouchSettings,
      pouchSettings = _ref$pouchSettings === void 0 ? {} : _ref$pouchSettings;
  (0, _util.validateCouchDBString)(name); // check if pouchdb-adapter

  if (typeof adapter === 'string') {
    if (!_pouchDb["default"].adapters || !_pouchDb["default"].adapters[adapter]) {
      throw _rxError["default"].newRxError('DB9', {
        adapter: adapter
      });
    }
  } else {
    (0, _util.isLevelDown)(adapter);

    if (!_pouchDb["default"].adapters || !_pouchDb["default"].adapters.leveldb) {
      throw _rxError["default"].newRxError('DB10', {
        adapter: adapter
      });
    }
  }

  if (password) {
    _overwritable["default"].validatePassword(password);
  } // check if combination already used


  if (!ignoreDuplicate) {
    _isNameAdapterUsed(name, adapter);
  } // add to used_map


  if (!USED_COMBINATIONS[name]) USED_COMBINATIONS[name] = [];
  USED_COMBINATIONS[name].push(adapter);
  var db = new RxDatabase(name, adapter, password, multiInstance, queryChangeDetection, options, pouchSettings);
  return prepare(db).then(function () {
    (0, _hooks.runPluginHooks)('createRxDatabase', db);
    return db;
  });
}

function getPouchLocation(dbName, collectionName, schemaVersion) {
  var prefix = dbName + '-rxdb-' + schemaVersion + '-';

  if (!collectionName.includes('/')) {
    return prefix + collectionName;
  } else {
    // if collectionName is a path, we have to prefix the last part only
    var split = collectionName.split('/');
    var last = split.pop();
    var ret = split.join('/');
    ret += '/' + prefix + last;
    return ret;
  }
}

function _spawnPouchDB2(dbName, adapter, collectionName, schemaVersion) {
  var pouchSettings = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : {};
  var pouchSettingsFromRxDatabaseCreator = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : {};
  var pouchLocation = getPouchLocation(dbName, collectionName, schemaVersion);
  var pouchDbParameters = {
    location: pouchLocation,
    adapter: (0, _util.adapterObject)(adapter),
    settings: pouchSettings
  };
  var pouchDBOptions = Object.assign({}, pouchDbParameters.adapter, pouchSettingsFromRxDatabaseCreator, pouchDbParameters.settings);
  (0, _hooks.runPluginHooks)('preCreatePouchDb', pouchDbParameters);
  return new _pouchDb["default"](pouchDbParameters.location, pouchDBOptions);
}

function _internalAdminPouch(name, adapter) {
  var pouchSettingsFromRxDatabaseCreator = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  return _spawnPouchDB2(name, adapter, '_admin', 0, {
    auto_compaction: false,
    // no compaction because this only stores local documents
    revs_limit: 1
  }, pouchSettingsFromRxDatabaseCreator);
}

function _internalCollectionsPouch(name, adapter) {
  var pouchSettingsFromRxDatabaseCreator = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  return _spawnPouchDB2(name, adapter, '_collections', 0, {
    auto_compaction: false,
    // no compaction because this only stores local documents
    revs_limit: 1
  }, pouchSettingsFromRxDatabaseCreator);
}
/**
 *
 * @return {Promise}
 */


function removeDatabase(_x6, _x7) {
  return _removeDatabase.apply(this, arguments);
}
/**
 * check is the given adapter can be used
 * @return {Promise}
 */


function _removeDatabase() {
  _removeDatabase = (0, _asyncToGenerator2["default"])(
  /*#__PURE__*/
  _regenerator["default"].mark(function _callee7(databaseName, adapter) {
    var adminPouch, collectionsPouch, collectionsData;
    return _regenerator["default"].wrap(function _callee7$(_context7) {
      while (1) {
        switch (_context7.prev = _context7.next) {
          case 0:
            adminPouch = _internalAdminPouch(databaseName, adapter);
            collectionsPouch = _internalCollectionsPouch(databaseName, adapter);
            _context7.next = 4;
            return collectionsPouch.allDocs({
              include_docs: true
            });

          case 4:
            collectionsData = _context7.sent;
            _context7.next = 7;
            return Promise.all(collectionsData.rows.map(function (colDoc) {
              return colDoc.id;
            }).map(function (id) {
              var split = id.split('-');
              var name = split[0];
              var version = parseInt(split[1], 10);

              var pouch = _spawnPouchDB2(databaseName, adapter, name, version);

              return pouch.destroy();
            }));

          case 7:
            return _context7.abrupt("return", Promise.all([collectionsPouch.destroy(), adminPouch.destroy()]));

          case 8:
          case "end":
            return _context7.stop();
        }
      }
    }, _callee7);
  }));
  return _removeDatabase.apply(this, arguments);
}

function checkAdapter(adapter) {
  return _overwritable["default"].checkAdapter(adapter);
}

function isInstanceOf(obj) {
  return obj instanceof RxDatabase;
}

function dbCount() {
  return DB_COUNT;
}

var _default = {
  create: create,
  removeDatabase: removeDatabase,
  checkAdapter: checkAdapter,
  isInstanceOf: isInstanceOf,
  RxDatabase: RxDatabase,
  RxSchema: _rxSchema["default"],
  dbCount: dbCount
};
exports["default"] = _default;
