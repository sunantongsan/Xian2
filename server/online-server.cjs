var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/ws/lib/constants.js
var require_constants = __commonJS({
  "node_modules/ws/lib/constants.js"(exports2, module2) {
    "use strict";
    var BINARY_TYPES = ["nodebuffer", "arraybuffer", "fragments"];
    var hasBlob = typeof Blob !== "undefined";
    if (hasBlob) BINARY_TYPES.push("blob");
    module2.exports = {
      BINARY_TYPES,
      CLOSE_TIMEOUT: 3e4,
      EMPTY_BUFFER: Buffer.alloc(0),
      GUID: "258EAFA5-E914-47DA-95CA-C5AB0DC85B11",
      hasBlob,
      kForOnEventAttribute: Symbol("kIsForOnEventAttribute"),
      kListener: Symbol("kListener"),
      kStatusCode: Symbol("status-code"),
      kWebSocket: Symbol("websocket"),
      NOOP: () => {
      }
    };
  }
});

// node_modules/ws/lib/buffer-util.js
var require_buffer_util = __commonJS({
  "node_modules/ws/lib/buffer-util.js"(exports2, module2) {
    "use strict";
    var { EMPTY_BUFFER } = require_constants();
    var FastBuffer = Buffer[Symbol.species];
    function concat(list, totalLength) {
      if (list.length === 0) return EMPTY_BUFFER;
      if (list.length === 1) return list[0];
      const target = Buffer.allocUnsafe(totalLength);
      let offset = 0;
      for (let i = 0; i < list.length; i++) {
        const buf = list[i];
        target.set(buf, offset);
        offset += buf.length;
      }
      if (offset < totalLength) {
        return new FastBuffer(target.buffer, target.byteOffset, offset);
      }
      return target;
    }
    function _mask(source, mask, output, offset, length) {
      for (let i = 0; i < length; i++) {
        output[offset + i] = source[i] ^ mask[i & 3];
      }
    }
    function _unmask(buffer, mask) {
      for (let i = 0; i < buffer.length; i++) {
        buffer[i] ^= mask[i & 3];
      }
    }
    function toArrayBuffer(buf) {
      if (buf.length === buf.buffer.byteLength) {
        return buf.buffer;
      }
      return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length);
    }
    function toBuffer(data) {
      toBuffer.readOnly = true;
      if (Buffer.isBuffer(data)) return data;
      let buf;
      if (data instanceof ArrayBuffer) {
        buf = new FastBuffer(data);
      } else if (ArrayBuffer.isView(data)) {
        buf = new FastBuffer(data.buffer, data.byteOffset, data.byteLength);
      } else {
        buf = Buffer.from(data);
        toBuffer.readOnly = false;
      }
      return buf;
    }
    module2.exports = {
      concat,
      mask: _mask,
      toArrayBuffer,
      toBuffer,
      unmask: _unmask
    };
    if (!process.env.WS_NO_BUFFER_UTIL) {
      try {
        const bufferUtil = require("bufferutil");
        module2.exports.mask = function(source, mask, output, offset, length) {
          if (length < 48) _mask(source, mask, output, offset, length);
          else bufferUtil.mask(source, mask, output, offset, length);
        };
        module2.exports.unmask = function(buffer, mask) {
          if (buffer.length < 32) _unmask(buffer, mask);
          else bufferUtil.unmask(buffer, mask);
        };
      } catch (e) {
      }
    }
  }
});

// node_modules/ws/lib/limiter.js
var require_limiter = __commonJS({
  "node_modules/ws/lib/limiter.js"(exports2, module2) {
    "use strict";
    var kDone = Symbol("kDone");
    var kRun = Symbol("kRun");
    var Limiter = class {
      /**
       * Creates a new `Limiter`.
       *
       * @param {Number} [concurrency=Infinity] The maximum number of jobs allowed
       *     to run concurrently
       */
      constructor(concurrency) {
        this[kDone] = () => {
          this.pending--;
          this[kRun]();
        };
        this.concurrency = concurrency || Infinity;
        this.jobs = [];
        this.pending = 0;
      }
      /**
       * Adds a job to the queue.
       *
       * @param {Function} job The job to run
       * @public
       */
      add(job) {
        this.jobs.push(job);
        this[kRun]();
      }
      /**
       * Removes a job from the queue and runs it if possible.
       *
       * @private
       */
      [kRun]() {
        if (this.pending === this.concurrency) return;
        if (this.jobs.length) {
          const job = this.jobs.shift();
          this.pending++;
          job(this[kDone]);
        }
      }
    };
    module2.exports = Limiter;
  }
});

// node_modules/ws/lib/permessage-deflate.js
var require_permessage_deflate = __commonJS({
  "node_modules/ws/lib/permessage-deflate.js"(exports2, module2) {
    "use strict";
    var zlib = require("zlib");
    var bufferUtil = require_buffer_util();
    var Limiter = require_limiter();
    var { kStatusCode } = require_constants();
    var FastBuffer = Buffer[Symbol.species];
    var TRAILER = Buffer.from([0, 0, 255, 255]);
    var kPerMessageDeflate = Symbol("permessage-deflate");
    var kTotalLength = Symbol("total-length");
    var kCallback = Symbol("callback");
    var kBuffers = Symbol("buffers");
    var kError = Symbol("error");
    var zlibLimiter;
    var PerMessageDeflate2 = class {
      /**
       * Creates a PerMessageDeflate instance.
       *
       * @param {Object} [options] Configuration options
       * @param {(Boolean|Number)} [options.clientMaxWindowBits] Advertise support
       *     for, or request, a custom client window size
       * @param {Boolean} [options.clientNoContextTakeover=false] Advertise/
       *     acknowledge disabling of client context takeover
       * @param {Number} [options.concurrencyLimit=10] The number of concurrent
       *     calls to zlib
       * @param {Boolean} [options.isServer=false] Create the instance in either
       *     server or client mode
       * @param {Number} [options.maxPayload=0] The maximum allowed message length
       * @param {(Boolean|Number)} [options.serverMaxWindowBits] Request/confirm the
       *     use of a custom server window size
       * @param {Boolean} [options.serverNoContextTakeover=false] Request/accept
       *     disabling of server context takeover
       * @param {Number} [options.threshold=1024] Size (in bytes) below which
       *     messages should not be compressed if context takeover is disabled
       * @param {Object} [options.zlibDeflateOptions] Options to pass to zlib on
       *     deflate
       * @param {Object} [options.zlibInflateOptions] Options to pass to zlib on
       *     inflate
       */
      constructor(options) {
        this._options = options || {};
        this._threshold = this._options.threshold !== void 0 ? this._options.threshold : 1024;
        this._maxPayload = this._options.maxPayload | 0;
        this._isServer = !!this._options.isServer;
        this._deflate = null;
        this._inflate = null;
        this.params = null;
        if (!zlibLimiter) {
          const concurrency = this._options.concurrencyLimit !== void 0 ? this._options.concurrencyLimit : 10;
          zlibLimiter = new Limiter(concurrency);
        }
      }
      /**
       * @type {String}
       */
      static get extensionName() {
        return "permessage-deflate";
      }
      /**
       * Create an extension negotiation offer.
       *
       * @return {Object} Extension parameters
       * @public
       */
      offer() {
        const params = {};
        if (this._options.serverNoContextTakeover) {
          params.server_no_context_takeover = true;
        }
        if (this._options.clientNoContextTakeover) {
          params.client_no_context_takeover = true;
        }
        if (this._options.serverMaxWindowBits) {
          params.server_max_window_bits = this._options.serverMaxWindowBits;
        }
        if (this._options.clientMaxWindowBits) {
          params.client_max_window_bits = this._options.clientMaxWindowBits;
        } else if (this._options.clientMaxWindowBits == null) {
          params.client_max_window_bits = true;
        }
        return params;
      }
      /**
       * Accept an extension negotiation offer/response.
       *
       * @param {Array} configurations The extension negotiation offers/reponse
       * @return {Object} Accepted configuration
       * @public
       */
      accept(configurations) {
        configurations = this.normalizeParams(configurations);
        this.params = this._isServer ? this.acceptAsServer(configurations) : this.acceptAsClient(configurations);
        return this.params;
      }
      /**
       * Releases all resources used by the extension.
       *
       * @public
       */
      cleanup() {
        if (this._inflate) {
          this._inflate.close();
          this._inflate = null;
        }
        if (this._deflate) {
          const callback = this._deflate[kCallback];
          this._deflate.close();
          this._deflate = null;
          if (callback) {
            callback(
              new Error(
                "The deflate stream was closed while data was being processed"
              )
            );
          }
        }
      }
      /**
       *  Accept an extension negotiation offer.
       *
       * @param {Array} offers The extension negotiation offers
       * @return {Object} Accepted configuration
       * @private
       */
      acceptAsServer(offers) {
        const opts = this._options;
        const accepted = offers.find((params) => {
          if (opts.serverNoContextTakeover === false && params.server_no_context_takeover || params.server_max_window_bits && (opts.serverMaxWindowBits === false || typeof opts.serverMaxWindowBits === "number" && opts.serverMaxWindowBits > params.server_max_window_bits) || typeof opts.clientMaxWindowBits === "number" && (typeof params.client_max_window_bits === "number" ? opts.clientMaxWindowBits > params.client_max_window_bits : !params.client_max_window_bits)) {
            return false;
          }
          return true;
        });
        if (!accepted) {
          throw new Error("None of the extension offers can be accepted");
        }
        if (opts.serverNoContextTakeover) {
          accepted.server_no_context_takeover = true;
        }
        if (opts.clientNoContextTakeover) {
          accepted.client_no_context_takeover = true;
        }
        if (typeof opts.serverMaxWindowBits === "number") {
          accepted.server_max_window_bits = opts.serverMaxWindowBits;
        }
        if (typeof opts.clientMaxWindowBits === "number") {
          accepted.client_max_window_bits = opts.clientMaxWindowBits;
        } else if (accepted.client_max_window_bits === true || opts.clientMaxWindowBits === false) {
          delete accepted.client_max_window_bits;
        }
        return accepted;
      }
      /**
       * Accept the extension negotiation response.
       *
       * @param {Array} response The extension negotiation response
       * @return {Object} Accepted configuration
       * @private
       */
      acceptAsClient(response) {
        const params = response[0];
        if (this._options.clientNoContextTakeover === false && params.client_no_context_takeover) {
          throw new Error('Unexpected parameter "client_no_context_takeover"');
        }
        if (!params.client_max_window_bits) {
          if (typeof this._options.clientMaxWindowBits === "number") {
            params.client_max_window_bits = this._options.clientMaxWindowBits;
          }
        } else if (this._options.clientMaxWindowBits === false || typeof this._options.clientMaxWindowBits === "number" && params.client_max_window_bits > this._options.clientMaxWindowBits) {
          throw new Error(
            'Unexpected or invalid parameter "client_max_window_bits"'
          );
        }
        return params;
      }
      /**
       * Normalize parameters.
       *
       * @param {Array} configurations The extension negotiation offers/reponse
       * @return {Array} The offers/response with normalized parameters
       * @private
       */
      normalizeParams(configurations) {
        configurations.forEach((params) => {
          Object.keys(params).forEach((key) => {
            let value = params[key];
            if (value.length > 1) {
              throw new Error(`Parameter "${key}" must have only a single value`);
            }
            value = value[0];
            if (key === "client_max_window_bits") {
              if (value !== true) {
                const num = +value;
                if (!Number.isInteger(num) || num < 8 || num > 15) {
                  throw new TypeError(
                    `Invalid value for parameter "${key}": ${value}`
                  );
                }
                value = num;
              } else if (!this._isServer) {
                throw new TypeError(
                  `Invalid value for parameter "${key}": ${value}`
                );
              }
            } else if (key === "server_max_window_bits") {
              const num = +value;
              if (!Number.isInteger(num) || num < 8 || num > 15) {
                throw new TypeError(
                  `Invalid value for parameter "${key}": ${value}`
                );
              }
              value = num;
            } else if (key === "client_no_context_takeover" || key === "server_no_context_takeover") {
              if (value !== true) {
                throw new TypeError(
                  `Invalid value for parameter "${key}": ${value}`
                );
              }
            } else {
              throw new Error(`Unknown parameter "${key}"`);
            }
            params[key] = value;
          });
        });
        return configurations;
      }
      /**
       * Decompress data. Concurrency limited.
       *
       * @param {Buffer} data Compressed data
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @public
       */
      decompress(data, fin, callback) {
        zlibLimiter.add((done) => {
          this._decompress(data, fin, (err, result) => {
            done();
            callback(err, result);
          });
        });
      }
      /**
       * Compress data. Concurrency limited.
       *
       * @param {(Buffer|String)} data Data to compress
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @public
       */
      compress(data, fin, callback) {
        zlibLimiter.add((done) => {
          this._compress(data, fin, (err, result) => {
            done();
            callback(err, result);
          });
        });
      }
      /**
       * Decompress data.
       *
       * @param {Buffer} data Compressed data
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @private
       */
      _decompress(data, fin, callback) {
        const endpoint = this._isServer ? "client" : "server";
        if (!this._inflate) {
          const key = `${endpoint}_max_window_bits`;
          const windowBits = typeof this.params[key] !== "number" ? zlib.Z_DEFAULT_WINDOWBITS : this.params[key];
          this._inflate = zlib.createInflateRaw({
            ...this._options.zlibInflateOptions,
            windowBits
          });
          this._inflate[kPerMessageDeflate] = this;
          this._inflate[kTotalLength] = 0;
          this._inflate[kBuffers] = [];
          this._inflate.on("error", inflateOnError);
          this._inflate.on("data", inflateOnData);
        }
        this._inflate[kCallback] = callback;
        this._inflate.write(data);
        if (fin) this._inflate.write(TRAILER);
        this._inflate.flush(() => {
          const err = this._inflate[kError];
          if (err) {
            this._inflate.close();
            this._inflate = null;
            callback(err);
            return;
          }
          const data2 = bufferUtil.concat(
            this._inflate[kBuffers],
            this._inflate[kTotalLength]
          );
          if (this._inflate._readableState.endEmitted) {
            this._inflate.close();
            this._inflate = null;
          } else {
            this._inflate[kTotalLength] = 0;
            this._inflate[kBuffers] = [];
            if (fin && this.params[`${endpoint}_no_context_takeover`]) {
              this._inflate.reset();
            }
          }
          callback(null, data2);
        });
      }
      /**
       * Compress data.
       *
       * @param {(Buffer|String)} data Data to compress
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @private
       */
      _compress(data, fin, callback) {
        const endpoint = this._isServer ? "server" : "client";
        if (!this._deflate) {
          const key = `${endpoint}_max_window_bits`;
          const windowBits = typeof this.params[key] !== "number" ? zlib.Z_DEFAULT_WINDOWBITS : this.params[key];
          this._deflate = zlib.createDeflateRaw({
            ...this._options.zlibDeflateOptions,
            windowBits
          });
          this._deflate[kTotalLength] = 0;
          this._deflate[kBuffers] = [];
          this._deflate.on("data", deflateOnData);
        }
        this._deflate[kCallback] = callback;
        this._deflate.write(data);
        this._deflate.flush(zlib.Z_SYNC_FLUSH, () => {
          if (!this._deflate) {
            return;
          }
          let data2 = bufferUtil.concat(
            this._deflate[kBuffers],
            this._deflate[kTotalLength]
          );
          if (fin) {
            data2 = new FastBuffer(data2.buffer, data2.byteOffset, data2.length - 4);
          }
          this._deflate[kCallback] = null;
          this._deflate[kTotalLength] = 0;
          this._deflate[kBuffers] = [];
          if (fin && this.params[`${endpoint}_no_context_takeover`]) {
            this._deflate.reset();
          }
          callback(null, data2);
        });
      }
    };
    module2.exports = PerMessageDeflate2;
    function deflateOnData(chunk) {
      this[kBuffers].push(chunk);
      this[kTotalLength] += chunk.length;
    }
    function inflateOnData(chunk) {
      this[kTotalLength] += chunk.length;
      if (this[kPerMessageDeflate]._maxPayload < 1 || this[kTotalLength] <= this[kPerMessageDeflate]._maxPayload) {
        this[kBuffers].push(chunk);
        return;
      }
      this[kError] = new RangeError("Max payload size exceeded");
      this[kError].code = "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH";
      this[kError][kStatusCode] = 1009;
      this.removeListener("data", inflateOnData);
      this.reset();
    }
    function inflateOnError(err) {
      this[kPerMessageDeflate]._inflate = null;
      if (this[kError]) {
        this[kCallback](this[kError]);
        return;
      }
      err[kStatusCode] = 1007;
      this[kCallback](err);
    }
  }
});

// node_modules/ws/lib/validation.js
var require_validation = __commonJS({
  "node_modules/ws/lib/validation.js"(exports2, module2) {
    "use strict";
    var { isUtf8 } = require("buffer");
    var { hasBlob } = require_constants();
    var tokenChars = [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      // 0 - 15
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      // 16 - 31
      0,
      1,
      0,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      1,
      1,
      0,
      1,
      1,
      0,
      // 32 - 47
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      // 48 - 63
      0,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      // 64 - 79
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      0,
      1,
      1,
      // 80 - 95
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      // 96 - 111
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      1,
      0,
      1,
      0
      // 112 - 127
    ];
    function isValidStatusCode(code) {
      return code >= 1e3 && code <= 1014 && code !== 1004 && code !== 1005 && code !== 1006 || code >= 3e3 && code <= 4999;
    }
    function _isValidUTF8(buf) {
      const len = buf.length;
      let i = 0;
      while (i < len) {
        if ((buf[i] & 128) === 0) {
          i++;
        } else if ((buf[i] & 224) === 192) {
          if (i + 1 === len || (buf[i + 1] & 192) !== 128 || (buf[i] & 254) === 192) {
            return false;
          }
          i += 2;
        } else if ((buf[i] & 240) === 224) {
          if (i + 2 >= len || (buf[i + 1] & 192) !== 128 || (buf[i + 2] & 192) !== 128 || buf[i] === 224 && (buf[i + 1] & 224) === 128 || // Overlong
          buf[i] === 237 && (buf[i + 1] & 224) === 160) {
            return false;
          }
          i += 3;
        } else if ((buf[i] & 248) === 240) {
          if (i + 3 >= len || (buf[i + 1] & 192) !== 128 || (buf[i + 2] & 192) !== 128 || (buf[i + 3] & 192) !== 128 || buf[i] === 240 && (buf[i + 1] & 240) === 128 || // Overlong
          buf[i] === 244 && buf[i + 1] > 143 || buf[i] > 244) {
            return false;
          }
          i += 4;
        } else {
          return false;
        }
      }
      return true;
    }
    function isBlob(value) {
      return hasBlob && typeof value === "object" && typeof value.arrayBuffer === "function" && typeof value.type === "string" && typeof value.stream === "function" && (value[Symbol.toStringTag] === "Blob" || value[Symbol.toStringTag] === "File");
    }
    module2.exports = {
      isBlob,
      isValidStatusCode,
      isValidUTF8: _isValidUTF8,
      tokenChars
    };
    if (isUtf8) {
      module2.exports.isValidUTF8 = function(buf) {
        return buf.length < 24 ? _isValidUTF8(buf) : isUtf8(buf);
      };
    } else if (!process.env.WS_NO_UTF_8_VALIDATE) {
      try {
        const isValidUTF8 = require("utf-8-validate");
        module2.exports.isValidUTF8 = function(buf) {
          return buf.length < 32 ? _isValidUTF8(buf) : isValidUTF8(buf);
        };
      } catch (e) {
      }
    }
  }
});

// node_modules/ws/lib/receiver.js
var require_receiver = __commonJS({
  "node_modules/ws/lib/receiver.js"(exports2, module2) {
    "use strict";
    var { Writable } = require("stream");
    var PerMessageDeflate2 = require_permessage_deflate();
    var {
      BINARY_TYPES,
      EMPTY_BUFFER,
      kStatusCode,
      kWebSocket
    } = require_constants();
    var { concat, toArrayBuffer, unmask } = require_buffer_util();
    var { isValidStatusCode, isValidUTF8 } = require_validation();
    var FastBuffer = Buffer[Symbol.species];
    var GET_INFO = 0;
    var GET_PAYLOAD_LENGTH_16 = 1;
    var GET_PAYLOAD_LENGTH_64 = 2;
    var GET_MASK = 3;
    var GET_DATA = 4;
    var INFLATING = 5;
    var DEFER_EVENT = 6;
    var Receiver2 = class extends Writable {
      /**
       * Creates a Receiver instance.
       *
       * @param {Object} [options] Options object
       * @param {Boolean} [options.allowSynchronousEvents=true] Specifies whether
       *     any of the `'message'`, `'ping'`, and `'pong'` events can be emitted
       *     multiple times in the same tick
       * @param {String} [options.binaryType=nodebuffer] The type for binary data
       * @param {Object} [options.extensions] An object containing the negotiated
       *     extensions
       * @param {Boolean} [options.isServer=false] Specifies whether to operate in
       *     client or server mode
       * @param {Number} [options.maxBufferedChunks=0] The maximum number of
       *     buffered data chunks
       * @param {Number} [options.maxFragments=0] The maximum number of message
       *     fragments
       * @param {Number} [options.maxPayload=0] The maximum allowed message length
       * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
       *     not to skip UTF-8 validation for text and close messages
       */
      constructor(options = {}) {
        super();
        this._allowSynchronousEvents = options.allowSynchronousEvents !== void 0 ? options.allowSynchronousEvents : true;
        this._binaryType = options.binaryType || BINARY_TYPES[0];
        this._extensions = options.extensions || {};
        this._isServer = !!options.isServer;
        this._maxBufferedChunks = options.maxBufferedChunks | 0;
        this._maxFragments = options.maxFragments | 0;
        this._maxPayload = options.maxPayload | 0;
        this._skipUTF8Validation = !!options.skipUTF8Validation;
        this[kWebSocket] = void 0;
        this._bufferedBytes = 0;
        this._buffers = [];
        this._compressed = false;
        this._payloadLength = 0;
        this._mask = void 0;
        this._fragmented = 0;
        this._masked = false;
        this._fin = false;
        this._opcode = 0;
        this._totalPayloadLength = 0;
        this._messageLength = 0;
        this._numFragments = 0;
        this._fragments = [];
        this._errored = false;
        this._loop = false;
        this._state = GET_INFO;
      }
      /**
       * Implements `Writable.prototype._write()`.
       *
       * @param {Buffer} chunk The chunk of data to write
       * @param {String} encoding The character encoding of `chunk`
       * @param {Function} cb Callback
       * @private
       */
      _write(chunk, encoding, cb) {
        if (this._opcode === 8 && this._state == GET_INFO) return cb();
        if (this._maxBufferedChunks > 0 && this._buffers.length >= this._maxBufferedChunks) {
          cb(
            this.createError(
              RangeError,
              "Too many buffered chunks",
              false,
              1008,
              "WS_ERR_TOO_MANY_BUFFERED_PARTS"
            )
          );
          return;
        }
        this._bufferedBytes += chunk.length;
        this._buffers.push(chunk);
        this.startLoop(cb);
      }
      /**
       * Consumes `n` bytes from the buffered data.
       *
       * @param {Number} n The number of bytes to consume
       * @return {Buffer} The consumed bytes
       * @private
       */
      consume(n) {
        this._bufferedBytes -= n;
        if (n === this._buffers[0].length) return this._buffers.shift();
        if (n < this._buffers[0].length) {
          const buf = this._buffers[0];
          this._buffers[0] = new FastBuffer(
            buf.buffer,
            buf.byteOffset + n,
            buf.length - n
          );
          return new FastBuffer(buf.buffer, buf.byteOffset, n);
        }
        const dst = Buffer.allocUnsafe(n);
        do {
          const buf = this._buffers[0];
          const offset = dst.length - n;
          if (n >= buf.length) {
            dst.set(this._buffers.shift(), offset);
          } else {
            dst.set(new Uint8Array(buf.buffer, buf.byteOffset, n), offset);
            this._buffers[0] = new FastBuffer(
              buf.buffer,
              buf.byteOffset + n,
              buf.length - n
            );
          }
          n -= buf.length;
        } while (n > 0);
        return dst;
      }
      /**
       * Starts the parsing loop.
       *
       * @param {Function} cb Callback
       * @private
       */
      startLoop(cb) {
        this._loop = true;
        do {
          switch (this._state) {
            case GET_INFO:
              this.getInfo(cb);
              break;
            case GET_PAYLOAD_LENGTH_16:
              this.getPayloadLength16(cb);
              break;
            case GET_PAYLOAD_LENGTH_64:
              this.getPayloadLength64(cb);
              break;
            case GET_MASK:
              this.getMask();
              break;
            case GET_DATA:
              this.getData(cb);
              break;
            case INFLATING:
            case DEFER_EVENT:
              this._loop = false;
              return;
          }
        } while (this._loop);
        if (!this._errored) cb();
      }
      /**
       * Reads the first two bytes of a frame.
       *
       * @param {Function} cb Callback
       * @private
       */
      getInfo(cb) {
        if (this._bufferedBytes < 2) {
          this._loop = false;
          return;
        }
        const buf = this.consume(2);
        if ((buf[0] & 48) !== 0) {
          const error = this.createError(
            RangeError,
            "RSV2 and RSV3 must be clear",
            true,
            1002,
            "WS_ERR_UNEXPECTED_RSV_2_3"
          );
          cb(error);
          return;
        }
        const compressed = (buf[0] & 64) === 64;
        if (compressed && !this._extensions[PerMessageDeflate2.extensionName]) {
          const error = this.createError(
            RangeError,
            "RSV1 must be clear",
            true,
            1002,
            "WS_ERR_UNEXPECTED_RSV_1"
          );
          cb(error);
          return;
        }
        this._fin = (buf[0] & 128) === 128;
        this._opcode = buf[0] & 15;
        this._payloadLength = buf[1] & 127;
        if (this._opcode === 0) {
          if (compressed) {
            const error = this.createError(
              RangeError,
              "RSV1 must be clear",
              true,
              1002,
              "WS_ERR_UNEXPECTED_RSV_1"
            );
            cb(error);
            return;
          }
          if (!this._fragmented) {
            const error = this.createError(
              RangeError,
              "invalid opcode 0",
              true,
              1002,
              "WS_ERR_INVALID_OPCODE"
            );
            cb(error);
            return;
          }
          this._opcode = this._fragmented;
        } else if (this._opcode === 1 || this._opcode === 2) {
          if (this._fragmented) {
            const error = this.createError(
              RangeError,
              `invalid opcode ${this._opcode}`,
              true,
              1002,
              "WS_ERR_INVALID_OPCODE"
            );
            cb(error);
            return;
          }
          this._compressed = compressed;
        } else if (this._opcode > 7 && this._opcode < 11) {
          if (!this._fin) {
            const error = this.createError(
              RangeError,
              "FIN must be set",
              true,
              1002,
              "WS_ERR_EXPECTED_FIN"
            );
            cb(error);
            return;
          }
          if (compressed) {
            const error = this.createError(
              RangeError,
              "RSV1 must be clear",
              true,
              1002,
              "WS_ERR_UNEXPECTED_RSV_1"
            );
            cb(error);
            return;
          }
          if (this._payloadLength > 125 || this._opcode === 8 && this._payloadLength === 1) {
            const error = this.createError(
              RangeError,
              `invalid payload length ${this._payloadLength}`,
              true,
              1002,
              "WS_ERR_INVALID_CONTROL_PAYLOAD_LENGTH"
            );
            cb(error);
            return;
          }
        } else {
          const error = this.createError(
            RangeError,
            `invalid opcode ${this._opcode}`,
            true,
            1002,
            "WS_ERR_INVALID_OPCODE"
          );
          cb(error);
          return;
        }
        if (!this._fin && !this._fragmented) this._fragmented = this._opcode;
        this._masked = (buf[1] & 128) === 128;
        if (this._isServer) {
          if (!this._masked) {
            const error = this.createError(
              RangeError,
              "MASK must be set",
              true,
              1002,
              "WS_ERR_EXPECTED_MASK"
            );
            cb(error);
            return;
          }
        } else if (this._masked) {
          const error = this.createError(
            RangeError,
            "MASK must be clear",
            true,
            1002,
            "WS_ERR_UNEXPECTED_MASK"
          );
          cb(error);
          return;
        }
        if (this._payloadLength === 126) this._state = GET_PAYLOAD_LENGTH_16;
        else if (this._payloadLength === 127) this._state = GET_PAYLOAD_LENGTH_64;
        else this.haveLength(cb);
      }
      /**
       * Gets extended payload length (7+16).
       *
       * @param {Function} cb Callback
       * @private
       */
      getPayloadLength16(cb) {
        if (this._bufferedBytes < 2) {
          this._loop = false;
          return;
        }
        this._payloadLength = this.consume(2).readUInt16BE(0);
        this.haveLength(cb);
      }
      /**
       * Gets extended payload length (7+64).
       *
       * @param {Function} cb Callback
       * @private
       */
      getPayloadLength64(cb) {
        if (this._bufferedBytes < 8) {
          this._loop = false;
          return;
        }
        const buf = this.consume(8);
        const num = buf.readUInt32BE(0);
        if (num > Math.pow(2, 53 - 32) - 1) {
          const error = this.createError(
            RangeError,
            "Unsupported WebSocket frame: payload length > 2^53 - 1",
            false,
            1009,
            "WS_ERR_UNSUPPORTED_DATA_PAYLOAD_LENGTH"
          );
          cb(error);
          return;
        }
        this._payloadLength = num * Math.pow(2, 32) + buf.readUInt32BE(4);
        this.haveLength(cb);
      }
      /**
       * Payload length has been read.
       *
       * @param {Function} cb Callback
       * @private
       */
      haveLength(cb) {
        if (this._payloadLength && this._opcode < 8) {
          this._totalPayloadLength += this._payloadLength;
          if (this._totalPayloadLength > this._maxPayload && this._maxPayload > 0) {
            const error = this.createError(
              RangeError,
              "Max payload size exceeded",
              false,
              1009,
              "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH"
            );
            cb(error);
            return;
          }
        }
        if (this._masked) this._state = GET_MASK;
        else this._state = GET_DATA;
      }
      /**
       * Reads mask bytes.
       *
       * @private
       */
      getMask() {
        if (this._bufferedBytes < 4) {
          this._loop = false;
          return;
        }
        this._mask = this.consume(4);
        this._state = GET_DATA;
      }
      /**
       * Reads data bytes.
       *
       * @param {Function} cb Callback
       * @private
       */
      getData(cb) {
        let data = EMPTY_BUFFER;
        if (this._payloadLength) {
          if (this._bufferedBytes < this._payloadLength) {
            this._loop = false;
            return;
          }
          data = this.consume(this._payloadLength);
          if (this._masked && (this._mask[0] | this._mask[1] | this._mask[2] | this._mask[3]) !== 0) {
            unmask(data, this._mask);
          }
        }
        if (this._opcode > 7) {
          this.controlMessage(data, cb);
          return;
        }
        if (this._maxFragments > 0 && ++this._numFragments > this._maxFragments) {
          const error = this.createError(
            RangeError,
            "Too many message fragments",
            false,
            1008,
            "WS_ERR_TOO_MANY_BUFFERED_PARTS"
          );
          cb(error);
          return;
        }
        if (this._compressed) {
          this._state = INFLATING;
          this.decompress(data, cb);
          return;
        }
        if (data.length) {
          this._messageLength = this._totalPayloadLength;
          this._fragments.push(data);
        }
        this.dataMessage(cb);
      }
      /**
       * Decompresses data.
       *
       * @param {Buffer} data Compressed data
       * @param {Function} cb Callback
       * @private
       */
      decompress(data, cb) {
        const perMessageDeflate = this._extensions[PerMessageDeflate2.extensionName];
        perMessageDeflate.decompress(data, this._fin, (err, buf) => {
          if (err) return cb(err);
          if (buf.length) {
            this._messageLength += buf.length;
            if (this._messageLength > this._maxPayload && this._maxPayload > 0) {
              const error = this.createError(
                RangeError,
                "Max payload size exceeded",
                false,
                1009,
                "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH"
              );
              cb(error);
              return;
            }
            this._fragments.push(buf);
          }
          this.dataMessage(cb);
          if (this._state === GET_INFO) this.startLoop(cb);
        });
      }
      /**
       * Handles a data message.
       *
       * @param {Function} cb Callback
       * @private
       */
      dataMessage(cb) {
        if (!this._fin) {
          this._state = GET_INFO;
          return;
        }
        const messageLength = this._messageLength;
        const fragments = this._fragments;
        this._totalPayloadLength = 0;
        this._messageLength = 0;
        this._fragmented = 0;
        this._numFragments = 0;
        this._fragments = [];
        if (this._opcode === 2) {
          let data;
          if (this._binaryType === "nodebuffer") {
            data = concat(fragments, messageLength);
          } else if (this._binaryType === "arraybuffer") {
            data = toArrayBuffer(concat(fragments, messageLength));
          } else if (this._binaryType === "blob") {
            data = new Blob(fragments);
          } else {
            data = fragments;
          }
          if (this._allowSynchronousEvents) {
            this.emit("message", data, true);
            this._state = GET_INFO;
          } else {
            this._state = DEFER_EVENT;
            setImmediate(() => {
              this.emit("message", data, true);
              this._state = GET_INFO;
              this.startLoop(cb);
            });
          }
        } else {
          const buf = concat(fragments, messageLength);
          if (!this._skipUTF8Validation && !isValidUTF8(buf)) {
            const error = this.createError(
              Error,
              "invalid UTF-8 sequence",
              true,
              1007,
              "WS_ERR_INVALID_UTF8"
            );
            cb(error);
            return;
          }
          if (this._state === INFLATING || this._allowSynchronousEvents) {
            this.emit("message", buf, false);
            this._state = GET_INFO;
          } else {
            this._state = DEFER_EVENT;
            setImmediate(() => {
              this.emit("message", buf, false);
              this._state = GET_INFO;
              this.startLoop(cb);
            });
          }
        }
      }
      /**
       * Handles a control message.
       *
       * @param {Buffer} data Data to handle
       * @return {(Error|RangeError|undefined)} A possible error
       * @private
       */
      controlMessage(data, cb) {
        if (this._opcode === 8) {
          if (data.length === 0) {
            this._loop = false;
            this.emit("conclude", 1005, EMPTY_BUFFER);
            this.end();
          } else {
            const code = data.readUInt16BE(0);
            if (!isValidStatusCode(code)) {
              const error = this.createError(
                RangeError,
                `invalid status code ${code}`,
                true,
                1002,
                "WS_ERR_INVALID_CLOSE_CODE"
              );
              cb(error);
              return;
            }
            const buf = new FastBuffer(
              data.buffer,
              data.byteOffset + 2,
              data.length - 2
            );
            if (!this._skipUTF8Validation && !isValidUTF8(buf)) {
              const error = this.createError(
                Error,
                "invalid UTF-8 sequence",
                true,
                1007,
                "WS_ERR_INVALID_UTF8"
              );
              cb(error);
              return;
            }
            this._loop = false;
            this.emit("conclude", code, buf);
            this.end();
          }
          this._state = GET_INFO;
          return;
        }
        if (this._allowSynchronousEvents) {
          this.emit(this._opcode === 9 ? "ping" : "pong", data);
          this._state = GET_INFO;
        } else {
          this._state = DEFER_EVENT;
          setImmediate(() => {
            this.emit(this._opcode === 9 ? "ping" : "pong", data);
            this._state = GET_INFO;
            this.startLoop(cb);
          });
        }
      }
      /**
       * Builds an error object.
       *
       * @param {function(new:Error|RangeError)} ErrorCtor The error constructor
       * @param {String} message The error message
       * @param {Boolean} prefix Specifies whether or not to add a default prefix to
       *     `message`
       * @param {Number} statusCode The status code
       * @param {String} errorCode The exposed error code
       * @return {(Error|RangeError)} The error
       * @private
       */
      createError(ErrorCtor, message, prefix, statusCode, errorCode) {
        this._loop = false;
        this._errored = true;
        const err = new ErrorCtor(
          prefix ? `Invalid WebSocket frame: ${message}` : message
        );
        Error.captureStackTrace(err, this.createError);
        err.code = errorCode;
        err[kStatusCode] = statusCode;
        return err;
      }
    };
    module2.exports = Receiver2;
  }
});

// node_modules/ws/lib/sender.js
var require_sender = __commonJS({
  "node_modules/ws/lib/sender.js"(exports2, module2) {
    "use strict";
    var { Duplex } = require("stream");
    var { randomFillSync } = require("crypto");
    var {
      types: { isUint8Array }
    } = require("util");
    var PerMessageDeflate2 = require_permessage_deflate();
    var { EMPTY_BUFFER, kWebSocket, NOOP } = require_constants();
    var { isBlob, isValidStatusCode } = require_validation();
    var { mask: applyMask, toBuffer } = require_buffer_util();
    var kByteLength = Symbol("kByteLength");
    var maskBuffer = Buffer.alloc(4);
    var RANDOM_POOL_SIZE = 8 * 1024;
    var randomPool;
    var randomPoolPointer = RANDOM_POOL_SIZE;
    var DEFAULT = 0;
    var DEFLATING = 1;
    var GET_BLOB_DATA = 2;
    var Sender2 = class _Sender {
      /**
       * Creates a Sender instance.
       *
       * @param {Duplex} socket The connection socket
       * @param {Object} [extensions] An object containing the negotiated extensions
       * @param {Function} [generateMask] The function used to generate the masking
       *     key
       */
      constructor(socket, extensions, generateMask) {
        this._extensions = extensions || {};
        if (generateMask) {
          this._generateMask = generateMask;
          this._maskBuffer = Buffer.alloc(4);
        }
        this._socket = socket;
        this._firstFragment = true;
        this._compress = false;
        this._bufferedBytes = 0;
        this._queue = [];
        this._state = DEFAULT;
        this.onerror = NOOP;
        this[kWebSocket] = void 0;
      }
      /**
       * Frames a piece of data according to the HyBi WebSocket protocol.
       *
       * @param {(Buffer|String)} data The data to frame
       * @param {Object} options Options object
       * @param {Boolean} [options.fin=false] Specifies whether or not to set the
       *     FIN bit
       * @param {Function} [options.generateMask] The function used to generate the
       *     masking key
       * @param {Boolean} [options.mask=false] Specifies whether or not to mask
       *     `data`
       * @param {Buffer} [options.maskBuffer] The buffer used to store the masking
       *     key
       * @param {Number} options.opcode The opcode
       * @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
       *     modified
       * @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
       *     RSV1 bit
       * @return {(Buffer|String)[]} The framed data
       * @public
       */
      static frame(data, options) {
        let mask;
        let merge = false;
        let offset = 2;
        let skipMasking = false;
        if (options.mask) {
          mask = options.maskBuffer || maskBuffer;
          if (options.generateMask) {
            options.generateMask(mask);
          } else {
            if (randomPoolPointer === RANDOM_POOL_SIZE) {
              if (randomPool === void 0) {
                randomPool = Buffer.alloc(RANDOM_POOL_SIZE);
              }
              randomFillSync(randomPool, 0, RANDOM_POOL_SIZE);
              randomPoolPointer = 0;
            }
            mask[0] = randomPool[randomPoolPointer++];
            mask[1] = randomPool[randomPoolPointer++];
            mask[2] = randomPool[randomPoolPointer++];
            mask[3] = randomPool[randomPoolPointer++];
          }
          skipMasking = (mask[0] | mask[1] | mask[2] | mask[3]) === 0;
          offset = 6;
        }
        let dataLength;
        if (typeof data === "string") {
          if ((!options.mask || skipMasking) && options[kByteLength] !== void 0) {
            dataLength = options[kByteLength];
          } else {
            data = Buffer.from(data);
            dataLength = data.length;
          }
        } else {
          dataLength = data.length;
          merge = options.mask && options.readOnly && !skipMasking;
        }
        let payloadLength = dataLength;
        if (dataLength >= 65536) {
          offset += 8;
          payloadLength = 127;
        } else if (dataLength > 125) {
          offset += 2;
          payloadLength = 126;
        }
        const target = Buffer.allocUnsafe(merge ? dataLength + offset : offset);
        target[0] = options.fin ? options.opcode | 128 : options.opcode;
        if (options.rsv1) target[0] |= 64;
        target[1] = payloadLength;
        if (payloadLength === 126) {
          target.writeUInt16BE(dataLength, 2);
        } else if (payloadLength === 127) {
          target[2] = target[3] = 0;
          target.writeUIntBE(dataLength, 4, 6);
        }
        if (!options.mask) return [target, data];
        target[1] |= 128;
        target[offset - 4] = mask[0];
        target[offset - 3] = mask[1];
        target[offset - 2] = mask[2];
        target[offset - 1] = mask[3];
        if (skipMasking) return [target, data];
        if (merge) {
          applyMask(data, mask, target, offset, dataLength);
          return [target];
        }
        applyMask(data, mask, data, 0, dataLength);
        return [target, data];
      }
      /**
       * Sends a close message to the other peer.
       *
       * @param {Number} [code] The status code component of the body
       * @param {(String|Buffer)} [data] The message component of the body
       * @param {Boolean} [mask=false] Specifies whether or not to mask the message
       * @param {Function} [cb] Callback
       * @public
       */
      close(code, data, mask, cb) {
        let buf;
        if (code === void 0) {
          buf = EMPTY_BUFFER;
        } else if (typeof code !== "number" || !isValidStatusCode(code)) {
          throw new TypeError("First argument must be a valid error code number");
        } else if (data === void 0 || !data.length) {
          buf = Buffer.allocUnsafe(2);
          buf.writeUInt16BE(code, 0);
        } else {
          const length = Buffer.byteLength(data);
          if (length > 123) {
            throw new RangeError("The message must not be greater than 123 bytes");
          }
          buf = Buffer.allocUnsafe(2 + length);
          buf.writeUInt16BE(code, 0);
          if (typeof data === "string") {
            buf.write(data, 2);
          } else if (isUint8Array(data)) {
            buf.set(data, 2);
          } else {
            throw new TypeError("Second argument must be a string or a Uint8Array");
          }
        }
        const options = {
          [kByteLength]: buf.length,
          fin: true,
          generateMask: this._generateMask,
          mask,
          maskBuffer: this._maskBuffer,
          opcode: 8,
          readOnly: false,
          rsv1: false
        };
        if (this._state !== DEFAULT) {
          this.enqueue([this.dispatch, buf, false, options, cb]);
        } else {
          this.sendFrame(_Sender.frame(buf, options), cb);
        }
      }
      /**
       * Sends a ping message to the other peer.
       *
       * @param {*} data The message to send
       * @param {Boolean} [mask=false] Specifies whether or not to mask `data`
       * @param {Function} [cb] Callback
       * @public
       */
      ping(data, mask, cb) {
        let byteLength;
        let readOnly;
        if (typeof data === "string") {
          byteLength = Buffer.byteLength(data);
          readOnly = false;
        } else if (isBlob(data)) {
          byteLength = data.size;
          readOnly = false;
        } else {
          data = toBuffer(data);
          byteLength = data.length;
          readOnly = toBuffer.readOnly;
        }
        if (byteLength > 125) {
          throw new RangeError("The data size must not be greater than 125 bytes");
        }
        const options = {
          [kByteLength]: byteLength,
          fin: true,
          generateMask: this._generateMask,
          mask,
          maskBuffer: this._maskBuffer,
          opcode: 9,
          readOnly,
          rsv1: false
        };
        if (isBlob(data)) {
          if (this._state !== DEFAULT) {
            this.enqueue([this.getBlobData, data, false, options, cb]);
          } else {
            this.getBlobData(data, false, options, cb);
          }
        } else if (this._state !== DEFAULT) {
          this.enqueue([this.dispatch, data, false, options, cb]);
        } else {
          this.sendFrame(_Sender.frame(data, options), cb);
        }
      }
      /**
       * Sends a pong message to the other peer.
       *
       * @param {*} data The message to send
       * @param {Boolean} [mask=false] Specifies whether or not to mask `data`
       * @param {Function} [cb] Callback
       * @public
       */
      pong(data, mask, cb) {
        let byteLength;
        let readOnly;
        if (typeof data === "string") {
          byteLength = Buffer.byteLength(data);
          readOnly = false;
        } else if (isBlob(data)) {
          byteLength = data.size;
          readOnly = false;
        } else {
          data = toBuffer(data);
          byteLength = data.length;
          readOnly = toBuffer.readOnly;
        }
        if (byteLength > 125) {
          throw new RangeError("The data size must not be greater than 125 bytes");
        }
        const options = {
          [kByteLength]: byteLength,
          fin: true,
          generateMask: this._generateMask,
          mask,
          maskBuffer: this._maskBuffer,
          opcode: 10,
          readOnly,
          rsv1: false
        };
        if (isBlob(data)) {
          if (this._state !== DEFAULT) {
            this.enqueue([this.getBlobData, data, false, options, cb]);
          } else {
            this.getBlobData(data, false, options, cb);
          }
        } else if (this._state !== DEFAULT) {
          this.enqueue([this.dispatch, data, false, options, cb]);
        } else {
          this.sendFrame(_Sender.frame(data, options), cb);
        }
      }
      /**
       * Sends a data message to the other peer.
       *
       * @param {*} data The message to send
       * @param {Object} options Options object
       * @param {Boolean} [options.binary=false] Specifies whether `data` is binary
       *     or text
       * @param {Boolean} [options.compress=false] Specifies whether or not to
       *     compress `data`
       * @param {Boolean} [options.fin=false] Specifies whether the fragment is the
       *     last one
       * @param {Boolean} [options.mask=false] Specifies whether or not to mask
       *     `data`
       * @param {Function} [cb] Callback
       * @public
       */
      send(data, options, cb) {
        const perMessageDeflate = this._extensions[PerMessageDeflate2.extensionName];
        let opcode = options.binary ? 2 : 1;
        let rsv1 = options.compress;
        let byteLength;
        let readOnly;
        if (typeof data === "string") {
          byteLength = Buffer.byteLength(data);
          readOnly = false;
        } else if (isBlob(data)) {
          byteLength = data.size;
          readOnly = false;
        } else {
          data = toBuffer(data);
          byteLength = data.length;
          readOnly = toBuffer.readOnly;
        }
        if (this._firstFragment) {
          this._firstFragment = false;
          if (rsv1 && perMessageDeflate && perMessageDeflate.params[perMessageDeflate._isServer ? "server_no_context_takeover" : "client_no_context_takeover"]) {
            rsv1 = byteLength >= perMessageDeflate._threshold;
          }
          this._compress = rsv1;
        } else {
          rsv1 = false;
          opcode = 0;
        }
        if (options.fin) this._firstFragment = true;
        const opts = {
          [kByteLength]: byteLength,
          fin: options.fin,
          generateMask: this._generateMask,
          mask: options.mask,
          maskBuffer: this._maskBuffer,
          opcode,
          readOnly,
          rsv1
        };
        if (isBlob(data)) {
          if (this._state !== DEFAULT) {
            this.enqueue([this.getBlobData, data, this._compress, opts, cb]);
          } else {
            this.getBlobData(data, this._compress, opts, cb);
          }
        } else if (this._state !== DEFAULT) {
          this.enqueue([this.dispatch, data, this._compress, opts, cb]);
        } else {
          this.dispatch(data, this._compress, opts, cb);
        }
      }
      /**
       * Gets the contents of a blob as binary data.
       *
       * @param {Blob} blob The blob
       * @param {Boolean} [compress=false] Specifies whether or not to compress
       *     the data
       * @param {Object} options Options object
       * @param {Boolean} [options.fin=false] Specifies whether or not to set the
       *     FIN bit
       * @param {Function} [options.generateMask] The function used to generate the
       *     masking key
       * @param {Boolean} [options.mask=false] Specifies whether or not to mask
       *     `data`
       * @param {Buffer} [options.maskBuffer] The buffer used to store the masking
       *     key
       * @param {Number} options.opcode The opcode
       * @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
       *     modified
       * @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
       *     RSV1 bit
       * @param {Function} [cb] Callback
       * @private
       */
      getBlobData(blob, compress, options, cb) {
        this._bufferedBytes += options[kByteLength];
        this._state = GET_BLOB_DATA;
        blob.arrayBuffer().then((arrayBuffer) => {
          if (this._socket.destroyed) {
            const err = new Error(
              "The socket was closed while the blob was being read"
            );
            process.nextTick(callCallbacks, this, err, cb);
            return;
          }
          this._bufferedBytes -= options[kByteLength];
          const data = toBuffer(arrayBuffer);
          if (!compress) {
            this._state = DEFAULT;
            this.sendFrame(_Sender.frame(data, options), cb);
            this.dequeue();
          } else {
            this.dispatch(data, compress, options, cb);
          }
        }).catch((err) => {
          process.nextTick(onError, this, err, cb);
        });
      }
      /**
       * Dispatches a message.
       *
       * @param {(Buffer|String)} data The message to send
       * @param {Boolean} [compress=false] Specifies whether or not to compress
       *     `data`
       * @param {Object} options Options object
       * @param {Boolean} [options.fin=false] Specifies whether or not to set the
       *     FIN bit
       * @param {Function} [options.generateMask] The function used to generate the
       *     masking key
       * @param {Boolean} [options.mask=false] Specifies whether or not to mask
       *     `data`
       * @param {Buffer} [options.maskBuffer] The buffer used to store the masking
       *     key
       * @param {Number} options.opcode The opcode
       * @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
       *     modified
       * @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
       *     RSV1 bit
       * @param {Function} [cb] Callback
       * @private
       */
      dispatch(data, compress, options, cb) {
        if (!compress) {
          this.sendFrame(_Sender.frame(data, options), cb);
          return;
        }
        const perMessageDeflate = this._extensions[PerMessageDeflate2.extensionName];
        this._bufferedBytes += options[kByteLength];
        this._state = DEFLATING;
        perMessageDeflate.compress(data, options.fin, (_, buf) => {
          if (this._socket.destroyed) {
            const err = new Error(
              "The socket was closed while data was being compressed"
            );
            callCallbacks(this, err, cb);
            return;
          }
          this._bufferedBytes -= options[kByteLength];
          this._state = DEFAULT;
          options.readOnly = false;
          this.sendFrame(_Sender.frame(buf, options), cb);
          this.dequeue();
        });
      }
      /**
       * Executes queued send operations.
       *
       * @private
       */
      dequeue() {
        while (this._state === DEFAULT && this._queue.length) {
          const params = this._queue.shift();
          this._bufferedBytes -= params[3][kByteLength];
          Reflect.apply(params[0], this, params.slice(1));
        }
      }
      /**
       * Enqueues a send operation.
       *
       * @param {Array} params Send operation parameters.
       * @private
       */
      enqueue(params) {
        this._bufferedBytes += params[3][kByteLength];
        this._queue.push(params);
      }
      /**
       * Sends a frame.
       *
       * @param {(Buffer | String)[]} list The frame to send
       * @param {Function} [cb] Callback
       * @private
       */
      sendFrame(list, cb) {
        if (list.length === 2) {
          this._socket.cork();
          this._socket.write(list[0]);
          this._socket.write(list[1], cb);
          this._socket.uncork();
        } else {
          this._socket.write(list[0], cb);
        }
      }
    };
    module2.exports = Sender2;
    function callCallbacks(sender, err, cb) {
      if (typeof cb === "function") cb(err);
      for (let i = 0; i < sender._queue.length; i++) {
        const params = sender._queue[i];
        const callback = params[params.length - 1];
        if (typeof callback === "function") callback(err);
      }
    }
    function onError(sender, err, cb) {
      callCallbacks(sender, err, cb);
      sender.onerror(err);
    }
  }
});

// node_modules/ws/lib/event-target.js
var require_event_target = __commonJS({
  "node_modules/ws/lib/event-target.js"(exports2, module2) {
    "use strict";
    var { kForOnEventAttribute, kListener } = require_constants();
    var kCode = Symbol("kCode");
    var kData = Symbol("kData");
    var kError = Symbol("kError");
    var kMessage = Symbol("kMessage");
    var kReason = Symbol("kReason");
    var kTarget = Symbol("kTarget");
    var kType = Symbol("kType");
    var kWasClean = Symbol("kWasClean");
    var Event = class {
      /**
       * Create a new `Event`.
       *
       * @param {String} type The name of the event
       * @throws {TypeError} If the `type` argument is not specified
       */
      constructor(type) {
        this[kTarget] = null;
        this[kType] = type;
      }
      /**
       * @type {*}
       */
      get target() {
        return this[kTarget];
      }
      /**
       * @type {String}
       */
      get type() {
        return this[kType];
      }
    };
    Object.defineProperty(Event.prototype, "target", { enumerable: true });
    Object.defineProperty(Event.prototype, "type", { enumerable: true });
    var CloseEvent = class extends Event {
      /**
       * Create a new `CloseEvent`.
       *
       * @param {String} type The name of the event
       * @param {Object} [options] A dictionary object that allows for setting
       *     attributes via object members of the same name
       * @param {Number} [options.code=0] The status code explaining why the
       *     connection was closed
       * @param {String} [options.reason=''] A human-readable string explaining why
       *     the connection was closed
       * @param {Boolean} [options.wasClean=false] Indicates whether or not the
       *     connection was cleanly closed
       */
      constructor(type, options = {}) {
        super(type);
        this[kCode] = options.code === void 0 ? 0 : options.code;
        this[kReason] = options.reason === void 0 ? "" : options.reason;
        this[kWasClean] = options.wasClean === void 0 ? false : options.wasClean;
      }
      /**
       * @type {Number}
       */
      get code() {
        return this[kCode];
      }
      /**
       * @type {String}
       */
      get reason() {
        return this[kReason];
      }
      /**
       * @type {Boolean}
       */
      get wasClean() {
        return this[kWasClean];
      }
    };
    Object.defineProperty(CloseEvent.prototype, "code", { enumerable: true });
    Object.defineProperty(CloseEvent.prototype, "reason", { enumerable: true });
    Object.defineProperty(CloseEvent.prototype, "wasClean", { enumerable: true });
    var ErrorEvent = class extends Event {
      /**
       * Create a new `ErrorEvent`.
       *
       * @param {String} type The name of the event
       * @param {Object} [options] A dictionary object that allows for setting
       *     attributes via object members of the same name
       * @param {*} [options.error=null] The error that generated this event
       * @param {String} [options.message=''] The error message
       */
      constructor(type, options = {}) {
        super(type);
        this[kError] = options.error === void 0 ? null : options.error;
        this[kMessage] = options.message === void 0 ? "" : options.message;
      }
      /**
       * @type {*}
       */
      get error() {
        return this[kError];
      }
      /**
       * @type {String}
       */
      get message() {
        return this[kMessage];
      }
    };
    Object.defineProperty(ErrorEvent.prototype, "error", { enumerable: true });
    Object.defineProperty(ErrorEvent.prototype, "message", { enumerable: true });
    var MessageEvent = class extends Event {
      /**
       * Create a new `MessageEvent`.
       *
       * @param {String} type The name of the event
       * @param {Object} [options] A dictionary object that allows for setting
       *     attributes via object members of the same name
       * @param {*} [options.data=null] The message content
       */
      constructor(type, options = {}) {
        super(type);
        this[kData] = options.data === void 0 ? null : options.data;
      }
      /**
       * @type {*}
       */
      get data() {
        return this[kData];
      }
    };
    Object.defineProperty(MessageEvent.prototype, "data", { enumerable: true });
    var EventTarget = {
      /**
       * Register an event listener.
       *
       * @param {String} type A string representing the event type to listen for
       * @param {(Function|Object)} handler The listener to add
       * @param {Object} [options] An options object specifies characteristics about
       *     the event listener
       * @param {Boolean} [options.once=false] A `Boolean` indicating that the
       *     listener should be invoked at most once after being added. If `true`,
       *     the listener would be automatically removed when invoked.
       * @public
       */
      addEventListener(type, handler, options = {}) {
        for (const listener of this.listeners(type)) {
          if (!options[kForOnEventAttribute] && listener[kListener] === handler && !listener[kForOnEventAttribute]) {
            return;
          }
        }
        let wrapper;
        if (type === "message") {
          wrapper = function onMessage(data, isBinary) {
            const event = new MessageEvent("message", {
              data: isBinary ? data : data.toString()
            });
            event[kTarget] = this;
            callListener(handler, this, event);
          };
        } else if (type === "close") {
          wrapper = function onClose(code, message) {
            const event = new CloseEvent("close", {
              code,
              reason: message.toString(),
              wasClean: this._closeFrameReceived && this._closeFrameSent
            });
            event[kTarget] = this;
            callListener(handler, this, event);
          };
        } else if (type === "error") {
          wrapper = function onError(error) {
            const event = new ErrorEvent("error", {
              error,
              message: error.message
            });
            event[kTarget] = this;
            callListener(handler, this, event);
          };
        } else if (type === "open") {
          wrapper = function onOpen() {
            const event = new Event("open");
            event[kTarget] = this;
            callListener(handler, this, event);
          };
        } else {
          return;
        }
        wrapper[kForOnEventAttribute] = !!options[kForOnEventAttribute];
        wrapper[kListener] = handler;
        if (options.once) {
          this.once(type, wrapper);
        } else {
          this.on(type, wrapper);
        }
      },
      /**
       * Remove an event listener.
       *
       * @param {String} type A string representing the event type to remove
       * @param {(Function|Object)} handler The listener to remove
       * @public
       */
      removeEventListener(type, handler) {
        for (const listener of this.listeners(type)) {
          if (listener[kListener] === handler && !listener[kForOnEventAttribute]) {
            this.removeListener(type, listener);
            break;
          }
        }
      }
    };
    module2.exports = {
      CloseEvent,
      ErrorEvent,
      Event,
      EventTarget,
      MessageEvent
    };
    function callListener(listener, thisArg, event) {
      if (typeof listener === "object" && listener.handleEvent) {
        listener.handleEvent.call(listener, event);
      } else {
        listener.call(thisArg, event);
      }
    }
  }
});

// node_modules/ws/lib/extension.js
var require_extension = __commonJS({
  "node_modules/ws/lib/extension.js"(exports2, module2) {
    "use strict";
    var { tokenChars } = require_validation();
    function push(dest, name, elem) {
      if (dest[name] === void 0) dest[name] = [elem];
      else dest[name].push(elem);
    }
    function parse(header) {
      const offers = /* @__PURE__ */ Object.create(null);
      let params = /* @__PURE__ */ Object.create(null);
      let mustUnescape = false;
      let isEscaping = false;
      let inQuotes = false;
      let extensionName;
      let paramName;
      let start = -1;
      let code = -1;
      let end = -1;
      let i = 0;
      for (; i < header.length; i++) {
        code = header.charCodeAt(i);
        if (extensionName === void 0) {
          if (end === -1 && tokenChars[code] === 1) {
            if (start === -1) start = i;
          } else if (i !== 0 && (code === 32 || code === 9)) {
            if (end === -1 && start !== -1) end = i;
          } else if (code === 59 || code === 44) {
            if (start === -1) {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
            if (end === -1) end = i;
            const name = header.slice(start, end);
            if (code === 44) {
              push(offers, name, params);
              params = /* @__PURE__ */ Object.create(null);
            } else {
              extensionName = name;
            }
            start = end = -1;
          } else {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
        } else if (paramName === void 0) {
          if (end === -1 && tokenChars[code] === 1) {
            if (start === -1) start = i;
          } else if (code === 32 || code === 9) {
            if (end === -1 && start !== -1) end = i;
          } else if (code === 59 || code === 44) {
            if (start === -1) {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
            if (end === -1) end = i;
            push(params, header.slice(start, end), true);
            if (code === 44) {
              push(offers, extensionName, params);
              params = /* @__PURE__ */ Object.create(null);
              extensionName = void 0;
            }
            start = end = -1;
          } else if (code === 61 && start !== -1 && end === -1) {
            paramName = header.slice(start, i);
            start = end = -1;
          } else {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
        } else {
          if (isEscaping) {
            if (tokenChars[code] !== 1) {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
            if (start === -1) start = i;
            else if (!mustUnescape) mustUnescape = true;
            isEscaping = false;
          } else if (inQuotes) {
            if (tokenChars[code] === 1) {
              if (start === -1) start = i;
            } else if (code === 34 && start !== -1) {
              inQuotes = false;
              end = i;
            } else if (code === 92) {
              isEscaping = true;
            } else {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
          } else if (code === 34 && header.charCodeAt(i - 1) === 61) {
            inQuotes = true;
          } else if (end === -1 && tokenChars[code] === 1) {
            if (start === -1) start = i;
          } else if (start !== -1 && (code === 32 || code === 9)) {
            if (end === -1) end = i;
          } else if (code === 59 || code === 44) {
            if (start === -1) {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
            if (end === -1) end = i;
            let value = header.slice(start, end);
            if (mustUnescape) {
              value = value.replace(/\\/g, "");
              mustUnescape = false;
            }
            push(params, paramName, value);
            if (code === 44) {
              push(offers, extensionName, params);
              params = /* @__PURE__ */ Object.create(null);
              extensionName = void 0;
            }
            paramName = void 0;
            start = end = -1;
          } else {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
        }
      }
      if (start === -1 || inQuotes || code === 32 || code === 9) {
        throw new SyntaxError("Unexpected end of input");
      }
      if (end === -1) end = i;
      const token = header.slice(start, end);
      if (extensionName === void 0) {
        push(offers, token, params);
      } else {
        if (paramName === void 0) {
          push(params, token, true);
        } else if (mustUnescape) {
          push(params, paramName, token.replace(/\\/g, ""));
        } else {
          push(params, paramName, token);
        }
        push(offers, extensionName, params);
      }
      return offers;
    }
    function format(extensions) {
      return Object.keys(extensions).map((extension2) => {
        let configurations = extensions[extension2];
        if (!Array.isArray(configurations)) configurations = [configurations];
        return configurations.map((params) => {
          return [extension2].concat(
            Object.keys(params).map((k) => {
              let values = params[k];
              if (!Array.isArray(values)) values = [values];
              return values.map((v) => v === true ? k : `${k}=${v}`).join("; ");
            })
          ).join("; ");
        }).join(", ");
      }).join(", ");
    }
    module2.exports = { format, parse };
  }
});

// node_modules/ws/lib/websocket.js
var require_websocket = __commonJS({
  "node_modules/ws/lib/websocket.js"(exports2, module2) {
    "use strict";
    var EventEmitter = require("events");
    var https = require("https");
    var http2 = require("http");
    var net = require("net");
    var tls = require("tls");
    var { randomBytes: randomBytes6, createHash: createHash7 } = require("crypto");
    var { Duplex, Readable } = require("stream");
    var { URL: URL2 } = require("url");
    var PerMessageDeflate2 = require_permessage_deflate();
    var Receiver2 = require_receiver();
    var Sender2 = require_sender();
    var { isBlob } = require_validation();
    var {
      BINARY_TYPES,
      CLOSE_TIMEOUT,
      EMPTY_BUFFER,
      GUID,
      kForOnEventAttribute,
      kListener,
      kStatusCode,
      kWebSocket,
      NOOP
    } = require_constants();
    var {
      EventTarget: { addEventListener, removeEventListener }
    } = require_event_target();
    var { format, parse } = require_extension();
    var { toBuffer } = require_buffer_util();
    var kAborted = Symbol("kAborted");
    var protocolVersions = [8, 13];
    var readyStates = ["CONNECTING", "OPEN", "CLOSING", "CLOSED"];
    var subprotocolRegex = /^[!#$%&'*+\-.0-9A-Z^_`|a-z~]+$/;
    var WebSocket2 = class _WebSocket extends EventEmitter {
      /**
       * Create a new `WebSocket`.
       *
       * @param {(String|URL)} address The URL to which to connect
       * @param {(String|String[])} [protocols] The subprotocols
       * @param {Object} [options] Connection options
       */
      constructor(address, protocols, options) {
        super();
        this._binaryType = BINARY_TYPES[0];
        this._closeCode = 1006;
        this._closeFrameReceived = false;
        this._closeFrameSent = false;
        this._closeMessage = EMPTY_BUFFER;
        this._closeTimer = null;
        this._errorEmitted = false;
        this._extensions = {};
        this._paused = false;
        this._protocol = "";
        this._readyState = _WebSocket.CONNECTING;
        this._receiver = null;
        this._sender = null;
        this._socket = null;
        if (address !== null) {
          this._bufferedAmount = 0;
          this._isServer = false;
          this._redirects = 0;
          if (protocols === void 0) {
            if (!options || options.protocols === void 0) {
              protocols = [];
            } else if (Array.isArray(options.protocols)) {
              protocols = options.protocols;
            } else {
              protocols = [options.protocols];
            }
          } else if (!Array.isArray(protocols)) {
            if (typeof protocols === "object" && protocols !== null) {
              options = protocols;
              if (options.protocols === void 0) {
                protocols = [];
              } else if (Array.isArray(options.protocols)) {
                protocols = options.protocols;
              } else {
                protocols = [options.protocols];
              }
            } else {
              protocols = [protocols];
            }
          }
          initAsClient(this, address, protocols, options);
        } else {
          this._autoPong = options.autoPong;
          this._closeTimeout = options.closeTimeout;
          this._isServer = true;
        }
      }
      /**
       * For historical reasons, the custom "nodebuffer" type is used by the default
       * instead of "blob".
       *
       * @type {String}
       */
      get binaryType() {
        return this._binaryType;
      }
      set binaryType(type) {
        if (!BINARY_TYPES.includes(type)) return;
        this._binaryType = type;
        if (this._receiver) this._receiver._binaryType = type;
      }
      /**
       * @type {Number}
       */
      get bufferedAmount() {
        if (!this._socket) return this._bufferedAmount;
        return this._socket._writableState.length + this._sender._bufferedBytes;
      }
      /**
       * @type {String}
       */
      get extensions() {
        return Object.keys(this._extensions).join();
      }
      /**
       * @type {Boolean}
       */
      get isPaused() {
        return this._paused;
      }
      /**
       * @type {Function}
       */
      /* istanbul ignore next */
      get onclose() {
        return null;
      }
      /**
       * @type {Function}
       */
      /* istanbul ignore next */
      get onerror() {
        return null;
      }
      /**
       * @type {Function}
       */
      /* istanbul ignore next */
      get onopen() {
        return null;
      }
      /**
       * @type {Function}
       */
      /* istanbul ignore next */
      get onmessage() {
        return null;
      }
      /**
       * @type {String}
       */
      get protocol() {
        return this._protocol;
      }
      /**
       * @type {Number}
       */
      get readyState() {
        return this._readyState;
      }
      /**
       * @type {String}
       */
      get url() {
        return this._url;
      }
      /**
       * Set up the socket and the internal resources.
       *
       * @param {Duplex} socket The network socket between the server and client
       * @param {Buffer} head The first packet of the upgraded stream
       * @param {Object} options Options object
       * @param {Boolean} [options.allowSynchronousEvents=false] Specifies whether
       *     any of the `'message'`, `'ping'`, and `'pong'` events can be emitted
       *     multiple times in the same tick
       * @param {Function} [options.generateMask] The function used to generate the
       *     masking key
       * @param {Number} [options.maxBufferedChunks=0] The maximum number of
       *     buffered data chunks
       * @param {Number} [options.maxFragments=0] The maximum number of message
       *     fragments
       * @param {Number} [options.maxPayload=0] The maximum allowed message size
       * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
       *     not to skip UTF-8 validation for text and close messages
       * @private
       */
      setSocket(socket, head, options) {
        const receiver = new Receiver2({
          allowSynchronousEvents: options.allowSynchronousEvents,
          binaryType: this.binaryType,
          extensions: this._extensions,
          isServer: this._isServer,
          maxBufferedChunks: options.maxBufferedChunks,
          maxFragments: options.maxFragments,
          maxPayload: options.maxPayload,
          skipUTF8Validation: options.skipUTF8Validation
        });
        const sender = new Sender2(socket, this._extensions, options.generateMask);
        this._receiver = receiver;
        this._sender = sender;
        this._socket = socket;
        receiver[kWebSocket] = this;
        sender[kWebSocket] = this;
        socket[kWebSocket] = this;
        receiver.on("conclude", receiverOnConclude);
        receiver.on("drain", receiverOnDrain);
        receiver.on("error", receiverOnError);
        receiver.on("message", receiverOnMessage);
        receiver.on("ping", receiverOnPing);
        receiver.on("pong", receiverOnPong);
        sender.onerror = senderOnError;
        if (socket.setTimeout) socket.setTimeout(0);
        if (socket.setNoDelay) socket.setNoDelay();
        if (head.length > 0) socket.unshift(head);
        socket.on("close", socketOnClose);
        socket.on("data", socketOnData);
        socket.on("end", socketOnEnd);
        socket.on("error", socketOnError);
        this._readyState = _WebSocket.OPEN;
        this.emit("open");
      }
      /**
       * Emit the `'close'` event.
       *
       * @private
       */
      emitClose() {
        if (!this._socket) {
          this._readyState = _WebSocket.CLOSED;
          this.emit("close", this._closeCode, this._closeMessage);
          return;
        }
        if (this._extensions[PerMessageDeflate2.extensionName]) {
          this._extensions[PerMessageDeflate2.extensionName].cleanup();
        }
        this._receiver.removeAllListeners();
        this._readyState = _WebSocket.CLOSED;
        this.emit("close", this._closeCode, this._closeMessage);
      }
      /**
       * Start a closing handshake.
       *
       *          +----------+   +-----------+   +----------+
       *     - - -|ws.close()|-->|close frame|-->|ws.close()|- - -
       *    |     +----------+   +-----------+   +----------+     |
       *          +----------+   +-----------+         |
       * CLOSING  |ws.close()|<--|close frame|<--+-----+       CLOSING
       *          +----------+   +-----------+   |
       *    |           |                        |   +---+        |
       *                +------------------------+-->|fin| - - - -
       *    |         +---+                      |   +---+
       *     - - - - -|fin|<---------------------+
       *              +---+
       *
       * @param {Number} [code] Status code explaining why the connection is closing
       * @param {(String|Buffer)} [data] The reason why the connection is
       *     closing
       * @public
       */
      close(code, data) {
        if (this.readyState === _WebSocket.CLOSED) return;
        if (this.readyState === _WebSocket.CONNECTING) {
          const msg = "WebSocket was closed before the connection was established";
          abortHandshake(this, this._req, msg);
          return;
        }
        if (this.readyState === _WebSocket.CLOSING) {
          if (this._closeFrameSent && (this._closeFrameReceived || this._receiver._writableState.errorEmitted)) {
            this._socket.end();
          }
          return;
        }
        this._sender.close(code, data, !this._isServer, (err) => {
          if (err) return;
          this._closeFrameSent = true;
          if (this._closeFrameReceived || this._receiver._writableState.errorEmitted) {
            this._socket.end();
          }
        });
        this._readyState = _WebSocket.CLOSING;
        setCloseTimer(this);
      }
      /**
       * Pause the socket.
       *
       * @public
       */
      pause() {
        if (this.readyState === _WebSocket.CONNECTING || this.readyState === _WebSocket.CLOSED) {
          return;
        }
        this._paused = true;
        this._socket.pause();
      }
      /**
       * Send a ping.
       *
       * @param {*} [data] The data to send
       * @param {Boolean} [mask] Indicates whether or not to mask `data`
       * @param {Function} [cb] Callback which is executed when the ping is sent
       * @public
       */
      ping(data, mask, cb) {
        if (this.readyState === _WebSocket.CONNECTING) {
          throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
        }
        if (typeof data === "function") {
          cb = data;
          data = mask = void 0;
        } else if (typeof mask === "function") {
          cb = mask;
          mask = void 0;
        }
        if (typeof data === "number") data = data.toString();
        if (this.readyState !== _WebSocket.OPEN) {
          sendAfterClose(this, data, cb);
          return;
        }
        if (mask === void 0) mask = !this._isServer;
        this._sender.ping(data || EMPTY_BUFFER, mask, cb);
      }
      /**
       * Send a pong.
       *
       * @param {*} [data] The data to send
       * @param {Boolean} [mask] Indicates whether or not to mask `data`
       * @param {Function} [cb] Callback which is executed when the pong is sent
       * @public
       */
      pong(data, mask, cb) {
        if (this.readyState === _WebSocket.CONNECTING) {
          throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
        }
        if (typeof data === "function") {
          cb = data;
          data = mask = void 0;
        } else if (typeof mask === "function") {
          cb = mask;
          mask = void 0;
        }
        if (typeof data === "number") data = data.toString();
        if (this.readyState !== _WebSocket.OPEN) {
          sendAfterClose(this, data, cb);
          return;
        }
        if (mask === void 0) mask = !this._isServer;
        this._sender.pong(data || EMPTY_BUFFER, mask, cb);
      }
      /**
       * Resume the socket.
       *
       * @public
       */
      resume() {
        if (this.readyState === _WebSocket.CONNECTING || this.readyState === _WebSocket.CLOSED) {
          return;
        }
        this._paused = false;
        if (!this._receiver._writableState.needDrain) this._socket.resume();
      }
      /**
       * Send a data message.
       *
       * @param {*} data The message to send
       * @param {Object} [options] Options object
       * @param {Boolean} [options.binary] Specifies whether `data` is binary or
       *     text
       * @param {Boolean} [options.compress] Specifies whether or not to compress
       *     `data`
       * @param {Boolean} [options.fin=true] Specifies whether the fragment is the
       *     last one
       * @param {Boolean} [options.mask] Specifies whether or not to mask `data`
       * @param {Function} [cb] Callback which is executed when data is written out
       * @public
       */
      send(data, options, cb) {
        if (this.readyState === _WebSocket.CONNECTING) {
          throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
        }
        if (typeof options === "function") {
          cb = options;
          options = {};
        }
        if (typeof data === "number") data = data.toString();
        if (this.readyState !== _WebSocket.OPEN) {
          sendAfterClose(this, data, cb);
          return;
        }
        const opts = {
          binary: typeof data !== "string",
          mask: !this._isServer,
          compress: true,
          fin: true,
          ...options
        };
        if (!this._extensions[PerMessageDeflate2.extensionName]) {
          opts.compress = false;
        }
        this._sender.send(data || EMPTY_BUFFER, opts, cb);
      }
      /**
       * Forcibly close the connection.
       *
       * @public
       */
      terminate() {
        if (this.readyState === _WebSocket.CLOSED) return;
        if (this.readyState === _WebSocket.CONNECTING) {
          const msg = "WebSocket was closed before the connection was established";
          abortHandshake(this, this._req, msg);
          return;
        }
        if (this._socket) {
          this._readyState = _WebSocket.CLOSING;
          this._socket.destroy();
        }
      }
    };
    Object.defineProperty(WebSocket2, "CONNECTING", {
      enumerable: true,
      value: readyStates.indexOf("CONNECTING")
    });
    Object.defineProperty(WebSocket2.prototype, "CONNECTING", {
      enumerable: true,
      value: readyStates.indexOf("CONNECTING")
    });
    Object.defineProperty(WebSocket2, "OPEN", {
      enumerable: true,
      value: readyStates.indexOf("OPEN")
    });
    Object.defineProperty(WebSocket2.prototype, "OPEN", {
      enumerable: true,
      value: readyStates.indexOf("OPEN")
    });
    Object.defineProperty(WebSocket2, "CLOSING", {
      enumerable: true,
      value: readyStates.indexOf("CLOSING")
    });
    Object.defineProperty(WebSocket2.prototype, "CLOSING", {
      enumerable: true,
      value: readyStates.indexOf("CLOSING")
    });
    Object.defineProperty(WebSocket2, "CLOSED", {
      enumerable: true,
      value: readyStates.indexOf("CLOSED")
    });
    Object.defineProperty(WebSocket2.prototype, "CLOSED", {
      enumerable: true,
      value: readyStates.indexOf("CLOSED")
    });
    [
      "binaryType",
      "bufferedAmount",
      "extensions",
      "isPaused",
      "protocol",
      "readyState",
      "url"
    ].forEach((property) => {
      Object.defineProperty(WebSocket2.prototype, property, { enumerable: true });
    });
    ["open", "error", "close", "message"].forEach((method) => {
      Object.defineProperty(WebSocket2.prototype, `on${method}`, {
        enumerable: true,
        get() {
          for (const listener of this.listeners(method)) {
            if (listener[kForOnEventAttribute]) return listener[kListener];
          }
          return null;
        },
        set(handler) {
          for (const listener of this.listeners(method)) {
            if (listener[kForOnEventAttribute]) {
              this.removeListener(method, listener);
              break;
            }
          }
          if (typeof handler !== "function") return;
          this.addEventListener(method, handler, {
            [kForOnEventAttribute]: true
          });
        }
      });
    });
    WebSocket2.prototype.addEventListener = addEventListener;
    WebSocket2.prototype.removeEventListener = removeEventListener;
    module2.exports = WebSocket2;
    function initAsClient(websocket, address, protocols, options) {
      const opts = {
        allowSynchronousEvents: true,
        autoPong: true,
        closeTimeout: CLOSE_TIMEOUT,
        protocolVersion: protocolVersions[1],
        maxBufferedChunks: 256 * 1024,
        maxFragments: 16 * 1024,
        maxPayload: 100 * 1024 * 1024,
        skipUTF8Validation: false,
        perMessageDeflate: true,
        followRedirects: false,
        maxRedirects: 10,
        ...options,
        socketPath: void 0,
        hostname: void 0,
        protocol: void 0,
        protocols: void 0,
        timeout: void 0,
        method: "GET",
        host: void 0,
        path: void 0,
        port: void 0
      };
      websocket._autoPong = opts.autoPong;
      websocket._closeTimeout = opts.closeTimeout;
      if (!protocolVersions.includes(opts.protocolVersion)) {
        throw new RangeError(
          `Unsupported protocol version: ${opts.protocolVersion} (supported versions: ${protocolVersions.join(", ")})`
        );
      }
      let parsedUrl;
      if (address instanceof URL2) {
        parsedUrl = address;
      } else {
        try {
          parsedUrl = new URL2(address);
        } catch {
          throw new SyntaxError(`Invalid URL: ${address}`);
        }
      }
      if (parsedUrl.protocol === "http:") {
        parsedUrl.protocol = "ws:";
      } else if (parsedUrl.protocol === "https:") {
        parsedUrl.protocol = "wss:";
      }
      websocket._url = parsedUrl.href;
      const isSecure = parsedUrl.protocol === "wss:";
      const isIpcUrl = parsedUrl.protocol === "ws+unix:";
      let invalidUrlMessage;
      if (parsedUrl.protocol !== "ws:" && !isSecure && !isIpcUrl) {
        invalidUrlMessage = `The URL's protocol must be one of "ws:", "wss:", "http:", "https:", or "ws+unix:"`;
      } else if (isIpcUrl && !parsedUrl.pathname) {
        invalidUrlMessage = "The URL's pathname is empty";
      } else if (parsedUrl.hash) {
        invalidUrlMessage = "The URL contains a fragment identifier";
      }
      if (invalidUrlMessage) {
        const err = new SyntaxError(invalidUrlMessage);
        if (websocket._redirects === 0) {
          throw err;
        } else {
          emitErrorAndClose(websocket, err);
          return;
        }
      }
      const defaultPort = isSecure ? 443 : 80;
      const key = randomBytes6(16).toString("base64");
      const request = isSecure ? https.request : http2.request;
      const protocolSet = /* @__PURE__ */ new Set();
      let perMessageDeflate;
      opts.createConnection = opts.createConnection || (isSecure ? tlsConnect : netConnect);
      opts.defaultPort = opts.defaultPort || defaultPort;
      opts.port = parsedUrl.port || defaultPort;
      opts.host = parsedUrl.hostname.startsWith("[") ? parsedUrl.hostname.slice(1, -1) : parsedUrl.hostname;
      opts.headers = {
        ...opts.headers,
        "Sec-WebSocket-Version": opts.protocolVersion,
        "Sec-WebSocket-Key": key,
        Connection: "Upgrade",
        Upgrade: "websocket"
      };
      opts.path = parsedUrl.pathname + parsedUrl.search;
      opts.timeout = opts.handshakeTimeout;
      if (opts.perMessageDeflate) {
        perMessageDeflate = new PerMessageDeflate2({
          ...opts.perMessageDeflate,
          isServer: false,
          maxPayload: opts.maxPayload
        });
        opts.headers["Sec-WebSocket-Extensions"] = format({
          [PerMessageDeflate2.extensionName]: perMessageDeflate.offer()
        });
      }
      if (protocols.length) {
        for (const protocol of protocols) {
          if (typeof protocol !== "string" || !subprotocolRegex.test(protocol) || protocolSet.has(protocol)) {
            throw new SyntaxError(
              "An invalid or duplicated subprotocol was specified"
            );
          }
          protocolSet.add(protocol);
        }
        opts.headers["Sec-WebSocket-Protocol"] = protocols.join(",");
      }
      if (opts.origin) {
        if (opts.protocolVersion < 13) {
          opts.headers["Sec-WebSocket-Origin"] = opts.origin;
        } else {
          opts.headers.Origin = opts.origin;
        }
      }
      if (parsedUrl.username || parsedUrl.password) {
        opts.auth = `${parsedUrl.username}:${parsedUrl.password}`;
      }
      if (isIpcUrl) {
        const parts = opts.path.split(":");
        opts.socketPath = parts[0];
        opts.path = parts[1];
      }
      let req;
      if (opts.followRedirects) {
        if (websocket._redirects === 0) {
          websocket._originalIpc = isIpcUrl;
          websocket._originalSecure = isSecure;
          websocket._originalHostOrSocketPath = isIpcUrl ? opts.socketPath : parsedUrl.host;
          const headers = options && options.headers;
          options = { ...options, headers: {} };
          if (headers) {
            for (const [key2, value] of Object.entries(headers)) {
              options.headers[key2.toLowerCase()] = value;
            }
          }
        } else if (websocket.listenerCount("redirect") === 0) {
          const isSameHost = isIpcUrl ? websocket._originalIpc ? opts.socketPath === websocket._originalHostOrSocketPath : false : websocket._originalIpc ? false : parsedUrl.host === websocket._originalHostOrSocketPath;
          if (!isSameHost || websocket._originalSecure && !isSecure) {
            delete opts.headers.authorization;
            delete opts.headers.cookie;
            if (!isSameHost) delete opts.headers.host;
            opts.auth = void 0;
          }
        }
        if (opts.auth && !options.headers.authorization) {
          options.headers.authorization = "Basic " + Buffer.from(opts.auth).toString("base64");
        }
        req = websocket._req = request(opts);
        if (websocket._redirects) {
          websocket.emit("redirect", websocket.url, req);
        }
      } else {
        req = websocket._req = request(opts);
      }
      if (opts.timeout) {
        req.on("timeout", () => {
          abortHandshake(websocket, req, "Opening handshake has timed out");
        });
      }
      req.on("error", (err) => {
        if (req === null || req[kAborted]) return;
        req = websocket._req = null;
        emitErrorAndClose(websocket, err);
      });
      req.on("response", (res) => {
        const location = res.headers.location;
        const statusCode = res.statusCode;
        if (location && opts.followRedirects && statusCode >= 300 && statusCode < 400) {
          if (++websocket._redirects > opts.maxRedirects) {
            abortHandshake(websocket, req, "Maximum redirects exceeded");
            return;
          }
          req.abort();
          let addr;
          try {
            addr = new URL2(location, address);
          } catch (e) {
            const err = new SyntaxError(`Invalid URL: ${location}`);
            emitErrorAndClose(websocket, err);
            return;
          }
          initAsClient(websocket, addr, protocols, options);
        } else if (!websocket.emit("unexpected-response", req, res)) {
          abortHandshake(
            websocket,
            req,
            `Unexpected server response: ${res.statusCode}`
          );
        }
      });
      req.on("upgrade", (res, socket, head) => {
        websocket.emit("upgrade", res);
        if (websocket.readyState !== WebSocket2.CONNECTING) return;
        req = websocket._req = null;
        const upgrade2 = res.headers.upgrade;
        if (upgrade2 === void 0 || upgrade2.toLowerCase() !== "websocket") {
          abortHandshake(websocket, socket, "Invalid Upgrade header");
          return;
        }
        const digest = createHash7("sha1").update(key + GUID).digest("base64");
        if (res.headers["sec-websocket-accept"] !== digest) {
          abortHandshake(websocket, socket, "Invalid Sec-WebSocket-Accept header");
          return;
        }
        const serverProt = res.headers["sec-websocket-protocol"];
        let protError;
        if (serverProt !== void 0) {
          if (!protocolSet.size) {
            protError = "Server sent a subprotocol but none was requested";
          } else if (!protocolSet.has(serverProt)) {
            protError = "Server sent an invalid subprotocol";
          }
        } else if (protocolSet.size) {
          protError = "Server sent no subprotocol";
        }
        if (protError) {
          abortHandshake(websocket, socket, protError);
          return;
        }
        if (serverProt) websocket._protocol = serverProt;
        const secWebSocketExtensions = res.headers["sec-websocket-extensions"];
        if (secWebSocketExtensions !== void 0) {
          if (!perMessageDeflate) {
            const message = "Server sent a Sec-WebSocket-Extensions header but no extension was requested";
            abortHandshake(websocket, socket, message);
            return;
          }
          let extensions;
          try {
            extensions = parse(secWebSocketExtensions);
          } catch (err) {
            const message = "Invalid Sec-WebSocket-Extensions header";
            abortHandshake(websocket, socket, message);
            return;
          }
          const extensionNames = Object.keys(extensions);
          if (extensionNames.length !== 1 || extensionNames[0] !== PerMessageDeflate2.extensionName) {
            const message = "Server indicated an extension that was not requested";
            abortHandshake(websocket, socket, message);
            return;
          }
          try {
            perMessageDeflate.accept(extensions[PerMessageDeflate2.extensionName]);
          } catch (err) {
            const message = "Invalid Sec-WebSocket-Extensions header";
            abortHandshake(websocket, socket, message);
            return;
          }
          websocket._extensions[PerMessageDeflate2.extensionName] = perMessageDeflate;
        }
        websocket.setSocket(socket, head, {
          allowSynchronousEvents: opts.allowSynchronousEvents,
          generateMask: opts.generateMask,
          maxBufferedChunks: opts.maxBufferedChunks,
          maxFragments: opts.maxFragments,
          maxPayload: opts.maxPayload,
          skipUTF8Validation: opts.skipUTF8Validation
        });
      });
      if (opts.finishRequest) {
        opts.finishRequest(req, websocket);
      } else {
        req.end();
      }
    }
    function emitErrorAndClose(websocket, err) {
      websocket._readyState = WebSocket2.CLOSING;
      websocket._errorEmitted = true;
      websocket.emit("error", err);
      websocket.emitClose();
    }
    function netConnect(options) {
      options.path = options.socketPath;
      return net.connect(options);
    }
    function tlsConnect(options) {
      options.path = void 0;
      if (!options.servername && options.servername !== "") {
        options.servername = net.isIP(options.host) ? "" : options.host;
      }
      return tls.connect(options);
    }
    function abortHandshake(websocket, stream, message) {
      websocket._readyState = WebSocket2.CLOSING;
      const err = new Error(message);
      Error.captureStackTrace(err, abortHandshake);
      if (stream.setHeader) {
        stream[kAborted] = true;
        stream.abort();
        if (stream.socket && !stream.socket.destroyed) {
          stream.socket.destroy();
        }
        process.nextTick(emitErrorAndClose, websocket, err);
      } else {
        stream.destroy(err);
        stream.once("error", websocket.emit.bind(websocket, "error"));
        stream.once("close", websocket.emitClose.bind(websocket));
      }
    }
    function sendAfterClose(websocket, data, cb) {
      if (data) {
        const length = isBlob(data) ? data.size : toBuffer(data).length;
        if (websocket._socket) websocket._sender._bufferedBytes += length;
        else websocket._bufferedAmount += length;
      }
      if (cb) {
        const err = new Error(
          `WebSocket is not open: readyState ${websocket.readyState} (${readyStates[websocket.readyState]})`
        );
        process.nextTick(cb, err);
      }
    }
    function receiverOnConclude(code, reason) {
      const websocket = this[kWebSocket];
      websocket._closeFrameReceived = true;
      websocket._closeMessage = reason;
      websocket._closeCode = code;
      if (websocket._socket[kWebSocket] === void 0) return;
      websocket._socket.removeListener("data", socketOnData);
      process.nextTick(resume, websocket._socket);
      if (code === 1005) websocket.close();
      else websocket.close(code, reason);
    }
    function receiverOnDrain() {
      const websocket = this[kWebSocket];
      if (!websocket.isPaused) websocket._socket.resume();
    }
    function receiverOnError(err) {
      const websocket = this[kWebSocket];
      if (websocket._socket[kWebSocket] !== void 0) {
        websocket._socket.removeListener("data", socketOnData);
        process.nextTick(resume, websocket._socket);
        websocket.close(err[kStatusCode]);
      }
      if (!websocket._errorEmitted) {
        websocket._errorEmitted = true;
        websocket.emit("error", err);
      }
    }
    function receiverOnFinish() {
      this[kWebSocket].emitClose();
    }
    function receiverOnMessage(data, isBinary) {
      this[kWebSocket].emit("message", data, isBinary);
    }
    function receiverOnPing(data) {
      const websocket = this[kWebSocket];
      if (websocket._autoPong) websocket.pong(data, !this._isServer, NOOP);
      websocket.emit("ping", data);
    }
    function receiverOnPong(data) {
      this[kWebSocket].emit("pong", data);
    }
    function resume(stream) {
      stream.resume();
    }
    function senderOnError(err) {
      const websocket = this[kWebSocket];
      if (websocket.readyState === WebSocket2.CLOSED) return;
      if (websocket.readyState === WebSocket2.OPEN) {
        websocket._readyState = WebSocket2.CLOSING;
        setCloseTimer(websocket);
      }
      this._socket.end();
      if (!websocket._errorEmitted) {
        websocket._errorEmitted = true;
        websocket.emit("error", err);
      }
    }
    function setCloseTimer(websocket) {
      websocket._closeTimer = setTimeout(
        websocket._socket.destroy.bind(websocket._socket),
        websocket._closeTimeout
      );
    }
    function socketOnClose() {
      const websocket = this[kWebSocket];
      this.removeListener("close", socketOnClose);
      this.removeListener("data", socketOnData);
      this.removeListener("end", socketOnEnd);
      websocket._readyState = WebSocket2.CLOSING;
      if (!this._readableState.endEmitted && !websocket._closeFrameReceived && !websocket._receiver._writableState.errorEmitted && this._readableState.length !== 0) {
        const chunk = this.read(this._readableState.length);
        websocket._receiver.write(chunk);
      }
      websocket._receiver.end();
      this[kWebSocket] = void 0;
      clearTimeout(websocket._closeTimer);
      if (websocket._receiver._writableState.finished || websocket._receiver._writableState.errorEmitted) {
        websocket.emitClose();
      } else {
        websocket._receiver.on("error", receiverOnFinish);
        websocket._receiver.on("finish", receiverOnFinish);
      }
    }
    function socketOnData(chunk) {
      if (!this[kWebSocket]._receiver.write(chunk)) {
        this.pause();
      }
    }
    function socketOnEnd() {
      const websocket = this[kWebSocket];
      websocket._readyState = WebSocket2.CLOSING;
      websocket._receiver.end();
      this.end();
    }
    function socketOnError() {
      const websocket = this[kWebSocket];
      this.removeListener("error", socketOnError);
      this.on("error", NOOP);
      if (websocket) {
        websocket._readyState = WebSocket2.CLOSING;
        this.destroy();
      }
    }
  }
});

// node_modules/ws/lib/stream.js
var require_stream = __commonJS({
  "node_modules/ws/lib/stream.js"(exports2, module2) {
    "use strict";
    var WebSocket2 = require_websocket();
    var { Duplex } = require("stream");
    function emitClose(stream) {
      stream.emit("close");
    }
    function duplexOnEnd() {
      if (!this.destroyed && this._writableState.finished) {
        this.destroy();
      }
    }
    function duplexOnError(err) {
      this.removeListener("error", duplexOnError);
      this.destroy();
      if (this.listenerCount("error") === 0) {
        this.emit("error", err);
      }
    }
    function createWebSocketStream2(ws, options) {
      let terminateOnDestroy = true;
      const duplex = new Duplex({
        ...options,
        autoDestroy: false,
        emitClose: false,
        objectMode: false,
        writableObjectMode: false
      });
      ws.on("message", function message(msg, isBinary) {
        const data = !isBinary && duplex._readableState.objectMode ? msg.toString() : msg;
        if (!duplex.push(data)) ws.pause();
      });
      ws.once("error", function error(err) {
        if (duplex.destroyed) return;
        terminateOnDestroy = false;
        duplex.destroy(err);
      });
      ws.once("close", function close() {
        if (duplex.destroyed) return;
        duplex.push(null);
      });
      duplex._destroy = function(err, callback) {
        if (ws.readyState === ws.CLOSED) {
          callback(err);
          process.nextTick(emitClose, duplex);
          return;
        }
        let called = false;
        ws.once("error", function error(err2) {
          called = true;
          callback(err2);
        });
        ws.once("close", function close() {
          if (!called) callback(err);
          process.nextTick(emitClose, duplex);
        });
        if (terminateOnDestroy) ws.terminate();
      };
      duplex._final = function(callback) {
        if (ws.readyState === ws.CONNECTING) {
          ws.once("open", function open2() {
            duplex._final(callback);
          });
          return;
        }
        if (ws._socket === null) return;
        if (ws._socket._writableState.finished) {
          callback();
          if (duplex._readableState.endEmitted) duplex.destroy();
        } else {
          ws._socket.once("finish", function finish() {
            callback();
          });
          ws.close();
        }
      };
      duplex._read = function() {
        if (ws.isPaused) ws.resume();
      };
      duplex._write = function(chunk, encoding, callback) {
        if (ws.readyState === ws.CONNECTING) {
          ws.once("open", function open2() {
            duplex._write(chunk, encoding, callback);
          });
          return;
        }
        ws.send(chunk, callback);
      };
      duplex.on("end", duplexOnEnd);
      duplex.on("error", duplexOnError);
      return duplex;
    }
    module2.exports = createWebSocketStream2;
  }
});

// node_modules/ws/lib/subprotocol.js
var require_subprotocol = __commonJS({
  "node_modules/ws/lib/subprotocol.js"(exports2, module2) {
    "use strict";
    var { tokenChars } = require_validation();
    function parse(header) {
      const protocols = /* @__PURE__ */ new Set();
      let start = -1;
      let end = -1;
      let i = 0;
      for (i; i < header.length; i++) {
        const code = header.charCodeAt(i);
        if (end === -1 && tokenChars[code] === 1) {
          if (start === -1) start = i;
        } else if (i !== 0 && (code === 32 || code === 9)) {
          if (end === -1 && start !== -1) end = i;
        } else if (code === 44) {
          if (start === -1) {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
          if (end === -1) end = i;
          const protocol2 = header.slice(start, end);
          if (protocols.has(protocol2)) {
            throw new SyntaxError(`The "${protocol2}" subprotocol is duplicated`);
          }
          protocols.add(protocol2);
          start = end = -1;
        } else {
          throw new SyntaxError(`Unexpected character at index ${i}`);
        }
      }
      if (start === -1 || end !== -1) {
        throw new SyntaxError("Unexpected end of input");
      }
      const protocol = header.slice(start, i);
      if (protocols.has(protocol)) {
        throw new SyntaxError(`The "${protocol}" subprotocol is duplicated`);
      }
      protocols.add(protocol);
      return protocols;
    }
    module2.exports = { parse };
  }
});

// node_modules/ws/lib/websocket-server.js
var require_websocket_server = __commonJS({
  "node_modules/ws/lib/websocket-server.js"(exports2, module2) {
    "use strict";
    var EventEmitter = require("events");
    var http2 = require("http");
    var { Duplex } = require("stream");
    var { createHash: createHash7 } = require("crypto");
    var extension2 = require_extension();
    var PerMessageDeflate2 = require_permessage_deflate();
    var subprotocol2 = require_subprotocol();
    var WebSocket2 = require_websocket();
    var { CLOSE_TIMEOUT, GUID, kWebSocket } = require_constants();
    var keyRegex = /^[+/0-9A-Za-z]{22}==$/;
    var RUNNING = 0;
    var CLOSING = 1;
    var CLOSED = 2;
    var WebSocketServer2 = class extends EventEmitter {
      /**
       * Create a `WebSocketServer` instance.
       *
       * @param {Object} options Configuration options
       * @param {Boolean} [options.allowSynchronousEvents=true] Specifies whether
       *     any of the `'message'`, `'ping'`, and `'pong'` events can be emitted
       *     multiple times in the same tick
       * @param {Boolean} [options.autoPong=true] Specifies whether or not to
       *     automatically send a pong in response to a ping
       * @param {Number} [options.backlog=511] The maximum length of the queue of
       *     pending connections
       * @param {Boolean} [options.clientTracking=true] Specifies whether or not to
       *     track clients
       * @param {Number} [options.closeTimeout=30000] Duration in milliseconds to
       *     wait for the closing handshake to finish after `websocket.close()` is
       *     called
       * @param {Function} [options.handleProtocols] A hook to handle protocols
       * @param {String} [options.host] The hostname where to bind the server
       * @param {Number} [options.maxBufferedChunks=262144] The maximum number of
       *     buffered data chunks
       * @param {Number} [options.maxFragments=16384] The maximum number of message
       *     fragments
       * @param {Number} [options.maxPayload=104857600] The maximum allowed message
       *     size
       * @param {Boolean} [options.noServer=false] Enable no server mode
       * @param {String} [options.path] Accept only connections matching this path
       * @param {(Boolean|Object)} [options.perMessageDeflate=false] Enable/disable
       *     permessage-deflate
       * @param {Number} [options.port] The port where to bind the server
       * @param {(http.Server|https.Server)} [options.server] A pre-created HTTP/S
       *     server to use
       * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
       *     not to skip UTF-8 validation for text and close messages
       * @param {Function} [options.verifyClient] A hook to reject connections
       * @param {Function} [options.WebSocket=WebSocket] Specifies the `WebSocket`
       *     class to use. It must be the `WebSocket` class or class that extends it
       * @param {Function} [callback] A listener for the `listening` event
       */
      constructor(options, callback) {
        super();
        options = {
          allowSynchronousEvents: true,
          autoPong: true,
          maxBufferedChunks: 256 * 1024,
          maxFragments: 16 * 1024,
          maxPayload: 100 * 1024 * 1024,
          skipUTF8Validation: false,
          perMessageDeflate: false,
          handleProtocols: null,
          clientTracking: true,
          closeTimeout: CLOSE_TIMEOUT,
          verifyClient: null,
          noServer: false,
          backlog: null,
          // use default (511 as implemented in net.js)
          server: null,
          host: null,
          path: null,
          port: null,
          WebSocket: WebSocket2,
          ...options
        };
        if (options.port == null && !options.server && !options.noServer || options.port != null && (options.server || options.noServer) || options.server && options.noServer) {
          throw new TypeError(
            'One and only one of the "port", "server", or "noServer" options must be specified'
          );
        }
        if (options.port != null) {
          this._server = http2.createServer((req, res) => {
            const body = http2.STATUS_CODES[426];
            res.writeHead(426, {
              "Content-Length": body.length,
              "Content-Type": "text/plain"
            });
            res.end(body);
          });
          this._server.listen(
            options.port,
            options.host,
            options.backlog,
            callback
          );
        } else if (options.server) {
          this._server = options.server;
        }
        if (this._server) {
          const emitConnection = this.emit.bind(this, "connection");
          this._removeListeners = addListeners(this._server, {
            listening: this.emit.bind(this, "listening"),
            error: this.emit.bind(this, "error"),
            upgrade: (req, socket, head) => {
              this.handleUpgrade(req, socket, head, emitConnection);
            }
          });
        }
        if (options.perMessageDeflate === true) options.perMessageDeflate = {};
        if (options.clientTracking) {
          this.clients = /* @__PURE__ */ new Set();
          this._shouldEmitClose = false;
        }
        this.options = options;
        this._state = RUNNING;
      }
      /**
       * Returns the bound address, the address family name, and port of the server
       * as reported by the operating system if listening on an IP socket.
       * If the server is listening on a pipe or UNIX domain socket, the name is
       * returned as a string.
       *
       * @return {(Object|String|null)} The address of the server
       * @public
       */
      address() {
        if (this.options.noServer) {
          throw new Error('The server is operating in "noServer" mode');
        }
        if (!this._server) return null;
        return this._server.address();
      }
      /**
       * Stop the server from accepting new connections and emit the `'close'` event
       * when all existing connections are closed.
       *
       * @param {Function} [cb] A one-time listener for the `'close'` event
       * @public
       */
      close(cb) {
        if (this._state === CLOSED) {
          if (cb) {
            this.once("close", () => {
              cb(new Error("The server is not running"));
            });
          }
          process.nextTick(emitClose, this);
          return;
        }
        if (cb) this.once("close", cb);
        if (this._state === CLOSING) return;
        this._state = CLOSING;
        if (this.options.noServer || this.options.server) {
          if (this._server) {
            this._removeListeners();
            this._removeListeners = this._server = null;
          }
          if (this.clients) {
            if (!this.clients.size) {
              process.nextTick(emitClose, this);
            } else {
              this._shouldEmitClose = true;
            }
          } else {
            process.nextTick(emitClose, this);
          }
        } else {
          const server = this._server;
          this._removeListeners();
          this._removeListeners = this._server = null;
          server.close(() => {
            emitClose(this);
          });
        }
      }
      /**
       * See if a given request should be handled by this server instance.
       *
       * @param {http.IncomingMessage} req Request object to inspect
       * @return {Boolean} `true` if the request is valid, else `false`
       * @public
       */
      shouldHandle(req) {
        if (this.options.path) {
          const index = req.url.indexOf("?");
          const pathname = index !== -1 ? req.url.slice(0, index) : req.url;
          if (pathname !== this.options.path) return false;
        }
        return true;
      }
      /**
       * Handle a HTTP Upgrade request.
       *
       * @param {http.IncomingMessage} req The request object
       * @param {Duplex} socket The network socket between the server and client
       * @param {Buffer} head The first packet of the upgraded stream
       * @param {Function} cb Callback
       * @public
       */
      handleUpgrade(req, socket, head, cb) {
        socket.on("error", socketOnError);
        const key = req.headers["sec-websocket-key"];
        const upgrade2 = req.headers.upgrade;
        const version = +req.headers["sec-websocket-version"];
        if (req.method !== "GET") {
          const message = "Invalid HTTP method";
          abortHandshakeOrEmitwsClientError(this, req, socket, 405, message);
          return;
        }
        if (upgrade2 === void 0 || upgrade2.toLowerCase() !== "websocket") {
          const message = "Invalid Upgrade header";
          abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
          return;
        }
        if (key === void 0 || !keyRegex.test(key)) {
          const message = "Missing or invalid Sec-WebSocket-Key header";
          abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
          return;
        }
        if (version !== 13 && version !== 8) {
          const message = "Missing or invalid Sec-WebSocket-Version header";
          abortHandshakeOrEmitwsClientError(this, req, socket, 400, message, {
            "Sec-WebSocket-Version": "13, 8"
          });
          return;
        }
        if (!this.shouldHandle(req)) {
          abortHandshake(socket, 400);
          return;
        }
        const secWebSocketProtocol = req.headers["sec-websocket-protocol"];
        let protocols = /* @__PURE__ */ new Set();
        if (secWebSocketProtocol !== void 0) {
          try {
            protocols = subprotocol2.parse(secWebSocketProtocol);
          } catch (err) {
            const message = "Invalid Sec-WebSocket-Protocol header";
            abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
            return;
          }
        }
        const secWebSocketExtensions = req.headers["sec-websocket-extensions"];
        const extensions = {};
        if (this.options.perMessageDeflate && secWebSocketExtensions !== void 0) {
          const perMessageDeflate = new PerMessageDeflate2({
            ...this.options.perMessageDeflate,
            isServer: true,
            maxPayload: this.options.maxPayload
          });
          try {
            const offers = extension2.parse(secWebSocketExtensions);
            if (offers[PerMessageDeflate2.extensionName]) {
              perMessageDeflate.accept(offers[PerMessageDeflate2.extensionName]);
              extensions[PerMessageDeflate2.extensionName] = perMessageDeflate;
            }
          } catch (err) {
            const message = "Invalid or unacceptable Sec-WebSocket-Extensions header";
            abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
            return;
          }
        }
        if (this.options.verifyClient) {
          const info = {
            origin: req.headers[`${version === 8 ? "sec-websocket-origin" : "origin"}`],
            secure: !!(req.socket.authorized || req.socket.encrypted),
            req
          };
          if (this.options.verifyClient.length === 2) {
            this.options.verifyClient(info, (verified, code, message, headers) => {
              if (!verified) {
                return abortHandshake(socket, code || 401, message, headers);
              }
              this.completeUpgrade(
                extensions,
                key,
                protocols,
                req,
                socket,
                head,
                cb
              );
            });
            return;
          }
          if (!this.options.verifyClient(info)) return abortHandshake(socket, 401);
        }
        this.completeUpgrade(extensions, key, protocols, req, socket, head, cb);
      }
      /**
       * Upgrade the connection to WebSocket.
       *
       * @param {Object} extensions The accepted extensions
       * @param {String} key The value of the `Sec-WebSocket-Key` header
       * @param {Set} protocols The subprotocols
       * @param {http.IncomingMessage} req The request object
       * @param {Duplex} socket The network socket between the server and client
       * @param {Buffer} head The first packet of the upgraded stream
       * @param {Function} cb Callback
       * @throws {Error} If called more than once with the same socket
       * @private
       */
      completeUpgrade(extensions, key, protocols, req, socket, head, cb) {
        if (!socket.readable || !socket.writable) return socket.destroy();
        if (socket[kWebSocket]) {
          throw new Error(
            "server.handleUpgrade() was called more than once with the same socket, possibly due to a misconfiguration"
          );
        }
        if (this._state > RUNNING) return abortHandshake(socket, 503);
        const digest = createHash7("sha1").update(key + GUID).digest("base64");
        const headers = [
          "HTTP/1.1 101 Switching Protocols",
          "Upgrade: websocket",
          "Connection: Upgrade",
          `Sec-WebSocket-Accept: ${digest}`
        ];
        const ws = new this.options.WebSocket(null, void 0, this.options);
        if (protocols.size) {
          const protocol = this.options.handleProtocols ? this.options.handleProtocols(protocols, req) : protocols.values().next().value;
          if (protocol) {
            headers.push(`Sec-WebSocket-Protocol: ${protocol}`);
            ws._protocol = protocol;
          }
        }
        if (extensions[PerMessageDeflate2.extensionName]) {
          const params = extensions[PerMessageDeflate2.extensionName].params;
          const value = extension2.format({
            [PerMessageDeflate2.extensionName]: [params]
          });
          headers.push(`Sec-WebSocket-Extensions: ${value}`);
          ws._extensions = extensions;
        }
        this.emit("headers", headers, req);
        socket.write(headers.concat("\r\n").join("\r\n"));
        socket.removeListener("error", socketOnError);
        ws.setSocket(socket, head, {
          allowSynchronousEvents: this.options.allowSynchronousEvents,
          maxBufferedChunks: this.options.maxBufferedChunks,
          maxFragments: this.options.maxFragments,
          maxPayload: this.options.maxPayload,
          skipUTF8Validation: this.options.skipUTF8Validation
        });
        if (this.clients) {
          this.clients.add(ws);
          ws.on("close", () => {
            this.clients.delete(ws);
            if (this._shouldEmitClose && !this.clients.size) {
              process.nextTick(emitClose, this);
            }
          });
        }
        cb(ws, req);
      }
    };
    module2.exports = WebSocketServer2;
    function addListeners(server, map) {
      for (const event of Object.keys(map)) server.on(event, map[event]);
      return function removeListeners() {
        for (const event of Object.keys(map)) {
          server.removeListener(event, map[event]);
        }
      };
    }
    function emitClose(server) {
      server._state = CLOSED;
      server.emit("close");
    }
    function socketOnError() {
      this.destroy();
    }
    function abortHandshake(socket, code, message, headers) {
      message = message || http2.STATUS_CODES[code];
      headers = {
        Connection: "close",
        "Content-Type": "text/html",
        "Content-Length": Buffer.byteLength(message),
        ...headers
      };
      socket.once("finish", socket.destroy);
      socket.end(
        `HTTP/1.1 ${code} ${http2.STATUS_CODES[code]}\r
` + Object.keys(headers).map((h) => `${h}: ${headers[h]}`).join("\r\n") + "\r\n\r\n" + message
      );
    }
    function abortHandshakeOrEmitwsClientError(server, req, socket, code, message, headers) {
      if (server.listenerCount("wsClientError")) {
        const err = new Error(message);
        Error.captureStackTrace(err, abortHandshakeOrEmitwsClientError);
        server.emit("wsClientError", err, socket, req);
      } else {
        abortHandshake(socket, code, message, headers);
      }
    }
  }
});

// server/chat.js
var import_node_crypto = require("node:crypto");
function createChat({ connections, send, clock = Date.now }) {
  const limits = /* @__PURE__ */ new Map();
  function handle(player, data) {
    const fail = (message) => {
      throw Error(message);
    };
    if (!["world", "map", "whisper"].includes(data.channel)) fail("invalid_channel");
    if (typeof data.text !== "string" || data.text.length > 1e3) fail("invalid_text");
    const text = data.text.normalize("NFC").replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g, " ").replace(/\s+/gu, " ").trim();
    if (!text || Array.from(text).length > 200) fail("invalid_text");
    const now = clock(), key = player.account || player.id;
    for (const [id, v] of limits) if (now - v.at > 6e4) limits.delete(id);
    const rate = limits.get(key) || { at: 0, times: [] };
    rate.times = rate.times.filter((t) => now - t < 1e4);
    if (rate.times.length >= 5 || rate.times.length && now - rate.at < 700) fail("chat_rate_limit");
    rate.at = now;
    rate.times.push(now);
    limits.set(key, rate);
    const peers = [...connections].filter((ws) => ws.readyState === 1 && ws.player?.());
    let recipient = null;
    if (data.channel === "whisper") {
      const matches = peers.map((ws) => ws.player()).filter((p) => data.to ? p.id === data.to : p.s.name === data.toName);
      if (matches.length !== 1) fail(matches.length > 1 ? "ambiguous_name" : "player_offline");
      recipient = matches[0];
      if (recipient.id === player.id) fail("self_whisper");
    }
    const packet = { type: "chat", id: (0, import_node_crypto.randomUUID)(), channel: data.channel, text, at: now, from: player.id, name: player.s.name, to: recipient?.id, toName: recipient?.s.name };
    for (const ws of peers) {
      const p = ws.player();
      if (data.channel === "world" || data.channel === "map" && p.map === player.map || data.channel === "whisper" && (p.id === player.id || p.id === recipient.id)) send(ws, packet);
    }
    return packet;
  }
  return { handle };
}

// server/commerce.js
var import_node_crypto2 = require("node:crypto");
var import_node_fs = require("node:fs");
var import_node_path = require("node:path");

// web/daily-activities.js
var dayKey = (now = Date.now()) => new Date(now + 7 * 36e5).toISOString().slice(0, 10);
var DAILY_TASKS = [{ id: "hunt", name: "\u0E25\u0E48\u0E32\u0E21\u0E2D\u0E19\u0E2A\u0E40\u0E15\u0E2D\u0E23\u0E4C 100 \u0E15\u0E31\u0E27", target: 100, g: 5e3, alloy: 3 }, { id: "boss", name: "\u0E1B\u0E23\u0E32\u0E1A\u0E1A\u0E2D\u0E2A 3 \u0E15\u0E31\u0E27", target: 3, g: 1e4, alloy: 5 }, { id: "upgrade", name: "\u0E15\u0E35\u0E1A\u0E27\u0E01\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08 1 \u0E04\u0E23\u0E31\u0E49\u0E07", target: 1, g: 2e3, alloy: 2 }];
function dailyState(s, now = Date.now()) {
  const day = dayKey(now);
  if (s.dailyActivities?.day !== day) s.dailyActivities = { day, hunt: 0, boss: 0, upgrade: 0, claimed: [] };
  return s.dailyActivities;
}
function countActivity(s, id, now = Date.now()) {
  const d = dailyState(s, now);
  if (DAILY_TASKS.some((t) => t.id === id)) d[id] = Math.min(1e5, (d[id] || 0) + 1);
}
function claimActivity(s, id, now = Date.now()) {
  const t = DAILY_TASKS.find((t2) => t2.id === id), d = dailyState(s, now);
  if (!t || d.claimed.includes(id) || (d[id] || 0) < t.target) return false;
  s.gold += t.g;
  s.upgradeItems.alloy = Math.min(99999, (s.upgradeItems.alloy || 0) + t.alloy);
  d.claimed.push(id);
  return true;
}
function normalizeActivities(s, v) {
  const d = v.dailyActivities;
  if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d.day)) return;
  s.dailyActivities = { day: d.day, claimed: Array.isArray(d.claimed) ? d.claimed.filter((id) => DAILY_TASKS.some((t) => t.id === id)) : [] };
  for (const t of DAILY_TASKS) s.dailyActivities[t.id] = Number.isFinite(d[t.id]) ? Math.max(0, Math.min(1e5, Math.floor(d[t.id]))) : 0;
}

// web/enhancement.js
var ENHANCE_SLOTS = ["weapon", "ring", "amulet"];
var MAX_PLUS = 9;
var SPECIALS = [
  { id: "hp25", name: "\u0E1F\u0E37\u0E49\u0E19 HP 25% \u0E17\u0E38\u0E01 2 \u0E27\u0E34\u0E19\u0E32\u0E17\u0E35", stat: "hpRegen", value: 0.25, weight: 5 },
  { id: "mp10", name: "\u0E1F\u0E37\u0E49\u0E19 MP 10% \u0E17\u0E38\u0E01 2 \u0E27\u0E34\u0E19\u0E32\u0E17\u0E35", stat: "mpRegen", value: 0.1, weight: 20 },
  { id: "crit5", name: "\u0E42\u0E2D\u0E01\u0E32\u0E2A\u0E04\u0E23\u0E34\u0E15\u0E34\u0E04\u0E2D\u0E25 +5%", stat: "crit", value: 0.05, weight: 20 },
  { id: "atk30", name: "\u0E42\u0E08\u0E21\u0E15\u0E35 +30", stat: "atk", value: 30, weight: 25 },
  { id: "def20", name: "\u0E1B\u0E49\u0E2D\u0E07\u0E01\u0E31\u0E19 +20", stat: "def", value: 20, weight: 20 },
  { id: "hp300", name: "HP \u0E2A\u0E39\u0E07\u0E2A\u0E38\u0E14 +300", stat: "hp", value: 300, weight: 10 }
];
var specialInfo = (id) => SPECIALS.find((x) => x.id === id);
var auraLevel = (s) => Math.max(0, ...ENHANCE_SLOTS.map((k) => Math.min(9, s.equip?.[k]?.plus || 0)));
function rerollSpecial(s, slot, rng = Math.random) {
  const it = s.equip?.[slot];
  if (!ENHANCE_SLOTS.includes(slot) || !it || !(s.upgradeItems?.meteor >= 1)) return false;
  let n = Math.min(0.999999, Math.max(0, rng())) * 100, choice = SPECIALS.at(-1);
  for (const row of SPECIALS) {
    n -= row.weight;
    if (n < 0) {
      choice = row;
      break;
    }
  }
  s.upgradeItems.meteor--;
  it.previousSpecial = it.special || null;
  it.special = choice.id;
  it.rollRevision = (it.rollRevision || 0) + 1;
  it.restoreAvailable = true;
  return true;
}
function restoreTarget(s, slot) {
  const it = s.equip?.[slot];
  return ENHANCE_SLOTS.includes(slot) && it?.restoreAvailable ? { itemId: it.id, revision: it.rollRevision } : null;
}
function restoreSpecial(s, target) {
  const it = [...Object.values(s.equip || {}), ...s.bag || []].find((x) => x?.id === target?.itemId);
  if (!it?.restoreAvailable || it.rollRevision !== target.revision) return false;
  it.special = it.previousSpecial || null;
  it.previousSpecial = null;
  it.restoreAvailable = false;
  return true;
}
function specialFields(it) {
  return { special: specialInfo(it.special)?.id || null, previousSpecial: specialInfo(it.previousSpecial)?.id || null, rollRevision: Number.isSafeInteger(it.rollRevision) && it.rollRevision >= 0 ? it.rollRevision : 0, restoreAvailable: it.restoreAvailable === true };
}
function applyRegen(p, dt, maxHP2, maxMP) {
  if (p.hp <= 0) {
    p.regenClock = 0;
    return;
  }
  p.regenClock = (p.regenClock || 0) + Math.max(0, dt);
  if (p.regenClock < 2) return;
  const ticks = Math.floor(p.regenClock / 2);
  p.regenClock %= 2;
  let hp = 0, mp = 0;
  for (const slot of ENHANCE_SLOTS) {
    const opt = specialInfo(p.s.equip?.[slot]?.special);
    if (opt?.stat === "hpRegen") hp += opt.value;
    if (opt?.stat === "mpRegen") mp += opt.value;
  }
  p.hp = Math.min(maxHP2, p.hp + maxHP2 * hp * ticks);
  p.mp = Math.min(maxMP, (p.mp || 0) + maxMP * mp * ticks);
}
function exchangeGold(s, amount) {
  if (!Number.isSafeInteger(amount) || amount < 1 || amount > 1e3 || s.stones < amount || s.gold + amount * 1e4 > 1e10) return false;
  s.stones -= amount;
  s.gold += amount * 1e4;
  return true;
}

// web/upgrade-items.js
var UPGRADE_ITEMS = {
  alloy: { name: "\u0E42\u0E25\u0E2B\u0E30\u0E40\u0E2A\u0E23\u0E34\u0E21\u0E1E\u0E25\u0E31\u0E07", price: 15, description: "\u0E27\u0E31\u0E2A\u0E14\u0E38\u0E15\u0E35\u0E1A\u0E27\u0E01 +1 \u0E16\u0E36\u0E07 +9 \u2022 \u0E43\u0E0A\u0E49\u0E15\u0E32\u0E21\u0E02\u0E31\u0E49\u0E19", icon: "items/glowstone.webp" },
  meteor: { name: "\u0E2B\u0E34\u0E19\u0E2D\u0E38\u0E01\u0E32\u0E1A\u0E32\u0E28", price: 20, description: "\u0E2A\u0E38\u0E48\u0E21\u0E04\u0E38\u0E13\u0E2A\u0E21\u0E1A\u0E31\u0E15\u0E34\u0E1E\u0E34\u0E40\u0E28\u0E29 \u2022 \u0E1F\u0E37\u0E49\u0E19 HP 25% \u0E21\u0E35\u0E42\u0E2D\u0E01\u0E32\u0E2A 5%", icon: "items/meteor.webp" },
  crystal: { name: "\u0E1C\u0E25\u0E36\u0E01", price: 35, description: "\u0E40\u0E2A\u0E23\u0E34\u0E21\u0E42\u0E08\u0E21\u0E15\u0E35 +8 \u0E15\u0E48\u0E2D\u0E02\u0E31\u0E49\u0E19", stat: "atk", amount: 8, icon: "items/crystal.webp" },
  glowstone: { name: "\u0E2B\u0E34\u0E19\u0E40\u0E23\u0E37\u0E2D\u0E07\u0E41\u0E2A\u0E07", price: 35, description: "\u0E40\u0E2A\u0E23\u0E34\u0E21\u0E1B\u0E49\u0E2D\u0E07\u0E01\u0E31\u0E19 +4 \u0E15\u0E48\u0E2D\u0E02\u0E31\u0E49\u0E19", stat: "def", amount: 4, icon: "items/glowstone.webp" },
  diamond: { name: "\u0E40\u0E1E\u0E0A\u0E23", price: 60, description: "\u0E40\u0E2A\u0E23\u0E34\u0E21\u0E42\u0E2D\u0E01\u0E32\u0E2A\u0E04\u0E23\u0E34\u0E15\u0E34\u0E04\u0E2D\u0E25 +0.5% \u0E15\u0E48\u0E2D\u0E02\u0E31\u0E49\u0E19", stat: "crit", amount: 5e-3, icon: "items/diamond.webp" },
  ruby: { name: "\u0E17\u0E31\u0E1A\u0E17\u0E34\u0E21", price: 40, description: "\u0E40\u0E2A\u0E23\u0E34\u0E21 HP +60 \u0E15\u0E48\u0E2D\u0E02\u0E31\u0E49\u0E19", stat: "hp", amount: 60, icon: "items/ruby.webp" }
};
var GEM_IDS = ["crystal", "glowstone", "diamond", "ruby"];
var GEM_CAP = 1;
var bounded = (v, max) => Number.isFinite(v) ? Math.max(0, Math.min(max, Math.floor(v))) : 0;
function normalizeUpgradeItems(s, v = s) {
  s.upgradeItems = Object.fromEntries(Object.keys(UPGRADE_ITEMS).map((id) => [id, bounded(v.upgradeItems?.[id], 99999)]));
  return s;
}
function normalizeGems(gems) {
  return Object.fromEntries(GEM_IDS.map((id) => [id, bounded(gems?.[id], GEM_CAP)]));
}
function socketGem(s, slot, id) {
  if (!GEM_IDS.includes(id) || !ENHANCE_SLOTS.includes(slot)) return false;
  const it = s.equip?.[slot];
  if (!it) return false;
  normalizeUpgradeItems(s);
  if (s.upgradeItems[id] < 1) return false;
  const old = GEM_IDS.find((k) => (it.gems?.[k] || 0) > 0);
  if (old === id) return false;
  if (old && s.upgradeItems[old] >= 99999) return false;
  s.upgradeItems[id]--;
  if (old) s.upgradeItems[old]++;
  it.gems = normalizeGems({ [id]: 1 });
  return true;
}

// web/gear.js
var SLOTS = {
  weapon: { name: "\u0E2D\u0E32\u0E27\u0E38\u0E18", atk: 9 },
  helm: { name: "\u0E2B\u0E21\u0E27\u0E01\u0E40\u0E01\u0E23\u0E32\u0E30", def: 1.2, hp: 22 },
  armor: { name: "\u0E40\u0E01\u0E23\u0E32\u0E30\u0E2D\u0E01", def: 2.2, hp: 40 },
  gloves: { name: "\u0E16\u0E38\u0E07\u0E21\u0E37\u0E2D", def: 0.8, atk: 3 },
  boots: { name: "\u0E23\u0E2D\u0E07\u0E40\u0E17\u0E49\u0E32", def: 0.8, speed: 3 },
  wings: { name: "\u0E1B\u0E35\u0E01\u0E1E\u0E25\u0E31\u0E07\u0E07\u0E32\u0E19", atk: 4, def: 1.2, hp: 20 },
  ring: { name: "\u0E41\u0E2B\u0E27\u0E19", crit: 0.012 },
  amulet: { name: "\u0E2A\u0E23\u0E49\u0E2D\u0E22\u0E1E\u0E25\u0E31\u0E07", mp: 14, spell: 0.03 }
};
var SLOT_ORDER = ["helm", "armor", "gloves", "boots", "weapon", "wings", "ring", "amulet"];
var TIERS = [
  { name: "\u0E1D\u0E36\u0E01\u0E2B\u0E31\u0E14", level: 1 },
  { name: "\u0E40\u0E2B\u0E25\u0E47\u0E01\u0E14\u0E32\u0E27", level: 10 },
  { name: "\u0E44\u0E04\u0E15\u0E34\u0E19\u0E2D\u0E33\u0E1E\u0E31\u0E19", level: 20 },
  { name: "\u0E04\u0E23\u0E34\u0E2A\u0E15\u0E31\u0E25\u0E44\u0E0B\u0E40\u0E1A\u0E2D\u0E23\u0E4C", level: 30 },
  { name: "\u0E19\u0E35\u0E2D\u0E2D\u0E19\u0E42\u0E04\u0E23", level: 40 },
  { name: "\u0E41\u0E01\u0E19\u0E14\u0E32\u0E27\u0E40\u0E1E\u0E25\u0E34\u0E07", level: 50 },
  ...Array.from({ length: 16 }, (_, i) => ({ name: "\u0E04\u0E27\u0E2D\u0E19\u0E15\u0E31\u0E21 Mk." + (i + 6), level: (i + 6) * 10 }))
];
var RARITY = [
  { name: "\u0E18\u0E23\u0E23\u0E21\u0E14\u0E32", color: "#e9e4d6", mult: 1 },
  { name: "\u0E14\u0E35\u0E40\u0E22\u0E35\u0E48\u0E22\u0E21", color: "#5aa8ff", mult: 1.25 },
  { name: "\u0E2B\u0E32\u0E22\u0E32\u0E01", color: "#4ff08a", mult: 1.6 },
  { name: "\u0E15\u0E33\u0E19\u0E32\u0E19", color: "#ffb440", mult: 2.1 }
];
var BAG_SIZE = 40;
var tierForLevel = (level) => TIERS.reduce((t, x, i) => level >= x.level ? i : t, 0);
function itemStats(it) {
  const base = SLOTS[it.slot], k = (1 + it.tier * 1.15) * RARITY[it.rarity].mult * (1 + Math.max(it.plus || 0, it.legacyPlus || 0) * 0.08), o = {};
  for (const key of ["atk", "def", "hp", "crit", "speed", "mp", "spell"]) if (base[key]) o[key] = +(base[key] * k).toFixed(key === "crit" || key === "spell" ? 3 : 1);
  for (const id of GEM_IDS) {
    const n = normalizeGems(it.gems)[id], g = UPGRADE_ITEMS[id];
    if (n) o[g.stat] = +((o[g.stat] || 0) + n * g.amount).toFixed(g.stat === "crit" ? 3 : 1);
  }
  const opt = specialInfo(it.special);
  if (opt && !["hpRegen", "mpRegen"].includes(opt.stat)) o[opt.stat] = (o[opt.stat] || 0) + opt.value;
  return o;
}
function sellPrice(it) {
  return Math.round(40 * (1 + it.tier) ** 2 * RARITY[it.rarity].mult);
}
function gearTotals(s) {
  const t = { atk: 0, def: 0, hp: 0, crit: 0, speed: 0, mp: 0, spell: 0 };
  for (const it of Object.values(s.equip || {})) if (it) for (const [k, v] of Object.entries(itemStats(it))) t[k] += v;
  return t;
}
var uid = 0;
function makeItem(slot, tier, rarity, rng = Math.random) {
  return { id: Date.now().toString(36) + (uid++).toString(36) + Math.floor(rng() * 1e4).toString(36), slot, tier, rarity, plus: 0, ...specialFields({}) };
}
function rollDrop(m, rng = Math.random) {
  const chance = m.boss ? 1 : m.elite ? 0.15 : 0.01;
  if (rng() >= chance) return null;
  const slot = SLOT_ORDER[Math.floor(rng() * SLOT_ORDER.length)], tier = tierForLevel(m.level);
  const r = rng();
  let rarity = r < 0.04 ? 3 : r < 0.16 ? 2 : r < 0.45 ? 1 : 0;
  if (m.boss) rarity = Math.max(2, rarity);
  else if (m.elite) rarity = Math.max(1, rarity);
  return makeItem(slot, tier, rarity, rng);
}
function canEquip(s, it) {
  return s.level >= TIERS[it.tier].level;
}
function equip(s, id) {
  const i = s.bag.findIndex((x) => x.id === id);
  if (i < 0) return "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E44\u0E2D\u0E40\u0E17\u0E47\u0E21";
  const it = s.bag[i];
  if (!canEquip(s, it)) return `\u0E15\u0E49\u0E2D\u0E07\u0E40\u0E25\u0E40\u0E27\u0E25 ${TIERS[it.tier].level}`;
  s.bag.splice(i, 1);
  const old = s.equip[it.slot];
  if (old) s.bag.push(old);
  s.equip[it.slot] = it;
  return null;
}
function unequip(s, slot) {
  const it = s.equip[slot];
  if (!it) return "\u0E0A\u0E48\u0E2D\u0E07\u0E27\u0E48\u0E32\u0E07";
  if (s.bag.length >= BAG_SIZE) return "\u0E01\u0E23\u0E30\u0E40\u0E1B\u0E4B\u0E32\u0E40\u0E15\u0E47\u0E21";
  s.bag.push(it);
  s.equip[slot] = null;
  return null;
}
function sell(s, id) {
  const i = s.bag.findIndex((x) => x.id === id);
  if (i < 0) return 0;
  const [it] = s.bag.splice(i, 1), g = sellPrice(it);
  s.gold += g;
  return g;
}
function freshGear(s) {
  s.equip = Object.fromEntries(SLOT_ORDER.map((k) => [k, null]));
  s.equip.weapon = makeItem("weapon", 0, 0);
  s.equip.armor = makeItem("armor", 0, 0);
  s.bag = [makeItem("helm", 0, 1), makeItem("boots", 0, 0), makeItem("wings", 0, 1)];
  return s;
}
var validItem = (it) => it && typeof it.id === "string" && SLOTS[it.slot] && Number.isInteger(it.tier) && it.tier >= 0 && it.tier < TIERS.length && Number.isInteger(it.rarity) && it.rarity >= 0 && it.rarity < RARITY.length;
function normalizeGear(s, v = {}) {
  if (!v.equip && !v.bag) return freshGear(s);
  s.equip = Object.fromEntries(SLOT_ORDER.map((k) => {
    const it = v.equip?.[k];
    return [k, validItem(it) && it.slot === k ? { id: it.id.slice(0, 40), slot: k, tier: it.tier, rarity: it.rarity, plus: Math.max(0, Math.min(ENHANCE_SLOTS.includes(it.slot) ? 9 : 15, Math.floor(it.plus || 0))), ...specialFields(it), ...it.legacyPlus ? { legacyPlus: Math.min(15, it.legacyPlus) } : {}, ...it.gems ? { gems: normalizeGems(it.gems) } : {} } : null];
  }));
  s.bag = (Array.isArray(v.bag) ? v.bag : []).filter(validItem).slice(0, BAG_SIZE).map((it) => ({ id: it.id.slice(0, 40), slot: it.slot, tier: it.tier, rarity: it.rarity, plus: Math.max(0, Math.min(ENHANCE_SLOTS.includes(it.slot) ? 9 : 15, Math.floor(it.plus || 0))), ...specialFields(it), ...it.legacyPlus ? { legacyPlus: Math.min(15, it.legacyPlus) } : {}, ...it.gems ? { gems: normalizeGems(it.gems) } : {} }));
  return s;
}
var gearUpgradeCost = (it) => 20 * ((it.plus || 0) + 1) + it.tier * 5;
var gearUpgradeG = (it) => 500 * ((it.plus || 0) + 1) ** 2;
function upgradeGear(s, slot) {
  const it = s.equip?.[slot];
  if (!ENHANCE_SLOTS.includes(slot) || !it || (it.plus || 0) >= MAX_PLUS) return false;
  normalizeUpgradeItems(s);
  const cost = gearUpgradeCost(it), g = gearUpgradeG(it), n = (it.plus || 0) + 1;
  if (!Number.isFinite(s.stones) || s.stones < cost || s.gold < g || s.upgradeItems.alloy < n) return false;
  s.stones -= cost;
  s.gold -= g;
  s.upgradeItems.alloy -= n;
  it.plus = n;
  countActivity(s, "upgrade");
  return true;
}
function gearShopPrice(slot, tier) {
  return slot === "weapon" ? 1e3 + 500 * tier * tier : 600 + 250 * tier * tier;
}
function buyShopGear(s, slot, tier = tierForLevel(s.level)) {
  if (!ENHANCE_SLOTS.includes(slot) || s.bag.length >= BAG_SIZE || !Number.isInteger(tier) || !TIERS[tier] || s.level < TIERS[tier].level) return false;
  const cost = gearShopPrice(slot, tier);
  const currency = slot === "weapon" ? "gold" : "stones";
  if (!Number.isFinite(s[currency]) || s[currency] < cost) return false;
  s[currency] -= cost;
  s.bag.push(makeItem(slot, tier, 2));
  return true;
}

// web/exp-tickets.js
var EXP_DURATION = 36e5;
var EXP_TICKETS = Object.freeze({
  x2: { name: "\u0E15\u0E31\u0E4B\u0E27 EXP \xD72", multiplier: 2, price: 5e4 },
  x5: { name: "\u0E15\u0E31\u0E4B\u0E27 EXP \xD75", multiplier: 5, price: 15e4 },
  x10: { name: "\u0E15\u0E31\u0E4B\u0E27 EXP \xD710", multiplier: 10, price: 35e4 }
});
function normalizeExpTickets(s, v = s, now = Date.now()) {
  s.expTickets = Object.fromEntries(Object.keys(EXP_TICKETS).map((id) => [id, Number.isSafeInteger(v.expTickets?.[id]) ? Math.max(0, Math.min(99999, v.expTickets[id])) : 0]));
  const b = v.expBoost;
  s.expBoost = b && Object.hasOwn(EXP_TICKETS, b.id) && Number.isFinite(b.until) && b.until > now ? { id: b.id, until: Math.min(b.until, now + EXP_DURATION) } : null;
}
function expMultiplier(s, now = Date.now()) {
  return s.expBoost?.until > now ? EXP_TICKETS[s.expBoost.id]?.multiplier || 1 : 1;
}
function buyExpTicket(s, id) {
  if (!Object.hasOwn(EXP_TICKETS, id)) return false;
  const it = EXP_TICKETS[id];
  if (!Number.isFinite(s.gold) || s.gold < it.price || (s.expTickets?.[id] || 0) >= 99999) return false;
  s.expTickets ??= {};
  s.gold -= it.price;
  s.expTickets[id] = (s.expTickets[id] || 0) + 1;
  return true;
}
function useExpTicket(s, id, replaceUntil = 0, now = Date.now()) {
  if (!Object.hasOwn(EXP_TICKETS, id) || !Number.isSafeInteger(s.expTickets?.[id]) || s.expTickets[id] < 1) return false;
  if (s.expBoost?.until > now && replaceUntil !== s.expBoost.until) return false;
  s.expTickets[id]--;
  s.expBoost = { id, until: now + EXP_DURATION };
  return true;
}

// server/commerce.js
var CAPS = { gold: 1e10, stones: 1e7 };
var integer = (n, max) => Number.isSafeInteger(n) && n > 0 && n <= max;
function need(ok, message) {
  if (!ok) throw Error(message);
}
function take(s, kind, id, quantity) {
  need(integer(quantity, 99999), "invalid_quantity");
  if (kind === "gear") {
    need(quantity === 1, "invalid_quantity");
    const i = s.bag.findIndex((it) => it.id === id);
    need(i >= 0, "item_missing");
    return { kind, id, quantity: 1, item: s.bag.splice(i, 1)[0] };
  }
  const [holder, key] = stack(s, kind, id);
  need((holder[key] || 0) >= quantity, "item_missing");
  holder[key] -= quantity;
  return { kind, id, quantity };
}
function stack(s, kind, id) {
  if (kind === "material" && Object.hasOwn(UPGRADE_ITEMS, id)) return [s.upgradeItems, id];
  if (kind === "ticket" && Object.hasOwn(EXP_TICKETS, id)) return [s.expTickets, id];
  if (kind === "potion" && ["hp", "mp"].includes(id)) return [s, id === "hp" ? "potions" : "mpPotions"];
  throw Error("item_not_transferable");
}
function give(s, cargo) {
  if (cargo.kind === "gear") {
    need(s.bag.length < BAG_SIZE, "bag_full");
    need(!s.bag.some((it) => it.id === cargo.item.id) && !Object.values(s.equip).some((it) => it?.id === cargo.item.id), "duplicate_item");
    s.bag.push(structuredClone(cargo.item));
    return;
  }
  const [holder, key] = stack(s, cargo.kind, cargo.id);
  need((holder[key] || 0) + cargo.quantity <= 99999, "bag_full");
  holder[key] = (holder[key] || 0) + cargo.quantity;
}
function createCommerce(directory, { players, getActor = (id) => players().get(id), capture = () => {
}, writeHook } = {}) {
  const ledgerPath = (0, import_node_path.join)(directory, "commerce.json"), walPath = (0, import_node_path.join)(directory, "commerce-pending.json");
  let failed = false;
  const syncDir = () => {
    const fd = (0, import_node_fs.openSync)(directory, "r");
    try {
      (0, import_node_fs.fsyncSync)(fd);
    } finally {
      (0, import_node_fs.closeSync)(fd);
    }
  };
  const write2 = (file, value) => {
    (0, import_node_fs.writeFileSync)(file + ".tmp", JSON.stringify(value), { mode: 384 });
    const fd = (0, import_node_fs.openSync)(file + ".tmp", "r");
    try {
      (0, import_node_fs.fsyncSync)(fd);
    } finally {
      (0, import_node_fs.closeSync)(fd);
    }
    (0, import_node_fs.renameSync)(file + ".tmp", file);
    syncDir();
  };
  function apply(tx) {
    for (const [id, s] of Object.entries(tx.characters)) {
      need(/^[a-f0-9]{64}$/.test(id), "invalid_character");
      write2((0, import_node_path.join)(directory, id + ".json"), s);
    }
    write2(ledgerPath, tx.ledger);
    (0, import_node_fs.unlinkSync)(walPath);
    syncDir();
  }
  if ((0, import_node_fs.existsSync)(walPath)) apply(JSON.parse((0, import_node_fs.readFileSync)(walPath, "utf8")));
  let ledger = (0, import_node_fs.existsSync)(ledgerPath) ? JSON.parse((0, import_node_fs.readFileSync)(ledgerPath, "utf8")) : { revision: 0, vaults: {}, shops: {} };
  const grants = /* @__PURE__ */ new WeakMap(), attempts = /* @__PURE__ */ new Map();
  const unlocked2 = (p) => {
    const g = grants.get(p), v = ledger.vaults[p.account];
    return !!(g && g.until > Date.now() && v?.pinHash && g.hash === v.pinHash);
  };
  const lockVault = (p) => grants.delete(p);
  function verifyPin(p, pin) {
    const now = Date.now();
    for (const [key, a2] of attempts) if (now - a2.at > 3e5) attempts.delete(key);
    const a = attempts.get(p.account) || { count: 0, at: now };
    need(a.count < 5, "vault_rate_limit");
    a.count++;
    a.at = now;
    attempts.set(p.account, a);
    const v = ledger.vaults[p.account];
    need(v?.pinHash, "vault_setup_required");
    need(typeof pin === "string" && /^\d{6}$/.test(pin), "invalid_pin");
    const hash4 = (0, import_node_crypto2.scryptSync)(pin, v.pinSalt, 32);
    need((0, import_node_crypto2.timingSafeEqual)(hash4, Buffer.from(v.pinHash, "hex")), "wrong_pin");
    attempts.delete(p.account);
    grants.set(p, { hash: v.pinHash, until: now + 3e5 });
  }
  const vault = (l, account) => l.vaults[account] ??= { gold: 0, stones: 0, items: [] };
  function ready(p) {
    need(!failed, "save_unavailable");
    need(p && players().get(p.id) === p && !p.offline, "seller_offline");
    need(!p.economyBusy, "account_busy");
    need(p.map === "town" && p.hp > 0 && Date.now() / 1e3 - (p.lastPvp ?? -Infinity) >= 10, "town_only");
  }
  function active(shop) {
    return shop.open;
  }
  function view(p) {
    const own = ledger.shops[p.account], v = ledger.vaults[p.account] || { gold: 0, stones: 0, items: [] };
    return { revision: ledger.revision, vaultSecurity: { supported: true, configured: !!v.pinHash, locked: !unlocked2(p) }, vault: unlocked2(p) ? structuredClone({ gold: v.gold, stones: v.stones, items: v.items }) : null, ownShop: structuredClone(own || { open: false, title: "", listings: [] }), shops: Object.values(ledger.shops).filter(active).map((shop) => ({ character: shop.character, title: shop.title, promotion: shop.promotion || "", name: shop.name, x: shop.x, y: shop.y, listings: structuredClone(shop.listings) })) };
  }
  function run(p, d) {
    ready(p);
    if (d.action === "view") return view(p);
    if (d.action === "lockVault") {
      lockVault(p);
      return view(p);
    }
    if (d.action === "unlockVault") {
      verifyPin(p, d.pin);
      return view(p);
    }
    if (["depositMoney", "withdrawMoney", "depositItem", "withdrawItem"].includes(d.action)) need(unlocked2(p), "vault_locked");
    need(d.revision === ledger.revision, "stale_market");
    const next = structuredClone(ledger), changed = /* @__PURE__ */ new Map();
    const state = (actor) => {
      if (!changed.has(actor)) {
        capture(actor);
        changed.set(actor, structuredClone(actor.s));
      }
      return changed.get(actor);
    };
    const s = state(p), v = vault(next, p.account);
    let shop = next.shops[p.account];
    switch (d.action) {
      case "setVaultPin":
      case "changeVaultPin": {
        if (v.pinHash) {
          need(d.action === "changeVaultPin", "vault_already_configured");
          verifyPin(p, d.oldPin);
        } else need(d.action === "setVaultPin", "vault_setup_required");
        need(typeof d.pin === "string" && /^\d{6}$/.test(d.pin), "invalid_pin");
        v.pinSalt = (0, import_node_crypto2.randomBytes)(16).toString("hex");
        v.pinHash = (0, import_node_crypto2.scryptSync)(d.pin, v.pinSalt, 32).toString("hex");
        break;
      }
      case "depositMoney":
      case "withdrawMoney": {
        need(Object.hasOwn(CAPS, d.currency), "invalid_currency");
        need(integer(d.amount, CAPS[d.currency]), "invalid_quantity");
        const [from, to] = d.action === "depositMoney" ? [s, v] : [v, s];
        need(from[d.currency] >= d.amount, "insufficient_funds");
        need(to[d.currency] + d.amount <= CAPS[d.currency], "wallet_full");
        from[d.currency] -= d.amount;
        to[d.currency] += d.amount;
        break;
      }
      case "depositItem":
        need(v.items.length < 120, "vault_full");
        v.items.push({ ...take(s, d.kind, d.id, d.quantity), key: (0, import_node_crypto2.randomUUID)() });
        break;
      case "withdrawItem": {
        const i = v.items.findIndex((it) => it.key === d.key);
        need(i >= 0, "item_missing");
        give(s, v.items[i]);
        v.items.splice(i, 1);
        break;
      }
      case "openShop": {
        need(typeof d.title === "string" && d.title.trim().length >= 2 && d.title.trim().length <= 32, "invalid_title");
        shop ??= { listings: [] };
        need(d.promotion === void 0 || typeof d.promotion === "string" && d.promotion.trim().length <= 120, "invalid_promotion");
        shop.promotion = (d.promotion ?? shop.promotion ?? "").trim();
        shop.title = d.title.trim();
        shop.open = true;
        shop.character = p.id;
        shop.name = p.name;
        shop.x = p.x;
        shop.y = p.y;
        next.shops[p.account] = shop;
        break;
      }
      case "updatePromotion":
        need(shop, "shop_missing");
        need(typeof d.promotion === "string" && d.promotion.trim().length <= 120, "invalid_promotion");
        shop.promotion = d.promotion.trim();
        break;
      case "closeShop":
        need(shop, "shop_missing");
        shop.open = false;
        break;
      case "listItem": {
        need(shop?.character === p.id, "shop_missing");
        need(shop.listings.length < 12, "shop_full");
        need(Object.hasOwn(CAPS, d.currency) && integer(d.price, CAPS[d.currency]), "invalid_price");
        shop.listings.push({ key: (0, import_node_crypto2.randomUUID)(), cargo: take(s, d.kind, d.id, d.quantity), currency: d.currency, price: d.price });
        break;
      }
      case "cancelListing": {
        need(shop, "shop_missing");
        const i = shop.listings.findIndex((it) => it.key === d.key);
        need(i >= 0, "item_missing");
        give(s, shop.listings[i].cargo);
        shop.listings.splice(i, 1);
        break;
      }
      case "buy": {
        const target = Object.entries(next.shops).find(([account, x]) => account !== p.account && x.character === d.seller);
        need(target, "shop_missing");
        const sale = target[1];
        need(active(sale), "seller_offline");
        const seller = getActor(sale.character);
        need(seller, "shop_missing");
        need(!seller.economyBusy, "account_busy");
        need(Math.hypot(p.x - sale.x, p.y - sale.y) <= 350, "seller_too_far");
        const i = sale.listings.findIndex((it) => it.key === d.key);
        need(i >= 0, "item_missing");
        const item = sale.listings[i];
        need(d.price === item.price && d.currency === item.currency, "price_changed");
        need(s[item.currency] >= item.price, "insufficient_funds");
        const recipient = state(seller);
        need(recipient[item.currency] + item.price <= CAPS[item.currency], "wallet_full");
        give(s, item.cargo);
        s[item.currency] -= item.price;
        recipient[item.currency] += item.price;
        sale.sales ??= [];
        sale.sales.push({ at: Date.now(), buyer: p.name, cargo: item.cargo, currency: item.currency, price: item.price });
        sale.sales = sale.sales.slice(-50);
        sale.listings.splice(i, 1);
        break;
      }
      default:
        throw Error("invalid_request");
    }
    next.revision++;
    const tx = { ledger: next, characters: Object.fromEntries([...changed].map(([actor, save]) => [actor.id, save])) };
    try {
      write2(walPath, tx);
      writeHook?.();
      apply(tx);
    } catch {
      failed = true;
      throw Error("save_unavailable");
    }
    ledger = next;
    if (["setVaultPin", "changeVaultPin"].includes(d.action)) grants.set(p, { hash: v.pinHash, until: Date.now() + 3e5 });
    for (const [actor, save] of changed) {
      actor.s = save;
      actor.dirty = false;
      actor.lastSaved = Date.now();
    }
    refreshSigns();
    return view(p);
  }
  function refreshSigns() {
    for (const p of players().values()) {
      const shop = ledger.shops[p.account];
      p.shopTitle = shop?.character === p.id && active(shop) ? shop.title : "";
    }
  }
  function removeAccount(account) {
    const next = structuredClone(ledger);
    delete next.vaults[account];
    delete next.shops[account];
    next.revision++;
    try {
      write2(walPath, { ledger: next, characters: {} });
      apply({ ledger: next, characters: {} });
      ledger = next;
    } catch {
      failed = true;
      throw Error("save_unavailable");
    }
  }
  const stalls = () => Object.values(ledger.shops).filter(active).map((x) => ({ character: x.character, title: x.title, promotion: x.promotion || "", name: x.name, x: x.x, y: x.y, count: x.listings.length }));
  const ownsListedItems = (account, id) => ledger.shops[account]?.character === id && ledger.shops[account].listings.length > 0;
  return { run, view, lockVault, refreshSigns, stalls, removeAccount, ownsListedItems, get failed() {
    return failed;
  } };
}

// server/play-billing.js
var import_node_crypto3 = require("node:crypto");
var import_node_fs2 = require("node:fs");
var import_node_path2 = require("node:path");

// web/gold-products.js
var GOLD_PRODUCTS = [
  { id: "cockro_gold_5000", gold: 5e3, thb: 30, title: "\u0E40\u0E23\u0E34\u0E48\u0E21\u0E15\u0E49\u0E19\u0E2E\u0E35\u0E42\u0E23\u0E48" },
  { id: "cockro_gold_20000", gold: 2e4, thb: 100, title: "\u0E40\u0E2A\u0E23\u0E34\u0E21\u0E1E\u0E25\u0E31\u0E07" },
  { id: "cockro_gold_150000", gold: 15e4, thb: 500, title: "\u0E22\u0E2D\u0E14\u0E19\u0E31\u0E01\u0E23\u0E1A" },
  { id: "cockro_gold_500000", gold: 5e5, thb: 1e3, title: "\u0E1E\u0E25\u0E31\u0E07\u0E23\u0E30\u0E14\u0E31\u0E1A\u0E40\u0E17\u0E1E" }
];

// server/play-billing.js
function validatePlayPurchase(data, { owner, character }) {
  if (data.purchaseState !== 0) throw Error("payment_pending");
  if (data.obfuscatedExternalAccountId !== owner || data.obfuscatedExternalProfileId !== character) throw Error("wrong_account");
  if ((data.quantity ?? 1) !== 1) throw Error("invalid_quantity");
}
function createPlayVerifier({ credentialsPath = process.env.GOOGLE_PLAY_CREDENTIALS, fetcher = fetch } = {}) {
  let credentials = null;
  try {
    if (credentialsPath) credentials = JSON.parse((0, import_node_fs2.readFileSync)(credentialsPath, "utf8"));
  } catch {
  }
  const enabled = !!(credentials?.client_email && credentials?.private_key);
  let cached = null;
  async function access() {
    if (!enabled) throw Error("billing_unavailable");
    if (cached && cached.until > Date.now()) return cached.token;
    const now = Math.floor(Date.now() / 1e3), enc = (v) => Buffer.from(JSON.stringify(v)).toString("base64url");
    const base = enc({ alg: "RS256", typ: "JWT" }) + "." + enc({ iss: credentials.client_email, scope: "https://www.googleapis.com/auth/androidpublisher", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 });
    const assertion = base + "." + (0, import_node_crypto3.createSign)("RSA-SHA256").update(base).sign(credentials.private_key, "base64url");
    const r = await fetcher("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }), signal: AbortSignal.timeout(15e3) });
    if (!r.ok) throw Error("billing_unavailable");
    const d = await r.json();
    if (!d.access_token) throw Error("billing_unavailable");
    cached = { token: d.access_token, until: Date.now() + 3e6 };
    return cached.token;
  }
  async function request(product, token, consume = false) {
    const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/com.sunantongsan.networkcokcro/purchases/products/${encodeURIComponent(product)}/tokens/${encodeURIComponent(token)}${consume ? ":consume" : ""}`;
    const r = await fetcher(url, { method: consume ? "POST" : "GET", headers: { Authorization: "Bearer " + await access() }, signal: AbortSignal.timeout(15e3) });
    if (!r.ok) throw Error(r.status >= 500 ? "verification_unavailable" : "purchase_not_verified");
    return consume ? null : r.json();
  }
  return { enabled, verify: (id, token) => request(id, token), consume: (id, token) => request(id, token, true) };
}
function createBillingService(directory, verifier = createPlayVerifier()) {
  const dir = (0, import_node_path2.join)(directory, "play-receipts");
  const locks = /* @__PURE__ */ new Set();
  const write2 = (path, data) => {
    (0, import_node_fs2.writeFileSync)(path + ".tmp", JSON.stringify(data), { mode: 384 });
    (0, import_node_fs2.renameSync)(path + ".tmp", path);
  };
  return { enabled: verifier.enabled, history(owner, offset = 0) {
    if (!Number.isSafeInteger(offset) || offset < 0 || offset > 1e6) throw Error("invalid_request");
    const records = (0, import_node_fs2.existsSync)(dir) ? (0, import_node_fs2.readdirSync)(dir).filter((f) => /^[a-f0-9]{64}\.json$/.test(f)).map((file) => ({ file, data: JSON.parse((0, import_node_fs2.readFileSync)((0, import_node_path2.join)(dir, file), "utf8")) })).filter((r) => r.data.owner === owner) : [];
    records.sort((a, b) => (b.data.created || 0) - (a.data.created || 0) || a.file.localeCompare(b.file));
    return { purchases: records.slice(offset, offset + 20).map(({ file, data: r }) => ({ reference: file.slice(0, 16), product: r.product, gold: r.gold, created: r.created, purchasedAt: r.purchasedAt || null, orderId: r.orderId || null, test: r.test === true, character: r.character, characterName: r.characterName || null, status: r.credited ? "credited" : "processing" })), nextOffset: offset + 20 < records.length ? offset + 20 : null };
  }, async redeem(p, { productId, token }, persist) {
    if (!verifier.enabled) throw Error("billing_unavailable");
    (0, import_node_fs2.mkdirSync)(dir, { recursive: true, mode: 448 });
    const product = GOLD_PRODUCTS.find((x) => x.id === productId);
    if (!product || typeof token !== "string" || token.length < 10 || token.length > 2048) throw Error("invalid_purchase");
    const hash4 = (0, import_node_crypto3.createHash)("sha256").update(token).digest("hex"), path = (0, import_node_path2.join)(dir, hash4 + ".json");
    if (locks.has(hash4)) throw Error("purchase_busy");
    locks.add(hash4);
    try {
      let record = (0, import_node_fs2.existsSync)(path) ? JSON.parse((0, import_node_fs2.readFileSync)(path, "utf8")) : null;
      if (record && (record.owner !== p.account || record.character !== p.id || record.product !== productId)) throw Error("wrong_account");
      if (record?.credited) {
        if (!record.consumed) {
          await verifier.consume(productId, token);
          record.consumed = true;
          write2(path, record);
        }
        return { gold: product.gold, duplicate: true };
      }
      const verified = await verifier.verify(productId, token);
      validatePlayPurchase(verified, { owner: p.account, character: p.id });
      if (verified.consumptionState === 1 && !record) throw Error("already_consumed");
      if (!record) {
        record = { owner: p.account, character: p.id, characterName: p.s.name || null, product: productId, gold: product.gold, credited: false, created: Date.now(), orderId: typeof verified.orderId === "string" ? verified.orderId.slice(0, 128) : null, purchasedAt: Number.isFinite(Number(verified.purchaseTimeMillis)) ? Number(verified.purchaseTimeMillis) : null, test: verified.purchaseType === 0 };
        write2(path, record);
      }
      const already = p.s.playReceipts?.includes(hash4);
      if (!already) {
        if (p.s.stones + product.gold > 1e7) throw Error("wallet_full");
        const next = structuredClone(p.s);
        next.stones += product.gold;
        next.playReceipts = [...next.playReceipts || [], hash4];
        persist({ id: p.id, s: next });
        p.s = next;
        p.dirty = false;
      }
      record.credited = true;
      write2(path, record);
      try {
        await verifier.consume(productId, token);
        record.consumed = true;
        write2(path, record);
      } catch {
        return { gold: product.gold, duplicate: !!already, consumePending: true };
      }
      return { gold: product.gold, duplicate: !!already };
    } finally {
      locks.delete(hash4);
    }
  } };
}

// server/state-wire.js
function stateForWire(data, cursor = 0) {
  if (data.type !== "state") return data;
  return { ...data, events: data.events.filter((e) => e.id > cursor) };
}

// web/loot-pets.js
var PET_PRICE = 2e4;
var PET_SEARCH_RADIUS = 400;
var PET_PICKUP_RADIUS = 45;
var LOOT_PETS = Object.freeze({ dog: { name: "\u0E2B\u0E21\u0E32", tile: 0 }, cat: { name: "\u0E41\u0E21\u0E27", tile: 1 }, chicken: { name: "\u0E44\u0E01\u0E48", tile: 2 }, tiger: { name: "\u0E40\u0E2A\u0E37\u0E2D", tile: 3 }, buffalo: { name: "\u0E04\u0E27\u0E32\u0E22", tile: 4 } });
function normalizePets(s, v = s) {
  const old = v.lootPets || {};
  const owned = Array.isArray(old.owned) ? [...new Set(old.owned.filter((id) => typeof id === "string" && Object.hasOwn(LOOT_PETS, id)))] : [];
  s.lootPets = { owned, active: owned.includes(old.active) ? old.active : null };
}
function buyPet(s, id) {
  if (typeof id !== "string" || !Object.hasOwn(LOOT_PETS, id)) return false;
  normalizePets(s);
  if (s.lootPets.owned.includes(id) || !Number.isFinite(s.gold) || s.gold < PET_PRICE) return false;
  s.gold -= PET_PRICE;
  s.lootPets.owned.push(id);
  s.lootPets.active = id;
  return true;
}
function equipPet(s, id) {
  normalizePets(s);
  if (id !== null && !s.lootPets.owned.includes(id)) return false;
  s.lootPets.active = id;
  return true;
}
function stepPet(p, loot, dt, now, trace) {
  const id = p.s.lootPets?.active;
  if (!id || !Object.hasOwn(LOOT_PETS, id) || p.hp <= 0 || p.offline) {
    p.pet = null;
    return;
  }
  if (!p.pet || p.pet.id !== id || p.pet.map !== p.map || Math.hypot(p.pet.x - p.x, p.pet.y - p.y) > 650) p.pet = { id, map: p.map, x: p.x, y: p.y, face: 1, moving: false };
  const pet = p.pet, targets = loot.filter((d2) => d2.owner === p.id && d2.map === p.map && now < d2.expires && now - d2.created >= 0.35 && Math.hypot(d2.x - p.x, d2.y - p.y) <= PET_SEARCH_RADIUS).sort((a, b) => Math.hypot(a.x - pet.x, a.y - pet.y) - Math.hypot(b.x - pet.x, b.y - pet.y));
  const target = targets.find((d2) => Math.hypot(trace(pet, d2).x - d2.x, trace(pet, d2).y - d2.y) < 1) || p;
  const dx = target.x - pet.x, dy = target.y - pet.y, d = Math.hypot(dx, dy), stop = target === p ? 65 : 8, step = Math.min(Math.max(0, d - stop), Math.max(0, Math.min(dt, 0.25)) * 360);
  pet.moving = step > 1;
  if (step) {
    const pos = trace(pet, { x: pet.x + dx / d * step, y: pet.y + dy / d * step });
    pet.face = dx - dy < 0 ? -1 : 1;
    pet.x = pos.x;
    pet.y = pos.y;
  }
}

// web/world-save.js
function normalizeWorldSave(s, v) {
  const w = v.worldState;
  if (w && ["town", "forest", "star"].includes(w.map) && ["x", "y", "hp", "mp"].every((k) => Number.isFinite(w[k])) && Math.abs(w.x) < 1e6 && Math.abs(w.y) < 1e6) {
    s.worldState = { map: w.map, x: w.x, y: w.y, hp: Math.max(0, w.hp), mp: Math.max(0, w.mp), cd: Object.fromEntries(Object.entries(w.cd || {}).filter(([k, n]) => /^[a-zA-Z0-9_-]{1,40}$/.test(k) && Number.isFinite(n) && n >= 0)), offlineSince: Number.isFinite(w.offlineSince) ? w.offlineSince : 0 };
  }
  s.pvpReports = (Array.isArray(v.pvpReports) ? v.pvpReports : []).filter((r) => r && typeof r.id === "string" && Number.isFinite(r.at)).slice(-30).map((r) => ({ id: r.id.slice(0, 80), at: r.at, opponent: String(r.opponent || "\u0E1C\u0E39\u0E49\u0E40\u0E25\u0E48\u0E19").slice(0, 40), result: ["won", "lost", "escaped", "interrupted"].includes(r.result) ? r.result : "interrupted", damageTaken: Math.max(0, Number(r.damageTaken) || 0), damageDealt: Math.max(0, Number(r.damageDealt) || 0), potions: Math.max(0, Number(r.potions) || 0), mpPotions: Math.max(0, Number(r.mpPotions) || 0), unread: r.unread !== false, pending: r.pending === true }));
}

// web/character-name.js
function characterName(value) {
  if (typeof value !== "string") return null;
  const name = value.normalize("NFC").trim().replace(/ +/g, " ");
  if (name.length < 2 || name.length > 20 || !/[\p{L}\p{N}]/u.test(name) || !/^[\p{L}\p{M}\p{N} _-]+$/u.test(name)) return null;
  return name;
}

// web/checkin.js
var DAILY_GOLD = [3, 4, 5, 6, 7, 8, 15];
var DAY = 864e5;
var thaiDay = (ms) => Math.floor((ms + 7 * 36e5) / DAY);
function normalizeCheckin(s, v = s) {
  const c = v.checkin || {};
  s.checkin = { lastDay: Number.isSafeInteger(c.lastDay) && c.lastDay >= 0 ? c.lastDay : null, streak: Number.isInteger(c.streak) ? Math.max(0, Math.min(7, c.streak)) : 0 };
  return s;
}
function checkinStatus(s, now = Date.now()) {
  const today = thaiDay(now), c = s.checkin || {}, last = c.lastDay;
  const claimed = Number.isInteger(last) && last >= today;
  const day = claimed ? Math.max(1, c.streak || 1) : last === today - 1 ? (c.streak || 0) % 7 + 1 : 1;
  return { day, claimed, reward: DAILY_GOLD[day - 1], today };
}
function claimCheckin(s, now = Date.now()) {
  if (!Number.isFinite(now)) return 0;
  normalizeCheckin(s);
  const status = checkinStatus(s, now);
  if (status.claimed || s.stones > 1e7 - status.reward) return 0;
  s.stones += status.reward;
  s.checkin = { lastDay: status.today, streak: status.day };
  return status.reward;
}

// web/fashion.js
var FASHION_SETS = [
  { id: "cowboy", name: "\u0E04\u0E32\u0E27\u0E1A\u0E2D\u0E22\u0E1E\u0E40\u0E19\u0E08\u0E23", color: "#d5a86e", file: "fashion/cowboy.webp" },
  { id: "wuxia", name: "\u0E08\u0E2D\u0E21\u0E22\u0E38\u0E17\u0E18\u0E40\u0E21\u0E06\u0E32\u0E2B\u0E22\u0E01", color: "#7ed4b2", file: "fashion/wuxia.webp" },
  { id: "knight", name: "\u0E2D\u0E31\u0E28\u0E27\u0E34\u0E19\u0E14\u0E27\u0E07\u0E14\u0E32\u0E27", color: "#98bfff", file: "fashion/knight-open.webp" }
];
var FASHION_ITEMS = FASHION_SETS.flatMap((set) => [
  { id: set.id + "-hat", set: set.id, slot: "hat", name: { cowboy: "\u0E2B\u0E21\u0E27\u0E01\u0E04\u0E32\u0E27\u0E1A\u0E2D\u0E22\u0E40\u0E17\u0E2D\u0E23\u0E4C\u0E04\u0E27\u0E2D\u0E22\u0E0B\u0E4C", wuxia: "\u0E2B\u0E21\u0E27\u0E01\u0E08\u0E2D\u0E21\u0E22\u0E38\u0E17\u0E18\u0E2B\u0E22\u0E01", knight: "\u0E2B\u0E21\u0E27\u0E01\u0E2D\u0E31\u0E28\u0E27\u0E34\u0E19\u0E14\u0E27\u0E07\u0E14\u0E32\u0E27" }[set.id], file: set.file, color: set.color },
  { id: set.id + "-outfit", set: set.id, slot: "outfit", name: "\u0E0A\u0E38\u0E14" + set.name, file: set.file, color: set.color }
]);
var byId = new Map(FASHION_ITEMS.map((it) => [it.id, it]));
var fashionItem = (id) => byId.get(id) || null;
function normalizeFashion(s, v = s) {
  const raw = v.fashion;
  const owned = Array.isArray(raw?.owned) ? [...new Set(raw.owned.filter((id) => byId.has(id)))] : FASHION_ITEMS.map((it) => it.id);
  const equipped = { hat: null, outfit: null };
  for (const slot of ["hat", "outfit"]) {
    const id = raw?.equipped?.[slot];
    if (owned.includes(id) && byId.get(id)?.slot === slot) equipped[slot] = id;
  }
  s.fashion = { owned, equipped };
  return s.fashion;
}
function wearFashion(s, id) {
  const it = fashionItem(id);
  if (!it) return false;
  const f = s.fashion || normalizeFashion(s);
  if (!f.owned.includes(id)) return false;
  f.equipped[it.slot] = id;
  return true;
}
function removeFashion(s, slot) {
  if (slot !== "hat" && slot !== "outfit") return false;
  const f = s.fashion || normalizeFashion(s);
  f.equipped[slot] = null;
  return true;
}
function appearance(s) {
  return { ...s.fashion?.equipped || { hat: null, outfit: null } };
}

// web/balance.js
var BALANCE_VERSION = 2;
var normalXP = (level) => 20 + level * 8;
var killsPerLevel = (level) => Math.round(8 + 1.2 * level + 6e-3 * level * level);
var levelXP = (level) => normalXP(level) * killsPerLevel(level);
var manaRegen = (s) => 6.5 + Math.min(6, (s.attributes?.int || 0) * 0.02);
function monsterStats(level, { boss = false, elite = false, toughness = 1 } = {}) {
  const hp = (110 + level * 65 + level * level * 1.4) * (1 + 3 * (1 - Math.exp(-(level - 1) / 10)));
  return { hp: Math.round(hp * toughness * (boss ? 7 : elite ? 2.6 : 1)), damage: Math.round((12 + level * 5 + level * level * 0.09) * (boss ? 1.65 : elite ? 1.2 : 1)), xp: normalXP(level) * (boss ? 10 : elite ? 3 : 1), gold: Math.round((10 + level * 3) * (boss ? 8 : elite ? 3 : 1)) };
}

// web/forest-species.js
var DATA = [
  ["\u0E14\u0E49\u0E27\u0E07\u0E40\u0E02\u0E32\u0E1E\u0E25\u0E32\u0E2A\u0E21\u0E32", "Plasma charge", "#55e9ff", "charge", 280, 32],
  ["\u0E15\u0E31\u0E4A\u0E01\u0E41\u0E15\u0E19\u0E40\u0E04\u0E35\u0E22\u0E27\u0E42\u0E1F\u0E15\u0E2D\u0E19", "Twin photon blades", "#ffd45e", "twin", 230, 32],
  ["\u0E1C\u0E35\u0E40\u0E2A\u0E37\u0E49\u0E2D\u0E2A\u0E1B\u0E2D\u0E23\u0E4C\u0E40\u0E19\u0E1A\u0E34\u0E27\u0E25\u0E32", "Spore fan", "#d687ff", "fan", 280, 22],
  ["\u0E41\u0E21\u0E07\u0E21\u0E38\u0E21\u0E02\u0E14\u0E25\u0E27\u0E14\u0E2D\u0E33\u0E1E\u0E31\u0E19", "Web detonation", "#ff965e", "web", 290, 100],
  ["\u0E2B\u0E2D\u0E22\u0E40\u0E15\u0E32\u0E1B\u0E0F\u0E34\u0E01\u0E23\u0E13\u0E4C", "Reactor ring", "#7dff9b", "ring", 175, 70],
  ["\u0E2B\u0E19\u0E2D\u0E19\u0E2A\u0E27\u0E48\u0E32\u0E19\u0E41\u0E21\u0E01\u0E21\u0E32", "Drill lance", "#ff794b", "drill", 420, 24],
  ["\u0E41\u0E15\u0E19\u0E40\u0E02\u0E47\u0E21\u0E44\u0E17\u0E40\u0E17\u0E40\u0E19\u0E35\u0E22\u0E21", "Needle trident", "#ffe267", "needles", 340, 14],
  ["\u0E41\u0E21\u0E07\u0E1B\u0E48\u0E2D\u0E07\u0E2B\u0E31\u0E27\u0E09\u0E35\u0E14\u0E01\u0E23\u0E14", "Acid spray", "#b6ff53", "spray", 230, 100],
  ["\u0E1B\u0E39\u0E1B\u0E23\u0E34\u0E0B\u0E36\u0E21\u0E04\u0E23\u0E32\u0E21", "Prism cross", "#83a9ff", "cross", 190, 36],
  ["\u0E41\u0E21\u0E25\u0E07\u0E1B\u0E2D\u0E44\u0E2D\u0E2D\u0E2D\u0E19", "Ion rail", "#65f1ff", "rail", 500, 19],
  ["\u0E04\u0E32\u0E07\u0E04\u0E01\u0E41\u0E21\u0E48\u0E40\u0E2B\u0E25\u0E47\u0E01\u0E21\u0E48\u0E27\u0E07", "Magnetic pulse", "#c99eff", "magnet", 220, 125],
  ["\u0E42\u0E01\u0E40\u0E25\u0E21\u0E40\u0E15\u0E32\u0E2B\u0E25\u0E2D\u0E21", "Furnace rupture", "#ff9d59", "rupture", 300, 62],
  ["\u0E41\u0E21\u0E07\u0E01\u0E30\u0E1E\u0E23\u0E38\u0E19\u0E2D\u0E32\u0E23\u0E4C\u0E01\u0E1E\u0E25\u0E32\u0E2A\u0E21\u0E32", "Six arc discharge", "#ffa1f2", "arcs", 240, 20],
  ["\u0E04\u0E49\u0E32\u0E07\u0E04\u0E32\u0E27\u0E40\u0E2A\u0E35\u0E22\u0E07\u0E2A\u0E30\u0E17\u0E49\u0E2D\u0E19", "Ultrasonic cone", "#c4e7ff", "sonic", 330, 160],
  ["\u0E07\u0E39\u0E40\u0E2B\u0E48\u0E32\u0E40\u0E25\u0E40\u0E0B\u0E2D\u0E23\u0E4C\u0E2B\u0E22\u0E01", "Twin laser", "#92ffab", "lasers", 390, 22],
  ["\u0E40\u0E15\u0E48\u0E32\u0E1B\u0E37\u0E19\u0E43\u0E2B\u0E0D\u0E48\u0E2A\u0E38\u0E23\u0E34\u0E22\u0E30", "Triple artillery", "#ffe292", "artillery", 350, 65],
  ["\u0E2B\u0E21\u0E49\u0E2D\u0E02\u0E49\u0E32\u0E27\u0E19\u0E32\u0E42\u0E19\u0E40\u0E02\u0E35\u0E49\u0E22\u0E27\u0E41\u0E14\u0E07", "Root ambush", "#ff8d98", "roots", 250, 95],
  ["\u0E2D\u0E2A\u0E39\u0E23\u0E15\u0E32\u0E41\u0E01\u0E19\u0E41\u0E23\u0E07\u0E42\u0E19\u0E49\u0E21\u0E16\u0E48\u0E27\u0E07", "Gravity halo", "#b8a2ff", "gravity", 300, 150],
  ["\u0E15\u0E30\u0E02\u0E32\u0E1A\u0E25\u0E32\u0E27\u0E32\u0E42\u0E25\u0E2B\u0E30", "Magma fault", "#ff7356", "fault", 350, 45],
  ["\u0E27\u0E34\u0E2B\u0E04\u0E41\u0E2A\u0E07\u0E2A\u0E38\u0E23\u0E34\u0E22\u0E30", "Solar star", "#fff4ac", "solar", 290, 30]
];
var FOREST_SPECIES = DATA.map(([name, skillName, color, pattern, range, radius], species) => ({ name, skillName, color, pattern, range, radius, species, id: 1100 + species, min: species * 3 + 1, max: species * 3 + 3 }));
function forestMonster(level) {
  const sp = FOREST_SPECIES[Math.min(19, Math.floor((level - 1) / 3))];
  return { ...sp, ...monsterStats(level), level, region: Math.floor((level - 1) / 10), zone: 0, art: "forest-v2", slot: sp.species, boss: false, speed: 65 + sp.species % 5 * 7, attack: "signature", cooldown: 2.8 + sp.species % 4 * 0.25, xp: 20 + level * 8, gold: 10 + level * 3, hp: monsterStats(level).hp };
}
function monsterZones(e) {
  const d = e.def, a = e.angle || 0, ux = Math.cos(a), uy = Math.sin(a), o = { x: e.x, y: e.y }, r = d.range || 200, w = d.radius || 30;
  const aim = { x: e.aimX ?? e.x + ux * r, y: e.aimY ?? e.y + uy * r };
  const at = (along, side = 0) => ({ x: o.x + ux * along - uy * side, y: o.y + uy * along + ux * side });
  const disk = (c, radius, inner = 0) => ({ type: "disk", ...c, radius, inner });
  const lane = (angle, length, width, side = 0) => {
    const c = at(0, side), x = Math.cos(angle), y = Math.sin(angle);
    return { type: "poly", points: [[c.x - y * width, c.y + x * width], [c.x + x * length - y * width, c.y + y * length + x * width], [c.x + x * length + y * width, c.y + y * length - x * width], [c.x + y * width, c.y - x * width]] };
  };
  switch (d.pattern) {
    case "charge":
      return [lane(a, r, w)];
    case "twin":
      return [-0.48, 0.48].map((t) => lane(a + t, r, w));
    case "fan":
      return [-0.6, -0.3, 0, 0.3, 0.6].map((t) => lane(a + t, r, w));
    case "web":
      return [disk(aim, w)];
    case "ring":
      return [disk(o, r, w)];
    case "drill":
      return [lane(a, r, w), disk(at(r), 45)];
    case "needles":
      return [-0.16, 0, 0.16].map((t) => lane(a + t, r, w));
    case "spray":
    case "sonic":
      return [{ type: "poly", points: [[o.x, o.y], ...[-1, 1].map((t) => {
        const p = at(r, t * w);
        return [p.x, p.y];
      })] }];
    case "cross":
      return [lane(a, r, w), lane(a + Math.PI / 2, r, w), lane(a + Math.PI, r, w), lane(a - Math.PI / 2, r, w)];
    case "rail":
      return [lane(a, r, w)];
    case "magnet":
      return [disk(o, w), disk(o, r, r - 25)];
    case "rupture":
      return [1, 2, 3].map((i) => disk(at(i * r / 3), w));
    case "arcs":
      return Array.from({ length: 6 }, (_, i) => lane(a + i * Math.PI / 3, r, w));
    case "lasers":
      return [-65, 65].map((side) => lane(a, r, w, side));
    case "artillery":
      return [-1, 0, 1].map((i) => disk({ x: aim.x - uy * i * 135, y: aim.y + ux * i * 135 }, w));
    case "roots":
      return [disk(o, 75), disk(aim, w)];
    case "gravity":
      return [disk(aim, w, 70)];
    case "fault":
      return Array.from({ length: 5 }, (_, i) => disk(at((i + 1) * r / 5, (i % 2 ? 1 : -1) * 45), w));
    case "solar":
      return Array.from({ length: 8 }, (_, i) => lane(a + i * Math.PI / 4, r, w));
    default:
      return [];
  }
}
function zoneContains(z, p) {
  if (z.type === "disk") {
    const d = Math.hypot(p.x - z.x, p.y - z.y);
    return d <= z.radius && d >= (z.inner || 0);
  }
  let sign2 = 0;
  for (let i = 0; i < z.points.length; i++) {
    const a = z.points[i], b = z.points[(i + 1) % z.points.length], c = (b[0] - a[0]) * (p.y - a[1]) - (b[1] - a[1]) * (p.x - a[0]);
    if (Math.abs(c) < 1e-7) continue;
    const s = Math.sign(c);
    if (sign2 && s !== sign2) return false;
    sign2 = s;
  }
  return true;
}

// web/advanced-monsters.js
var ADVANCED_SPECIES = [
  ["\u0E14\u0E49\u0E27\u0E07\u0E40\u0E01\u0E23\u0E32\u0E30\u0E2B\u0E22\u0E01", "beetle", "melee", "#29866f", "#b4fcb8", 1.25, 0.85],
  ["\u0E15\u0E31\u0E4A\u0E01\u0E41\u0E15\u0E19\u0E40\u0E04\u0E35\u0E22\u0E27\u0E41\u0E2A\u0E07", "mantis", "dash", "#6a9c38", "#e2ffa2", 0.85, 1.25],
  ["\u0E1C\u0E35\u0E40\u0E2A\u0E37\u0E49\u0E2D\u0E2A\u0E1B\u0E2D\u0E23\u0E4C\u0E21\u0E48\u0E27\u0E07", "moth", "projectile", "#8960b5", "#ffd0fc", 0.8, 1.1],
  ["\u0E41\u0E21\u0E07\u0E21\u0E38\u0E21\u0E2D\u0E33\u0E1E\u0E31\u0E19", "spider", "burst", "#a86828", "#ffe193", 1, 1],
  ["\u0E2B\u0E2D\u0E22\u0E40\u0E2B\u0E47\u0E14\u0E1E\u0E34\u0E29", "snail", "projectile", "#6b487c", "#e6acff", 1.5, 0.65],
  ["\u0E2B\u0E19\u0E2D\u0E19\u0E40\u0E08\u0E32\u0E30\u0E40\u0E01\u0E23\u0E32\u0E30", "worm", "dash", "#bd7549", "#ffe7a5", 1.2, 0.95],
  ["\u0E41\u0E15\u0E19\u0E40\u0E2B\u0E25\u0E47\u0E01", "wasp", "projectile", "#a58a35", "#fff0a0", 0.8, 1.3],
  ["\u0E41\u0E21\u0E07\u0E1B\u0E48\u0E2D\u0E07\u0E01\u0E23\u0E14", "scorpion", "cone", "#498f51", "#cbff76", 1.15, 0.95],
  ["\u0E1B\u0E39\u0E04\u0E23\u0E34\u0E2A\u0E15\u0E31\u0E25", "crab", "melee", "#4087a8", "#9ffff2", 1.4, 0.75],
  ["\u0E41\u0E21\u0E25\u0E07\u0E1B\u0E2D\u0E2A\u0E32\u0E22\u0E1F\u0E49\u0E32", "dragonfly", "dash", "#4377ba", "#c4f6ff", 0.75, 1.4],
  ["\u0E04\u0E32\u0E07\u0E04\u0E01\u0E41\u0E21\u0E48\u0E40\u0E2B\u0E25\u0E47\u0E01", "toad", "burst", "#607a83", "#bef7ec", 1.2, 0.8],
  ["\u0E42\u0E01\u0E40\u0E25\u0E21\u0E40\u0E28\u0E29\u0E40\u0E2B\u0E25\u0E47\u0E01", "golem", "cone", "#68677b", "#ffa46f", 1.6, 0.65],
  ["\u0E41\u0E21\u0E07\u0E01\u0E30\u0E1E\u0E23\u0E38\u0E19\u0E1E\u0E25\u0E32\u0E2A\u0E21\u0E32", "jelly", "burst", "#805da1", "#f9afff", 0.9, 0.95],
  ["\u0E04\u0E49\u0E32\u0E07\u0E04\u0E32\u0E27\u0E04\u0E25\u0E37\u0E48\u0E19\u0E40\u0E2A\u0E35\u0E22\u0E07", "bat", "cone", "#6c4c88", "#e1c5ff", 0.8, 1.3],
  ["\u0E2D\u0E2A\u0E23\u0E1E\u0E34\u0E29\u0E19\u0E35\u0E2D\u0E2D\u0E19", "serpent", "projectile", "#458f84", "#c4ff7e", 1, 1.15],
  ["\u0E40\u0E15\u0E48\u0E32\u0E1B\u0E49\u0E2D\u0E21\u0E1B\u0E23\u0E32\u0E01\u0E32\u0E23", "turtle", "burst", "#8a733e", "#ffdd87", 1.7, 0.6],
  ["\u0E2B\u0E21\u0E49\u0E2D\u0E02\u0E49\u0E32\u0E27\u0E2B\u0E21\u0E49\u0E2D\u0E41\u0E01\u0E07\u0E08\u0E31\u0E01\u0E23\u0E01\u0E25", "plant", "projectile", "#99616c", "#ffd398", 1.2, 0.7],
  ["\u0E22\u0E31\u0E01\u0E29\u0E4C\u0E15\u0E32\u0E40\u0E14\u0E35\u0E22\u0E27\u0E14\u0E32\u0E23\u0E4C\u0E01\u0E04\u0E2D\u0E23\u0E4C", "cyclops", "cone", "#725185", "#f7a8ec", 1.5, 0.7],
  ["\u0E15\u0E30\u0E02\u0E32\u0E1A\u0E41\u0E21\u0E01\u0E21\u0E32", "centipede", "dash", "#a34638", "#ffb26d", 1.15, 1.15],
  ["\u0E27\u0E34\u0E2B\u0E04\u0E40\u0E1E\u0E25\u0E34\u0E07\u0E2A\u0E38\u0E23\u0E34\u0E22\u0E30", "phoenix", "burst", "#bd5b31", "#fff1a2", 1.1, 1.25]
].map(([name, form, attack, color, accent, toughness, pace], species) => ({ name, form, attack, color, accent, toughness, pace, species, min: 61 + species * 3, max: 63 + species * 3 }));
var advancedSpeciesAt = (level) => Math.max(0, Math.min(19, Math.floor((level - 61) / 3)));
function advancedMonster(level, { elite = false, boss = false } = {}) {
  level = Math.max(61, Math.min(120, Math.round(level)));
  const sp = ADVANCED_SPECIES[advancedSpeciesAt(level)], region = 6 + Math.floor((level - 61) / 10);
  return { id: boss ? 2060 + region - 6 : 2e3 + level - 61, name: (boss ? "\u0E08\u0E49\u0E32\u0E27" : elite ? "\u0E2B\u0E31\u0E27\u0E2B\u0E19\u0E49\u0E32" : "") + sp.name, zone: 1, region, slot: sp.species, species: sp.species, art: "advanced", level, boss, elite: elite || boss, hp: Math.round((160 + level * 10) * sp.toughness * (boss ? 8 : elite ? 3.5 : 1)), damage: Math.round((5 + level * 1.4) * (boss ? 1.65 : elite ? 1.25 : 1)), speed: Math.round(85 * sp.pace), attack: sp.attack, cooldown: 2.4 / sp.pace + (boss ? 0.5 : 0), xp: Math.round((40 + level * 16) * (boss ? 10 : elite ? 4 : 1)), gold: Math.round((20 + level * 5) * (boss ? 6 : elite ? 4 : 1)), ...monsterStats(level, { boss, elite, toughness: sp.toughness }) };
}
var ADVANCED_MONSTERS = [...Array.from({ length: 60 }, (_, i) => advancedMonster(61 + i)), ...Array.from({ length: 6 }, (_, i) => advancedMonster(70 + i * 10, { boss: true }))];

// web/catalog.js
var SPECIES = [
  { name: "\u0E2B\u0E22\u0E14\u0E1E\u0E25\u0E31\u0E07\u0E2D\u0E33\u0E1E\u0E31\u0E19", attack: "melee", slot: 0 },
  { name: "\u0E40\u0E01\u0E23\u0E32\u0E30\u0E1C\u0E25\u0E36\u0E01\u0E2A\u0E32\u0E21\u0E02\u0E32", attack: "dash", slot: 1 },
  { name: "\u0E1A\u0E38\u0E1B\u0E1C\u0E32\u0E01\u0E34\u0E19\u0E1E\u0E25\u0E31\u0E07", attack: "projectile", slot: 2 }
];
var MONSTERS = Array.from({ length: 60 }, (_, i) => {
  const level = i + 1, sp = SPECIES[i % 3];
  return { id: 1e3 + i, name: sp.name, zone: 0, region: Math.floor(i / 10), slot: sp.slot, level, boss: false, hp: 44 + level * 6, damage: 4 + level * 1.35, speed: 70 + i % 3 * 8, attack: sp.attack, cooldown: 2.2 + i % 3 * 0.2, xp: 20 + level * 8, gold: 10 + level * 3 };
});
for (let region = 0; region < 6; region++) {
  const base = MONSTERS[region * 10 + 9];
  MONSTERS.push({ ...base, id: 1060 + region, name: ["\u0E23\u0E32\u0E0A\u0E32\u0E2B\u0E22\u0E14\u0E1E\u0E25\u0E31\u0E07", "\u0E08\u0E48\u0E32\u0E1D\u0E39\u0E07\u0E40\u0E01\u0E23\u0E32\u0E30\u0E1C\u0E25\u0E36\u0E01", "\u0E23\u0E32\u0E0A\u0E34\u0E19\u0E35\u0E1A\u0E38\u0E1B\u0E1C\u0E32"][region % 3], slot: region % 3, boss: true, hp: base.hp * 9, damage: base.damage * 1.8, attack: ["burst", "cone", "projectile"][region % 3], xp: base.xp * 8, gold: base.gold * 6 });
}
for (const m of MONSTERS) Object.assign(m, monsterStats(m.level, { boss: m.boss }));
MONSTERS.push(...ADVANCED_MONSTERS, ...FOREST_SPECIES.map((sp) => forestMonster(sp.min)));
var isKnownMonster = (id) => Number.isInteger(id) && (id >= 0 && id < 100 || id >= 1e3 && id <= 1065 || id >= 1100 && id <= 1119 || id >= 2e3 && id <= 2065);
var isKnownBoss = (id) => Number.isInteger(id) && (id >= 0 && id < 100 && id % 10 === 9 || id >= 1060 && id <= 1065 || id >= 2060 && id <= 2065);
var HEROES = [{ "id": "sword-male", "name": "\u0E01\u0E23\u0E30\u0E1A\u0E35\u0E48 \u2022 \u0E0A\u0E32\u0E22", "sect": "sword", "gender": "male", "skill": "\u0E2B\u0E21\u0E37\u0E48\u0E19\u0E01\u0E23\u0E30\u0E1A\u0E35\u0E48\u0E40\u0E21\u0E06\u0E32" }, { "id": "sword-female", "name": "\u0E01\u0E23\u0E30\u0E1A\u0E35\u0E48 \u2022 \u0E2B\u0E0D\u0E34\u0E07", "sect": "sword", "gender": "female", "skill": "\u0E2B\u0E21\u0E37\u0E48\u0E19\u0E01\u0E23\u0E30\u0E1A\u0E35\u0E48\u0E40\u0E21\u0E06\u0E32" }, { "id": "demon-male", "name": "\u0E21\u0E32\u0E23 \u2022 \u0E0A\u0E32\u0E22", "sect": "demon", "gender": "male", "skill": "\u0E01\u0E23\u0E07\u0E40\u0E25\u0E47\u0E1A\u0E42\u0E25\u0E2B\u0E34\u0E15" }, { "id": "demon-female", "name": "\u0E21\u0E32\u0E23 \u2022 \u0E2B\u0E0D\u0E34\u0E07", "sect": "demon", "gender": "female", "skill": "\u0E1A\u0E31\u0E27\u0E42\u0E25\u0E2B\u0E34\u0E15" }];
HEROES.push({ id: "sword-cockro", name: "\u0E41\u0E21\u0E07\u0E2A\u0E32\u0E1A\u0E41\u0E21\u0E19 \u2022 \u0E17\u0E14\u0E25\u0E2D\u0E07", sect: "sword", gender: "mascot", skill: "\u0E43\u0E0A\u0E49\u0E2A\u0E01\u0E34\u0E25\u0E01\u0E23\u0E30\u0E1A\u0E35\u0E48\u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E17\u0E14\u0E2A\u0E2D\u0E1A \u2022 \u0E20\u0E32\u0E1E\u0E0A\u0E31\u0E48\u0E27\u0E04\u0E23\u0E32\u0E27" });

// web/skills.js
var FORMS = { wave: { name: "\u0E04\u0E25\u0E37\u0E48\u0E19\u0E1E\u0E25\u0E31\u0E07", range: 320, radius: 36, power: 1.8, mp: 18, cd: 5, desc: "\u0E41\u0E19\u0E27\u0E15\u0E23\u0E07\u0E15\u0E32\u0E21\u0E17\u0E34\u0E28\u0E40\u0E1B\u0E49\u0E32\u0E2B\u0E21\u0E32\u0E22" }, circle: { name: "\u0E01\u0E27\u0E32\u0E14\u0E23\u0E2D\u0E1A\u0E15\u0E31\u0E27", range: 155, radius: 155, power: 1.4, mp: 22, cd: 7, desc: "\u0E42\u0E08\u0E21\u0E15\u0E35\u0E28\u0E31\u0E15\u0E23\u0E39\u0E23\u0E2D\u0E1A\u0E15\u0E31\u0E27" }, bolt: { name: "\u0E01\u0E23\u0E30\u0E2A\u0E38\u0E19\u0E1E\u0E25\u0E31\u0E07\u0E07\u0E32\u0E19", range: 400, radius: 0, power: 2.3, mp: 16, cd: 4, desc: "\u0E42\u0E08\u0E21\u0E15\u0E35\u0E40\u0E1B\u0E49\u0E32\u0E2B\u0E21\u0E32\u0E22\u0E40\u0E14\u0E35\u0E22\u0E27\u0E23\u0E30\u0E22\u0E30\u0E44\u0E01\u0E25" }, dash: { name: "\u0E1E\u0E38\u0E48\u0E07\u0E41\u0E17\u0E07", range: 230, radius: 45, power: 1.7, mp: 24, cd: 8, desc: "\u0E1E\u0E38\u0E48\u0E07\u0E1C\u0E48\u0E32\u0E19\u0E28\u0E31\u0E15\u0E23\u0E39\u0E43\u0E19\u0E41\u0E19\u0E27\u0E15\u0E23\u0E07" }, field: { name: "\u0E2A\u0E19\u0E32\u0E21\u0E1E\u0E25\u0E31\u0E07", range: 300, radius: 120, power: 0.65, mp: 32, cd: 12, desc: "\u0E2A\u0E23\u0E49\u0E32\u0E07\u0E1E\u0E37\u0E49\u0E19\u0E17\u0E35\u0E48\u0E42\u0E08\u0E21\u0E15\u0E35 4 \u0E04\u0E23\u0E31\u0E49\u0E07\u0E43\u0E19 3 \u0E27\u0E34\u0E19\u0E32\u0E17\u0E35" } };
var ELEMENTS = { wind: { name: "\u0E25\u0E21", color: "#a6f3dd", desc: "\u0E1C\u0E25\u0E31\u0E01\u0E28\u0E31\u0E15\u0E23\u0E39\u0E2D\u0E2D\u0E01 45 \u0E2B\u0E19\u0E48\u0E27\u0E22" }, fire: { name: "\u0E44\u0E1F", color: "#ff9a50", desc: "\u0E40\u0E1C\u0E32\u0E44\u0E2B\u0E21\u0E49 3 \u0E27\u0E34\u0E19\u0E32\u0E17\u0E35 \u0E23\u0E27\u0E21 45% \u0E1E\u0E25\u0E31\u0E07\u0E42\u0E08\u0E21\u0E15\u0E35" }, ice: { name: "\u0E19\u0E49\u0E33\u0E41\u0E02\u0E47\u0E07", color: "#81ddff", desc: "\u0E25\u0E14\u0E04\u0E27\u0E32\u0E21\u0E40\u0E23\u0E47\u0E27 35% \u0E19\u0E32\u0E19 3 \u0E27\u0E34\u0E19\u0E32\u0E17\u0E35" }, lightning: { name: "\u0E2A\u0E32\u0E22\u0E1F\u0E49\u0E32", color: "#d8b4ff", desc: "\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E04\u0E27\u0E32\u0E21\u0E40\u0E2A\u0E35\u0E22\u0E2B\u0E32\u0E22\u0E17\u0E31\u0E19\u0E17\u0E35 20%" }, poison: { name: "\u0E1E\u0E34\u0E29", color: "#a8dc64", desc: "\u0E1E\u0E34\u0E29 6 \u0E27\u0E34\u0E19\u0E32\u0E17\u0E35 \u0E23\u0E27\u0E21 60% \u0E1E\u0E25\u0E31\u0E07\u0E42\u0E08\u0E21\u0E15\u0E35" } };
var MODS = { none: { name: "\u0E44\u0E21\u0E48\u0E21\u0E35", desc: "\u0E44\u0E21\u0E48\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E04\u0E48\u0E32\u0E1E\u0E25\u0E31\u0E07\u0E07\u0E32\u0E19" }, pierce: { name: "\u0E17\u0E30\u0E25\u0E27\u0E07", desc: "\u0E01\u0E23\u0E30\u0E2A\u0E38\u0E19\u0E1E\u0E25\u0E31\u0E07\u0E07\u0E32\u0E19\u0E17\u0E30\u0E25\u0E38\u0E44\u0E14\u0E49\u0E2A\u0E39\u0E07\u0E2A\u0E38\u0E14 3 \u0E40\u0E1B\u0E49\u0E32\u0E2B\u0E21\u0E32\u0E22 / \u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A\u0E2D\u0E37\u0E48\u0E19\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E41\u0E23\u0E07 15%" }, drain: { name: "\u0E14\u0E39\u0E14\u0E40\u0E25\u0E37\u0E2D\u0E14", desc: "\u0E1F\u0E37\u0E49\u0E19 8% \u0E02\u0E2D\u0E07\u0E04\u0E27\u0E32\u0E21\u0E40\u0E2A\u0E35\u0E22\u0E2B\u0E32\u0E22\u0E08\u0E23\u0E34\u0E07 \u0E2A\u0E39\u0E07\u0E2A\u0E38\u0E14 8% \u0E40\u0E25\u0E37\u0E2D\u0E14\u0E15\u0E48\u0E2D\u0E01\u0E32\u0E23\u0E23\u0E48\u0E32\u0E22" }, wide: { name: "\u0E02\u0E22\u0E32\u0E22", desc: "\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E23\u0E30\u0E22\u0E30\u0E41\u0E25\u0E30\u0E1E\u0E37\u0E49\u0E19\u0E17\u0E35\u0E48 25%" }, force: { name: "\u0E2D\u0E31\u0E14\u0E1E\u0E25\u0E31\u0E07", desc: "\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E04\u0E27\u0E32\u0E21\u0E41\u0E23\u0E07 25%" }, quick: { name: "\u0E09\u0E31\u0E1A\u0E44\u0E27", desc: "\u0E25\u0E14\u0E04\u0E39\u0E25\u0E14\u0E32\u0E27\u0E19\u0E4C 20% \u0E41\u0E15\u0E48\u0E25\u0E14\u0E41\u0E23\u0E07 15%" }, lasting: { name: "\u0E22\u0E37\u0E14\u0E1C\u0E25", desc: "\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E40\u0E27\u0E25\u0E32\u0E1C\u0E25\u0E18\u0E32\u0E15\u0E38 50%" } };
var SCHOOL = [
  { id: "s1", sect: "sword", name: "\u0E1E\u0E25\u0E32\u0E2A\u0E21\u0E32\u0E17\u0E30\u0E25\u0E27\u0E07\u0E40\u0E21\u0E06", level: 1, form: "wave", element: "wind", mods: [] },
  { id: "s2", sect: "sword", name: "\u0E01\u0E49\u0E32\u0E27\u0E1E\u0E25\u0E32\u0E2A\u0E21\u0E32\u0E2A\u0E32\u0E22\u0E1F\u0E49\u0E32", level: 20, form: "dash", element: "lightning", mods: [] },
  { id: "s3", sect: "sword", name: "\u0E27\u0E07\u0E1E\u0E25\u0E32\u0E2A\u0E21\u0E32\u0E40\u0E2B\u0E21\u0E31\u0E19\u0E15\u0E4C", level: 40, form: "circle", element: "ice", mods: [] },
  { id: "s4", sect: "sword", name: "\u0E1E\u0E25\u0E32\u0E2A\u0E21\u0E32\u0E40\u0E1E\u0E25\u0E34\u0E07\u0E44\u0E25\u0E48\u0E14\u0E32\u0E27", level: 60, form: "bolt", element: "fire", mods: ["pierce"] },
  { id: "s5", sect: "sword", name: "\u0E2A\u0E19\u0E32\u0E21\u0E1E\u0E25\u0E31\u0E07\u0E2B\u0E21\u0E37\u0E48\u0E19\u0E1E\u0E25\u0E32\u0E2A\u0E21\u0E32", level: 120, form: "field", element: "lightning", mods: ["wide"] },
  { id: "d1", sect: "demon", name: "\u0E01\u0E23\u0E07\u0E40\u0E25\u0E47\u0E1A\u0E42\u0E25\u0E2B\u0E34\u0E15", level: 1, form: "circle", element: "poison", mods: ["drain"] },
  { id: "d2", sect: "demon", name: "\u0E40\u0E1E\u0E25\u0E34\u0E07\u0E21\u0E32\u0E23\u0E15\u0E34\u0E14\u0E15\u0E32\u0E21", level: 20, form: "bolt", element: "fire", mods: [] },
  { id: "d3", sect: "demon", name: "\u0E40\u0E07\u0E32\u0E21\u0E32\u0E23\u0E40\u0E22\u0E37\u0E2D\u0E01\u0E41\u0E02\u0E47\u0E07", level: 40, form: "dash", element: "ice", mods: [] },
  { id: "d4", sect: "demon", name: "\u0E04\u0E25\u0E37\u0E48\u0E19\u0E1E\u0E34\u0E29\u0E01\u0E25\u0E37\u0E19\u0E1E\u0E25\u0E31\u0E07\u0E07\u0E32\u0E19", level: 60, form: "wave", element: "poison", mods: ["wide"] },
  { id: "d5", sect: "demon", name: "\u0E2A\u0E19\u0E32\u0E21\u0E1E\u0E25\u0E31\u0E07\u0E42\u0E2B\u0E19\u0E14\u0E42\u0E25\u0E2B\u0E34\u0E15", level: 120, form: "field", element: "fire", mods: ["drain"] }
];
function compileSkill(r) {
  if (!r || !FORMS[r.form] || !ELEMENTS[r.element]) return null;
  const mods = [...new Set(r.mods || [])].filter((m) => m !== "none" && MODS[m]);
  const f = { ...FORMS[r.form], ...r.combat || {} };
  return { ...r, mods, range: f.range * (mods.includes("wide") ? 1.25 : 1), radius: f.radius * (mods.includes("wide") ? 1.25 : 1), power: f.power * (mods.includes("force") ? 1.25 : 1) * (mods.includes("quick") ? 0.85 : 1) * (mods.includes("pierce") && r.form !== "bolt" ? 1.15 : 1), mp: f.mp + mods.length * 4, cd: Math.max(1.5, f.cd * 0.8) * (mods.includes("quick") ? 0.8 : 1), color: ELEMENTS[r.element].color };
}
var COCKRO_SKILLS = [
  { id: "s1", name: "\u0E04\u0E25\u0E37\u0E48\u0E19\u0E14\u0E32\u0E1A\u0E1E\u0E25\u0E31\u0E07\u0E07\u0E32\u0E19", level: 1, form: "wave", element: "wind", mods: ["wide"], combat: { range: 480, radius: 150, mp: 10, cd: 3.2, power: 1.9 } },
  { id: "s2", name: "\u0E42\u0E23\u0E40\u0E15\u0E2D\u0E23\u0E4C\u0E1E\u0E25\u0E32\u0E2A\u0E21\u0E32", level: 5, form: "circle", element: "fire", mods: ["wide"], combat: { range: 185, radius: 185, mp: 14, cd: 5, power: 1.8 } },
  { id: "s3", name: "\u0E2A\u0E19\u0E32\u0E21\u0E44\u0E2D\u0E2D\u0E2D\u0E19", level: 12, form: "field", element: "lightning", mods: ["wide"], combat: { range: 420, radius: 180, mp: 22, cd: 9, power: 0.7 } },
  { id: "s4", name: "\u0E1A\u0E39\u0E2A\u0E15\u0E4C\u0E14\u0E32\u0E1A\u0E1E\u0E25\u0E32\u0E2A\u0E21\u0E32", level: 25, form: "dash", element: "wind", mods: ["wide"] },
  { id: "s5", name: "\u0E1B\u0E37\u0E19\u0E27\u0E07\u0E42\u0E04\u0E08\u0E23\u0E1E\u0E34\u0E17\u0E31\u0E01\u0E29\u0E4C\u0E14\u0E32\u0E27", level: 40, form: "field", element: "lightning", mods: ["wide", "force"] },
  { id: "s6", name: "\u0E42\u0E2D\u0E40\u0E27\u0E2D\u0E23\u0E4C\u0E42\u0E2B\u0E25\u0E14\u0E1E\u0E25\u0E32\u0E2A\u0E21\u0E32", level: 55, form: "circle", element: "lightning", mods: ["wide", "force"] }
];
var SCORPION_SKILLS = [
  { id: "d1", name: "\u0E43\u0E1A\u0E21\u0E35\u0E14\u0E19\u0E32\u0E42\u0E19\u0E1E\u0E38\u0E48\u0E07\u0E17\u0E30\u0E22\u0E32\u0E19", level: 1, form: "wave", element: "poison", mods: ["wide"], combat: { range: 460, radius: 140, mp: 10, cd: 3.2, power: 1.8 } },
  { id: "d2", name: "\u0E42\u0E23\u0E40\u0E15\u0E2D\u0E23\u0E4C\u0E0A\u0E35\u0E27\u0E1E\u0E34\u0E29", level: 5, form: "circle", element: "poison", mods: ["wide"], combat: { range: 185, radius: 185, mp: 14, cd: 5, power: 1.75 } },
  { id: "d3", name: "\u0E2A\u0E19\u0E32\u0E21\u0E19\u0E32\u0E42\u0E19\u0E0A\u0E35\u0E27\u0E1E\u0E34\u0E29", level: 12, form: "field", element: "poison", mods: ["wide"], combat: { range: 420, radius: 180, mp: 22, cd: 9, power: 0.7 } },
  { id: "d4", name: "\u0E40\u0E08\u0E47\u0E15\u0E1A\u0E39\u0E2A\u0E15\u0E4C\u0E25\u0E2D\u0E1A\u0E2A\u0E31\u0E07\u0E2B\u0E32\u0E23", level: 25, form: "dash", element: "poison", mods: ["wide"] },
  { id: "d5", name: "\u0E01\u0E23\u0E30\u0E2A\u0E38\u0E19\u0E0A\u0E35\u0E27\u0E1E\u0E34\u0E29 EMP", level: 40, form: "bolt", element: "lightning", mods: ["force", "pierce"] },
  { id: "d6", name: "\u0E42\u0E14\u0E23\u0E19\u0E01\u0E23\u0E30\u0E08\u0E32\u0E22\u0E0A\u0E35\u0E27\u0E1E\u0E34\u0E29", level: 55, form: "field", element: "poison", mods: ["wide", "force"] }
];
var DRAGONFLY_SKILLS = [
  { id: "s1", name: "\u0E28\u0E23\u0E40\u0E23\u0E25\u0E01\u0E31\u0E19\u0E17\u0E30\u0E25\u0E27\u0E07", level: 1, form: "bolt", element: "lightning", mods: ["pierce"], combat: { range: 520, radius: 0, mp: 9, cd: 2.6, power: 2.1 } },
  { id: "s2", name: "\u0E21\u0E31\u0E25\u0E15\u0E34\u0E0A\u0E47\u0E2D\u0E15\u0E40\u0E23\u0E25\u0E01\u0E31\u0E19", level: 5, form: "wave", element: "wind", mods: ["wide"], combat: { range: 420, radius: 170, mp: 14, cd: 4.5, power: 1.7 } },
  { id: "s3", name: "\u0E27\u0E07\u0E41\u0E2B\u0E27\u0E19\u0E44\u0E2D\u0E2D\u0E2D\u0E19", level: 12, form: "circle", element: "wind", mods: ["wide"], combat: { range: 190, radius: 190, mp: 20, cd: 7, power: 1.6 } },
  { id: "s4", name: "\u0E14\u0E32\u0E27\u0E40\u0E17\u0E35\u0E22\u0E21\u0E22\u0E34\u0E07\u0E28\u0E23", level: 25, form: "field", element: "lightning", mods: ["wide"], combat: { range: 460, radius: 190, mp: 26, cd: 10, power: 0.75 } },
  { id: "s5", name: "\u0E28\u0E23\u0E40\u0E23\u0E25\u0E01\u0E31\u0E19\u0E42\u0E2D\u0E40\u0E27\u0E2D\u0E23\u0E4C\u0E0A\u0E32\u0E23\u0E4C\u0E08", level: 40, form: "bolt", element: "lightning", mods: ["pierce", "force"] },
  { id: "s6", name: "\u0E1D\u0E39\u0E07\u0E28\u0E23\u0E42\u0E1F\u0E15\u0E2D\u0E19", level: 55, form: "wave", element: "lightning", mods: ["wide", "force"] }
];
var CRICKET_SKILLS = [
  { id: "s1", name: "\u0E04\u0E49\u0E2D\u0E19\u0E42\u0E0B\u0E19\u0E34\u0E01\u0E01\u0E23\u0E30\u0E41\u0E17\u0E01", level: 1, form: "wave", element: "wind", mods: ["wide"], combat: { range: 400, radius: 150, mp: 10, cd: 3.4, power: 2 } },
  { id: "s2", name: "\u0E42\u0E0B\u0E19\u0E34\u0E01\u0E1E\u0E31\u0E25\u0E2A\u0E4C", level: 5, form: "circle", element: "lightning", mods: ["wide"], combat: { range: 190, radius: 190, mp: 14, cd: 5, power: 1.8 } },
  { id: "s3", name: "\u0E40\u0E08\u0E47\u0E15\u0E1A\u0E39\u0E2A\u0E15\u0E4C\u0E01\u0E23\u0E30\u0E41\u0E17\u0E01", level: 12, form: "dash", element: "wind", mods: ["wide", "force"], combat: { range: 260, radius: 70, mp: 18, cd: 7, power: 2 } },
  { id: "s4", name: "\u0E2A\u0E19\u0E32\u0E21\u0E40\u0E23\u0E42\u0E0B\u0E41\u0E19\u0E19\u0E0B\u0E4C", level: 25, form: "field", element: "lightning", mods: ["wide"], combat: { range: 380, radius: 190, mp: 26, cd: 10, power: 0.8 } },
  { id: "s5", name: "\u0E42\u0E23\u0E40\u0E15\u0E2D\u0E23\u0E4C\u0E04\u0E49\u0E2D\u0E19\u0E42\u0E0B\u0E19\u0E34\u0E01", level: 40, form: "circle", element: "wind", mods: ["wide", "force"] },
  { id: "s6", name: "\u0E42\u0E14\u0E21\u0E40\u0E23\u0E42\u0E0B\u0E41\u0E19\u0E19\u0E0B\u0E4C", level: 55, form: "field", element: "lightning", mods: ["wide", "force"], combat: { range: 200, radius: 230, mp: 40, cd: 14, power: 0.9 } }
];
function classSkills(s) {
  if (s.hero === "sword-dragonfly") return [...DRAGONFLY_SKILLS, ...SCHOOL.filter((r) => r.sect === "sword" && Number(r.id.slice(1)) >= 7)];
  if (s.hero === "sword-cricket") return [...CRICKET_SKILLS, ...SCHOOL.filter((r) => r.sect === "sword" && Number(r.id.slice(1)) >= 7)];
  if (s.hero === "demon-scorpion") return [...SCORPION_SKILLS, ...SCHOOL.filter((r) => r.sect === "demon" && Number(r.id.slice(1)) >= 7)];
  return s.hero === "sword-cockro" ? [...COCKRO_SKILLS, ...SCHOOL.filter((r) => r.sect === "sword" && Number(r.id.slice(1)) >= 7)] : SCHOOL.filter((r) => r.sect === (s.hero.startsWith("sword") ? "sword" : "demon"));
}
function normalizeSkills(s, v = {}) {
  const sect = s.hero.startsWith("sword") ? "sword" : "demon";
  s.recipes = Array.isArray(v.recipes) ? v.recipes.slice(0, 10).filter((r) => r && FORMS[r.form] && ELEMENTS[r.element] && Array.isArray(r.mods) && r.mods.length <= 2 && r.mods.every((m) => MODS[m] && m !== "none")).map((r, i) => ({ ...r, id: "custom" + i, name: String(r.name || "\u0E27\u0E34\u0E0A\u0E32\u0E44\u0E23\u0E49\u0E19\u0E32\u0E21").slice(0, 32), level: r.mods.length > 1 ? 120 : 60 })) : [];
  const available = [...classSkills(s), ...s.recipes].filter((r) => r.level <= s.level);
  const used = /* @__PURE__ */ new Set();
  s.equipped = Array.isArray(v.equipped) ? v.equipped.slice(0, 5).map((id) => {
    if (used.has(id) || !available.some((r) => r.id === id)) return null;
    used.add(id);
    return id;
  }) : [];
  if (!s.equipped.some(Boolean)) s.equipped = [available[0].id];
  for (let i = 0; i < 5; i++) {
    if (s.equipped[i] === void 0) s.equipped[i] = i < 3 ? null : available.find((r) => !s.equipped.includes(r.id))?.id || null;
  }
  s.materials = {};
  for (const k of ["ink", "core", ...Object.keys(ELEMENTS)]) s.materials[k] = Math.min(99999, Math.max(0, Math.floor(Number(v.materials?.[k]) || 0)));
}
function knownSkills(s) {
  return [...classSkills(s), ...s.recipes];
}
function skillTargets(skill, origin, aim, enemies) {
  const dx = aim.x - origin.x, dy = aim.y - origin.y, len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len;
  const live = enemies.filter((e) => e.hp > 0);
  if (skill.form === "circle") return live.filter((e) => Math.hypot(e.x - origin.x, e.y - origin.y) <= skill.radius);
  if (skill.form === "field") return live.filter((e) => Math.hypot(e.x - aim.x, e.y - aim.y) <= skill.radius);
  const line = live.filter((e) => {
    const x = e.x - origin.x, y = e.y - origin.y, along = x * ux + y * uy;
    return along >= 0 && along <= skill.range && Math.abs(x * uy - y * ux) <= (skill.radius || 40);
  }).sort((a, b) => Math.hypot(a.x - origin.x, a.y - origin.y) - Math.hypot(b.x - origin.x, b.y - origin.y));
  return skill.form === "bolt" ? line.slice(0, skill.mods.includes("pierce") ? 3 : 1) : line;
}
SCHOOL.push(
  { id: "s6", sect: "sword", name: "\u0E1E\u0E25\u0E32\u0E2A\u0E21\u0E32\u0E27\u0E32\u0E22\u0E38\u0E2B\u0E22\u0E01", level: 80, form: "circle", element: "wind", mods: ["wide"] },
  { id: "s7", sect: "sword", name: "\u0E42\u0E2B\u0E19\u0E14\u0E1E\u0E25\u0E32\u0E2A\u0E21\u0E32\u0E40\u0E2B\u0E21\u0E31\u0E19\u0E15\u0E4C", level: 100, form: "field", element: "ice", mods: ["lasting"] },
  { id: "s8", sect: "sword", name: "\u0E40\u0E08\u0E47\u0E14\u0E1E\u0E25\u0E32\u0E2A\u0E21\u0E32\u0E1E\u0E34\u0E1E\u0E32\u0E01\u0E29\u0E32", level: 140, form: "wave", element: "lightning", mods: ["pierce", "force"] },
  { id: "s9", sect: "sword", name: "\u0E1B\u0E37\u0E19\u0E44\u0E2D\u0E2D\u0E2D\u0E19\u0E17\u0E30\u0E25\u0E27\u0E07", level: 160, form: "wave", element: "ice", mods: ["wide", "force"] },
  { id: "s10", sect: "sword", name: "\u0E1D\u0E19\u0E1E\u0E25\u0E32\u0E2A\u0E21\u0E32\u0E27\u0E07\u0E42\u0E04\u0E08\u0E23", level: 180, form: "field", element: "lightning", mods: ["wide", "force"] },
  { id: "d6", sect: "demon", name: "\u0E42\u0E0B\u0E48\u0E19\u0E32\u0E42\u0E19\u0E27\u0E19\u0E2A\u0E39\u0E0D", level: 80, form: "circle", element: "ice", mods: ["drain"] },
  { id: "d7", sect: "demon", name: "\u0E1B\u0E35\u0E01\u0E40\u0E08\u0E47\u0E15\u0E15\u0E31\u0E14\u0E27\u0E07\u0E42\u0E04\u0E08\u0E23", level: 100, form: "wave", element: "fire", mods: ["force"] },
  { id: "d8", sect: "demon", name: "\u0E15\u0E2D\u0E23\u0E4C\u0E1B\u0E34\u0E42\u0E14\u0E0A\u0E35\u0E27\u0E1E\u0E34\u0E29", level: 140, form: "bolt", element: "poison", mods: ["pierce", "lasting"] },
  { id: "d9", sect: "demon", name: "EMP \u0E40\u0E01\u0E49\u0E32\u0E42\u0E2B\u0E19\u0E14", level: 160, form: "circle", element: "fire", mods: ["wide", "drain"] },
  { id: "d10", sect: "demon", name: "\u0E1D\u0E39\u0E07\u0E42\u0E14\u0E23\u0E19\u0E19\u0E32\u0E42\u0E19", level: 180, form: "field", element: "poison", mods: ["wide", "force"] }
);

// web/town-buff.js
var BUFF_DURATION = 36e5;
var BUFF_NPC_UV = [0.57, 0.59];
function buffActive(s, now = Date.now()) {
  return Number.isFinite(s.townBuffUntil) && s.townBuffUntil > now;
}
function buffMultiplier(s, now = Date.now()) {
  return buffActive(s, now) ? 3 : 1;
}
function movementMultiplier(s, now = Date.now()) {
  return buffActive(s, now) ? 2 : 1;
}
function normalizeTownBuff(s, v, now = Date.now()) {
  s.townBuffUntil = Number.isFinite(v.townBuffUntil) ? Math.max(0, Math.min(v.townBuffUntil, now + BUFF_DURATION)) : 0;
}
function grantTownBuff(p, enabled, near, now = Date.now()) {
  if (!enabled || !near || p.hp <= 0 || now < (p.buffRequestAt || 0) + 2e3) return false;
  p.buffRequestAt = now;
  p.s.townBuffUntil = now + BUFF_DURATION;
  p.dirty = true;
  return true;
}

// web/core.js
var VERSION = 1;
function fresh(hero) {
  const s = { version: VERSION, name: "", townBuffUntil: 0, enhancementVersion: 2, balanceVersion: BALANCE_VERSION, mpPotions: 5, adTickets: [], accountRewardReceipts: [], playReceipts: [], pvpReports: [], hero, level: 1, xp: 0, gold: 1e5, potions: 10, stones: 0, upgrade: 0, zone: 0, kills: 0, seen: [], bosses: [], sound: true, quality: "auto", attributes: { vit: 0, str: 0, int: 0, agi: 0 }, statPoints: 0, skillPoints: 0, skillRanks: {}, reputation: 0, autoAttack: false };
  normalizePets(s);
  normalizeExpTickets(s);
  normalizeSkills(s);
  normalizeUpgradeItems(s);
  normalizeCheckin(s);
  freshGear(s);
  normalizeFashion(s);
  return s;
}
function xpNeed(level) {
  return levelXP(level);
}
function maxHP(s) {
  return buffMultiplier(s) * Math.round(120 + s.level * 20 + s.upgrade * 12 + (s.attributes?.vit || 0) * 12 + gearTotals(s).hp);
}
function damage(s) {
  return buffMultiplier(s) * Math.round(16 + s.level * 4 + s.upgrade * 8 + (s.attributes?.str || 0) * 2 + gearTotals(s).atk);
}
function reward(s, m, rng = Math.random) {
  countActivity(s, "hunt");
  if (m.boss) countActivity(s, "boss");
  s.gold += m.gold;
  s.xp += Math.floor(m.xp * expMultiplier(s));
  s.kills++;
  s.reputation = (s.reputation || 0) + (m.boss ? 25 : 1);
  if (!s.seen.includes(m.id)) s.seen.push(m.id);
  if (m.boss && !s.bosses.includes(m.id)) s.bosses.push(m.id);
  const stone = false;
  normalizeUpgradeItems(s);
  if (m.boss) s.upgradeItems.alloy = Math.min(99999, s.upgradeItems.alloy + 3);
  else if (rng() < 0.08) s.upgradeItems.alloy = Math.min(99999, s.upgradeItems.alloy + 1);
  while (s.level < 210 && s.xp >= xpNeed(s.level)) {
    s.xp -= xpNeed(s.level);
    s.level++;
    s.statPoints = (s.statPoints || 0) + 10;
    s.skillPoints = (s.skillPoints || 0) + 10;
  }
  if (s.level === 210) s.xp = Math.min(s.xp, xpNeed(210));
  return stone;
}
function unlocked(s, z) {
  return z === 0;
}
function validSave(v) {
  if (!v || v.version !== VERSION || !["sword-male", "sword-female", "demon-male", "demon-female", "sword-cockro", "demon-scorpion", "sword-dragonfly", "sword-cricket"].includes(v.hero)) return null;
  const s = fresh(v.hero);
  s.accountRewardReceipts = Array.isArray(v.accountRewardReceipts) ? [...new Set(v.accountRewardReceipts.filter((x) => typeof x === "string" && /^[a-f0-9]{64}$/.test(x)))] : [];
  s.playReceipts = Array.isArray(v.playReceipts) ? [...new Set(v.playReceipts.filter((x) => typeof x === "string" && /^[a-f0-9]{64}$/.test(x)))] : [];
  s.name = characterName(v.name) || "";
  normalizeTownBuff(s, v);
  normalizeExpTickets(s, v);
  normalizeWorldSave(s, v);
  normalizePets(s, v);
  normalizeActivities(s, v);
  if (v.testGoldGrant) s.testGoldGrant = v.testGoldGrant;
  for (const [k, max] of Object.entries({ level: 210, xp: 1e8, gold: 1e10, potions: 99999, stones: 1e7, upgrade: 20, zone: 9, kills: 1e9 })) {
    if (!Number.isFinite(v[k])) return null;
    s[k] = Math.max(k === "level" ? 1 : 0, Math.min(max, Math.floor(v[k])));
  }
  s.seen = Array.isArray(v.seen) ? [...new Set(v.seen.filter(isKnownMonster))] : [];
  s.bosses = Array.isArray(v.bosses) ? [...new Set(v.bosses.filter(isKnownBoss))] : [];
  s.sound = v.sound !== false;
  s.quality = ["auto", "low"].includes(v.quality) ? v.quality : "auto";
  if (!unlocked(s, s.zone)) s.zone = 0;
  normalizeSkills(s, v);
  normalizeProgress(s, v);
  normalizeUpgradeItems(s, v);
  const gearSave = structuredClone(v);
  if (v.enhancementVersion !== 2) {
    for (const it of [...Object.values(gearSave.equip || {}), ...gearSave.bag || []]) {
      if (!it) continue;
      let kept = false;
      for (const id of ["crystal", "glowstone", "diamond", "ruby"]) {
        const n = Math.max(0, Math.min(10, Math.floor(it.gems?.[id] || 0)));
        if (!n) continue;
        const keep = !kept && ["weapon", "ring", "amulet"].includes(it.slot);
        kept = kept || keep;
        s.upgradeItems[id] = Math.min(99999, s.upgradeItems[id] + n - (keep ? 1 : 0));
        it.gems[id] = keep ? 1 : 0;
      }
      if (it.plus > 9 && ["weapon", "ring", "amulet"].includes(it.slot)) it.legacyPlus = it.plus;
    }
    gearSave.upgradeItems = s.upgradeItems;
  }
  normalizeGear(s, gearSave);
  normalizeFashion(s, v);
  normalizeCheckin(s, v);
  s.adTickets = Array.isArray(v.adTickets) ? v.adTickets.filter((t) => t && /^[a-f0-9]{48}$/.test(t.nonce) && Number.isFinite(t.created)).slice(-100) : [];
  s.mpPotions = Number.isFinite(v.mpPotions) ? Math.max(0, Math.min(99999, Math.floor(v.mpPotions))) : 5;
  if (v.balanceVersion !== BALANCE_VERSION) {
    s.xp = Math.floor(Math.min(1, s.xp / (45 + s.level * s.level * 4)) * xpNeed(s.level));
  }
  return s;
}
function inCone(px, py, x, y, angle, range, arc) {
  const dx = px - x, dy = py - y;
  return Math.hypot(dx, dy) <= range && Math.abs(Math.atan2(Math.sin(Math.atan2(dy, dx) - angle), Math.cos(Math.atan2(dy, dx) - angle))) <= arc / 2;
}
var integer2 = (v, max) => Number.isFinite(v) ? Math.max(0, Math.min(max, Math.floor(v))) : 0;
function normalizeProgress(s, v = s) {
  const budget = (s.level - 1) * 10;
  let left = budget;
  const attrs = {};
  for (const key of ["vit", "str", "int", "agi"]) {
    attrs[key] = Math.min(left, integer2(v.attributes?.[key], 2090));
    left -= attrs[key];
  }
  s.attributes = attrs;
  s.statPoints = left;
  const ranks = {};
  let points = budget;
  for (const [id, value] of Object.entries(v.skillRanks || {})) {
    if (!knownSkills(s).some((r) => r.id === id && r.level <= s.level)) continue;
    const rank = Math.min(points, integer2(value, 19));
    ranks[id] = rank;
    points -= rank;
  }
  s.skillRanks = ranks;
  s.skillPoints = points;
  s.reputation = integer2(v.reputation ?? s.kills, 1e10);
  s.autoAttack = v.autoAttack === true;
  return s;
}
function allocateStats(s, values) {
  if (!values || typeof values !== "object" || Array.isArray(values)) return false;
  const keys = Object.keys(values);
  if (!keys.length || keys.some((k) => !Object.hasOwn(s.attributes, k))) return false;
  if (keys.some((k) => !Number.isSafeInteger(values[k]) || values[k] < 0)) return false;
  const total = keys.reduce((n, k) => n + values[k], 0);
  if (!Number.isSafeInteger(total) || total < 1 || total > s.statPoints) return false;
  for (const k of keys) s.attributes[k] += values[k];
  s.statPoints -= total;
  return true;
}
function allocateStat(s, key) {
  if (!Object.hasOwn(s.attributes, key) || s.statPoints < 1) return false;
  s.attributes[key]++;
  s.statPoints--;
  return true;
}
function trainSkill(s, id) {
  if (!knownSkills(s).some((r) => r.id === id && r.level <= s.level) || s.skillPoints < 1 || (s.skillRanks[id] || 0) >= 19) return false;
  s.skillRanks[id] = (s.skillRanks[id] || 0) + 1;
  s.skillPoints--;
  return true;
}
function combatStats(s) {
  const a = s.attributes || {}, g = gearTotals(s), b = buffMultiplier(s);
  return { mp: b * Math.round(80 + s.level * 3 + (a.int || 0) * 8 + g.mp), defense: b * (s.level * 0.25 + (a.vit || 0) * 0.6 + g.def), crit: Math.min(1, b * Math.min(0.5, 0.05 + (a.agi || 0) * 1e-3 + g.crit)), speed: Math.min(60, (a.agi || 0) * 0.15 + g.speed), haste: Math.min(0.35, (a.agi || 0) * 1e-3), spell: 1 + (a.int || 0) * 8e-3 + g.spell };
}

// web/merchant.js
var MERCHANT_UV = [0.235, 0.48];
var MERCHANT_OPS = /* @__PURE__ */ new Set(["buyPet", "buyExpTicket", "buy", "buyMP", "buyUpgradeItem", "buyShopGear", "exchangeGold"]);
function buyMerchantStack(s, op, id, quantity = 1, items) {
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 100) return false;
  let currency, key, price, inventory;
  if (op === "buy" || op === "buyMP") {
    currency = "gold";
    key = op === "buy" ? "potions" : "mpPotions";
    price = op === "buy" ? 50 : 60;
    inventory = s;
  } else if (op === "buyUpgradeItem" && Object.hasOwn(items, id)) {
    currency = "stones";
    key = id;
    price = items[id].price;
    inventory = s.upgradeItems;
  } else return false;
  if (!inventory || !Number.isFinite(s[currency]) || s[currency] < price * quantity || (inventory[key] || 0) + quantity > 99999) return false;
  s[currency] -= price * quantity;
  inventory[key] = (inventory[key] || 0) + quantity;
  return true;
}

// web/star-data.js
var STAR_ZONES = [
  { name: "\u0E25\u0E32\u0E19\u0E08\u0E2D\u0E14\u0E22\u0E32\u0E19\u0E2E\u0E35\u0E42\u0E23\u0E48", en: "Hero Landing Fields", min: 61, max: 65, ground: ["#6f9e5c", "#86b468"], liquid: { kind: "water", color: "#4f9fc0" }, props: { bulbtree: 4, meteor: 2, pylon: 1 }, density: 0.07, lakes: 0.66 },
  { name: "\u0E1B\u0E48\u0E32\u0E40\u0E2B\u0E47\u0E14\u0E40\u0E23\u0E37\u0E2D\u0E07\u0E41\u0E2A\u0E07", en: "Glowcap Grove", min: 66, max: 70, ground: ["#3f7a6c", "#4d8b74"], liquid: { kind: "water", color: "#3f8fb0" }, props: { mushroom: 5, bulbtree: 2, rock: 1 }, density: 0.09, lakes: 0.68 },
  { name: "\u0E17\u0E38\u0E48\u0E07\u0E2A\u0E1B\u0E2D\u0E23\u0E4C\u0E2D\u0E33\u0E1E\u0E31\u0E19", en: "Amber Spore Fields", min: 71, max: 75, ground: ["#9c9a4e", "#b0aa5c"], liquid: { kind: "acid", color: "#f0b43a" }, props: { mushroom: 3, bulbtree: 2, rock: 1 }, density: 0.08, lakes: 0.68 },
  { name: "\u0E40\u0E19\u0E34\u0E19\u0E23\u0E31\u0E07\u0E1B\u0E25\u0E27\u0E01\u0E22\u0E31\u0E01\u0E29\u0E4C", en: "Termite Mound Hills", min: 76, max: 80, ground: ["#a87652", "#b98762"], liquid: { kind: "water", color: "#4f9fbd" }, props: { mound: 5, rock: 2, deadtree: 1 }, density: 0.08, lakes: 0.7 },
  { name: "\u0E2B\u0E19\u0E2D\u0E07\u0E19\u0E49\u0E33\u0E01\u0E23\u0E14", en: "Acid Swamp", min: 81, max: 85, ground: ["#4f6e4a", "#5b7c52"], liquid: { kind: "acid", color: "#8fdc4e" }, props: { reed: 4, deadtree: 2, mushroom: 1 }, density: 0.08, lakes: 0.6 },
  { name: "\u0E1B\u0E48\u0E32\u0E04\u0E23\u0E34\u0E2A\u0E15\u0E31\u0E25\u0E44\u0E0B\u0E40\u0E1A\u0E2D\u0E23\u0E4C", en: "Cyber Crystal Woods", min: 86, max: 90, ground: ["#3f5f7a", "#4b6d88"], liquid: { kind: "water", color: "#39b6d6" }, props: { crystaltree: 4, crystal: 3, pylon: 1 }, density: 0.09, lakes: 0.67, crystal: "#7ff5ff" },
  { name: "\u0E2A\u0E38\u0E2A\u0E32\u0E19\u0E2B\u0E38\u0E48\u0E19\u0E23\u0E1A", en: "Mech Graveyard", min: 91, max: 95, ground: ["#7d8288", "#8b9096"], liquid: { kind: "chasm", color: "#0b1430" }, props: { wreck: 4, rock: 2, pylon: 1 }, density: 0.08, lakes: 0.67 },
  { name: "\u0E2B\u0E38\u0E1A\u0E23\u0E31\u0E07\u0E41\u0E21\u0E07\u0E1B\u0E48\u0E2D\u0E07", en: "Scorpion Canyon", min: 96, max: 100, ground: ["#b9714a", "#c7805a"], liquid: { kind: "chasm", color: "#0b1430" }, props: { rock: 4, meteor: 2, deadtree: 1 }, density: 0.08, lakes: 0.68 },
  { name: "\u0E19\u0E04\u0E23\u0E19\u0E35\u0E2D\u0E2D\u0E19\u0E23\u0E49\u0E32\u0E07", en: "Neon Ruins", min: 101, max: 105, ground: ["#4a4f66", "#565b74"], liquid: { kind: "water", color: "#2fc8f0" }, props: { pillar: 3, obelisk: 2, lantern: 2 }, density: 0.08, lakes: 0.69, crystal: "#ff5fd2" },
  { name: "\u0E23\u0E31\u0E07\u0E1C\u0E36\u0E49\u0E07\u0E40\u0E2B\u0E25\u0E47\u0E01", en: "Iron Hive", min: 106, max: 110, ground: ["#8a6f3c", "#9a7d46"], liquid: { kind: "acid", color: "#f2b230" }, props: { hive: 4, pylon: 2, rock: 1 }, density: 0.08, lakes: 0.69 },
  { name: "\u0E23\u0E2D\u0E22\u0E41\u0E22\u0E01\u0E1E\u0E25\u0E31\u0E07\u0E21\u0E37\u0E14", en: "Void Rift", min: 111, max: 115, ground: ["#5a4b6e", "#665579"], liquid: { kind: "acid", color: "#b58cff" }, props: { crystal: 3, obelisk: 2, deadtree: 2 }, density: 0.09, lakes: 0.67, crystal: "#c79bff" },
  { name: "\u0E41\u0E01\u0E19\u0E14\u0E32\u0E27\u0E40\u0E1E\u0E25\u0E34\u0E07", en: "Planet Core", min: 116, max: 120, ground: ["#4a3a3c", "#574446"], liquid: { kind: "lava", color: "#ff7a2e" }, props: { spire: 4, crystal: 2, meteor: 1 }, density: 0.09, lakes: 0.65, crystal: "#ff8a5c" }
];
var starMonster = advancedMonster;

// web/tilemap.js
var props = (o) => Object.fromEntries((o?.properties || []).map((p) => [p.name, p.value]));
function parseTiled(json) {
  const N = json.width, rows = json.height, mp = props(json), T = mp.tileWorld || 48;
  if (json.orientation !== "isometric" || !N || !rows) throw new Error("\u0E15\u0E49\u0E2D\u0E07\u0E40\u0E1B\u0E47\u0E19\u0E41\u0E1C\u0E19\u0E17\u0E35\u0E48 Tiled \u0E41\u0E1A\u0E1A isometric");
  const layer = (name) => json.layers.find((l) => l.name === name);
  const sets = [...json.tilesets].sort((a, b) => b.firstgid - a.firstgid);
  const tileOf = (gid) => {
    if (!gid) return null;
    const ts = sets.find((t) => gid >= t.firstgid);
    if (!ts) return null;
    const id = gid - ts.firstgid, meta = ts.tiles?.find((t) => t.id === id);
    return { set: ts.name, id, ...props(meta) };
  };
  const cache = /* @__PURE__ */ new Map(), info = (gid) => {
    if (!cache.has(gid)) cache.set(gid, tileOf(gid));
    return cache.get(gid);
  };
  const count = N * rows, kind = new Array(count), color = new Array(count), walk = new Uint8Array(count), prop = new Array(count).fill(null), zone = new Int8Array(count).fill(-1), variant = new Uint8Array(count);
  const ground = layer("ground").data, pl = layer("props")?.data || [], zl = layer("zones")?.data || [];
  for (let i = 0; i < count; i++) {
    const g = info(ground[i]) || { kind: "void", walkable: false };
    kind[i] = g.kind;
    color[i] = g.color || null;
    walk[i] = g.walkable ? 1 : 0;
    variant[i] = g.kind === "ground" && (g.id - 5) % 3 === 1 ? 1 : 0;
    const pr = info(pl[i]);
    if (pr) {
      prop[i] = pr.kind;
      walk[i] = 0;
    }
    const z = info(zl[i]);
    if (z) zone[i] = z.id;
    if (g.zone >= 0 && zone[i] < 0) zone[i] = g.zone;
  }
  const zoneSet = json.tilesets.find((t) => t.name === "hero-star-zones");
  const zones = (zoneSet?.tiles || []).sort((a, b) => a.id - b.id).map((t) => {
    const p = props(t);
    return { ...STAR_ZONES[t.id], name: p.name, en: p.en, min: p.minLevel, max: p.maxLevel };
  });
  const toW = (o) => ({ x: o.x / json.tileheight * T, y: o.y / json.tileheight * T });
  const spawns = (layer("spawns")?.objects || []).map((o) => {
    const p = props(o);
    return { id: o.id, name: o.name, ...toW(o), zone: p.zone, level: p.level, species: p.species, count: p.count || 1, elite: o.type === "elite" || o.type === "boss", boss: o.type === "boss" };
  });
  const pois = (layer("pois")?.objects || []).map((o) => {
    const p = props(o);
    return { id: o.id, name: o.name, action: o.type, zone: p.zone, world: toW(o) };
  });
  const gate = pois.find((p) => p.action === "warp" && p.zone === 0) || pois[0];
  return { type: "tiles", name: mp.title || "\u0E41\u0E1C\u0E19\u0E17\u0E35\u0E48", N, rows, T, kind, color, walk, prop, zone, variant, zones, spawns, pois, spawn: gate.world };
}
var tileIndex = (scene, x, y) => {
  const c = Math.floor(x / scene.T), r = Math.floor(y / scene.T);
  return c < 0 || r < 0 || c >= scene.N || r >= scene.rows ? -1 : r * scene.N + c;
};
var open = (scene, x, y) => {
  const i = tileIndex(scene, x, y);
  return i >= 0 && scene.walk[i] === 1;
};
function tileWalkable(scene, { x, y }) {
  const r = 7;
  return open(scene, x, y) && open(scene, x + r, y) && open(scene, x - r, y) && open(scene, x, y + r) && open(scene, x, y - r);
}

// web/maps.js
var MAP_W = 2e3;
var MAP_H = 1333;
var mapSize = (scene) => ({ width: scene?.width || MAP_W, height: scene?.height || MAP_H });
var toWorld = ([u, v], scene) => {
  const { width, height } = mapSize(scene), a = (u - 0.5) * width / 0.8, b = (v - 0.6) * height / 0.4;
  return { x: (a + b) / 2, y: (b - a) / 2 };
};
var rect = (l, t, r, b) => [[l, t], [r, t], [r, b], [l, b]];
var FOREST_COLS = 9;
var FOREST_ROWS = 6;
var forestWalk = [rect(0.012, 0.012, 0.988, 0.988)];
var REGIONS = [
  { id: 0, name: "\u0E0A\u0E32\u0E22\u0E1B\u0E48\u0E32\u0E41\u0E2A\u0E07\u0E41\u0E23\u0E01", min: 1, max: 10, center: [1 / 6, 0.75], entry: [1 / 6, 0.9] },
  { id: 1, name: "\u0E17\u0E38\u0E48\u0E07\u0E2A\u0E1B\u0E2D\u0E23\u0E4C\u0E2D\u0E33\u0E1E\u0E31\u0E19", min: 11, max: 20, center: [0.5, 0.75], entry: [0.5, 0.9] },
  { id: 2, name: "\u0E2A\u0E27\u0E19\u0E23\u0E32\u0E01\u0E04\u0E23\u0E34\u0E2A\u0E15\u0E31\u0E25", min: 21, max: 30, center: [5 / 6, 0.75], entry: [5 / 6, 0.9] },
  { id: 3, name: "\u0E14\u0E07\u0E1A\u0E38\u0E1B\u0E1C\u0E32\u0E01\u0E34\u0E19\u0E1E\u0E25\u0E31\u0E07", min: 31, max: 40, center: [5 / 6, 0.25], entry: [5 / 6, 0.4] },
  { id: 4, name: "\u0E41\u0E2D\u0E48\u0E07\u0E0A\u0E35\u0E27\u0E30\u0E41\u0E2A\u0E07", min: 41, max: 50, center: [0.5, 0.25], entry: [0.5, 0.4] },
  { id: 5, name: "\u0E2B\u0E31\u0E27\u0E43\u0E08\u0E1B\u0E48\u0E32\u0E14\u0E32\u0E27\u0E44\u0E01\u0E25", min: 51, max: 60, center: [1 / 6, 0.25], entry: [1 / 6, 0.4] }
];
var MAPS = {
  town: { id: "town", name: "\u0E2B\u0E21\u0E39\u0E48\u0E1A\u0E49\u0E32\u0E19\u0E2E\u0E35\u0E42\u0E23\u0E48 \u2022 \u0E2A\u0E16\u0E32\u0E19\u0E35\u0E2D\u0E2D\u0E42\u0E23\u0E23\u0E32", image: "maps/aurora-outpost.webp", width: 4e3, height: 2666, spawn: [0.5, 0.445], walk: [
    // Main plaza follows its painted perimeter, with broad side promenades.
    [[0.29, 0.28], [0.71, 0.28], [0.77, 0.32], [0.73, 0.43], [0.76, 0.53], [0.7, 0.64], [0.61, 0.71], [0.39, 0.71], [0.25, 0.66], [0.23, 0.54], [0.27, 0.43], [0.23, 0.31]],
    rect(0.46, 0.23, 0.54, 0.97),
    rect(0.68, 0.51, 0.97, 0.58),
    rect(0.15, 0.49, 0.32, 0.59),
    // Walk around the two landing pads without crossing parked craft or building roofs.
    rect(0.12, 0.225, 0.31, 0.275),
    rect(0.25, 0.17, 0.3, 0.34),
    rect(0.04, 0.195, 0.12, 0.255),
    rect(0.08, 0.245, 0.27, 0.29),
    rect(0.69, 0.225, 0.88, 0.275),
    rect(0.7, 0.17, 0.75, 0.34),
    rect(0.88, 0.195, 0.96, 0.255),
    rect(0.73, 0.245, 0.92, 0.29)
  ], pois: [{ uv: BUFF_NPC_UV, name: "AURA-01 \u2022 \u0E23\u0E31\u0E1A\u0E1A\u0E31\u0E1F 1 \u0E0A\u0E31\u0E48\u0E27\u0E42\u0E21\u0E07", action: "buff" }, { uv: MERCHANT_UV, name: "MERC-01 \u2022 \u0E2B\u0E38\u0E48\u0E19\u0E1E\u0E48\u0E2D\u0E04\u0E49\u0E32", action: "shop" }, { uv: [0.73, 0.54], name: "FORGE-09 \u2022 \u0E2B\u0E38\u0E48\u0E19\u0E2D\u0E31\u0E1B\u0E40\u0E01\u0E23\u0E14", action: "forge" }, { uv: [0.5, 0.37], name: "\u0E28\u0E39\u0E19\u0E22\u0E4C\u0E1D\u0E36\u0E01\u0E2E\u0E35\u0E42\u0E23\u0E48", action: "skills" }, { uv: [0.5, 0.94], name: "\u0E16\u0E19\u0E19\u0E2A\u0E39\u0E48\u0E1B\u0E48\u0E32\u0E0A\u0E35\u0E27\u0E30\u0E41\u0E2A\u0E07 \u2022 Lv.1\u201360", action: "road", road: "forest" }, { uv: [0.94, 0.54], name: "\u0E16\u0E19\u0E19\u0E2A\u0E39\u0E48\u0E40\u0E02\u0E15\u0E2E\u0E35\u0E42\u0E23\u0E48 \u2022 Lv.61\u2013120", action: "road", road: "star" }] },
  forest: { id: "forest", name: "\u0E1B\u0E48\u0E32\u0E0A\u0E35\u0E27\u0E30\u0E41\u0E2A\u0E07 \u2022 Lv.1\u201360", image: "maps/biolume-tile.webp", tiled: true, cols: FOREST_COLS, rows: FOREST_ROWS, width: 14400, height: 9600, spawn: [1 / 6, 0.935], walk: forestWalk, pois: [{ uv: [1 / 6, 0.95], name: "\u0E16\u0E19\u0E19\u0E01\u0E25\u0E31\u0E1A\u0E2A\u0E16\u0E32\u0E19\u0E35\u0E2D\u0E2D\u0E42\u0E23\u0E23\u0E32", action: "road", road: "town" }, ...REGIONS.map((r) => ({ uv: r.entry, name: r.name + " \u2022 " + r.min + "\u2013" + r.max, action: "waypoint", region: r.id }))] }
};
function inside(u, v, poly) {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if (a[1] > v !== b[1] > v && u < (b[0] - a[0]) * (v - a[1]) / (b[1] - a[1]) + a[0]) hit = !hit;
  }
  return hit;
}
var walkBounds = /* @__PURE__ */ new WeakMap();
var FOOT_OFFSETS = [[0, 0], [15e-4, 0], [-15e-4, 0], [0, 15e-4], [0, -15e-4]];
function geometry(scene) {
  let entry = walkBounds.get(scene);
  if (entry?.source === scene.walk) return entry.polys;
  const polys = scene.walk.map((poly) => ({ poly, l: Math.min(...poly.map((p) => p[0])), r: Math.max(...poly.map((p) => p[0])), t: Math.min(...poly.map((p) => p[1])), b: Math.max(...poly.map((p) => p[1])) }));
  walkBounds.set(scene, { source: scene.walk, polys });
  return polys;
}
function walkable(scene, point) {
  if (scene?.type === "tiles") return tileWalkable(scene, point);
  if (!scene) return Math.abs(point.x) <= 850 && Math.abs(point.y) <= 850;
  const u = 0.5 + 0.8 * (point.x - point.y) / (scene.width || MAP_W), v = 0.6 + 0.4 * (point.x + point.y) / (scene.height || MAP_H), polys = geometry(scene);
  for (const [du, dv] of FOOT_OFFSETS) {
    const x = u + du, y = v + dv;
    let hit = false;
    for (const p of polys) {
      if (x >= p.l && x <= p.r && y >= p.t && y <= p.b && inside(x, y, p.poly)) {
        hit = true;
        break;
      }
    }
    if (!hit) return false;
  }
  return true;
}
function traceStep(scene, from, to) {
  const d = Math.hypot(to.x - from.x, to.y - from.y), steps = Math.max(1, Math.ceil(d / 10));
  let p = { x: from.x, y: from.y };
  for (let i = 1; i <= steps; i++) {
    const q = { x: from.x + (to.x - from.x) * i / steps, y: from.y + (to.y - from.y) * i / steps };
    if (!walkable(scene, q)) break;
    p = q;
  }
  return p;
}

// server/pvp.js
function checkpointFight(world, key, f, now) {
  for (const id of [f.a, f.b]) {
    const p = world.getActor(id);
    if (!p) continue;
    const other = id === f.a ? f.b : f.a, rid = `${key}-${Math.round(f.started * 1e3)}`;
    p.s.pvpReports ??= [];
    const report = { id: rid, at: now * 1e3, opponent: f.names[other], result: "interrupted", ...f.stats[id], unread: false, pending: true };
    const i = p.s.pvpReports.findIndex((r) => r.id === rid);
    if (i < 0) p.s.pvpReports.push(report);
    else p.s.pvpReports[i] = report;
    p.s.pvpReports = p.s.pvpReports.slice(-30);
    p.dirty = true;
  }
}
var distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function capturePresence(p) {
  p.s.worldState = { map: p.map, x: p.x, y: p.y, hp: p.hp, mp: p.mp, cd: { ...p.cd }, offlineSince: p.offlineSince || 0 };
}
function finishFight(world, key, resultA, resultB, now) {
  const f = world.fights.get(key);
  if (!f) return;
  world.fights.delete(key);
  for (const [id, other, result] of [[f.a, f.b, resultA], [f.b, f.a, resultB]]) {
    const p = world.getActor(id);
    if (!p) continue;
    const record = f.stats[id];
    p.s.pvpReports ??= [];
    p.s.pvpReports = p.s.pvpReports.filter((r) => r.id !== `${key}-${Math.round(f.started * 1e3)}`);
    p.s.pvpReports.push({ id: `${key}-${Math.round(f.started * 1e3)}`, at: now * 1e3, opponent: f.names[other], result, ...record, unread: true });
    p.s.pvpReports = p.s.pvpReports.slice(-30);
    p.dirty = true;
    world.event(p, { kind: "pvpResult", result, opponent: f.names[other] });
  }
}
function pvpAttack(world, p, d, now) {
  const reject = (reason) => {
    if (d.type === "skillPlayer" && d.manual === true) world.event(p, { kind: "pvpSkillRejected", reason });
    return false;
  };
  const target = world.getActor(d.target);
  if (!target || target === p || target.hp <= 0 || p.hp <= 0 || target.map !== p.map || now < (target.pvpShield || 0)) return reject("target");
  if (now < p.actionUntil || p.pendingPvp) return reject("busy");
  let range = p.s.hero === "sword-dragonfly" ? 340 : 120, power = 1, k;
  if (d.type === "skillPlayer") {
    if (!Number.isInteger(d.slot) || d.slot < 0 || d.slot > 4) return reject("skill");
    const r = knownSkills(p.s).find((r2) => r2.id === p.s.equipped[d.slot] && r2.level <= p.s.level);
    if (!r) return reject("skill");
    k = compileSkill(r);
    if (now < (p.cd[r.id] || 0)) return reject("cooldown");
    if (p.mp < k.mp) return reject("mana");
    range = k.form === "circle" ? k.radius : k.range;
    power = k.power * combatStats(p.s).spell * (1 + (p.s.skillRanks[r.id] || 0) * 0.06);
  } else if (now < (p.cd.attack || 0)) return false;
  if (distance(p, target) > range || distance(traceStep(world.maps[p.map], p, target), target) > 1) return reject("range");
  const key = [p.id, target.id].sort().join(":");
  let f = world.fights.get(key);
  if (!f) {
    const blank = () => ({ damageTaken: 0, damageDealt: 0, potions: 0, mpPotions: 0 });
    f = { a: p.id, b: target.id, started: now, last: now, names: { [p.id]: p.name, [target.id]: target.name }, stats: { [p.id]: blank(), [target.id]: blank() } };
    world.fights.set(key, f);
  }
  f.last = now;
  p.lastPvp = target.lastPvp = now;
  target.defender = p.id;
  if (k) {
    p.pvpNextSkill = (d.slot + 1) % 5;
    p.mp -= k.mp;
    p.cd[k.id] = now + k.cd;
    p.castId = k.id;
  } else p.cd.attack = now + 0.46 * (1 - combatStats(p.s).haste);
  p.actionUntil = now + (k ? 0.5 : 0.35);
  p.actionKind = k ? "skill" : "attack";
  p.anim = p.actionKind;
  p.animTime = 0;
  const windup = k ? 0.55 : 0.32;
  p.actionUntil = now + windup;
  p.cd.attack = Math.max(p.cd.attack || 0, now + 0.8);
  p.pendingPvp = { target: target.id, key, due: now + windup, range, power };
  world.event(p, { kind: k ? "skill" : "attack", hero: p.s.hero, skillId: k?.id, form: k?.form, aim: { x: target.x, y: target.y }, range, color: k?.color, radius: k?.radius });
  checkpointFight(world, key, f, now);
  return true;
}
function resolvePvpImpacts(world, now) {
  for (const p of world.actors()) {
    const attack = p.pendingPvp;
    if (!attack || now < attack.due) continue;
    delete p.pendingPvp;
    const target = world.getActor(attack.target), f = world.fights.get(attack.key);
    if (!f || p.hp <= 0 || !target || target.hp <= 0 || p.map !== target.map) continue;
    if (now < (target.pvpShield || 0) || now < (target.inv || 0) || distance(p, target) > attack.range || distance(traceStep(world.maps[p.map], p, target), target) > 1) {
      world.event(p, { kind: "pvpMiss", target: target.id, x: target.x, y: target.y });
      continue;
    }
    const hit = Math.min(target.hp, maxHP(target.s) * 0.3, Math.max(1, damage(p.s) * attack.power * 0.45 * 100 / (100 + combatStats(target.s).defense)));
    target.hp = Math.max(0, target.hp - hit);
    f.last = now;
    f.stats[p.id].damageDealt += Math.round(hit);
    f.stats[target.id].damageTaken += Math.round(hit);
    p.dirty = target.dirty = true;
    world.event(p, { kind: "hit", target: target.id, x: target.x, y: target.y, amount: Math.round(hit) });
    checkpointFight(world, attack.key, f, now);
    if (target.hp <= 0) {
      target.anim = "dead";
      target.defender = null;
      delete target.pendingPvp;
      for (const [id, fight] of [...world.fights]) if (fight.a === target.id || fight.b === target.id) finishFight(world, id, fight.a === target.id ? "lost" : "won", fight.b === target.id ? "lost" : "won", now);
    }
  }
}
function tickPvp(world, dt, now) {
  resolvePvpImpacts(world, now);
  for (const p of world.sleepers.values()) {
    if (p.hp <= 0) continue;
    const enemy = world.getActor(p.defender);
    if (!enemy || enemy.hp <= 0 || enemy.map !== p.map || now - (p.lastPvp || 0) > 10 || distance(p, enemy) > 650) continue;
    const use = (type, key, condition) => {
      if (!condition) return;
      const before = p.s[key];
      world.command(p, { type }, now);
      if (p.s[key] < before) {
        for (const f of world.fights.values()) if (f.stats[p.id]) f.stats[p.id][key === "potions" ? "potions" : "mpPotions"]++;
      }
    };
    use("potion", "potions", p.hp < maxHP(p.s) * 0.5);
    use("mpPotion", "mpPotions", p.mp < combatStats(p.s).mp * 0.25);
    let cast = false;
    const first = p.pvpNextSkill || 0;
    for (let n = 0; n < 5 && !cast; n++) {
      const slot = (first + n) % 5;
      cast = pvpAttack(world, p, { type: "skillPlayer", target: enemy.id, slot }, now);
    }
    if (!cast) pvpAttack(world, p, { type: "attackPlayer", target: enemy.id }, now);
  }
  for (const [key, f] of [...world.fights]) {
    checkpointFight(world, key, f, now);
    const a = world.getActor(f.a), b = world.getActor(f.b);
    if (!a || !b) finishFight(world, key, "interrupted", "interrupted", now);
    else if (a.map !== b.map || distance(a, b) > 650 || now - f.last > 10) finishFight(world, key, "escaped", "escaped", now);
  }
}

// server/referrals.js
var import_node_crypto4 = require("node:crypto");
var import_node_fs3 = require("node:fs");
var import_node_path3 = require("node:path");
var hash = (s) => (0, import_node_crypto4.createHash)("sha256").update(s).digest("hex");
function createReferrals(directory) {
  const path = (0, import_node_path3.join)(directory, "referrals.json");
  const read = () => (0, import_node_fs3.existsSync)(path) ? JSON.parse((0, import_node_fs3.readFileSync)(path, "utf8")) : { members: {}, claims: {}, awards: {} };
  const write2 = (d) => {
    (0, import_node_fs3.mkdirSync)(directory, { recursive: true });
    (0, import_node_fs3.writeFileSync)(path + ".tmp", JSON.stringify(d), { mode: 384 });
    (0, import_node_fs3.renameSync)(path + ".tmp", path);
  };
  const code = (account) => hash("cockro-referral:" + account).slice(0, 12).toUpperCase();
  function status(account, uid2) {
    const d = read(), c = code(account);
    if (uid2) {
      d.members[c] = { account, identity: hash(uid2) };
      write2(d);
    }
    return { code: uid2 ? c : null, used: !!(uid2 && d.claims[hash(uid2)]), pending: Object.values(d.awards).filter((a) => a.account === account && !a.delivered).reduce((n, a) => n + a.amount, 0) };
  }
  function redeem(account, uid2, input) {
    if (!uid2) throw Error("google_required");
    if (typeof input !== "string" || !/^[A-F0-9]{12}$/.test(input.trim().toUpperCase())) throw Error("referral_invalid");
    const d = read(), identity = hash(uid2), member = d.members[input.trim().toUpperCase()];
    if (!member) throw Error("referral_invalid");
    if (member.account === account || member.identity === identity) throw Error("referral_self");
    if (d.claims[identity]) throw Error("referral_used");
    const id = hash("referral:" + identity);
    d.claims[identity] = true;
    d.awards[id] = { account: member.account, amount: 500, delivered: false };
    write2(d);
    return { accepted: true, reward: 500 };
  }
  function deliver(account, character, s, persist, { welcome = false } = {}) {
    const d = read(), welcomeId = hash("welcome:" + account);
    if (welcome && !d.awards[welcomeId]) d.awards[welcomeId] = { account, amount: 500, delivered: false };
    s.accountRewardReceipts ??= [];
    for (const [id, a] of Object.entries(d.awards)) {
      if (a.account !== account || a.delivered || a.character && a.character !== character) continue;
      if (!s.accountRewardReceipts.includes(id) && s.stones + a.amount > 1e7) continue;
      a.character = character;
      write2(d);
      if (!s.accountRewardReceipts.includes(id)) {
        s.stones += a.amount;
        s.accountRewardReceipts.push(id);
        persist(s);
      }
      a.delivered = true;
      write2(d);
    }
  }
  function remove(account) {
    const d = read();
    delete d.members[code(account)];
    for (const [id, a] of Object.entries(d.awards)) if (a.account === account) delete d.awards[id];
    write2(d);
  }
  return { status, redeem, deliver, remove };
}

// server/accounts.js
var import_node_crypto8 = require("node:crypto");
var import_node_util = require("node:util");
var import_node_fs7 = require("node:fs");
var import_node_path7 = require("node:path");

// server/characters.js
var import_node_crypto5 = require("node:crypto");
var import_node_fs4 = require("node:fs");
var import_node_path4 = require("node:path");
var CHARACTER_SLOTS = ["main", "slot2", "slot3", "slot4"];
function characterId(account, slot = "main") {
  if (!CHARACTER_SLOTS.includes(slot)) throw Error("character_missing");
  return slot === "main" ? account : (0, import_node_crypto5.createHash)("sha256").update(account + ":" + slot).digest("hex");
}
function readCharacter(directory, account, slot = "main") {
  const path = (0, import_node_path4.join)(directory, characterId(account, slot) + ".json");
  if (!(0, import_node_fs4.existsSync)(path)) return null;
  const state = validSave(JSON.parse((0, import_node_fs4.readFileSync)(path, "utf8")));
  if (!state) throw Error("invalid_save");
  return state;
}
function characterRoster(directory, account) {
  return CHARACTER_SLOTS.flatMap((id) => {
    const state = readCharacter(directory, account, id);
    return state ? [{ id, hero: state.hero, name: state.name || "", level: state.level }] : [];
  });
}

// server/identity-cleanup.js
var import_node_crypto6 = require("node:crypto");
var import_node_fs5 = require("node:fs");
var import_node_path5 = require("node:path");
function createIdentityCleanup(directory, { authUrl, fetcher = fetch } = {}) {
  (0, import_node_fs5.mkdirSync)(directory, { recursive: true, mode: 448 });
  const path = (0, import_node_path5.join)(directory, "account-cleanup-key.pem");
  if (!(0, import_node_fs5.existsSync)(path)) {
    const { privateKey } = (0, import_node_crypto6.generateKeyPairSync)("ed25519");
    (0, import_node_fs5.writeFileSync)(path + ".tmp", privateKey.export({ type: "pkcs8", format: "pem" }), { mode: 384 });
    (0, import_node_fs5.renameSync)(path + ".tmp", path);
  }
  const key = (0, import_node_fs5.readFileSync)(path, "utf8");
  const publicKey = (0, import_node_crypto6.createPublicKey)(key).export({ type: "spki", format: "der" }).toString("base64");
  async function remove(uid2) {
    const body = JSON.stringify({ uid: uid2, timestamp: Date.now() });
    const signature = (0, import_node_crypto6.sign)(null, Buffer.from(body), key).toString("base64");
    const response = await fetcher(authUrl + "/functions/v1/cockro-account-cleanup", { method: "POST", headers: { "Content-Type": "application/json", "X-Cockro-Signature": signature }, body, signal: AbortSignal.timeout(15e3) });
    if (!response.ok) return false;
    const result = await response.json();
    return result.deleted === true;
  }
  return { remove, publicKey };
}

// server/account-deletion.js
var import_node_crypto7 = require("node:crypto");
var import_node_fs6 = require("node:fs");
var import_node_path6 = require("node:path");
var hash2 = (s) => (0, import_node_crypto7.createHash)("sha256").update(s).digest("hex");
var write = (path, value) => {
  (0, import_node_fs6.writeFileSync)(path + ".tmp", JSON.stringify(value), { mode: 384 });
  (0, import_node_fs6.renameSync)(path + ".tmp", path);
};
function createAccountDeletion(directory, { authUrl, adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY, fetcher = fetch } = {}) {
  const identity = createIdentityCleanup(directory, { authUrl, fetcher });
  const root = (0, import_node_path6.join)(directory, "account-deletions");
  const files = () => (0, import_node_fs6.existsSync)(root) ? (0, import_node_fs6.readdirSync)(root) : [];
  const deletedIds = /* @__PURE__ */ new Set();
  const path = (account) => (0, import_node_path6.join)(root, account + ".json");
  const read = (account) => (0, import_node_fs6.existsSync)(path(account)) ? JSON.parse((0, import_node_fs6.readFileSync)(path(account), "utf8")) : null;
  function purge(record) {
    const ids = CHARACTER_SLOTS.map((slot) => characterId(record.account, slot));
    ids.forEach((id) => deletedIds.add(id));
    function clean(base) {
      const commerce = (0, import_node_path6.join)(base, "commerce.json");
      if ((0, import_node_fs6.existsSync)(commerce)) {
        const data = JSON.parse((0, import_node_fs6.readFileSync)(commerce, "utf8"));
        delete data.vaults?.[record.account];
        delete data.shops?.[record.account];
        write(commerce, data);
      }
      if ((0, import_node_fs6.existsSync)((0, import_node_path6.join)(base, "referrals.json"))) createReferrals(base).remove(record.account);
      for (const id of ids) {
        (0, import_node_fs6.rmSync)((0, import_node_path6.join)(base, id + ".json"), { force: true });
        (0, import_node_fs6.rmSync)((0, import_node_path6.join)(base, id + ".json.tmp"), { force: true });
      }
      const trash = (0, import_node_path6.join)(base, "deleted-characters");
      if ((0, import_node_fs6.existsSync)(trash)) {
        for (const file of (0, import_node_fs6.readdirSync)(trash)) if (ids.some((id) => file.startsWith(id + "-"))) (0, import_node_fs6.rmSync)((0, import_node_path6.join)(trash, file), { force: true });
      }
      const accounts = (0, import_node_path6.join)(base, "accounts");
      if ((0, import_node_fs6.existsSync)(accounts)) {
        for (const file of (0, import_node_fs6.readdirSync)(accounts).filter((f) => /^session-.*\.json$/.test(f))) {
          const p = (0, import_node_path6.join)(accounts, file), s = JSON.parse((0, import_node_fs6.readFileSync)(p, "utf8"));
          if (s.account === record.account) (0, import_node_fs6.rmSync)(p);
        }
        (0, import_node_fs6.rmSync)((0, import_node_path6.join)(accounts, "profile-" + hash2(record.account) + ".json"), { force: true });
        if (record.uid) (0, import_node_fs6.rmSync)((0, import_node_path6.join)(accounts, "google-" + hash2(record.uid) + ".json"), { force: true });
      }
      const receipts = (0, import_node_path6.join)(base, "play-receipts");
      if ((0, import_node_fs6.existsSync)(receipts)) for (const file of (0, import_node_fs6.readdirSync)(receipts).filter((f) => f.endsWith(".json"))) {
        const p = (0, import_node_path6.join)(receipts, file), r = JSON.parse((0, import_node_fs6.readFileSync)(p, "utf8"));
        if (r.owner === record.account) write(p, { product: r.product, gold: r.gold, credited: r.credited, consumed: r.consumed, created: r.created, deleted: true });
      }
    }
    clean(directory);
    const backups = (0, import_node_path6.join)(directory, "release-backups");
    if ((0, import_node_fs6.existsSync)(backups)) {
      for (const item of (0, import_node_fs6.readdirSync)(backups, { withFileTypes: true })) if (item.isDirectory()) clean((0, import_node_path6.join)(backups, item.name));
    }
    record.localComplete = true;
    write(path(record.account), record);
  }
  function request(account, uid2) {
    (0, import_node_fs6.mkdirSync)(root, { recursive: true, mode: 448 });
    const record = read(account) || { account, uid: uid2 || null, requestedAt: Date.now(), localComplete: false, identityComplete: !uid2 };
    write(path(account), record);
    CHARACTER_SLOTS.forEach((slot) => deletedIds.add(characterId(account, slot)));
    purge(record);
    return { deleted: true, identityCleanupPending: !record.identityComplete };
  }
  function recover() {
    for (const file of files().filter((f) => /^[a-f0-9]{64}\.json$/.test(f))) {
      const record = JSON.parse((0, import_node_fs6.readFileSync)((0, import_node_path6.join)(root, file), "utf8"));
      CHARACTER_SLOTS.forEach((slot) => deletedIds.add(characterId(record.account, slot)));
      if (!record.localComplete) purge(record);
    }
  }
  let processing = false;
  async function processPending() {
    if (processing) return;
    recover();
    processing = true;
    try {
      for (const file of files().filter((f) => f.endsWith(".json"))) {
        const record = JSON.parse((0, import_node_fs6.readFileSync)((0, import_node_path6.join)(root, file), "utf8"));
        if (!record.localComplete || record.identityComplete || !record.uid) continue;
        try {
          let complete;
          if (!adminKey) complete = await identity.remove(record.uid);
          else {
            const response = await fetcher(authUrl + "/auth/v1/admin/users/" + encodeURIComponent(record.uid), { method: "DELETE", headers: { apikey: adminKey, Authorization: "Bearer " + adminKey }, signal: AbortSignal.timeout(1e4) });
            complete = response.ok || response.status === 404;
          }
          if (complete) {
            record.identityComplete = true;
            delete record.uid;
            write((0, import_node_path6.join)(root, file), record);
          }
        } catch {
        }
      }
    } finally {
      processing = false;
    }
  }
  const identityPending = (uid2) => files().filter((f) => f.endsWith(".json")).some((f) => {
    const r = JSON.parse((0, import_node_fs6.readFileSync)((0, import_node_path6.join)(root, f), "utf8"));
    return !r.identityComplete && r.uid === uid2;
  });
  recover();
  return { publicKey: identity.publicKey, request, isDeleted: (account) => !!read(account), isCharacterDeleted: (id) => deletedIds.has(id), identityPending, processPending };
}

// server/accounts.js
var scrypt = (0, import_node_util.promisify)(import_node_crypto8.scrypt);
var hash3 = (v) => (0, import_node_crypto8.createHash)("sha256").update(v).digest("hex");
var AUTH_URL = "https://kfohckvypopaoogmnjuy.supabase.co";
var AUTH_KEY = "sb_publishable_t64SUKWO3J2UGkhsqnrgsQ_VljJquXA";
var AUTH_REDIRECT = "cockronetwork://auth/callback";
function createAccounts(directory, { fetcher = fetch, adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY } = {}) {
  const referrals = createReferrals(directory);
  const deletion = createAccountDeletion(directory, { authUrl: AUTH_URL, fetcher, adminKey });
  const root = (0, import_node_path7.join)(directory, "accounts");
  const flows = /* @__PURE__ */ new Map(), attempts = /* @__PURE__ */ new Map(), busy = /* @__PURE__ */ new Set();
  const path = (kind, key) => (0, import_node_path7.join)(root, kind + "-" + hash3(key) + ".json");
  const read = (kind, key) => {
    const p = path(kind, key);
    return (0, import_node_fs7.existsSync)(p) ? JSON.parse((0, import_node_fs7.readFileSync)(p, "utf8")) : null;
  };
  const write2 = (kind, key, data) => {
    (0, import_node_fs7.mkdirSync)(root, { recursive: true, mode: 448 });
    const p = path(kind, key);
    (0, import_node_fs7.writeFileSync)(p + ".tmp", JSON.stringify(data), { mode: 384 });
    (0, import_node_fs7.renameSync)(p + ".tmp", p);
  };
  function resolve(token) {
    if (typeof token !== "string" || !/^\w{64}$/.test(token)) throw Error("invalid_token");
    const session = read("session", token);
    if (session) {
      if (deletion.isDeleted(session.account) || session.revoked || !session.persistent && session.expires < Date.now()) throw Error("login_required");
      if (!session.persistent) write2("session", token, { ...session, persistent: true });
      return session.account;
    }
    const account = hash3(token);
    if (deletion.isDeleted(account)) throw Error("account_deleted");
    if (read("profile", account)?.uid) throw Error("login_required");
    if (!read("profile", account) && !characterRoster(directory, account).length) throw Error("account_missing");
    return account;
  }
  const exists = (account) => !deletion.isDeleted(account) && (!!read("profile", account) || characterRoster(directory, account).length > 0);
  const meta = (account) => read("profile", account) || {};
  function throttle(account) {
    const now = Date.now(), q = (attempts.get(account) || []).filter((t) => t > now - 6e5);
    if (q.length >= 5) throw Error("password_locked");
    q.push(now);
    attempts.set(account, q);
  }
  async function verifyPassword(account, password) {
    throttle(account);
    const m = meta(account);
    if (!m.password || typeof password !== "string" || password.length > 128) throw Error("wrong_password");
    const key = await scrypt(password, m.salt, 32);
    if (!(0, import_node_crypto8.timingSafeEqual)(key, Buffer.from(m.password, "hex"))) throw Error("wrong_password");
    attempts.delete(account);
    return m;
  }
  async function manageUnlocked(token, d) {
    const account = resolve(token);
    if (d.action === "logout") {
      write2("session", token, { account, revoked: true });
      return { loggedOut: true };
    }
    if (d.action === "status") return { hasPassword: !!meta(account).password, google: !!meta(account).uid, canReset: !!meta(account).uid && Date.now() - (read("session", token)?.reauthAt || 0) < 3e5, canDelete: !!meta(account).uid && Date.now() - (read("session", token)?.deleteReauthAt || 0) < 3e5, accountId: account.slice(0, 12) };
    if (d.action === "referralStatus") return referrals.status(account, meta(account).uid);
    if (d.action === "redeemReferral") return referrals.redeem(account, meta(account).uid, d.code);
    if (d.action === "deleteAccount") {
      if (meta(account).uid) {
        const proof = read("session", token)?.deleteReauthAt;
        if (!proof || Date.now() - proof > 3e5) throw Error("reauth_required");
      } else await verifyPassword(account, d.password);
      if (d.confirmText !== "\u0E25\u0E1A\u0E1A\u0E31\u0E0D\u0E0A\u0E35 COCKRO") throw Error("confirmation_mismatch");
      return deletion.request(account, meta(account).uid);
    }
    if (d.action === "rename") {
      const state = readCharacter(directory, account, d.character);
      if (!state) throw Error("character_missing");
      if (state.name) throw Error("already_named");
      const name = characterName(d.name);
      if (!name) throw Error("invalid_name");
      state.name = name;
      const p = (0, import_node_path7.join)(directory, characterId(account, d.character) + ".json");
      (0, import_node_fs7.writeFileSync)(p + ".tmp", JSON.stringify(state), { mode: 384 });
      (0, import_node_fs7.renameSync)(p + ".tmp", p);
      return { characters: characterRoster(directory, account) };
    }
    if (d.action === "setPassword") {
      const m = meta(account);
      if (d.reset === true) {
        const session = read("session", token);
        if (!m.uid || !session?.reauthAt || Date.now() - session.reauthAt > 3e5) throw Error("reauth_required");
      } else if (m.password) await verifyPassword(account, d.oldPassword);
      if (typeof d.password !== "string" || d.password.length < 8 || d.password.length > 128) throw Error("weak_password");
      const salt = (0, import_node_crypto8.randomBytes)(16).toString("hex"), key = await scrypt(d.password, salt, 32);
      write2("profile", account, { ...meta(account), salt, password: key.toString("hex") });
      if (d.reset === true) write2("session", token, { ...read("session", token), reauthAt: 0 });
      return { hasPassword: true };
    }
    if (d.action === "delete") {
      await verifyPassword(account, d.password);
      if (!CHARACTER_SLOTS.includes(d.character)) throw Error("character_missing");
      const state = readCharacter(directory, account, d.character);
      if (!state) throw Error("character_missing");
      if (d.confirmName !== (state.name || "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E15\u0E31\u0E49\u0E07\u0E0A\u0E37\u0E48\u0E2D")) throw Error("name_mismatch");
      write2("profile", account, meta(account));
      const trash = (0, import_node_path7.join)(directory, "deleted-characters");
      (0, import_node_fs7.mkdirSync)(trash, { recursive: true, mode: 448 });
      (0, import_node_fs7.renameSync)((0, import_node_path7.join)(directory, characterId(account, d.character) + ".json"), (0, import_node_path7.join)(trash, characterId(account, d.character) + "-" + Date.now() + ".json"));
      return { characters: characterRoster(directory, account) };
    }
    throw Error("invalid_request");
  }
  async function authStart(token, purpose) {
    let account = null;
    if (token) {
      try {
        account = resolve(token);
      } catch (e) {
        if (e.message !== "login_required") throw e;
      }
    }
    if (["resetPassword", "deleteAccount"].includes(purpose) && (!account || !meta(account).uid)) throw Error("google_required");
    for (const [id, f] of flows) if (f.until < Date.now()) flows.delete(id);
    if (flows.size >= 100) throw Error("auth_busy");
    const flow = (0, import_node_crypto8.randomBytes)(32).toString("hex"), verifier = (0, import_node_crypto8.randomBytes)(48).toString("base64url");
    flows.set(flow, { account, purpose, verifier, until: Date.now() + 3e5 });
    const u = new URL(AUTH_URL + "/auth/v1/authorize");
    u.search = new URLSearchParams({ provider: "google", redirect_to: AUTH_REDIRECT, code_challenge: (0, import_node_crypto8.createHash)("sha256").update(verifier).digest("base64url"), code_challenge_method: "s256", prompt: "select_account" }).toString();
    return { flow, url: u.href };
  }
  async function authFinish(flow, code) {
    const f = flows.get(flow);
    if (!f || f.until < Date.now() || typeof code !== "string" || code.length > 2048) throw Error("auth_expired");
    flows.delete(flow);
    const response = await fetcher(AUTH_URL + "/auth/v1/token?grant_type=pkce", { method: "POST", headers: { apikey: AUTH_KEY, "Content-Type": "application/json" }, body: JSON.stringify({ auth_code: code, code_verifier: f.verifier }), signal: AbortSignal.timeout(15e3) });
    if (!response.ok) throw Error("auth_failed");
    const session = await response.json();
    const check = await fetcher(AUTH_URL + "/auth/v1/user", { headers: { apikey: AUTH_KEY, Authorization: "Bearer " + session.access_token }, signal: AbortSignal.timeout(15e3) });
    if (!check.ok) throw Error("auth_failed");
    const user = await check.json();
    if (typeof user.id !== "string" || !user.identities?.some((i) => i.provider === "google")) throw Error("auth_failed");
    if (deletion.identityPending(user.id)) throw Error("deletion_pending");
    if (["resetPassword", "deleteAccount"].includes(f.purpose) && meta(f.account).uid !== user.id) throw Error("wrong_google_account");
    if (f.account && deletion.isDeleted(f.account)) throw Error("account_deleted");
    const existing = read("google", user.id);
    let account = existing?.account;
    if (!account) {
      account = f.account || hash3((0, import_node_crypto8.randomBytes)(32));
      const profile = meta(account);
      if (profile.uid && profile.uid !== user.id) throw Error("account_linked");
      write2("profile", account, { ...profile, uid: user.id });
      write2("google", user.id, { account });
    }
    const token = (0, import_node_crypto8.randomBytes)(32).toString("hex");
    write2("session", token, { account, persistent: true, createdAt: Date.now(), reauthAt: f.purpose === "resetPassword" ? Date.now() : 0, deleteReauthAt: f.purpose === "deleteAccount" ? Date.now() : 0 });
    return { token, google: true, accountDeletionReady: f.purpose === "deleteAccount", passwordReset: f.purpose === "resetPassword", characters: characterRoster(directory, account), loadedExisting: !!existing && f.account !== account };
  }
  async function manage(token, d) {
    const account = resolve(token);
    if (busy.has(account)) throw Error("account_busy");
    busy.add(account);
    try {
      return await manageUnlocked(token, d);
    } finally {
      busy.delete(account);
    }
  }
  return { resolve, exists, meta, manage, authStart, authFinish, busy, deletion, referrals };
}

// server/server.js
var import_node_http = __toESM(require("node:http"), 1);

// server/reward-target.js
function rewardTarget(s, item) {
  if (typeof item === "string" && item.startsWith("restore:")) {
    const target = restoreTarget(s, item.slice(8));
    if (!target) throw Error("invalid_reward");
    return target;
  }
  if (!Object.hasOwn(UPGRADE_ITEMS, item) || (s.upgradeItems?.[item] || 0) >= 99999) throw Error("invalid_reward");
  return null;
}
function deliverReward(s, t) {
  if (t.item.startsWith("restore:")) {
    if (!restoreSpecial(s, t.restore)) throw Error("restore_expired");
    return;
  }
  if (!Object.hasOwn(UPGRADE_ITEMS, t.item) || (s.upgradeItems[t.item] || 0) >= 99999) throw Error("inventory_full");
  s.upgradeItems[t.item] = (s.upgradeItems[t.item] || 0) + 1;
}

// server/test-rewards.js
var import_node_crypto9 = require("node:crypto");
function issueTestTicket(s, item, now = Date.now()) {
  const restore = rewardTarget(s, item);
  s.adTickets = (s.adTickets || []).filter((t2) => t2.created > now - 864e5);
  const recent = s.adTickets.filter((t2) => t2.kind === "demo");
  const pending = recent.find((t2) => !t2.transaction && t2.item === item && now - t2.created < 36e5);
  if (pending && JSON.stringify(pending.restore) === JSON.stringify(restore)) return pending;
  if (recent.length >= 20) throw Error("test_limit");
  const t = { kind: "demo", nonce: (0, import_node_crypto9.randomBytes)(24).toString("hex"), item, restore, created: now };
  s.adTickets.push(t);
  return t;
}
function completeTestTicket(s, nonce, now = Date.now()) {
  const t = s.adTickets?.find((t2) => t2.kind === "demo" && t2.nonce === nonce);
  if (!t || now - t.created > 36e5) throw Error("invalid_test_ticket");
  if (t.transaction) return { item: t.item, duplicate: true };
  deliverReward(s, t);
  t.transaction = "demo:" + nonce;
  return { item: t.item, duplicate: false };
}

// server/rewarded-ads.js
var import_node_crypto10 = require("node:crypto");
var TTL = 36e5;
var RETENTION = 864e5;
function issueRewardTicket(s, item, now = Date.now()) {
  const restore = rewardTarget(s, item);
  const tickets = (s.adTickets || []).filter((t) => t.created > now - RETENTION);
  if (tickets.some((t) => !t.transaction && t.created > now - 9e4)) throw Error("ad_pending");
  if (tickets.length >= 100) throw Error("ad_limit");
  const ticket = { nonce: (0, import_node_crypto10.randomBytes)(24).toString("hex"), item, restore, created: now };
  s.adTickets = [...tickets, ticket];
  return ticket;
}
function applyVerifiedReward(s, params, now = Date.now()) {
  const ticket = s.adTickets?.find((t) => t.nonce === params.custom_data);
  if (!ticket || ticket.kind === "demo") throw Error("unknown_ticket");
  if (ticket.transaction) {
    if (ticket.transaction === params.transaction_id) return false;
    throw Error("used_ticket");
  }
  const stamp = Number(params.timestamp);
  if (!Number.isFinite(stamp) || stamp < ticket.created - 6e4 || stamp > ticket.created + TTL || stamp > now + 6e4 || now - stamp > RETENTION) throw Error("expired_reward");
  if (!/^[\w.-]{1,200}$/.test(params.transaction_id || "") || s.adTickets.some((t) => t.transaction === params.transaction_id)) throw Error("duplicate_transaction");
  deliverReward(s, ticket);
  ticket.transaction = params.transaction_id;
  return true;
}
function createSSVVerifier({ fetchKeys = () => fetch("https://www.gstatic.com/admob/reward/verifier-keys.json", { signal: AbortSignal.timeout(5e3) }), unit } = {}) {
  let cache = /* @__PURE__ */ new Map(), fetched = 0, inflight;
  async function refresh() {
    if (!inflight) inflight = (async () => {
      const r = await fetchKeys();
      if (!r.ok) throw Error("keys_unavailable");
      const json = await r.json();
      const next = new Map(json.keys.map((k) => [String(k.keyId), k.pem]));
      if (!next.size) throw Error("keys_unavailable");
      cache = next;
      fetched = Date.now();
    })().finally(() => inflight = null);
    return inflight;
  }
  return async (raw) => {
    if (!unit || unit.includes("3940256099942544")) throw Error("ads_disabled");
    if (raw.length > 4096) throw Error("invalid_callback");
    const match = /^(.+)&signature=([A-Za-z0-9_%=-]+)&key_id=(\d+)$/.exec(raw);
    if (!match) throw Error("invalid_signature");
    const [, content, signature, keyId] = match, params = new URLSearchParams(content), seen = /* @__PURE__ */ new Set();
    for (const [key2] of params) {
      if (seen.has(key2) || ["signature", "key_id"].includes(key2)) throw Error("duplicate_parameter");
      seen.add(key2);
    }
    if (Date.now() - fetched > RETENTION || !cache.has(keyId) && Date.now() - fetched > 6e4) await refresh();
    const key = cache.get(keyId);
    if (!key || !(0, import_node_crypto10.verify)("sha256", Buffer.from(content), key, Buffer.from(decodeURIComponent(signature), "base64url"))) throw Error("invalid_signature");
    const p = Object.fromEntries(params);
    if (p.user_id === "0".repeat(64) && p.custom_data === "0".repeat(48)) return p;
    if (p.ad_unit !== unit.split("/").at(-1) && p.ad_unit !== unit) throw Error("wrong_ad_unit");
    if (p.reward_amount !== "1" || p.reward_item !== "item") throw Error("wrong_reward");
    if (!/^[a-f0-9]{64}$/.test(p.user_id || "") || !/^[a-f0-9]{48}$/.test(p.custom_data || "")) throw Error("invalid_reward_identity");
    return p;
  };
}

// node_modules/ws/wrapper.mjs
var import_stream = __toESM(require_stream(), 1);
var import_extension = __toESM(require_extension(), 1);
var import_permessage_deflate = __toESM(require_permessage_deflate(), 1);
var import_receiver = __toESM(require_receiver(), 1);
var import_sender = __toESM(require_sender(), 1);
var import_subprotocol = __toESM(require_subprotocol(), 1);
var import_websocket = __toESM(require_websocket(), 1);
var import_websocket_server = __toESM(require_websocket_server(), 1);

// server/server.js
var import_node_crypto11 = require("node:crypto");
var import_node_fs8 = require("node:fs");
var import_node_path8 = require("node:path");

// server/roamers.js
var ROSTER = [["\u0E41\u0E2A\u0E07\u0E40\u0E2B\u0E19\u0E37\u0E2D", 5], ["\u0E14\u0E32\u0E27\u0E2B\u0E32\u0E07", 8], ["\u0E21\u0E30\u0E25\u0E34\u0E0B\u0E48\u0E32", 12], ["\u0E02\u0E38\u0E19\u0E40\u0E2B\u0E25\u0E47\u0E01", 16], ["\u0E2A\u0E32\u0E22\u0E2B\u0E21\u0E2D\u0E01", 20], ["\u0E27\u0E32\u0E22\u0E38\u0E04\u0E23\u0E32\u0E21", 25], ["\u0E08\u0E31\u0E19\u0E17\u0E23\u0E4C\u0E40\u0E08\u0E49\u0E32", 30], ["\u0E15\u0E30\u0E27\u0E31\u0E19\u0E41\u0E14\u0E07", 35], ["\u0E19\u0E34\u0E25\u0E01\u0E32\u0E2C", 12], ["\u0E1B\u0E23\u0E30\u0E01\u0E32\u0E22\u0E14\u0E32\u0E27", 20], ["\u0E1E\u0E22\u0E31\u0E04\u0E06\u0E4C\u0E40\u0E07\u0E34\u0E19", 42], ["\u0E2D\u0E31\u0E28\u0E27\u0E34\u0E19\u0E23\u0E38\u0E48\u0E07", 60]];
var HEROES2 = ["sword-cockro", "sword-dragonfly", "sword-cricket", "demon-scorpion"];
var distance2 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function createRoamers(world) {
  const result = /* @__PURE__ */ new Map();
  ROSTER.forEach(([name, level], i) => {
    const s = fresh(HEROES2[i % HEROES2.length]);
    Object.assign(s, { name, level, gold: 0, stones: 0, potions: 0, mpPotions: 0 });
    s.equipped = knownSkills(s).filter((k) => k.level <= level).slice(0, 5).map((k) => k.id);
    const p = world.makeActor("roamer-" + (i + 1), s), map = i < 8 ? "town" : "forest";
    const center = toWorld(map === "town" ? MAPS.town.spawn : REGIONS[0].entry, MAPS[map]);
    const angle = i * 2.399, offset = 90 + i % 4 * 100;
    const home = traceStep(world.maps[map], center, { x: center.x + Math.cos(angle) * offset, y: center.y + Math.sin(angle) * offset });
    Object.assign(p, home, { map, roamer: true, home: { ...home }, routeIndex: i, nextWander: 0, hp: maxHP(s), mp: combatStats(s).mp });
    result.set(p.id, p);
  });
  return result;
}
function tickRoamers(world, dt, now) {
  for (const p of world.roamers.values()) {
    if (p.hp <= 0) {
      p.respawnAt ??= now + 30;
      if (now < p.respawnAt) continue;
      Object.assign(p, p.home, { hp: maxHP(p.s), mp: combatStats(p.s).mp, anim: "idle", defender: null, pvpShield: now + 5, cd: {}, actionUntil: 0 });
      delete p.pendingPvp;
      delete p.respawnAt;
      p.nextWander = now + 3;
    }
    const enemy = world.getActor(p.defender);
    if (enemy && !enemy.roamer && enemy.hp > 0 && enemy.map === p.map && now - (p.lastPvp || 0) < 10 && distance2(p, enemy) < 600) {
      if (distance2(p, enemy) > 100 && distance2(p, p.home) < 450 && now >= p.actionUntil) move(world, p, enemy, dt, now);
      let cast = false;
      for (let n = 0; n < 5 && !cast; n++) {
        const slot = ((p.pvpNextSkill || 0) + n) % 5;
        cast = pvpAttack(world, p, { type: "skillPlayer", slot, target: enemy.id }, now);
      }
      if (!cast) pvpAttack(world, p, { type: "attackPlayer", target: enemy.id }, now);
      continue;
    }
    p.defender = null;
    if (now - (p.lastPvp || 0) < 12 || now < p.actionUntil) continue;
    p.hp = Math.min(maxHP(p.s), p.hp + maxHP(p.s) * dt * 0.08);
    if (now < p.nextWander) continue;
    if (!p.destination || distance2(p, p.destination) < 8) {
      const angle = ++p.routeIndex * 2.399, radius = 100 + p.routeIndex % 4 * 65;
      const destination = traceStep(world.maps[p.map], p.home, { x: p.home.x + Math.cos(angle) * radius, y: p.home.y + Math.sin(angle) * radius });
      p.destination = walkable(world.maps[p.map], destination) ? destination : { ...p.home };
      p.nextWander = now + 1 + p.routeIndex % 3;
      p.anim = "idle";
      continue;
    }
    move(world, p, p.destination, dt, now);
  }
}
function move(world, p, target, dt, now) {
  const d = distance2(p, target);
  if (d < 1) return;
  const ratio = Math.min(1, 90 * Math.min(0.2, dt) / d), next = traceStep(world.maps[p.map], p, { x: p.x + (target.x - p.x) * ratio, y: p.y + (target.y - p.y) * ratio });
  const dx = next.x - p.x, dy = next.y - p.y;
  if (Math.hypot(dx, dy) < 0.05) {
    p.destination = null;
    p.nextWander = now + 1;
    return;
  }
  Object.assign(p, next, { anim: "walk", moveAt: now, walkDX: dx, walkDY: dy, face: dx - dy >= 0 ? 1 : -1, back: dx + dy < 0 });
  p.walkDistance += Math.hypot(dx, dy);
}

// web/monster-behavior.js
var aggressiveMonster = (def) => def.aggressive ?? (!!def.boss || def.id % 3 === 0);

// web/ground-loot.js
var LOOT_SECONDS = 8;
var LOOT_RADIUS = 65;
function monsterRewards(s, m, rng = Math.random) {
  const gold = s.gold, alloy = s.upgradeItems?.alloy || 0;
  reward(s, m, rng);
  const rewards = [];
  if (s.gold > gold) rewards.push({ kind: "gold", count: s.gold - gold });
  if (s.upgradeItems.alloy > alloy) rewards.push({ kind: "material", itemId: "alloy", count: s.upgradeItems.alloy - alloy });
  s.gold = gold;
  s.upgradeItems.alloy = alloy;
  const item = rollDrop(m, rng);
  if (item) rewards.push({ kind: "gear", item, count: 1 });
  return rewards;
}
function collectLoot(s, d) {
  if (d.kind === "gear") {
    if (s.bag.length >= BAG_SIZE) return false;
    s.bag.push(d.item);
  } else if (d.kind === "gold") s.gold = Math.min(1e10, s.gold + d.count);
  else if (d.kind === "material") {
    const n = s.upgradeItems[d.itemId] || 0;
    if (n + d.count > 99999) return false;
    s.upgradeItems[d.itemId] = n + d.count;
  } else return false;
  return true;
}

// web/mob-motion.js
var dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function moveMonster(e, scene, goal, step) {
  const n = dist(e, goal);
  if (n < 0.01) return;
  const next = traceStep(scene, e, { x: e.x + (goal.x - e.x) / n * Math.min(n, step), y: e.y + (goal.y - e.y) / n * Math.min(n, step) }), moved = dist(e, next);
  if (moved > 0.01) {
    e.walkDistance = (e.walkDistance || 0) + moved;
    e.face = next.x - e.x - (next.y - e.y) >= 0 ? 1 : -1;
    e.moving = true;
    Object.assign(e, next);
  }
  return moved;
}
function wanderMonster(e, scene, dt, now) {
  if (e.state === "windup") return;
  e.state = "idle";
  if (now < (e.restUntil || 0)) return;
  if (!e.roamGoal) {
    const seed = String(e.id || e.spawnId).split("").reduce((a2, c) => a2 * 31 + c.charCodeAt(0) >>> 0, 0), turn = e.roamTurn || 0;
    e.roamTurn = turn + 1;
    const a = seed % 628 / 100 + turn * 2.399, r = 70 + (seed + turn * 37) % 150;
    const goal = { x: e.homeX + Math.cos(a) * r, y: e.homeY + Math.sin(a) * r };
    if (!walkable(scene, goal)) {
      e.restUntil = now + 1;
      return;
    }
    e.roamGoal = goal;
  }
  const moved = moveMonster(e, scene, e.roamGoal, e.def.speed * 0.45 * dt);
  if (dist(e, e.roamGoal) < 8 || !moved) {
    e.roamGoal = null;
    e.restUntil = now + 1 + e.roamTurn % 4 * 0.6;
  }
}

// web/roads.js
var TOWN_ROADS = [{ id: "forest", from: [0.5, 0.76], end: [0.5, 0.94], arrival: [0.5, 0.87], min: 1 }, { id: "star", from: [0.73, 0.54], end: [0.94, 0.54], arrival: [0.87, 0.54], min: 61 }];
var FOREST_ROAD_EXIT = [1 / 6, 0.95];
var FOREST_ROAD_ARRIVAL = [1 / 6, 0.91];
function roadDestination(map, point, level, star) {
  const near = (w) => Math.hypot(point.x - w.x, point.y - w.y) < 85;
  if (map === "town") {
    for (const r of TOWN_ROADS) if (near(toWorld(r.end, MAPS.town))) return level >= r.min ? { map: r.id, road: r.id } : null;
  }
  if (map === "forest" && near(toWorld(FOREST_ROAD_EXIT, MAPS.forest))) return { map: "town", road: "forest" };
  if (map === "star") {
    const gate = star.pois.find((p) => p.action === "town");
    if (gate && near(gate.world)) return { map: "town", road: "star" };
  }
  return null;
}
function roadArrival(destination, star) {
  if (destination.map === "town") return toWorld(TOWN_ROADS.find((r) => r.id === destination.road).arrival, MAPS.town);
  if (destination.map === "forest") return toWorld(FOREST_ROAD_ARRIVAL, MAPS.forest);
  const g = star.pois.find((p) => p.action === "warp" && p.zone === 0);
  return { x: g.world.x + 40, y: g.world.y + 70 };
}

// web/alien-population.js
var PACK_SIZE = 6;
var PACKS_PER_REGION = 27;
var EXTRA_NORMALS = Math.ceil(6 * PACK_SIZE * PACKS_PER_REGION * 0.2);
var EXTRA_BOSSES = 40;
var POPULATION = 6 * (PACK_SIZE * PACKS_PER_REGION + 1) + EXTRA_NORMALS + EXTRA_BOSSES;
var CAMPS = REGIONS.flatMap((region) => {
  const baseCol = Math.floor(region.center[0] * 3) * 3, baseRow = region.id < 3 ? 3 : 0;
  const camps = [];
  for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) {
    for (const [index, u, v] of [[0, 0.38, 0.46], [1, 0.62, 0.46], [2, 0.5, 0.65]]) {
      const tier = Math.min(9, (2 - row) * 3 + col + [1, 2, 0][index]);
      camps.push({ id: `${region.id}-${row}-${col}-${index}`, region: region.id, tier, uv: [(baseCol + col + u) / FOREST_COLS, (baseRow + row + v) / FOREST_ROWS] });
    }
  }
  return camps;
});
function makePopulation() {
  const units = [];
  for (const camp of CAMPS) {
    const center = toWorld(camp.uv, MAPS.forest);
    for (let i = 0; i < PACK_SIZE; i++) {
      const tileCol = Math.floor(camp.uv[0] * FOREST_COLS), tileRow = Math.floor(camp.uv[1] * FOREST_ROWS), row = Number(camp.id.split("-").at(-1));
      const jitter = Math.sin(tileCol * 31 + tileRow * 17 + i * 13 + row * 7) * 0.035;
      const position = toWorld([Math.max(0.02, Math.min(0.98, (tileCol + (i + 0.5) / 6 + jitter) / FOREST_COLS)), Math.max(0.02, Math.min(0.98, (tileRow + (row + 0.5) / 3 + jitter) / FOREST_ROWS))], MAPS.forest);
      const entry = toWorld(REGIONS[camp.region].entry, MAPS.forest);
      const level = camp.region * 10 + 1 + (Math.hypot(position.x - entry.x, position.y - entry.y) < 700 ? i % 3 : camp.tier);
      const def = i % 3 === 0 ? MONSTERS[level - 1] : forestMonster(level);
      units.push(makeUnit(def, position, `${camp.id}-${i}`));
    }
  }
  for (const region of REGIONS) {
    const col = Math.floor(region.center[0] * 3) * 3 + 1, row = region.id < 3 ? 3 : 0;
    const position = toWorld([(col + 0.5) / FOREST_COLS, (row + 0.34) / FOREST_ROWS], MAPS.forest);
    units.push(makeUnit(MONSTERS.find((m) => m.boss && m.region === region.id), position, region.id + "-boss"));
  }
  for (let i = 0; i < EXTRA_NORMALS; i++) {
    const region = REGIONS[i % 6], n = Math.floor(i / 6), tile = n % 9;
    const col = Math.floor(region.center[0] * 3) * 3 + tile % 3, row = (region.id < 3 ? 3 : 0) + Math.floor(tile / 3);
    const position = toWorld([(col + 0.18 + Math.floor(n / 9) % 4 * 0.21) / FOREST_COLS, (row + 0.31 + tile % 2 * 0.38) / FOREST_ROWS], MAPS.forest);
    const entry = toWorld(region.entry, MAPS.forest), level = region.min + (Math.hypot(position.x - entry.x, position.y - entry.y) < 700 ? n % 3 : (tile + n) % 10);
    units.push(makeUnit(forestMonster(level), position, `extra-${i}`));
  }
  for (let i = 0; i < EXTRA_BOSSES; i++) {
    const region = REGIONS[i % 6], tile = Math.floor(i / 6), col = Math.floor(region.center[0] * 3) * 3 + tile % 3, row = (region.id < 3 ? 3 : 0) + Math.floor(tile / 3);
    let position = toWorld([(col + 0.76) / FOREST_COLS, (row + 0.27) / FOREST_ROWS], MAPS.forest);
    const entry = toWorld(region.entry, MAPS.forest);
    if (Math.hypot(position.x - entry.x, position.y - entry.y) < 850) position = toWorld([(col + 0.83) / FOREST_COLS, (row + 0.08) / FOREST_ROWS], MAPS.forest);
    units.push(makeUnit(MONSTERS.find((m) => m.boss && m.region === region.id), position, `extra-boss-${i}`));
  }
  return units;
}
function makeUnit(def, position, spawnId) {
  return { def, ...position, spawnId, hp: def.hp, state: "idle", clock: 2, angle: 0, face: 1, flash: 0, homeX: position.x, homeY: position.y, respawn: 0 };
}

// web/maps/hero-star.json
var hero_star_default = { type: "map", version: "1.10", tiledversion: "1.10.2", orientation: "isometric", renderorder: "right-down", width: 192, height: 192, tilewidth: 64, tileheight: 32, infinite: false, compressionlevel: -1, properties: [{ name: "title", type: "string", value: "\u0E14\u0E32\u0E27\u0E2E\u0E35\u0E42\u0E23\u0E48 \u2022 Lv.61\u2013120" }, { name: "en", type: "string", value: "Hero Star" }, { name: "tileWorld", type: "int", value: 48 }, { name: "seed", type: "int", value: 20261029 }, { name: "generator", type: "string", value: "tools/gen-hero-star.mjs" }], tilesets: [{ firstgid: 1, name: "hero-star-terrain", tilewidth: 64, tileheight: 32, tilecount: 41, columns: 0, margin: 0, spacing: 0, grid: { orientation: "isometric", width: 64, height: 32 }, tiles: [{ id: 0, properties: [{ name: "kind", type: "string", value: "void" }, { name: "walkable", type: "bool", value: false }, { name: "zone", type: "int", value: -1 }] }, { id: 1, properties: [{ name: "kind", type: "string", value: "chasm" }, { name: "walkable", type: "bool", value: false }, { name: "zone", type: "int", value: -1 }] }, { id: 2, properties: [{ name: "kind", type: "string", value: "road" }, { name: "walkable", type: "bool", value: true }, { name: "zone", type: "int", value: -1 }] }, { id: 3, properties: [{ name: "kind", type: "string", value: "bridge" }, { name: "walkable", type: "bool", value: true }, { name: "zone", type: "int", value: -1 }] }, { id: 4, properties: [{ name: "kind", type: "string", value: "plaza" }, { name: "walkable", type: "bool", value: true }, { name: "zone", type: "int", value: -1 }] }, { id: 5, properties: [{ name: "kind", type: "string", value: "ground" }, { name: "walkable", type: "bool", value: true }, { name: "zone", type: "int", value: 0 }, { name: "color", type: "string", value: "#6f9e5c" }] }, { id: 6, properties: [{ name: "kind", type: "string", value: "ground" }, { name: "walkable", type: "bool", value: true }, { name: "zone", type: "int", value: 0 }, { name: "color", type: "string", value: "#86b468" }] }, { id: 7, properties: [{ name: "kind", type: "string", value: "water" }, { name: "walkable", type: "bool", value: false }, { name: "zone", type: "int", value: 0 }, { name: "color", type: "string", value: "#4f9fc0" }] }, { id: 8, properties: [{ name: "kind", type: "string", value: "ground" }, { name: "walkable", type: "bool", value: true }, { name: "zone", type: "int", value: 1 }, { name: "color", type: "string", value: "#3f7a6c" }] }, { id: 9, properties: [{ name: "kind", type: "string", value: "ground" }, { name: "walkable", type: "bool", value: true }, { name: "zone", type: "int", value: 1 }, { name: "color", type: "string", value: "#4d8b74" }] }, { id: 10, properties: [{ name: "kind", type: "string", value: "water" }, { name: "walkable", type: "bool", value: false }, { name: "zone", type: "int", value: 1 }, { name: "color", type: "string", value: "#3f8fb0" }] }, { id: 11, properties: [{ name: "kind", type: "string", value: "ground" }, { name: "walkable", type: "bool", value: true }, { name: "zone", type: "int", value: 2 }, { name: "color", type: "string", value: "#9c9a4e" }] }, { id: 12, properties: [{ name: "kind", type: "string", value: "ground" }, { name: "walkable", type: "bool", value: true }, { name: "zone", type: "int", value: 2 }, { name: "color", type: "string", value: "#b0aa5c" }] }, { id: 13, properties: [{ name: "kind", type: "string", value: "acid" }, { name: "walkable", type: "bool", value: false }, { name: "zone", type: "int", value: 2 }, { name: "color", type: "string", value: "#f0b43a" }] }, { id: 14, properties: [{ name: "kind", type: "string", value: "ground" }, { name: "walkable", type: "bool", value: true }, { name: "zone", type: "int", value: 3 }, { name: "color", type: "string", value: "#a87652" }] }, { id: 15, properties: [{ name: "kind", type: "string", value: "ground" }, { name: "walkable", type: "bool", value: true }, { name: "zone", type: "int", value: 3 }, { name: "color", type: "string", value: "#b98762" }] }, { id: 16, properties: [{ name: "kind", type: "string", value: "water" }, { name: "walkable", type: "bool", value: false }, { name: "zone", type: "int", value: 3 }, { name: "color", type: "string", value: "#4f9fbd" }] }, { id: 17, properties: [{ name: "kind", type: "string", value: "ground" }, { name: "walkable", type: "bool", value: true }, { name: "zone", type: "int", value: 4 }, { name: "color", type: "string", value: "#4f6e4a" }] }, { id: 18, properties: [{ name: "kind", type: "string", value: "ground" }, { name: "walkable", type: "bool", value: true }, { name: "zone", type: "int", value: 4 }, { name: "color", type: "string", value: "#5b7c52" }] }, { id: 19, properties: [{ name: "kind", type: "string", value: "acid" }, { name: "walkable", type: "bool", value: false }, { name: "zone", type: "int", value: 4 }, { name: "color", type: "string", value: "#8fdc4e" }] }, { id: 20, properties: [{ name: "kind", type: "string", value: "ground" }, { name: "walkable", type: "bool", value: true }, { name: "zone", type: "int", value: 5 }, { name: "color", type: "string", value: "#3f5f7a" }] }, { id: 21, properties: [{ name: "kind", type: "string", value: "ground" }, { name: "walkable", type: "bool", value: true }, { name: "zone", type: "int", value: 5 }, { name: "color", type: "string", value: "#4b6d88" }] }, { id: 22, properties: [{ name: "kind", type: "string", value: "water" }, { name: "walkable", type: "bool", value: false }, { name: "zone", type: "int", value: 5 }, { name: "color", type: "string", value: "#39b6d6" }] }, { id: 23, properties: [{ name: "kind", type: "string", value: "ground" }, { name: "walkable", type: "bool", value: true }, { name: "zone", type: "int", value: 6 }, { name: "color", type: "string", value: "#7d8288" }] }, { id: 24, properties: [{ name: "kind", type: "string", value: "ground" }, { name: "walkable", type: "bool", value: true }, { name: "zone", type: "int", value: 6 }, { name: "color", type: "string", value: "#8b9096" }] }, { id: 25, properties: [{ name: "kind", type: "string", value: "chasm" }, { name: "walkable", type: "bool", value: false }, { name: "zone", type: "int", value: 6 }, { name: "color", type: "string", value: "#0b1430" }] }, { id: 26, properties: [{ name: "kind", type: "string", value: "ground" }, { name: "walkable", type: "bool", value: true }, { name: "zone", type: "int", value: 7 }, { name: "color", type: "string", value: "#b9714a" }] }, { id: 27, properties: [{ name: "kind", type: "string", value: "ground" }, { name: "walkable", type: "bool", value: true }, { name: "zone", type: "int", value: 7 }, { name: "color", type: "string", value: "#c7805a" }] }, { id: 28, properties: [{ name: "kind", type: "string", value: "chasm" }, { name: "walkable", type: "bool", value: false }, { name: "zone", type: "int", value: 7 }, { name: "color", type: "string", value: "#0b1430" }] }, { id: 29, properties: [{ name: "kind", type: "string", value: "ground" }, { name: "walkable", type: "bool", value: true }, { name: "zone", type: "int", value: 8 }, { name: "color", type: "string", value: "#4a4f66" }] }, { id: 30, properties: [{ name: "kind", type: "string", value: "ground" }, { name: "walkable", type: "bool", value: true }, { name: "zone", type: "int", value: 8 }, { name: "color", type: "string", value: "#565b74" }] }, { id: 31, properties: [{ name: "kind", type: "string", value: "water" }, { name: "walkable", type: "bool", value: false }, { name: "zone", type: "int", value: 8 }, { name: "color", type: "string", value: "#2fc8f0" }] }, { id: 32, properties: [{ name: "kind", type: "string", value: "ground" }, { name: "walkable", type: "bool", value: true }, { name: "zone", type: "int", value: 9 }, { name: "color", type: "string", value: "#8a6f3c" }] }, { id: 33, properties: [{ name: "kind", type: "string", value: "ground" }, { name: "walkable", type: "bool", value: true }, { name: "zone", type: "int", value: 9 }, { name: "color", type: "string", value: "#9a7d46" }] }, { id: 34, properties: [{ name: "kind", type: "string", value: "acid" }, { name: "walkable", type: "bool", value: false }, { name: "zone", type: "int", value: 9 }, { name: "color", type: "string", value: "#f2b230" }] }, { id: 35, properties: [{ name: "kind", type: "string", value: "ground" }, { name: "walkable", type: "bool", value: true }, { name: "zone", type: "int", value: 10 }, { name: "color", type: "string", value: "#5a4b6e" }] }, { id: 36, properties: [{ name: "kind", type: "string", value: "ground" }, { name: "walkable", type: "bool", value: true }, { name: "zone", type: "int", value: 10 }, { name: "color", type: "string", value: "#665579" }] }, { id: 37, properties: [{ name: "kind", type: "string", value: "acid" }, { name: "walkable", type: "bool", value: false }, { name: "zone", type: "int", value: 10 }, { name: "color", type: "string", value: "#b58cff" }] }, { id: 38, properties: [{ name: "kind", type: "string", value: "ground" }, { name: "walkable", type: "bool", value: true }, { name: "zone", type: "int", value: 11 }, { name: "color", type: "string", value: "#4a3a3c" }] }, { id: 39, properties: [{ name: "kind", type: "string", value: "ground" }, { name: "walkable", type: "bool", value: true }, { name: "zone", type: "int", value: 11 }, { name: "color", type: "string", value: "#574446" }] }, { id: 40, properties: [{ name: "kind", type: "string", value: "lava" }, { name: "walkable", type: "bool", value: false }, { name: "zone", type: "int", value: 11 }, { name: "color", type: "string", value: "#ff7a2e" }] }] }, { firstgid: 101, name: "hero-star-props", tilewidth: 64, tileheight: 96, tilecount: 17, columns: 0, margin: 0, spacing: 0, grid: { orientation: "isometric", width: 64, height: 32 }, tiles: [{ id: 0, properties: [{ name: "kind", type: "string", value: "bulbtree" }, { name: "walkable", type: "bool", value: false }] }, { id: 1, properties: [{ name: "kind", type: "string", value: "mushroom" }, { name: "walkable", type: "bool", value: false }] }, { id: 2, properties: [{ name: "kind", type: "string", value: "crystal" }, { name: "walkable", type: "bool", value: false }] }, { id: 3, properties: [{ name: "kind", type: "string", value: "crystaltree" }, { name: "walkable", type: "bool", value: false }] }, { id: 4, properties: [{ name: "kind", type: "string", value: "rock" }, { name: "walkable", type: "bool", value: false }] }, { id: 5, properties: [{ name: "kind", type: "string", value: "meteor" }, { name: "walkable", type: "bool", value: false }] }, { id: 6, properties: [{ name: "kind", type: "string", value: "pine" }, { name: "walkable", type: "bool", value: false }] }, { id: 7, properties: [{ name: "kind", type: "string", value: "reed" }, { name: "walkable", type: "bool", value: false }] }, { id: 8, properties: [{ name: "kind", type: "string", value: "lantern" }, { name: "walkable", type: "bool", value: false }] }, { id: 9, properties: [{ name: "kind", type: "string", value: "mound" }, { name: "walkable", type: "bool", value: false }] }, { id: 10, properties: [{ name: "kind", type: "string", value: "deadtree" }, { name: "walkable", type: "bool", value: false }] }, { id: 11, properties: [{ name: "kind", type: "string", value: "pillar" }, { name: "walkable", type: "bool", value: false }] }, { id: 12, properties: [{ name: "kind", type: "string", value: "obelisk" }, { name: "walkable", type: "bool", value: false }] }, { id: 13, properties: [{ name: "kind", type: "string", value: "spire" }, { name: "walkable", type: "bool", value: false }] }, { id: 14, properties: [{ name: "kind", type: "string", value: "wreck" }, { name: "walkable", type: "bool", value: false }] }, { id: 15, properties: [{ name: "kind", type: "string", value: "hive" }, { name: "walkable", type: "bool", value: false }] }, { id: 16, properties: [{ name: "kind", type: "string", value: "pylon" }, { name: "walkable", type: "bool", value: false }] }] }, { firstgid: 201, name: "hero-star-zones", tilewidth: 64, tileheight: 32, tilecount: 12, columns: 0, margin: 0, spacing: 0, grid: { orientation: "isometric", width: 64, height: 32 }, tiles: [{ id: 0, properties: [{ name: "name", type: "string", value: "\u0E25\u0E32\u0E19\u0E08\u0E2D\u0E14\u0E22\u0E32\u0E19\u0E2E\u0E35\u0E42\u0E23\u0E48" }, { name: "en", type: "string", value: "Hero Landing Fields" }, { name: "minLevel", type: "int", value: 61 }, { name: "maxLevel", type: "int", value: 65 }] }, { id: 1, properties: [{ name: "name", type: "string", value: "\u0E1B\u0E48\u0E32\u0E40\u0E2B\u0E47\u0E14\u0E40\u0E23\u0E37\u0E2D\u0E07\u0E41\u0E2A\u0E07" }, { name: "en", type: "string", value: "Glowcap Grove" }, { name: "minLevel", type: "int", value: 66 }, { name: "maxLevel", type: "int", value: 70 }] }, { id: 2, properties: [{ name: "name", type: "string", value: "\u0E17\u0E38\u0E48\u0E07\u0E2A\u0E1B\u0E2D\u0E23\u0E4C\u0E2D\u0E33\u0E1E\u0E31\u0E19" }, { name: "en", type: "string", value: "Amber Spore Fields" }, { name: "minLevel", type: "int", value: 71 }, { name: "maxLevel", type: "int", value: 75 }] }, { id: 3, properties: [{ name: "name", type: "string", value: "\u0E40\u0E19\u0E34\u0E19\u0E23\u0E31\u0E07\u0E1B\u0E25\u0E27\u0E01\u0E22\u0E31\u0E01\u0E29\u0E4C" }, { name: "en", type: "string", value: "Termite Mound Hills" }, { name: "minLevel", type: "int", value: 76 }, { name: "maxLevel", type: "int", value: 80 }] }, { id: 4, properties: [{ name: "name", type: "string", value: "\u0E2B\u0E19\u0E2D\u0E07\u0E19\u0E49\u0E33\u0E01\u0E23\u0E14" }, { name: "en", type: "string", value: "Acid Swamp" }, { name: "minLevel", type: "int", value: 81 }, { name: "maxLevel", type: "int", value: 85 }] }, { id: 5, properties: [{ name: "name", type: "string", value: "\u0E1B\u0E48\u0E32\u0E04\u0E23\u0E34\u0E2A\u0E15\u0E31\u0E25\u0E44\u0E0B\u0E40\u0E1A\u0E2D\u0E23\u0E4C" }, { name: "en", type: "string", value: "Cyber Crystal Woods" }, { name: "minLevel", type: "int", value: 86 }, { name: "maxLevel", type: "int", value: 90 }] }, { id: 6, properties: [{ name: "name", type: "string", value: "\u0E2A\u0E38\u0E2A\u0E32\u0E19\u0E2B\u0E38\u0E48\u0E19\u0E23\u0E1A" }, { name: "en", type: "string", value: "Mech Graveyard" }, { name: "minLevel", type: "int", value: 91 }, { name: "maxLevel", type: "int", value: 95 }] }, { id: 7, properties: [{ name: "name", type: "string", value: "\u0E2B\u0E38\u0E1A\u0E23\u0E31\u0E07\u0E41\u0E21\u0E07\u0E1B\u0E48\u0E2D\u0E07" }, { name: "en", type: "string", value: "Scorpion Canyon" }, { name: "minLevel", type: "int", value: 96 }, { name: "maxLevel", type: "int", value: 100 }] }, { id: 8, properties: [{ name: "name", type: "string", value: "\u0E19\u0E04\u0E23\u0E19\u0E35\u0E2D\u0E2D\u0E19\u0E23\u0E49\u0E32\u0E07" }, { name: "en", type: "string", value: "Neon Ruins" }, { name: "minLevel", type: "int", value: 101 }, { name: "maxLevel", type: "int", value: 105 }] }, { id: 9, properties: [{ name: "name", type: "string", value: "\u0E23\u0E31\u0E07\u0E1C\u0E36\u0E49\u0E07\u0E40\u0E2B\u0E25\u0E47\u0E01" }, { name: "en", type: "string", value: "Iron Hive" }, { name: "minLevel", type: "int", value: 106 }, { name: "maxLevel", type: "int", value: 110 }] }, { id: 10, properties: [{ name: "name", type: "string", value: "\u0E23\u0E2D\u0E22\u0E41\u0E22\u0E01\u0E1E\u0E25\u0E31\u0E07\u0E21\u0E37\u0E14" }, { name: "en", type: "string", value: "Void Rift" }, { name: "minLevel", type: "int", value: 111 }, { name: "maxLevel", type: "int", value: 115 }] }, { id: 11, properties: [{ name: "name", type: "string", value: "\u0E41\u0E01\u0E19\u0E14\u0E32\u0E27\u0E40\u0E1E\u0E25\u0E34\u0E07" }, { name: "en", type: "string", value: "Planet Core" }, { name: "minLevel", type: "int", value: 116 }, { name: "maxLevel", type: "int", value: 120 }] }] }], layers: [{ id: 1, name: "ground", type: "tilelayer", width: 192, height: 192, x: 0, y: 0, opacity: 1, visible: true, data: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 21, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 21, 21, 21, 21, 21, 21, 21, 21, 21, 2, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 21, 21, 21, 21, 21, 21, 21, 21, 21, 22, 22, 22, 22, 22, 22, 22, 22, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 21, 21, 21, 21, 21, 21, 21, 21, 21, 22, 21, 21, 21, 21, 22, 22, 22, 22, 22, 22, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 22, 22, 22, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 21, 21, 21, 21, 21, 22, 22, 21, 22, 21, 21, 21, 21, 21, 21, 21, 22, 22, 22, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 22, 22, 22, 22, 22, 21, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 18, 18, 18, 18, 18, 2, 2, 2, 21, 21, 21, 21, 21, 21, 21, 22, 21, 21, 21, 21, 21, 21, 21, 21, 22, 22, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 22, 22, 22, 22, 22, 22, 21, 21, 21, 21, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 18, 18, 18, 18, 18, 18, 18, 2, 2, 2, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 22, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 22, 22, 22, 22, 22, 21, 21, 21, 21, 21, 22, 22, 2, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 18, 18, 20, 18, 18, 18, 18, 2, 2, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 23, 23, 21, 21, 21, 21, 22, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 18, 19, 19, 18, 18, 18, 18, 2, 2, 2, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 22, 22, 22, 22, 21, 21, 21, 21, 21, 21, 21, 23, 23, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 18, 2, 2, 2, 2, 19, 19, 19, 18, 18, 19, 19, 2, 2, 2, 22, 22, 22, 22, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 22, 22, 22, 22, 22, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 22, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 18, 19, 19, 18, 18, 18, 18, 19, 19, 19, 19, 19, 2, 2, 2, 22, 22, 22, 22, 22, 22, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 22, 22, 21, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 22, 22, 22, 22, 22, 21, 21, 21, 21, 2, 2, 2, 2, 24, 24, 24, 24, 24, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 19, 18, 18, 19, 19, 18, 18, 18, 19, 19, 19, 19, 19, 19, 2, 2, 2, 22, 22, 22, 22, 22, 22, 22, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 22, 22, 22, 22, 22, 21, 21, 21, 21, 2, 2, 2, 24, 24, 24, 24, 24, 25, 24, 24, 24, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 18, 18, 18, 18, 18, 18, 18, 18, 19, 19, 19, 19, 19, 19, 2, 2, 2, 22, 22, 22, 22, 22, 22, 22, 22, 22, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 21, 22, 22, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 22, 22, 21, 21, 21, 23, 23, 21, 21, 21, 2, 2, 24, 24, 24, 24, 26, 26, 24, 24, 24, 24, 24, 24, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 19, 19, 18, 18, 18, 18, 18, 18, 19, 19, 19, 19, 19, 19, 19, 2, 2, 2, 2, 22, 22, 22, 22, 22, 21, 22, 22, 22, 22, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 22, 21, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 23, 23, 23, 21, 21, 2, 2, 24, 24, 24, 24, 24, 25, 25, 24, 24, 25, 25, 25, 24, 24, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 19, 19, 19, 19, 18, 18, 18, 18, 18, 19, 19, 19, 19, 19, 19, 2, 2, 2, 2, 22, 22, 22, 22, 22, 22, 21, 21, 21, 21, 22, 22, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 23, 21, 21, 21, 21, 21, 21, 21, 2, 2, 24, 24, 24, 24, 24, 25, 25, 25, 25, 25, 25, 25, 25, 25, 24, 25, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 19, 19, 19, 19, 19, 19, 18, 18, 18, 19, 19, 19, 19, 19, 18, 2, 2, 2, 2, 22, 22, 22, 22, 22, 22, 21, 21, 21, 21, 21, 21, 21, 23, 23, 21, 21, 21, 21, 21, 21, 21, 21, 21, 22, 5, 5, 5, 5, 5, 22, 22, 22, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 23, 23, 23, 23, 23, 21, 21, 21, 21, 21, 21, 2, 2, 24, 24, 26, 24, 25, 25, 25, 25, 25, 25, 25, 25, 24, 24, 24, 25, 25, 25, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 18, 2, 2, 2, 2, 22, 22, 22, 22, 22, 22, 22, 21, 21, 21, 21, 21, 21, 21, 23, 23, 21, 21, 21, 21, 21, 21, 21, 21, 22, 5, 5, 5, 5, 5, 5, 5, 22, 22, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 23, 23, 23, 23, 23, 23, 21, 21, 2, 2, 2, 21, 21, 2, 2, 24, 24, 26, 26, 24, 25, 25, 25, 24, 25, 25, 24, 24, 24, 24, 24, 24, 25, 24, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 18, 18, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 18, 18, 2, 2, 2, 22, 22, 22, 22, 22, 22, 22, 22, 22, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 22, 22, 5, 5, 5, 5, 5, 5, 5, 5, 5, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 23, 23, 23, 23, 23, 21, 21, 2, 2, 2, 2, 2, 2, 2, 2, 25, 25, 26, 26, 24, 24, 24, 24, 24, 25, 25, 24, 24, 24, 24, 24, 24, 24, 24, 24, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 18, 18, 18, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 18, 18, 2, 2, 2, 22, 22, 22, 22, 22, 22, 22, 22, 22, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 22, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 23, 23, 23, 23, 23, 21, 21, 2, 2, 2, 2, 2, 2, 2, 2, 25, 25, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 18, 19, 18, 18, 18, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 18, 18, 18, 18, 2, 2, 2, 22, 22, 22, 22, 21, 21, 22, 22, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 22, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 21, 21, 21, 21, 21, 21, 21, 21, 23, 23, 23, 23, 23, 23, 23, 23, 21, 21, 2, 2, 24, 2, 2, 2, 2, 25, 25, 25, 25, 25, 25, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 18, 18, 19, 19, 18, 18, 18, 19, 19, 19, 19, 19, 19, 19, 19, 19, 18, 18, 18, 18, 18, 2, 2, 2, 2, 21, 21, 21, 21, 22, 22, 22, 22, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 21, 21, 21, 21, 21, 21, 21, 23, 23, 23, 23, 23, 23, 23, 23, 23, 21, 21, 2, 2, 24, 24, 24, 24, 24, 25, 26, 26, 25, 25, 25, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 25, 24, 24, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 18, 18, 18, 18, 19, 19, 18, 18, 19, 19, 19, 19, 19, 19, 19, 19, 19, 18, 18, 18, 19, 19, 19, 2, 2, 2, 2, 21, 21, 21, 23, 22, 22, 22, 22, 22, 21, 21, 21, 21, 21, 22, 21, 21, 21, 21, 21, 21, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 21, 21, 21, 21, 21, 21, 21, 23, 23, 23, 23, 23, 23, 23, 23, 23, 21, 21, 2, 2, 2, 24, 24, 24, 24, 26, 24, 25, 25, 25, 25, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 25, 25, 25, 24, 24, 24, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 18, 18, 18, 18, 18, 18, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 18, 2, 2, 2, 21, 21, 21, 21, 21, 21, 21, 21, 22, 22, 21, 21, 21, 21, 22, 21, 21, 21, 21, 21, 21, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 21, 21, 21, 22, 22, 22, 21, 23, 23, 23, 23, 23, 23, 23, 23, 23, 21, 21, 2, 2, 2, 2, 24, 24, 26, 26, 24, 25, 25, 25, 25, 24, 24, 24, 24, 25, 24, 24, 24, 24, 24, 24, 24, 24, 24, 25, 25, 25, 24, 24, 24, 24, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 18, 18, 19, 19, 19, 18, 18, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 18, 2, 2, 2, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 22, 21, 21, 21, 21, 3, 5, 5, 5, 5, 5, 5, 5, 5, 5, 3, 21, 22, 22, 22, 22, 22, 21, 22, 22, 22, 22, 21, 21, 21, 21, 21, 21, 21, 22, 2, 2, 2, 24, 24, 26, 24, 24, 24, 24, 25, 25, 24, 25, 25, 25, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 19, 18, 18, 19, 19, 19, 19, 18, 18, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 18, 2, 2, 2, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 22, 22, 22, 22, 21, 3, 3, 3, 5, 5, 5, 5, 5, 5, 5, 3, 3, 3, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 21, 21, 21, 21, 21, 21, 22, 2, 2, 2, 2, 24, 24, 24, 24, 24, 24, 24, 24, 25, 25, 25, 25, 25, 24, 24, 24, 24, 24, 24, 24, 25, 25, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 19, 19, 18, 18, 19, 19, 19, 19, 18, 18, 19, 19, 19, 19, 19, 19, 19, 20, 20, 20, 19, 19, 19, 19, 19, 19, 19, 19, 18, 18, 2, 2, 2, 21, 21, 21, 21, 21, 21, 21, 21, 21, 22, 22, 22, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 5, 5, 5, 5, 5, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2, 2, 2, 25, 24, 24, 24, 24, 24, 24, 24, 24, 24, 25, 25, 25, 25, 24, 24, 24, 24, 24, 24, 25, 25, 25, 25, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 19, 19, 19, 18, 18, 18, 18, 18, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 20, 20, 20, 19, 19, 19, 19, 19, 19, 19, 19, 18, 18, 2, 2, 2, 21, 21, 21, 21, 21, 22, 22, 22, 22, 22, 22, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 21, 21, 21, 21, 21, 21, 21, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 24, 24, 24, 24, 24, 24, 24, 24, 24, 25, 25, 25, 25, 25, 25, 24, 24, 24, 24, 25, 25, 25, 25, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 19, 19, 19, 18, 18, 18, 18, 18, 18, 19, 19, 19, 19, 18, 18, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 2, 2, 2, 21, 21, 21, 21, 22, 22, 22, 22, 22, 22, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 21, 21, 21, 21, 21, 21, 21, 21, 21, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 24, 24, 24, 24, 24, 24, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 19, 19, 19, 18, 18, 18, 18, 18, 18, 18, 19, 19, 19, 19, 18, 18, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 2, 2, 2, 2, 21, 21, 21, 21, 22, 22, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 22, 22, 21, 21, 22, 22, 22, 22, 22, 22, 22, 22, 22, 3, 3, 3, 3, 3, 3, 3, 3, 3, 24, 24, 24, 24, 24, 24, 25, 25, 25, 25, 25, 25, 25, 25, 25, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 19, 19, 18, 19, 18, 18, 19, 19, 18, 18, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 18, 18, 19, 19, 2, 2, 2, 21, 21, 21, 21, 21, 21, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 23, 21, 21, 21, 21, 21, 21, 22, 22, 21, 21, 22, 22, 22, 22, 22, 22, 22, 21, 21, 21, 22, 2, 4, 3, 3, 3, 3, 3, 3, 24, 24, 24, 24, 24, 24, 24, 24, 25, 25, 25, 25, 25, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 18, 18, 18, 19, 19, 19, 19, 19, 19, 19, 19, 19, 18, 18, 18, 19, 19, 19, 19, 19, 18, 19, 18, 18, 18, 18, 20, 18, 18, 18, 18, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 4, 2, 2, 2, 21, 21, 21, 21, 21, 21, 21, 21, 21, 23, 23, 23, 23, 23, 23, 23, 23, 22, 22, 22, 22, 21, 22, 22, 21, 21, 21, 21, 21, 21, 22, 2, 2, 25, 25, 3, 3, 3, 3, 3, 3, 24, 24, 24, 24, 24, 24, 24, 24, 24, 25, 25, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 18, 18, 18, 18, 19, 19, 19, 19, 19, 19, 19, 19, 19, 18, 18, 19, 19, 19, 19, 19, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 4, 2, 2, 3, 3, 3, 4, 2, 2, 2, 2, 2, 21, 21, 21, 21, 21, 21, 21, 21, 23, 23, 23, 23, 23, 23, 23, 21, 21, 22, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 2, 2, 2, 25, 25, 24, 3, 3, 3, 3, 3, 3, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 18, 18, 18, 18, 18, 18, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 4, 2, 2, 2, 4, 3, 3, 3, 36, 2, 2, 2, 2, 2, 2, 2, 21, 21, 21, 21, 21, 21, 21, 23, 23, 23, 23, 23, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 2, 2, 2, 25, 25, 24, 24, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 18, 18, 18, 18, 18, 18, 18, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 18, 18, 18, 18, 20, 18, 18, 18, 18, 18, 18, 3, 3, 3, 3, 3, 2, 2, 2, 2, 22, 22, 21, 21, 2, 2, 2, 2, 36, 36, 36, 3, 3, 3, 36, 36, 36, 2, 2, 2, 2, 2, 21, 21, 21, 21, 21, 21, 21, 21, 23, 23, 23, 23, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 2, 2, 2, 25, 25, 24, 24, 25, 24, 24, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 18, 18, 18, 18, 18, 18, 18, 18, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 18, 18, 18, 18, 18, 18, 18, 18, 18, 3, 3, 3, 3, 3, 18, 18, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 36, 36, 36, 36, 3, 3, 3, 36, 36, 36, 36, 36, 36, 2, 2, 2, 21, 21, 21, 21, 21, 21, 21, 23, 23, 23, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 2, 2, 2, 24, 25, 24, 25, 25, 24, 24, 24, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 18, 18, 18, 18, 18, 18, 18, 18, 18, 19, 19, 19, 19, 19, 19, 19, 19, 5, 5, 5, 5, 5, 18, 18, 19, 19, 19, 18, 18, 18, 3, 3, 3, 3, 3, 18, 18, 18, 2, 2, 2, 2, 2, 2, 2, 2, 2, 37, 36, 36, 36, 36, 3, 3, 3, 36, 36, 36, 36, 36, 36, 2, 2, 2, 21, 21, 21, 21, 21, 21, 21, 23, 23, 23, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 2, 2, 2, 24, 24, 25, 25, 24, 24, 24, 24, 24, 24, 24, 24, 24, 3, 3, 3, 3, 3, 3, 3, 5, 5, 5, 5, 5, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 19, 19, 19, 19, 19, 19, 5, 5, 5, 5, 5, 5, 5, 19, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 18, 18, 18, 2, 2, 2, 37, 2, 2, 2, 37, 37, 37, 37, 36, 36, 36, 36, 3, 3, 3, 36, 36, 36, 36, 36, 36, 36, 2, 2, 21, 21, 21, 21, 21, 22, 22, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 2, 2, 2, 24, 25, 25, 25, 25, 25, 25, 24, 24, 24, 24, 24, 24, 24, 24, 3, 3, 3, 3, 5, 5, 5, 5, 5, 5, 5, 24, 24, 24, 24, 24, 24, 24, 25, 25, 25, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 19, 19, 19, 19, 19, 5, 5, 5, 5, 5, 5, 5, 5, 5, 3, 3, 3, 3, 3, 3, 3, 3, 3, 18, 18, 18, 18, 2, 2, 2, 37, 37, 37, 37, 37, 37, 37, 37, 37, 37, 37, 36, 3, 3, 3, 36, 36, 36, 36, 36, 36, 36, 2, 2, 21, 22, 22, 22, 22, 22, 22, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 22, 21, 21, 2, 2, 2, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 24, 24, 24, 24, 24, 24, 3, 3, 5, 5, 5, 5, 5, 5, 5, 5, 5, 24, 24, 24, 24, 24, 25, 25, 25, 25, 25, 25, 24, 24, 24, 24, 24, 24, 24, 24, 24, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 19, 19, 19, 19, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 3, 3, 3, 3, 3, 3, 3, 18, 18, 18, 18, 18, 2, 2, 37, 37, 37, 37, 37, 37, 37, 37, 37, 37, 37, 37, 37, 3, 3, 3, 36, 36, 36, 36, 36, 36, 36, 2, 2, 22, 22, 22, 2, 2, 2, 2, 2, 2, 2, 21, 21, 21, 21, 21, 21, 21, 21, 21, 22, 22, 21, 2, 2, 2, 24, 24, 26, 25, 25, 25, 25, 25, 25, 25, 25, 24, 24, 24, 24, 24, 24, 24, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 24, 24, 24, 24, 25, 25, 25, 25, 25, 25, 25, 25, 24, 24, 24, 24, 24, 24, 24, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 19, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 19, 19, 19, 19, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 3, 19, 19, 18, 18, 18, 18, 18, 18, 18, 18, 18, 2, 2, 36, 36, 36, 36, 37, 37, 37, 37, 37, 37, 37, 37, 37, 3, 3, 3, 36, 36, 36, 36, 36, 36, 36, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 2, 2, 2, 2, 24, 24, 24, 24, 25, 25, 25, 25, 25, 25, 25, 24, 24, 24, 24, 24, 24, 24, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 24, 24, 24, 24, 25, 25, 25, 25, 25, 25, 25, 25, 24, 25, 25, 25, 24, 24, 24, 24, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 19, 19, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 19, 19, 19, 19, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 18, 18, 19, 18, 18, 18, 18, 18, 18, 18, 18, 18, 2, 2, 36, 36, 36, 36, 37, 37, 37, 37, 37, 37, 37, 37, 3, 3, 3, 3, 36, 36, 36, 36, 36, 36, 36, 2, 2, 2, 2, 2, 2, 2, 37, 37, 37, 2, 2, 2, 2, 2, 21, 21, 21, 21, 21, 21, 21, 2, 2, 2, 2, 24, 24, 26, 24, 24, 25, 25, 25, 25, 25, 25, 25, 24, 24, 24, 24, 24, 24, 24, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 24, 24, 24, 24, 25, 25, 25, 25, 25, 25, 25, 25, 24, 25, 25, 25, 24, 24, 24, 24, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 19, 19, 19, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 19, 19, 19, 19, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 3, 3, 3, 18, 18, 18, 18, 18, 18, 18, 18, 18, 2, 2, 36, 36, 36, 36, 37, 37, 37, 37, 37, 37, 37, 3, 3, 3, 3, 3, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 37, 37, 37, 37, 37, 36, 36, 2, 2, 2, 2, 2, 21, 21, 21, 21, 21, 2, 2, 2, 2, 24, 24, 26, 26, 24, 24, 24, 24, 25, 25, 25, 25, 24, 24, 24, 24, 24, 24, 24, 24, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 24, 24, 24, 24, 25, 25, 25, 25, 25, 25, 25, 24, 24, 25, 25, 25, 24, 26, 26, 24, 24, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 19, 19, 19, 19, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 19, 19, 19, 19, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 3, 3, 3, 3, 3, 3, 18, 18, 18, 18, 18, 18, 2, 2, 36, 36, 36, 36, 36, 37, 37, 37, 37, 37, 3, 3, 3, 3, 3, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 37, 37, 37, 38, 38, 38, 36, 36, 36, 2, 2, 2, 21, 21, 21, 2, 2, 2, 2, 2, 24, 24, 26, 26, 24, 24, 24, 24, 24, 25, 25, 25, 24, 24, 24, 24, 24, 24, 24, 24, 24, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 24, 24, 24, 24, 25, 25, 25, 25, 25, 25, 25, 24, 24, 24, 24, 24, 24, 26, 26, 24, 24, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 19, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 19, 19, 19, 5, 5, 5, 5, 5, 5, 5, 5, 5, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 18, 18, 2, 2, 36, 36, 36, 36, 36, 36, 36, 36, 37, 3, 3, 3, 3, 3, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 38, 38, 38, 38, 38, 36, 36, 36, 36, 2, 2, 2, 21, 21, 2, 2, 2, 2, 24, 24, 26, 26, 26, 24, 24, 24, 25, 25, 24, 25, 25, 25, 24, 24, 24, 24, 24, 24, 24, 24, 24, 5, 5, 5, 5, 5, 5, 5, 5, 5, 24, 24, 24, 24, 24, 25, 25, 25, 25, 25, 25, 25, 25, 24, 24, 24, 24, 24, 26, 26, 26, 24, 24, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 19, 19, 19, 19, 5, 5, 5, 5, 5, 5, 5, 18, 18, 19, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 18, 2, 2, 2, 36, 36, 36, 36, 36, 36, 36, 36, 3, 3, 3, 3, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 38, 38, 38, 38, 38, 36, 36, 36, 36, 2, 2, 2, 2, 2, 2, 2, 2, 2, 24, 25, 26, 26, 26, 24, 24, 24, 24, 25, 25, 25, 25, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 5, 5, 5, 5, 5, 5, 5, 3, 24, 24, 24, 24, 24, 25, 25, 25, 25, 25, 25, 25, 25, 24, 24, 24, 24, 24, 24, 26, 26, 26, 24, 24, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 20, 20, 18, 18, 18, 3, 3, 5, 5, 5, 5, 5, 18, 18, 18, 19, 19, 19, 19, 3, 3, 3, 3, 3, 3, 3, 3, 2, 2, 2, 36, 36, 36, 38, 36, 36, 36, 36, 3, 3, 3, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 38, 38, 38, 38, 38, 36, 36, 36, 36, 36, 2, 2, 2, 2, 2, 2, 2, 2, 2, 25, 25, 25, 25, 25, 24, 24, 24, 25, 25, 25, 25, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 5, 5, 5, 5, 5, 3, 3, 24, 24, 24, 24, 25, 25, 25, 25, 25, 25, 25, 25, 25, 24, 24, 24, 24, 24, 24, 24, 24, 26, 24, 24, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 18, 18, 19, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 20, 18, 18, 18, 18, 3, 3, 3, 3, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 18, 3, 3, 3, 3, 3, 3, 4, 36, 36, 36, 36, 36, 36, 36, 36, 3, 3, 3, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 38, 38, 38, 36, 36, 36, 36, 37, 36, 36, 36, 36, 36, 36, 36, 36, 2, 2, 2, 2, 25, 25, 25, 25, 25, 25, 25, 25, 24, 25, 25, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 3, 3, 3, 3, 3, 3, 3, 24, 24, 24, 24, 25, 25, 25, 25, 25, 25, 25, 25, 25, 24, 24, 24, 24, 24, 24, 24, 24, 24, 26, 24, 24, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 18, 18, 19, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 3, 3, 3, 3, 19, 19, 19, 19, 19, 19, 20, 20, 20, 19, 19, 19, 19, 19, 19, 19, 3, 3, 3, 3, 3, 3, 3, 36, 36, 36, 36, 36, 36, 36, 3, 3, 3, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 37, 37, 37, 36, 36, 36, 36, 36, 36, 36, 36, 2, 2, 2, 2, 2, 2, 2, 2, 25, 25, 25, 24, 24, 25, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 3, 3, 3, 3, 3, 3, 3, 3, 3, 24, 24, 24, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 24, 24, 24, 24, 24, 24, 24, 24, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 18, 18, 18, 19, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 20, 18, 18, 18, 18, 18, 18, 18, 18, 3, 3, 3, 3, 3, 19, 19, 19, 19, 20, 20, 20, 20, 20, 20, 19, 19, 19, 19, 18, 18, 18, 4, 3, 3, 3, 3, 3, 3, 36, 36, 36, 36, 36, 36, 3, 3, 3, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 37, 37, 37, 36, 36, 36, 36, 36, 36, 36, 36, 36, 2, 2, 2, 2, 2, 2, 2, 2, 25, 24, 24, 24, 25, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 3, 3, 3, 3, 3, 24, 3, 3, 3, 3, 24, 24, 24, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 24, 24, 24, 24, 24, 24, 24, 24, 24, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 18, 18, 20, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 20, 18, 18, 18, 18, 18, 18, 18, 3, 3, 3, 3, 3, 18, 19, 19, 20, 20, 20, 20, 19, 19, 20, 19, 19, 19, 19, 18, 18, 18, 2, 2, 2, 2, 4, 3, 3, 3, 3, 36, 36, 36, 36, 36, 3, 3, 3, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 37, 37, 37, 36, 36, 36, 36, 36, 36, 36, 36, 36, 2, 2, 30, 31, 31, 2, 2, 2, 2, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 3, 3, 3, 3, 3, 24, 24, 24, 3, 3, 3, 24, 24, 24, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 24, 25, 25, 24, 24, 24, 24, 24, 24, 24, 24, 24, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 18, 18, 20, 20, 20, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 20, 19, 19, 18, 18, 18, 18, 18, 3, 3, 3, 3, 18, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 18, 18, 18, 18, 18, 18, 2, 2, 2, 2, 37, 37, 3, 3, 3, 3, 3, 3, 5, 5, 5, 5, 5, 3, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 37, 37, 37, 37, 37, 37, 37, 37, 37, 37, 37, 2, 2, 2, 30, 30, 31, 31, 2, 2, 2, 2, 2, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 3, 3, 3, 3, 24, 24, 24, 24, 3, 3, 3, 24, 24, 25, 25, 25, 25, 25, 25, 25, 25, 25, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 18, 18, 20, 20, 20, 20, 18, 20, 20, 18, 18, 18, 18, 18, 18, 20, 18, 18, 18, 18, 18, 18, 3, 3, 3, 3, 18, 18, 18, 18, 19, 19, 19, 19, 19, 19, 18, 18, 18, 18, 18, 18, 18, 2, 2, 2, 2, 36, 36, 37, 37, 3, 3, 3, 3, 5, 5, 5, 5, 5, 5, 5, 37, 37, 37, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 37, 37, 37, 37, 37, 37, 37, 37, 37, 37, 2, 2, 2, 30, 30, 31, 31, 31, 2, 2, 2, 2, 2, 24, 24, 24, 24, 24, 25, 24, 24, 24, 24, 3, 3, 3, 24, 24, 24, 24, 24, 3, 3, 3, 24, 24, 25, 25, 25, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 25, 25, 24, 24, 24, 24, 24, 24, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 18, 18, 20, 20, 20, 20, 20, 20, 20, 20, 20, 18, 18, 18, 18, 19, 19, 19, 18, 18, 18, 18, 18, 3, 3, 3, 3, 18, 18, 18, 18, 18, 18, 19, 19, 19, 18, 18, 18, 18, 18, 18, 2, 2, 2, 2, 2, 36, 36, 37, 37, 37, 37, 3, 3, 5, 5, 5, 5, 5, 5, 5, 5, 5, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 37, 37, 37, 37, 37, 37, 37, 37, 37, 37, 2, 2, 2, 30, 30, 30, 30, 30, 30, 30, 30, 2, 2, 2, 2, 24, 24, 24, 24, 24, 24, 24, 24, 24, 3, 3, 3, 24, 24, 24, 24, 24, 3, 3, 3, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 25, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 18, 18, 18, 18, 18, 20, 20, 20, 20, 20, 20, 18, 18, 18, 18, 19, 19, 19, 19, 18, 18, 18, 18, 3, 3, 3, 18, 18, 18, 18, 18, 18, 18, 18, 19, 19, 18, 18, 18, 18, 18, 2, 2, 2, 2, 2, 36, 36, 36, 37, 37, 37, 37, 37, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 37, 37, 37, 37, 37, 37, 37, 37, 37, 37, 2, 2, 2, 30, 30, 30, 30, 30, 30, 30, 30, 30, 2, 2, 2, 24, 24, 24, 24, 24, 24, 24, 24, 24, 3, 3, 3, 25, 25, 25, 25, 25, 3, 3, 3, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 18, 18, 18, 18, 18, 18, 18, 20, 20, 20, 20, 18, 20, 18, 19, 19, 19, 19, 19, 18, 18, 18, 18, 18, 3, 3, 3, 18, 18, 18, 18, 18, 18, 19, 19, 19, 19, 19, 18, 18, 18, 2, 2, 2, 2, 36, 36, 36, 36, 36, 37, 37, 37, 37, 37, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 3, 3, 3, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 37, 37, 37, 37, 37, 37, 37, 37, 37, 37, 2, 2, 2, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 2, 2, 24, 24, 24, 24, 24, 24, 24, 24, 25, 3, 3, 3, 25, 25, 25, 25, 25, 3, 3, 3, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 2, 2, 2, 2, 2, 28, 28, 28, 28, 28, 27, 27, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 18, 18, 20, 20, 20, 20, 20, 18, 18, 19, 19, 19, 18, 18, 18, 18, 18, 18, 3, 3, 3, 18, 18, 18, 18, 18, 18, 18, 19, 19, 19, 19, 18, 18, 2, 2, 2, 2, 36, 36, 36, 36, 36, 36, 37, 37, 37, 37, 37, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 36, 36, 36, 36, 37, 37, 37, 37, 37, 37, 37, 37, 37, 2, 2, 2, 2, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 2, 2, 2, 24, 24, 24, 24, 24, 24, 24, 25, 3, 3, 3, 25, 25, 25, 25, 25, 3, 3, 3, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 2, 2, 2, 2, 2, 2, 28, 28, 28, 28, 28, 28, 28, 27, 27, 27, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 18, 18, 20, 20, 20, 20, 18, 18, 18, 18, 19, 18, 18, 18, 18, 18, 18, 18, 3, 3, 3, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 2, 2, 2, 2, 36, 36, 36, 36, 36, 36, 36, 37, 37, 37, 37, 37, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 36, 36, 36, 37, 37, 37, 37, 36, 37, 37, 37, 37, 2, 2, 2, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 2, 2, 2, 2, 2, 2, 24, 24, 24, 24, 25, 3, 3, 3, 25, 25, 25, 25, 25, 3, 3, 3, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 2, 2, 2, 2, 2, 2, 27, 28, 28, 28, 28, 28, 27, 27, 27, 27, 27, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 15, 15, 2, 2, 2, 18, 18, 20, 20, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 3, 3, 3, 18, 18, 18, 19, 19, 18, 18, 18, 18, 18, 18, 2, 2, 2, 2, 36, 36, 36, 36, 36, 36, 36, 36, 36, 37, 37, 37, 37, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 36, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 36, 36, 37, 37, 37, 36, 36, 36, 36, 36, 2, 2, 2, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 2, 2, 2, 2, 2, 2, 24, 24, 24, 24, 3, 3, 3, 25, 25, 25, 25, 25, 3, 3, 3, 3, 24, 24, 25, 24, 24, 24, 24, 24, 25, 2, 2, 2, 2, 27, 27, 27, 27, 28, 28, 28, 28, 27, 27, 27, 27, 27, 27, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 15, 15, 15, 2, 2, 2, 19, 18, 18, 19, 19, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 3, 3, 3, 18, 18, 19, 19, 19, 18, 18, 18, 18, 18, 18, 2, 2, 2, 37, 37, 36, 36, 36, 36, 36, 36, 36, 36, 37, 37, 37, 37, 37, 5, 5, 5, 5, 5, 5, 5, 5, 5, 36, 36, 36, 36, 36, 36, 36, 36, 36, 37, 37, 37, 36, 36, 3, 3, 3, 3, 3, 36, 36, 37, 36, 36, 36, 36, 2, 2, 2, 2, 2, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 2, 2, 2, 2, 2, 24, 24, 3, 3, 3, 25, 25, 25, 25, 25, 3, 3, 3, 3, 3, 24, 25, 25, 24, 24, 25, 25, 25, 2, 2, 2, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 15, 15, 17, 15, 15, 2, 2, 19, 18, 18, 19, 19, 19, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 3, 3, 3, 18, 18, 19, 18, 19, 19, 18, 18, 18, 18, 2, 2, 2, 36, 36, 36, 36, 36, 36, 36, 36, 36, 37, 37, 37, 37, 37, 37, 37, 36, 5, 5, 5, 5, 5, 5, 5, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 37, 37, 36, 36, 36, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2, 2, 2, 2, 2, 2, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 2, 2, 2, 2, 24, 24, 3, 3, 3, 25, 25, 24, 24, 24, 24, 3, 3, 3, 3, 24, 25, 25, 25, 25, 25, 25, 25, 2, 2, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 15, 15, 17, 17, 16, 16, 2, 2, 2, 18, 18, 19, 19, 19, 19, 18, 18, 18, 18, 18, 18, 18, 18, 19, 3, 3, 3, 3, 18, 18, 18, 18, 18, 18, 18, 18, 19, 19, 2, 2, 2, 37, 37, 36, 36, 38, 38, 36, 36, 37, 37, 37, 37, 37, 37, 37, 36, 36, 36, 5, 5, 5, 5, 5, 36, 36, 36, 36, 37, 36, 36, 36, 36, 37, 37, 37, 37, 37, 36, 36, 36, 36, 3, 3, 3, 3, 3, 3, 3, 3, 4, 2, 2, 2, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 31, 31, 31, 30, 30, 30, 30, 30, 2, 2, 2, 2, 3, 3, 3, 25, 25, 24, 24, 24, 24, 24, 3, 3, 3, 24, 24, 25, 25, 25, 25, 25, 25, 2, 2, 2, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 15, 15, 15, 15, 16, 16, 15, 2, 2, 2, 2, 19, 19, 19, 19, 19, 19, 18, 18, 18, 18, 18, 18, 18, 3, 3, 3, 3, 3, 18, 18, 18, 18, 18, 18, 18, 20, 19, 19, 2, 2, 2, 37, 37, 37, 36, 38, 38, 38, 38, 37, 37, 37, 37, 37, 37, 37, 37, 36, 3, 3, 3, 3, 3, 36, 36, 36, 36, 37, 37, 37, 36, 36, 36, 37, 37, 37, 36, 36, 36, 36, 36, 36, 36, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 30, 30, 30, 30, 30, 30, 32, 32, 32, 30, 30, 30, 30, 30, 30, 31, 31, 31, 31, 31, 30, 30, 30, 30, 2, 2, 2, 2, 3, 3, 3, 25, 25, 24, 24, 24, 24, 24, 3, 3, 3, 3, 24, 25, 25, 25, 25, 25, 25, 2, 2, 2, 2, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 15, 15, 15, 15, 15, 15, 15, 15, 2, 2, 2, 2, 2, 2, 2, 19, 18, 18, 18, 18, 18, 18, 2, 2, 3, 3, 3, 4, 18, 18, 18, 18, 18, 18, 18, 18, 20, 19, 19, 2, 2, 2, 37, 37, 37, 37, 38, 38, 38, 38, 38, 38, 37, 37, 37, 37, 37, 36, 3, 3, 3, 3, 3, 3, 3, 36, 36, 36, 36, 37, 36, 36, 36, 36, 37, 37, 37, 37, 36, 36, 36, 36, 36, 36, 36, 2, 2, 2, 2, 4, 3, 3, 3, 3, 3, 30, 30, 30, 30, 32, 32, 32, 32, 32, 32, 30, 30, 30, 30, 30, 31, 31, 31, 31, 30, 30, 30, 30, 30, 30, 2, 2, 3, 3, 3, 25, 25, 24, 24, 24, 24, 24, 3, 3, 3, 3, 3, 25, 25, 25, 25, 25, 25, 24, 2, 2, 2, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 15, 15, 15, 15, 15, 15, 15, 15, 15, 2, 2, 2, 2, 2, 2, 2, 2, 18, 18, 18, 18, 2, 2, 2, 3, 3, 3, 2, 2, 18, 18, 18, 18, 18, 18, 20, 20, 20, 18, 18, 2, 2, 36, 36, 37, 37, 38, 38, 38, 38, 38, 38, 38, 37, 37, 37, 36, 3, 3, 3, 3, 3, 3, 3, 3, 3, 36, 36, 36, 36, 36, 36, 36, 37, 37, 37, 37, 37, 36, 36, 36, 36, 36, 36, 36, 2, 2, 2, 2, 2, 4, 3, 3, 3, 3, 3, 30, 30, 30, 30, 32, 32, 32, 32, 32, 32, 31, 31, 30, 30, 30, 31, 31, 30, 30, 30, 30, 30, 30, 30, 2, 2, 3, 3, 3, 25, 25, 24, 24, 24, 24, 24, 24, 3, 3, 3, 3, 3, 25, 25, 25, 25, 25, 25, 2, 2, 2, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 4, 3, 3, 3, 2, 2, 2, 18, 18, 18, 18, 20, 20, 20, 18, 18, 18, 2, 2, 36, 36, 36, 36, 38, 38, 38, 38, 38, 38, 38, 37, 36, 36, 3, 3, 3, 3, 3, 36, 3, 3, 3, 3, 3, 36, 36, 37, 37, 36, 36, 37, 37, 37, 37, 37, 37, 2, 2, 2, 2, 2, 2, 2, 2, 31, 31, 31, 31, 31, 3, 3, 3, 3, 3, 30, 30, 30, 30, 32, 32, 32, 32, 32, 32, 31, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 2, 3, 3, 3, 25, 25, 25, 24, 24, 24, 24, 24, 24, 3, 3, 3, 3, 25, 25, 25, 2, 2, 2, 2, 2, 2, 28, 28, 28, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 2, 2, 2, 2, 18, 18, 18, 20, 20, 18, 18, 18, 2, 2, 2, 36, 36, 36, 36, 36, 38, 38, 38, 38, 38, 38, 36, 36, 3, 3, 3, 3, 3, 36, 36, 36, 3, 3, 3, 3, 3, 36, 37, 37, 37, 37, 37, 37, 37, 37, 37, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 31, 31, 31, 3, 3, 3, 3, 3, 30, 30, 30, 30, 32, 32, 32, 32, 31, 31, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 2, 3, 3, 3, 25, 25, 24, 24, 24, 24, 24, 24, 24, 24, 3, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 28, 28, 28, 28, 27, 27, 27, 27, 27, 27, 27, 27, 28, 28, 27, 27, 27, 27, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 16, 16, 16, 16, 16, 3, 3, 3, 15, 15, 2, 2, 2, 2, 18, 18, 18, 18, 18, 2, 2, 2, 2, 2, 36, 36, 36, 36, 36, 36, 38, 38, 36, 36, 36, 36, 36, 3, 3, 3, 3, 36, 36, 36, 36, 36, 3, 3, 3, 3, 3, 37, 37, 37, 37, 37, 37, 37, 37, 2, 2, 2, 2, 39, 39, 40, 40, 2, 2, 2, 2, 2, 2, 2, 31, 31, 3, 3, 3, 3, 3, 30, 30, 30, 30, 31, 31, 31, 31, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 4, 3, 3, 3, 2, 2, 2, 2, 2, 2, 24, 24, 2, 2, 3, 3, 3, 2, 2, 2, 2, 2, 28, 28, 28, 28, 28, 28, 28, 27, 27, 27, 27, 27, 27, 27, 28, 28, 28, 28, 28, 27, 27, 28, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 16, 15, 15, 16, 16, 16, 16, 3, 3, 3, 15, 15, 15, 2, 2, 2, 2, 2, 18, 18, 2, 2, 2, 2, 2, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 3, 3, 3, 36, 36, 36, 36, 36, 36, 36, 3, 3, 3, 3, 3, 37, 37, 37, 37, 37, 37, 37, 2, 2, 2, 40, 40, 40, 40, 40, 40, 40, 40, 2, 2, 2, 2, 2, 2, 31, 3, 3, 3, 3, 3, 30, 30, 30, 31, 31, 31, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 3, 3, 3, 4, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 2, 2, 27, 27, 27, 28, 28, 28, 28, 28, 28, 28, 28, 27, 27, 27, 27, 27, 27, 28, 28, 28, 28, 28, 28, 28, 27, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 16, 15, 15, 16, 16, 16, 16, 3, 3, 3, 15, 15, 15, 15, 2, 2, 2, 2, 2, 2, 2, 2, 2, 37, 37, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 3, 3, 3, 36, 36, 36, 36, 36, 36, 36, 36, 3, 3, 3, 3, 3, 37, 37, 37, 37, 37, 2, 2, 2, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 2, 2, 2, 2, 2, 30, 3, 3, 3, 3, 3, 30, 31, 31, 31, 31, 30, 30, 30, 30, 30, 30, 30, 32, 30, 30, 30, 30, 30, 30, 30, 3, 3, 3, 31, 31, 31, 31, 30, 2, 2, 2, 2, 2, 2, 3, 3, 3, 27, 27, 27, 27, 27, 28, 28, 28, 28, 28, 28, 28, 28, 28, 27, 27, 27, 27, 28, 28, 28, 28, 28, 28, 28, 28, 27, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 16, 16, 16, 16, 16, 3, 3, 3, 15, 15, 15, 15, 15, 15, 2, 2, 2, 2, 2, 2, 37, 37, 37, 37, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 3, 3, 3, 36, 36, 36, 36, 36, 36, 36, 37, 36, 3, 3, 3, 3, 37, 37, 37, 37, 37, 2, 2, 2, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 30, 31, 31, 30, 30, 30, 30, 30, 30, 30, 32, 32, 32, 30, 30, 30, 30, 30, 30, 3, 3, 3, 31, 31, 31, 31, 31, 30, 2, 2, 2, 2, 27, 3, 3, 3, 27, 27, 27, 27, 27, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 27, 27, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 15, 15, 15, 15, 15, 15, 15, 15, 15, 16, 16, 16, 16, 16, 15, 15, 15, 15, 15, 15, 15, 15, 16, 16, 16, 16, 16, 3, 3, 3, 15, 15, 15, 15, 15, 15, 15, 15, 16, 2, 2, 2, 37, 37, 37, 37, 37, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 3, 3, 3, 36, 36, 36, 36, 36, 36, 36, 37, 37, 37, 3, 3, 3, 37, 37, 2, 2, 2, 2, 2, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 31, 31, 30, 30, 30, 32, 32, 32, 32, 32, 32, 30, 31, 31, 30, 30, 30, 30, 3, 3, 3, 31, 31, 31, 31, 31, 30, 2, 2, 2, 27, 27, 3, 3, 3, 27, 27, 27, 27, 27, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 15, 15, 15, 15, 15, 15, 15, 15, 15, 16, 16, 16, 16, 16, 15, 15, 15, 15, 15, 15, 15, 15, 16, 16, 16, 16, 16, 3, 3, 3, 15, 15, 16, 16, 15, 15, 15, 15, 15, 16, 2, 2, 37, 37, 37, 37, 37, 37, 37, 37, 36, 36, 36, 36, 37, 37, 37, 36, 36, 3, 3, 3, 37, 37, 36, 36, 36, 36, 37, 37, 37, 37, 3, 3, 3, 2, 2, 2, 2, 2, 2, 2, 40, 40, 40, 40, 40, 39, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 2, 2, 2, 30, 3, 3, 3, 3, 3, 30, 30, 30, 30, 32, 32, 32, 32, 32, 32, 30, 31, 31, 31, 31, 31, 31, 3, 3, 3, 31, 31, 31, 31, 31, 2, 2, 2, 2, 27, 27, 3, 3, 3, 27, 27, 27, 27, 28, 28, 27, 27, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 16, 16, 15, 15, 15, 15, 15, 15, 15, 15, 15, 16, 16, 16, 16, 16, 3, 3, 3, 16, 16, 16, 15, 15, 15, 15, 16, 16, 2, 2, 2, 37, 37, 37, 37, 37, 37, 37, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 3, 3, 3, 37, 37, 36, 37, 37, 37, 37, 37, 37, 36, 3, 3, 3, 2, 2, 2, 2, 40, 40, 40, 40, 40, 40, 39, 39, 39, 39, 39, 40, 40, 40, 40, 40, 40, 40, 40, 39, 40, 2, 2, 30, 30, 3, 3, 3, 3, 3, 30, 30, 30, 30, 32, 32, 32, 32, 31, 31, 31, 31, 31, 31, 31, 31, 3, 3, 3, 30, 30, 30, 30, 30, 2, 2, 2, 27, 27, 27, 3, 3, 3, 27, 27, 27, 27, 27, 27, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 16, 16, 16, 16, 3, 3, 3, 3, 16, 16, 16, 16, 16, 16, 16, 16, 16, 2, 2, 2, 37, 37, 38, 36, 36, 36, 36, 36, 36, 37, 37, 37, 36, 36, 36, 36, 36, 3, 3, 3, 36, 37, 37, 37, 37, 37, 37, 36, 36, 36, 3, 3, 3, 2, 2, 40, 40, 40, 40, 40, 40, 40, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 40, 40, 41, 41, 39, 39, 2, 2, 2, 30, 30, 3, 3, 3, 3, 3, 30, 30, 30, 31, 32, 32, 32, 31, 31, 31, 31, 31, 31, 31, 31, 3, 3, 3, 30, 30, 30, 30, 30, 2, 2, 27, 27, 27, 27, 3, 3, 3, 27, 27, 27, 27, 27, 27, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 27, 28, 28, 29, 28, 28, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 16, 16, 16, 16, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 16, 16, 15, 16, 3, 3, 3, 3, 3, 16, 16, 16, 16, 16, 16, 16, 16, 16, 2, 2, 37, 37, 38, 38, 38, 38, 36, 36, 36, 36, 37, 37, 37, 37, 36, 36, 36, 37, 3, 3, 3, 36, 37, 37, 37, 37, 37, 37, 37, 2, 2, 3, 3, 3, 4, 40, 40, 40, 39, 39, 40, 40, 39, 39, 39, 39, 39, 39, 39, 39, 39, 40, 39, 39, 39, 41, 41, 39, 39, 2, 2, 2, 30, 30, 30, 3, 3, 3, 3, 3, 30, 30, 31, 31, 32, 30, 31, 31, 31, 31, 31, 31, 31, 31, 3, 3, 3, 30, 30, 30, 30, 30, 2, 2, 27, 27, 27, 28, 3, 3, 3, 27, 27, 27, 27, 27, 27, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 27, 27, 27, 28, 28, 27, 27, 28, 27, 28, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 16, 16, 16, 16, 16, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 16, 15, 3, 3, 3, 3, 16, 16, 16, 16, 17, 17, 17, 16, 16, 16, 2, 2, 37, 37, 38, 38, 38, 38, 38, 36, 36, 36, 37, 37, 37, 37, 36, 36, 36, 37, 3, 3, 3, 36, 37, 37, 37, 37, 37, 2, 2, 2, 2, 4, 3, 3, 3, 40, 40, 39, 39, 40, 40, 40, 40, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 41, 41, 41, 39, 39, 2, 2, 2, 30, 30, 30, 3, 3, 3, 3, 3, 30, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 3, 3, 3, 30, 30, 30, 30, 2, 2, 2, 27, 27, 27, 27, 3, 3, 3, 27, 27, 27, 27, 27, 27, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 27, 27, 28, 27, 27, 27, 27, 28, 27, 27, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 16, 16, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 16, 15, 3, 3, 3, 16, 16, 16, 16, 16, 16, 16, 17, 16, 16, 16, 2, 2, 36, 36, 38, 38, 38, 38, 38, 38, 36, 36, 37, 37, 37, 37, 36, 36, 36, 36, 3, 3, 3, 37, 37, 2, 2, 2, 2, 2, 2, 2, 2, 39, 3, 3, 3, 3, 40, 40, 40, 40, 40, 40, 40, 40, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 41, 39, 39, 2, 2, 2, 2, 30, 30, 30, 3, 3, 3, 3, 3, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 3, 3, 3, 30, 30, 30, 30, 2, 2, 2, 27, 27, 27, 27, 3, 3, 3, 3, 27, 27, 27, 27, 27, 27, 28, 27, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 27, 27, 27, 28, 28, 27, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 15, 16, 15, 15, 15, 15, 16, 16, 16, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 3, 3, 3, 3, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 15, 2, 2, 36, 36, 38, 38, 38, 38, 38, 38, 38, 37, 37, 37, 37, 37, 37, 37, 36, 36, 3, 3, 3, 37, 37, 2, 2, 2, 2, 2, 2, 39, 39, 39, 3, 3, 3, 3, 3, 40, 40, 40, 40, 40, 40, 40, 40, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 40, 40, 41, 39, 39, 39, 2, 2, 2, 30, 30, 30, 30, 3, 3, 3, 3, 3, 30, 30, 30, 31, 31, 31, 31, 31, 31, 31, 31, 3, 3, 3, 30, 30, 30, 2, 2, 2, 27, 27, 27, 27, 27, 3, 3, 3, 3, 3, 27, 27, 27, 27, 27, 27, 27, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 27, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 15, 15, 15, 15, 15, 15, 16, 16, 16, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 3, 3, 3, 3, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 2, 2, 2, 36, 36, 38, 38, 38, 38, 38, 36, 36, 37, 37, 37, 37, 37, 37, 37, 36, 36, 3, 3, 3, 37, 2, 2, 2, 40, 40, 40, 40, 39, 39, 39, 39, 3, 3, 3, 3, 3, 40, 40, 40, 40, 40, 40, 40, 40, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 2, 2, 30, 30, 30, 30, 30, 3, 3, 3, 3, 3, 30, 30, 31, 31, 31, 31, 31, 31, 31, 31, 3, 3, 3, 30, 30, 30, 2, 2, 2, 27, 27, 27, 27, 27, 27, 3, 3, 3, 3, 3, 27, 27, 27, 27, 27, 27, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 27, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 3, 3, 3, 16, 16, 16, 16, 16, 16, 16, 16, 17, 16, 16, 2, 2, 2, 36, 36, 38, 38, 38, 38, 36, 36, 36, 36, 36, 37, 37, 36, 37, 37, 36, 36, 3, 3, 3, 37, 2, 2, 2, 40, 40, 40, 40, 39, 39, 39, 39, 40, 3, 3, 3, 3, 3, 40, 40, 40, 40, 40, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 2, 2, 30, 30, 30, 30, 30, 30, 3, 3, 3, 3, 3, 30, 30, 30, 31, 31, 31, 31, 31, 30, 3, 3, 3, 30, 30, 30, 2, 2, 2, 27, 27, 27, 27, 27, 27, 27, 3, 3, 3, 3, 3, 27, 27, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 27, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 3, 3, 3, 3, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 2, 2, 36, 36, 38, 38, 38, 38, 38, 36, 36, 36, 36, 36, 37, 37, 37, 37, 37, 37, 37, 3, 3, 3, 37, 2, 2, 40, 40, 39, 39, 39, 40, 40, 40, 40, 40, 40, 3, 3, 3, 3, 3, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 41, 39, 39, 2, 2, 30, 30, 32, 30, 30, 30, 30, 3, 3, 3, 3, 3, 31, 31, 31, 31, 31, 30, 30, 3, 3, 3, 3, 30, 30, 30, 2, 2, 2, 2, 2, 27, 27, 27, 27, 27, 27, 3, 3, 3, 3, 3, 27, 28, 28, 28, 28, 27, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 27, 27, 27, 27, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 3, 3, 3, 3, 3, 15, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 2, 2, 36, 36, 36, 36, 38, 38, 38, 36, 36, 36, 36, 36, 36, 36, 37, 37, 37, 37, 37, 3, 3, 3, 2, 2, 2, 40, 40, 39, 39, 39, 40, 40, 40, 40, 40, 40, 39, 3, 3, 3, 3, 3, 5, 5, 5, 5, 5, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 41, 39, 39, 2, 2, 30, 30, 32, 30, 30, 30, 30, 31, 3, 3, 3, 3, 3, 5, 5, 5, 5, 5, 3, 3, 3, 3, 3, 30, 30, 30, 30, 2, 2, 2, 2, 2, 27, 27, 27, 27, 27, 27, 3, 3, 3, 3, 3, 5, 5, 5, 5, 5, 27, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 27, 27, 27, 27, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 16, 16, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 5, 5, 5, 5, 5, 3, 3, 3, 3, 3, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 15, 16, 2, 2, 2, 36, 36, 38, 38, 38, 38, 36, 36, 36, 36, 36, 37, 37, 37, 37, 37, 37, 37, 3, 3, 3, 2, 2, 2, 39, 39, 39, 39, 39, 39, 40, 40, 40, 40, 40, 40, 39, 3, 3, 3, 5, 5, 5, 5, 5, 5, 5, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 41, 41, 39, 39, 2, 2, 30, 30, 32, 32, 30, 30, 30, 31, 31, 3, 3, 3, 5, 5, 5, 5, 5, 5, 5, 3, 3, 3, 30, 30, 30, 30, 30, 30, 30, 2, 2, 2, 27, 27, 27, 27, 27, 27, 27, 3, 3, 3, 5, 5, 5, 5, 5, 5, 5, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 27, 27, 27, 27, 27, 27, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 15, 15, 15, 15, 15, 15, 15, 15, 15, 16, 16, 16, 15, 15, 15, 15, 15, 5, 5, 5, 5, 5, 5, 5, 3, 3, 3, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 15, 15, 15, 2, 2, 2, 36, 36, 36, 36, 36, 38, 36, 36, 36, 36, 36, 36, 36, 37, 37, 37, 37, 3, 3, 3, 3, 2, 2, 39, 39, 39, 39, 39, 39, 39, 39, 40, 40, 40, 40, 40, 39, 39, 3, 5, 5, 5, 5, 5, 5, 5, 5, 5, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 2, 2, 30, 30, 30, 30, 30, 30, 30, 31, 31, 31, 3, 5, 5, 5, 5, 5, 5, 5, 5, 5, 3, 30, 30, 30, 30, 30, 32, 30, 30, 2, 2, 2, 27, 27, 27, 27, 27, 27, 27, 27, 3, 5, 5, 5, 5, 5, 5, 5, 5, 5, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 27, 27, 27, 27, 27, 27, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 15, 15, 15, 15, 15, 15, 15, 16, 16, 16, 16, 16, 16, 16, 16, 15, 5, 5, 5, 5, 5, 5, 5, 5, 5, 3, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 15, 15, 15, 15, 2, 2, 2, 2, 36, 36, 36, 36, 36, 36, 36, 36, 37, 36, 36, 37, 37, 37, 3, 3, 3, 3, 3, 2, 2, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 40, 40, 40, 40, 39, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 2, 2, 30, 30, 30, 30, 30, 30, 30, 31, 31, 31, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 30, 30, 30, 30, 30, 32, 30, 30, 2, 2, 27, 27, 27, 27, 27, 27, 27, 27, 28, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 27, 27, 27, 27, 27, 27, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 15, 15, 15, 15, 15, 15, 15, 15, 16, 16, 16, 16, 16, 16, 16, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 15, 16, 16, 16, 15, 15, 15, 16, 16, 16, 15, 15, 15, 15, 15, 2, 2, 2, 2, 2, 2, 2, 36, 36, 36, 37, 37, 37, 37, 37, 37, 37, 3, 3, 3, 3, 3, 36, 2, 2, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 40, 40, 40, 39, 39, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 30, 30, 30, 30, 30, 32, 30, 30, 2, 2, 27, 27, 27, 27, 27, 27, 28, 28, 28, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 27, 27, 27, 27, 27, 27, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 16, 16, 16, 16, 16, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 37, 37, 36, 36, 37, 3, 3, 3, 3, 3, 36, 36, 2, 2, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 40, 40, 40, 39, 39, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 30, 30, 30, 30, 30, 30, 30, 30, 2, 2, 27, 27, 27, 27, 27, 27, 28, 27, 28, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 27, 27, 27, 27, 27, 27, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 16, 16, 16, 16, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 2, 2, 33, 33, 33, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 4, 2, 37, 37, 2, 2, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 40, 39, 40, 40, 39, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 30, 30, 30, 30, 30, 30, 30, 30, 2, 2, 2, 27, 27, 29, 29, 28, 27, 27, 28, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 29, 29, 29, 29, 27, 27, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 16, 16, 16, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 2, 2, 33, 33, 33, 33, 33, 33, 33, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 2, 2, 2, 37, 2, 2, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 40, 40, 40, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 3, 3, 4, 2, 2, 30, 31, 31, 31, 30, 30, 30, 30, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 3, 30, 30, 30, 30, 30, 30, 30, 2, 2, 2, 27, 27, 29, 28, 27, 27, 27, 28, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 27, 28, 28, 28, 28, 28, 28, 28, 28, 28, 29, 29, 29, 29, 27, 27, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 15, 15, 17, 15, 15, 15, 15, 15, 15, 15, 15, 15, 16, 16, 16, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 2, 2, 33, 33, 33, 33, 33, 33, 33, 33, 34, 34, 34, 33, 33, 34, 3, 3, 3, 2, 2, 2, 2, 2, 2, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 40, 40, 40, 40, 40, 5, 5, 5, 5, 5, 5, 5, 5, 5, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 2, 2, 2, 30, 31, 31, 31, 30, 30, 30, 30, 3, 5, 5, 5, 5, 5, 5, 5, 5, 5, 3, 3, 3, 30, 30, 30, 30, 30, 30, 30, 2, 2, 27, 27, 27, 27, 27, 27, 3, 3, 3, 5, 5, 5, 5, 5, 5, 5, 5, 5, 27, 28, 28, 28, 28, 28, 28, 28, 28, 28, 29, 29, 29, 29, 29, 27, 27, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 15, 15, 17, 15, 15, 15, 15, 15, 15, 15, 15, 15, 16, 16, 16, 16, 5, 5, 5, 5, 5, 5, 5, 5, 5, 3, 3, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 2, 2, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 34, 33, 33, 34, 3, 3, 3, 34, 2, 2, 2, 2, 2, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 40, 40, 40, 40, 40, 5, 5, 5, 5, 5, 5, 5, 39, 39, 39, 39, 41, 41, 41, 41, 41, 41, 41, 41, 39, 39, 39, 39, 39, 2, 2, 30, 31, 30, 30, 30, 30, 30, 3, 3, 3, 5, 5, 5, 5, 5, 5, 5, 3, 3, 3, 3, 3, 3, 3, 3, 30, 30, 30, 2, 2, 2, 27, 27, 27, 27, 3, 3, 3, 3, 3, 5, 5, 5, 5, 5, 5, 5, 28, 28, 28, 28, 28, 28, 28, 28, 28, 27, 29, 29, 29, 29, 29, 29, 27, 27, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 15, 15, 17, 17, 15, 15, 15, 15, 15, 15, 15, 15, 16, 16, 16, 16, 5, 5, 5, 5, 5, 5, 5, 3, 3, 3, 3, 3, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 2, 2, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 35, 35, 33, 33, 3, 3, 3, 3, 34, 2, 2, 2, 2, 2, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 40, 40, 40, 40, 40, 40, 40, 5, 5, 5, 5, 5, 39, 39, 39, 39, 39, 41, 41, 41, 41, 41, 41, 41, 41, 41, 41, 39, 39, 2, 2, 2, 30, 30, 30, 30, 30, 31, 3, 3, 3, 3, 3, 5, 5, 5, 5, 5, 31, 31, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 5, 5, 5, 5, 5, 28, 28, 28, 28, 28, 28, 28, 28, 28, 27, 29, 29, 29, 29, 29, 29, 27, 27, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 15, 15, 17, 17, 15, 15, 15, 15, 15, 15, 15, 15, 15, 16, 16, 15, 15, 5, 5, 5, 5, 5, 3, 3, 3, 3, 3, 3, 3, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 2, 2, 2, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 35, 35, 33, 33, 3, 3, 3, 3, 34, 34, 33, 2, 2, 2, 39, 39, 39, 39, 39, 39, 39, 39, 39, 40, 40, 40, 40, 40, 40, 40, 40, 40, 3, 3, 3, 39, 39, 39, 40, 40, 39, 41, 41, 41, 41, 41, 41, 41, 41, 41, 41, 39, 39, 2, 2, 2, 30, 30, 31, 30, 30, 3, 3, 3, 3, 3, 30, 31, 3, 3, 3, 31, 31, 31, 31, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 27, 27, 27, 27, 27, 27, 27, 28, 28, 28, 27, 28, 29, 29, 29, 29, 29, 29, 29, 27, 27, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 15, 15, 17, 17, 16, 15, 15, 15, 15, 15, 15, 17, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 3, 3, 3, 3, 3, 3, 3, 15, 15, 15, 15, 15, 15, 15, 15, 15, 2, 2, 2, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 35, 33, 33, 33, 3, 3, 3, 33, 33, 33, 33, 2, 2, 39, 39, 39, 39, 39, 39, 39, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 3, 3, 3, 40, 40, 39, 40, 40, 40, 40, 40, 41, 41, 41, 41, 41, 41, 41, 39, 39, 2, 2, 2, 31, 31, 31, 31, 30, 3, 3, 3, 3, 3, 30, 30, 30, 3, 3, 3, 31, 31, 31, 30, 30, 30, 30, 30, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 27, 3, 3, 3, 3, 28, 28, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 29, 29, 29, 29, 29, 29, 29, 27, 27, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 15, 16, 16, 16, 16, 16, 16, 16, 15, 15, 17, 17, 17, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 3, 3, 3, 3, 3, 3, 3, 15, 15, 15, 15, 15, 15, 15, 15, 2, 2, 2, 34, 34, 34, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 3, 3, 3, 3, 33, 33, 33, 2, 2, 2, 40, 39, 39, 39, 39, 39, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 3, 3, 3, 40, 40, 40, 40, 40, 40, 40, 40, 41, 39, 39, 41, 41, 41, 39, 39, 2, 2, 2, 2, 31, 31, 31, 31, 3, 3, 3, 3, 3, 30, 30, 30, 30, 3, 3, 3, 31, 31, 31, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 2, 2, 2, 27, 27, 28, 27, 27, 27, 3, 3, 3, 3, 28, 28, 28, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 28, 29, 29, 29, 29, 29, 27, 27, 27, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 16, 16, 16, 17, 16, 16, 17, 17, 17, 17, 17, 17, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 3, 3, 3, 3, 3, 3, 3, 15, 15, 15, 15, 15, 15, 15, 2, 2, 2, 34, 34, 34, 33, 33, 34, 33, 33, 33, 33, 33, 33, 33, 33, 33, 3, 3, 3, 3, 3, 33, 33, 2, 2, 2, 2, 39, 39, 39, 39, 39, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 3, 3, 3, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 41, 40, 40, 39, 39, 2, 2, 2, 2, 30, 31, 31, 31, 3, 3, 3, 3, 3, 30, 30, 30, 30, 30, 3, 3, 3, 31, 31, 31, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 2, 2, 27, 27, 27, 27, 27, 27, 3, 3, 3, 3, 3, 28, 28, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 28, 28, 28, 29, 29, 29, 29, 27, 27, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 16, 16, 16, 16, 16, 17, 17, 17, 17, 17, 17, 17, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 3, 3, 3, 3, 3, 3, 3, 15, 15, 15, 15, 16, 16, 2, 2, 2, 34, 34, 34, 34, 33, 34, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 3, 3, 3, 3, 3, 33, 33, 2, 2, 2, 39, 39, 39, 39, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 3, 3, 3, 3, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 39, 40, 39, 39, 2, 2, 2, 30, 30, 31, 31, 3, 3, 3, 3, 3, 30, 30, 30, 30, 30, 30, 3, 3, 3, 31, 31, 31, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 2, 2, 27, 27, 29, 27, 27, 27, 3, 3, 3, 3, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 28, 28, 28, 28, 29, 29, 29, 27, 27, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 16, 16, 16, 16, 17, 17, 17, 17, 17, 17, 17, 17, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 3, 3, 3, 3, 3, 3, 3, 15, 15, 16, 16, 16, 2, 2, 2, 34, 34, 34, 34, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 3, 3, 3, 3, 34, 34, 34, 2, 2, 39, 39, 39, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 3, 3, 3, 3, 3, 40, 40, 41, 40, 40, 40, 40, 40, 40, 40, 39, 39, 39, 39, 2, 2, 2, 30, 30, 30, 30, 3, 3, 3, 3, 3, 30, 30, 30, 30, 30, 30, 30, 3, 3, 3, 31, 31, 31, 32, 30, 30, 30, 30, 30, 30, 30, 30, 30, 2, 2, 27, 27, 27, 27, 27, 27, 3, 3, 3, 28, 28, 27, 27, 27, 27, 29, 29, 27, 27, 27, 27, 27, 27, 27, 28, 28, 28, 28, 29, 29, 29, 27, 27, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 16, 16, 16, 16, 17, 17, 17, 17, 17, 17, 17, 17, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 3, 3, 3, 3, 3, 3, 3, 15, 16, 16, 16, 2, 2, 34, 34, 34, 34, 34, 34, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 3, 3, 3, 33, 34, 33, 2, 2, 2, 39, 39, 39, 40, 40, 40, 40, 40, 40, 40, 40, 40, 3, 3, 3, 3, 3, 40, 40, 40, 41, 41, 41, 39, 39, 39, 40, 40, 40, 40, 39, 39, 2, 2, 2, 30, 30, 30, 3, 3, 3, 3, 3, 30, 30, 30, 30, 32, 32, 30, 30, 3, 3, 3, 31, 31, 32, 32, 32, 30, 30, 30, 30, 30, 30, 30, 30, 2, 2, 27, 27, 27, 27, 27, 27, 3, 3, 3, 27, 27, 27, 27, 27, 29, 29, 29, 27, 27, 27, 27, 27, 27, 27, 28, 28, 28, 28, 28, 29, 28, 27, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 16, 15, 16, 16, 16, 17, 17, 17, 17, 17, 17, 17, 17, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 3, 3, 3, 3, 3, 3, 3, 16, 16, 16, 2, 2, 34, 34, 34, 34, 34, 34, 34, 34, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 3, 3, 3, 3, 34, 34, 2, 2, 2, 2, 40, 39, 40, 40, 40, 40, 39, 39, 40, 40, 3, 3, 3, 3, 3, 40, 40, 40, 40, 41, 41, 41, 40, 40, 39, 40, 40, 40, 40, 39, 39, 2, 2, 30, 30, 30, 3, 3, 3, 3, 3, 30, 30, 30, 30, 32, 32, 30, 30, 30, 3, 3, 3, 31, 31, 32, 32, 32, 30, 30, 30, 30, 30, 30, 30, 30, 2, 2, 27, 27, 27, 27, 27, 27, 3, 3, 3, 27, 27, 27, 29, 29, 29, 29, 29, 27, 27, 27, 27, 27, 27, 27, 27, 28, 28, 28, 28, 28, 28, 27, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 15, 15, 15, 15, 15, 15, 17, 17, 17, 17, 17, 17, 17, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 3, 3, 3, 3, 3, 3, 3, 3, 16, 16, 2, 2, 2, 34, 34, 34, 34, 34, 34, 34, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 3, 3, 3, 3, 3, 34, 34, 2, 2, 2, 2, 2, 2, 39, 39, 39, 39, 39, 39, 3, 3, 3, 3, 3, 39, 40, 40, 40, 41, 41, 41, 41, 40, 40, 40, 40, 40, 39, 39, 40, 40, 2, 2, 30, 30, 3, 3, 3, 3, 3, 30, 30, 30, 30, 32, 32, 32, 30, 30, 30, 3, 3, 3, 31, 31, 32, 32, 32, 32, 30, 30, 30, 30, 30, 30, 30, 2, 2, 2, 27, 27, 27, 27, 3, 3, 3, 3, 28, 27, 29, 29, 29, 29, 29, 29, 29, 27, 27, 27, 27, 27, 27, 27, 28, 28, 28, 28, 28, 28, 28, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 15, 15, 15, 15, 15, 15, 17, 17, 17, 17, 17, 17, 17, 16, 16, 16, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 3, 3, 3, 15, 3, 3, 3, 3, 3, 3, 4, 2, 2, 2, 33, 33, 34, 34, 34, 34, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 3, 3, 3, 3, 3, 34, 34, 2, 2, 2, 2, 2, 2, 2, 39, 39, 39, 3, 3, 3, 3, 3, 39, 39, 40, 40, 41, 41, 41, 41, 41, 40, 40, 40, 40, 39, 39, 39, 39, 40, 2, 2, 31, 3, 3, 3, 3, 3, 30, 30, 30, 30, 30, 32, 32, 30, 30, 30, 30, 3, 3, 3, 31, 31, 32, 32, 32, 32, 30, 30, 30, 30, 30, 30, 30, 2, 2, 2, 27, 27, 27, 3, 3, 3, 3, 3, 27, 27, 29, 29, 29, 29, 29, 29, 29, 27, 27, 27, 27, 27, 27, 27, 28, 28, 28, 28, 28, 28, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 15, 15, 15, 15, 15, 15, 15, 15, 15, 16, 17, 17, 17, 16, 16, 16, 16, 16, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 3, 3, 3, 15, 15, 3, 3, 3, 3, 3, 3, 4, 2, 2, 33, 33, 34, 34, 34, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 3, 3, 3, 3, 3, 34, 34, 34, 34, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 39, 39, 39, 40, 40, 40, 41, 41, 41, 41, 40, 40, 40, 39, 39, 39, 39, 40, 2, 2, 2, 3, 3, 3, 3, 3, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 3, 3, 3, 31, 31, 31, 32, 32, 32, 30, 30, 30, 30, 30, 30, 30, 30, 2, 2, 27, 27, 28, 3, 3, 3, 3, 27, 27, 27, 29, 29, 29, 29, 29, 29, 29, 27, 29, 27, 27, 27, 27, 27, 27, 28, 28, 28, 28, 28, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 15, 15, 15, 15, 15, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 15, 15, 15, 15, 15, 15, 15, 15, 3, 3, 3, 15, 15, 15, 3, 3, 3, 3, 3, 3, 4, 2, 4, 3, 3, 34, 34, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 3, 3, 3, 3, 3, 34, 34, 34, 33, 33, 2, 2, 2, 4, 3, 3, 3, 3, 39, 39, 39, 39, 40, 40, 40, 40, 41, 40, 40, 39, 39, 39, 39, 39, 39, 2, 2, 2, 2, 4, 3, 3, 3, 3, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 31, 3, 3, 3, 31, 31, 31, 32, 32, 32, 30, 30, 30, 30, 30, 30, 30, 31, 2, 2, 27, 27, 27, 3, 3, 3, 27, 27, 27, 27, 29, 29, 29, 29, 29, 29, 27, 27, 27, 27, 27, 27, 27, 28, 28, 28, 27, 27, 27, 27, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 15, 15, 15, 15, 15, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 15, 16, 16, 16, 16, 15, 15, 15, 15, 15, 15, 15, 3, 3, 3, 3, 15, 15, 15, 15, 15, 3, 3, 3, 3, 3, 3, 3, 3, 3, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 3, 3, 3, 3, 3, 34, 34, 33, 33, 33, 33, 2, 3, 3, 3, 4, 39, 39, 39, 39, 39, 40, 40, 40, 40, 40, 40, 39, 39, 39, 39, 39, 39, 2, 2, 2, 2, 4, 3, 3, 3, 3, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 3, 3, 3, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 30, 30, 30, 31, 2, 2, 28, 28, 28, 3, 3, 3, 27, 27, 27, 29, 29, 29, 29, 27, 27, 27, 27, 28, 28, 28, 27, 27, 28, 28, 28, 28, 28, 28, 27, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 15, 15, 15, 15, 15, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 15, 16, 16, 16, 16, 15, 15, 15, 15, 15, 15, 15, 3, 3, 3, 3, 3, 15, 15, 15, 15, 15, 3, 3, 3, 3, 3, 3, 3, 3, 3, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 34, 34, 3, 3, 3, 3, 34, 34, 33, 33, 33, 33, 33, 3, 3, 3, 2, 2, 2, 2, 39, 39, 40, 40, 40, 40, 40, 40, 39, 39, 39, 39, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 3, 3, 3, 31, 31, 31, 31, 31, 30, 30, 30, 32, 30, 30, 30, 30, 31, 2, 2, 28, 28, 3, 3, 3, 3, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 28, 28, 27, 27, 27, 27, 28, 28, 28, 28, 28, 28, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 15, 15, 15, 15, 16, 16, 16, 16, 15, 16, 16, 16, 16, 16, 15, 15, 15, 16, 16, 16, 15, 15, 15, 15, 15, 15, 15, 15, 3, 3, 3, 3, 3, 15, 15, 15, 15, 15, 3, 3, 3, 3, 3, 3, 3, 3, 3, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 34, 34, 3, 3, 3, 3, 33, 33, 33, 33, 33, 3, 3, 3, 3, 2, 2, 2, 2, 2, 39, 39, 39, 40, 40, 40, 40, 39, 39, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 3, 3, 3, 30, 30, 31, 30, 30, 30, 30, 32, 32, 32, 32, 32, 31, 31, 2, 2, 28, 28, 3, 3, 3, 3, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 28, 28, 28, 28, 28, 28, 27, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 15, 15, 15, 16, 16, 16, 16, 15, 15, 16, 16, 16, 16, 16, 17, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 4, 3, 3, 3, 2, 2, 2, 15, 15, 15, 15, 15, 2, 2, 4, 3, 3, 3, 3, 34, 34, 33, 34, 34, 34, 33, 33, 33, 33, 33, 33, 33, 33, 34, 34, 3, 3, 3, 3, 33, 33, 33, 33, 3, 3, 3, 3, 3, 33, 33, 2, 2, 2, 2, 39, 39, 39, 40, 40, 2, 2, 2, 2, 2, 2, 2, 30, 3, 3, 3, 3, 3, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 3, 3, 3, 30, 30, 30, 30, 30, 30, 30, 32, 32, 32, 32, 31, 31, 2, 2, 2, 28, 28, 3, 3, 3, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 28, 27, 28, 28, 28, 28, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 16, 16, 16, 16, 16, 16, 15, 15, 16, 16, 16, 16, 15, 17, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 2, 3, 3, 3, 2, 2, 2, 2, 15, 15, 15, 15, 2, 2, 2, 4, 3, 3, 3, 3, 34, 34, 34, 34, 34, 34, 34, 33, 35, 35, 33, 33, 33, 34, 34, 34, 3, 3, 3, 33, 33, 33, 3, 3, 3, 3, 3, 33, 33, 33, 33, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 30, 30, 3, 3, 3, 3, 3, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 3, 3, 3, 3, 30, 30, 30, 30, 30, 30, 32, 32, 32, 32, 31, 31, 2, 2, 2, 28, 28, 3, 3, 3, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 28, 28, 28, 28, 28, 28, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 15, 16, 16, 16, 16, 16, 15, 15, 16, 16, 16, 16, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 2, 3, 3, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 4, 3, 3, 3, 3, 3, 34, 34, 34, 34, 33, 33, 33, 33, 33, 33, 33, 34, 34, 34, 3, 3, 3, 33, 33, 3, 3, 3, 3, 3, 33, 33, 33, 33, 33, 33, 2, 2, 2, 2, 2, 2, 2, 2, 2, 33, 2, 2, 30, 3, 3, 3, 3, 3, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 3, 3, 3, 3, 30, 30, 30, 30, 30, 30, 32, 32, 30, 31, 31, 31, 2, 2, 28, 28, 2, 3, 3, 3, 2, 2, 2, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 27, 28, 28, 28, 28, 28, 28, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 15, 15, 15, 16, 16, 16, 16, 16, 16, 16, 16, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 17, 17, 15, 15, 15, 15, 2, 4, 3, 3, 3, 12, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 34, 34, 33, 33, 33, 33, 33, 33, 33, 33, 34, 34, 34, 3, 3, 3, 33, 3, 3, 3, 3, 3, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 2, 2, 3, 3, 3, 3, 3, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 3, 3, 3, 30, 30, 30, 30, 30, 31, 31, 31, 30, 31, 30, 30, 2, 2, 2, 2, 2, 3, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 27, 27, 27, 27, 27, 27, 28, 28, 28, 28, 28, 28, 28, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 16, 16, 16, 16, 16, 16, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 2, 2, 2, 2, 3, 3, 3, 12, 12, 12, 12, 12, 12, 12, 12, 12, 13, 2, 2, 2, 3, 3, 3, 3, 3, 3, 33, 33, 33, 33, 33, 33, 33, 33, 34, 34, 34, 34, 3, 3, 3, 3, 3, 3, 3, 3, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 2, 2, 3, 3, 3, 3, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 3, 3, 3, 30, 30, 30, 30, 30, 31, 31, 31, 30, 30, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 6, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 27, 27, 27, 27, 27, 28, 28, 28, 28, 28, 28, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 16, 16, 16, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 2, 2, 2, 2, 2, 2, 3, 3, 3, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 2, 2, 2, 34, 34, 3, 3, 3, 3, 3, 33, 33, 33, 33, 33, 33, 33, 34, 34, 34, 34, 3, 3, 3, 3, 3, 3, 3, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 2, 2, 3, 3, 3, 2, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 3, 3, 3, 30, 30, 30, 30, 30, 31, 2, 2, 2, 2, 2, 2, 2, 2, 2, 7, 7, 3, 3, 3, 6, 6, 6, 6, 6, 6, 6, 6, 2, 2, 2, 2, 27, 27, 27, 27, 27, 27, 28, 28, 28, 28, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 12, 2, 2, 2, 2, 2, 15, 15, 16, 16, 15, 15, 15, 15, 15, 15, 15, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 12, 12, 3, 3, 3, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 2, 2, 2, 34, 34, 3, 3, 3, 3, 3, 3, 33, 33, 33, 33, 34, 34, 34, 34, 5, 5, 5, 5, 5, 3, 3, 34, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 3, 3, 3, 30, 30, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 6, 6, 6, 7, 7, 3, 3, 3, 6, 6, 6, 6, 6, 6, 6, 6, 6, 2, 2, 2, 2, 2, 2, 2, 27, 27, 28, 28, 28, 28, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 12, 13, 13, 2, 2, 2, 15, 16, 16, 16, 15, 15, 15, 15, 16, 16, 2, 2, 2, 2, 2, 2, 2, 2, 12, 12, 13, 13, 3, 3, 3, 12, 12, 12, 13, 12, 12, 12, 12, 12, 12, 12, 2, 2, 2, 34, 34, 34, 3, 3, 3, 3, 3, 3, 34, 34, 34, 34, 34, 34, 5, 5, 5, 5, 5, 5, 5, 34, 34, 34, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 4, 2, 2, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 31, 30, 30, 30, 30, 30, 30, 2, 3, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 6, 6, 6, 6, 6, 6, 6, 6, 7, 3, 3, 3, 7, 6, 6, 6, 6, 6, 6, 6, 6, 6, 2, 2, 2, 2, 2, 2, 2, 2, 27, 27, 27, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 12, 12, 12, 2, 2, 2, 2, 2, 2, 16, 15, 15, 15, 16, 16, 2, 2, 2, 13, 13, 12, 12, 12, 12, 13, 13, 13, 13, 3, 3, 3, 12, 13, 14, 13, 13, 12, 12, 12, 12, 12, 12, 2, 2, 2, 33, 33, 33, 33, 3, 3, 3, 3, 3, 3, 34, 34, 34, 34, 5, 5, 5, 5, 5, 5, 5, 5, 5, 34, 34, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2, 2, 2, 2, 30, 30, 30, 30, 30, 30, 31, 31, 31, 31, 31, 31, 31, 31, 30, 32, 31, 30, 2, 2, 3, 3, 3, 2, 2, 2, 2, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 7, 3, 3, 3, 7, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 2, 2, 2, 2, 2, 27, 27, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 12, 12, 12, 12, 2, 2, 2, 2, 2, 2, 15, 15, 15, 16, 2, 2, 2, 2, 13, 13, 13, 13, 13, 13, 13, 14, 13, 13, 3, 3, 3, 13, 13, 13, 13, 13, 12, 12, 12, 12, 12, 12, 2, 2, 2, 33, 33, 33, 33, 33, 33, 3, 3, 3, 3, 3, 3, 3, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 33, 33, 33, 33, 33, 33, 33, 33, 33, 2, 2, 2, 30, 30, 30, 30, 30, 31, 31, 31, 31, 31, 31, 31, 31, 30, 30, 30, 31, 2, 2, 2, 3, 3, 3, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 7, 7, 3, 3, 3, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 2, 2, 2, 27, 27, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 12, 12, 12, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 13, 13, 14, 14, 14, 13, 13, 13, 14, 13, 13, 3, 3, 3, 13, 13, 13, 13, 13, 12, 12, 12, 12, 12, 12, 2, 2, 33, 33, 33, 33, 33, 33, 33, 33, 3, 3, 3, 3, 3, 3, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 2, 2, 2, 30, 30, 30, 30, 30, 31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 2, 2, 2, 2, 3, 3, 3, 6, 6, 6, 6, 6, 6, 7, 6, 6, 7, 7, 6, 6, 6, 6, 6, 7, 3, 3, 3, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 8, 6, 6, 6, 2, 2, 27, 27, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 12, 12, 12, 2, 2, 2, 12, 2, 2, 2, 2, 2, 2, 2, 2, 13, 13, 14, 14, 14, 14, 13, 13, 13, 13, 13, 13, 3, 3, 3, 13, 13, 13, 13, 13, 12, 12, 12, 12, 12, 12, 2, 2, 2, 33, 33, 35, 35, 33, 33, 33, 33, 3, 3, 3, 3, 3, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 2, 2, 2, 30, 30, 30, 30, 30, 30, 30, 31, 31, 31, 31, 31, 30, 30, 2, 2, 2, 2, 6, 3, 3, 3, 6, 6, 6, 6, 6, 6, 7, 6, 6, 7, 7, 6, 6, 6, 6, 6, 6, 3, 3, 3, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 2, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 13, 12, 12, 12, 12, 13, 14, 14, 14, 14, 13, 13, 13, 13, 13, 13, 3, 3, 3, 13, 13, 13, 13, 13, 12, 12, 12, 12, 12, 12, 2, 2, 2, 33, 33, 35, 35, 33, 33, 33, 33, 33, 33, 34, 3, 3, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 3, 3, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 2, 2, 30, 30, 30, 30, 30, 31, 31, 31, 31, 31, 31, 31, 31, 2, 2, 2, 2, 6, 6, 3, 3, 3, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 7, 7, 6, 6, 6, 6, 6, 3, 3, 3, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 12, 12, 12, 12, 12, 12, 12, 12, 13, 13, 13, 13, 13, 12, 12, 12, 12, 14, 14, 13, 13, 13, 13, 13, 13, 13, 13, 3, 3, 3, 13, 13, 13, 13, 12, 12, 12, 12, 12, 12, 12, 2, 2, 2, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 34, 33, 33, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 34, 34, 34, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 2, 2, 30, 30, 30, 30, 31, 31, 31, 31, 31, 31, 31, 31, 2, 2, 2, 2, 7, 6, 6, 3, 3, 3, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 7, 7, 6, 6, 6, 6, 6, 3, 3, 3, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 12, 12, 12, 12, 12, 13, 13, 13, 13, 13, 13, 13, 12, 12, 12, 12, 14, 14, 12, 13, 13, 13, 13, 13, 13, 13, 3, 3, 3, 3, 12, 12, 12, 12, 12, 13, 13, 12, 12, 2, 2, 2, 2, 33, 33, 33, 34, 33, 33, 33, 33, 33, 33, 33, 33, 33, 3, 5, 5, 5, 5, 5, 5, 5, 5, 5, 34, 34, 34, 34, 34, 35, 35, 35, 35, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 2, 2, 30, 30, 30, 31, 31, 31, 31, 31, 31, 31, 31, 2, 2, 2, 2, 7, 7, 7, 6, 3, 3, 3, 6, 6, 6, 6, 6, 6, 6, 7, 7, 7, 7, 6, 7, 7, 6, 6, 6, 3, 3, 3, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 12, 12, 12, 13, 13, 13, 13, 13, 13, 13, 13, 13, 12, 12, 12, 12, 12, 12, 12, 13, 13, 13, 13, 13, 13, 13, 3, 3, 3, 3, 3, 12, 12, 12, 12, 13, 13, 12, 2, 2, 2, 2, 33, 33, 33, 34, 34, 34, 33, 33, 33, 33, 33, 33, 33, 3, 3, 3, 5, 5, 5, 5, 5, 5, 5, 34, 34, 34, 34, 34, 34, 35, 35, 35, 35, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 2, 2, 2, 30, 30, 30, 31, 31, 31, 31, 31, 2, 2, 2, 2, 2, 7, 7, 7, 7, 6, 3, 3, 3, 3, 6, 6, 6, 6, 6, 6, 7, 7, 7, 6, 6, 7, 7, 6, 6, 6, 3, 3, 3, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 12, 12, 13, 13, 13, 13, 13, 13, 13, 13, 13, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 13, 13, 13, 13, 13, 3, 3, 3, 3, 3, 12, 12, 12, 13, 13, 2, 2, 2, 2, 33, 33, 34, 34, 34, 34, 34, 34, 34, 33, 33, 33, 33, 3, 3, 3, 3, 3, 5, 5, 5, 5, 5, 3, 3, 34, 34, 34, 34, 34, 35, 35, 35, 35, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 2, 2, 2, 2, 30, 30, 2, 2, 2, 2, 31, 2, 2, 2, 2, 7, 7, 7, 7, 6, 6, 3, 3, 3, 3, 3, 6, 6, 6, 6, 7, 7, 7, 7, 6, 6, 6, 6, 6, 6, 6, 3, 3, 3, 6, 6, 6, 6, 6, 7, 7, 7, 7, 7, 6, 6, 6, 6, 6, 6, 6, 6, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 13, 13, 13, 13, 13, 13, 13, 12, 12, 12, 12, 13, 13, 13, 12, 12, 12, 12, 12, 12, 12, 13, 13, 13, 13, 13, 13, 3, 3, 3, 3, 3, 13, 13, 12, 12, 2, 2, 2, 33, 33, 33, 34, 34, 34, 34, 34, 34, 34, 33, 3, 3, 3, 3, 3, 3, 3, 33, 33, 33, 33, 3, 3, 3, 3, 3, 34, 34, 34, 34, 35, 35, 35, 35, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 2, 2, 2, 30, 30, 2, 2, 2, 2, 2, 2, 2, 7, 6, 7, 7, 7, 7, 7, 6, 6, 3, 3, 3, 3, 3, 7, 7, 7, 6, 6, 7, 6, 6, 6, 6, 6, 6, 6, 6, 3, 3, 3, 6, 6, 6, 6, 7, 7, 7, 7, 7, 7, 7, 6, 6, 6, 6, 6, 6, 6, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 13, 12, 13, 13, 13, 13, 13, 12, 12, 12, 12, 13, 13, 13, 12, 12, 12, 12, 12, 12, 12, 13, 13, 13, 13, 13, 13, 13, 3, 3, 3, 3, 3, 13, 13, 12, 2, 2, 33, 33, 33, 33, 34, 34, 34, 34, 34, 34, 34, 3, 3, 3, 3, 3, 3, 3, 33, 33, 33, 33, 33, 33, 3, 3, 3, 3, 34, 34, 34, 34, 35, 35, 35, 35, 35, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 7, 6, 7, 7, 7, 7, 7, 6, 6, 6, 3, 3, 3, 3, 3, 7, 6, 6, 6, 6, 6, 6, 7, 6, 6, 6, 6, 3, 3, 3, 3, 6, 6, 6, 6, 6, 7, 7, 7, 7, 7, 7, 6, 6, 6, 6, 6, 6, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 12, 12, 13, 13, 12, 12, 12, 12, 12, 12, 13, 13, 13, 13, 12, 12, 12, 12, 12, 12, 13, 13, 13, 13, 13, 13, 13, 13, 3, 3, 3, 3, 13, 13, 13, 2, 4, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 33, 33, 33, 33, 33, 33, 33, 33, 3, 3, 3, 34, 34, 34, 34, 35, 35, 35, 35, 35, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 7, 7, 7, 7, 7, 7, 7, 6, 6, 6, 6, 6, 3, 3, 3, 3, 3, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 3, 3, 3, 3, 6, 6, 6, 6, 6, 7, 7, 7, 7, 7, 6, 6, 6, 6, 6, 6, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 12, 12, 12, 12, 12, 12, 12, 13, 13, 12, 12, 12, 13, 13, 13, 13, 12, 12, 12, 12, 12, 12, 13, 12, 14, 13, 13, 13, 13, 3, 3, 3, 13, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 33, 33, 33, 34, 34, 34, 33, 33, 33, 33, 33, 3, 3, 3, 34, 34, 34, 35, 35, 35, 35, 35, 35, 33, 33, 33, 34, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 2, 2, 2, 2, 2, 2, 6, 6, 6, 7, 7, 7, 7, 7, 7, 7, 6, 6, 6, 6, 6, 6, 3, 3, 3, 3, 3, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 3, 3, 3, 6, 6, 6, 6, 6, 6, 7, 7, 7, 7, 6, 6, 6, 7, 6, 6, 6, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 12, 12, 12, 12, 12, 12, 13, 13, 12, 12, 13, 13, 13, 13, 13, 13, 12, 12, 12, 12, 12, 12, 14, 13, 13, 13, 13, 5, 5, 5, 5, 5, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 34, 34, 34, 34, 34, 34, 34, 34, 33, 33, 33, 33, 3, 3, 3, 34, 34, 34, 34, 34, 33, 33, 33, 33, 33, 33, 33, 34, 34, 34, 33, 34, 34, 34, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 2, 2, 2, 2, 7, 6, 6, 6, 6, 6, 6, 6, 7, 7, 7, 6, 6, 6, 6, 6, 7, 6, 6, 3, 3, 3, 3, 3, 6, 6, 6, 6, 6, 6, 6, 6, 6, 3, 3, 3, 7, 7, 6, 8, 6, 7, 7, 7, 7, 7, 6, 6, 6, 7, 7, 6, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 12, 12, 12, 12, 12, 12, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 5, 5, 5, 5, 5, 5, 5, 3, 3, 3, 4, 2, 2, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 3, 3, 3, 34, 34, 34, 34, 34, 34, 33, 33, 33, 33, 33, 33, 33, 34, 34, 33, 34, 34, 34, 34, 33, 33, 33, 33, 33, 33, 33, 33, 2, 2, 2, 2, 6, 6, 6, 8, 8, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 7, 6, 6, 6, 6, 3, 3, 3, 3, 3, 6, 6, 6, 6, 6, 6, 6, 6, 3, 3, 3, 7, 7, 8, 8, 6, 6, 7, 7, 7, 6, 6, 6, 6, 6, 7, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 12, 12, 12, 12, 12, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 12, 12, 12, 12, 12, 12, 12, 12, 5, 5, 5, 5, 5, 5, 5, 5, 5, 13, 13, 2, 2, 2, 2, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 3, 3, 3, 34, 34, 34, 2, 2, 2, 2, 2, 2, 33, 34, 34, 2, 2, 2, 2, 2, 2, 33, 33, 33, 33, 33, 33, 34, 34, 2, 2, 2, 2, 2, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 7, 6, 6, 6, 6, 6, 3, 3, 3, 3, 3, 6, 6, 6, 5, 5, 5, 5, 5, 3, 3, 7, 7, 7, 7, 6, 6, 7, 7, 7, 7, 7, 7, 7, 6, 7, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 12, 12, 12, 12, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 12, 12, 12, 12, 12, 12, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 13, 12, 2, 2, 2, 2, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 3, 3, 3, 34, 34, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 33, 33, 2, 2, 2, 2, 2, 2, 2, 2, 2, 7, 6, 8, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 3, 3, 3, 3, 3, 5, 5, 5, 5, 5, 5, 5, 5, 5, 7, 7, 7, 7, 6, 6, 6, 6, 7, 7, 7, 7, 7, 7, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 12, 12, 12, 12, 12, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 12, 12, 12, 12, 12, 12, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 13, 12, 12, 2, 2, 2, 2, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 35, 35, 34, 34, 34, 34, 34, 34, 3, 3, 3, 34, 2, 2, 2, 2, 10, 9, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 7, 6, 8, 8, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 3, 3, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 7, 7, 7, 6, 6, 6, 7, 7, 7, 7, 7, 7, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 12, 12, 12, 12, 13, 13, 13, 13, 13, 13, 13, 13, 12, 12, 13, 12, 12, 12, 12, 12, 12, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 13, 12, 13, 13, 2, 2, 2, 2, 2, 34, 34, 34, 34, 34, 34, 34, 35, 35, 35, 35, 35, 34, 34, 34, 34, 34, 3, 3, 3, 2, 2, 2, 2, 10, 10, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 2, 2, 2, 2, 2, 2, 9, 10, 10, 10, 10, 2, 2, 2, 7, 6, 8, 6, 6, 6, 6, 8, 8, 8, 8, 8, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 7, 7, 7, 6, 6, 7, 7, 7, 7, 7, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 12, 12, 12, 13, 13, 13, 13, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 13, 12, 12, 13, 13, 2, 2, 2, 2, 2, 34, 34, 34, 34, 34, 35, 35, 35, 35, 35, 35, 35, 34, 34, 34, 34, 3, 3, 3, 2, 2, 2, 10, 10, 10, 9, 9, 10, 10, 10, 10, 10, 10, 10, 10, 9, 9, 9, 9, 9, 9, 9, 9, 10, 10, 10, 10, 2, 2, 2, 7, 6, 8, 8, 6, 6, 8, 8, 8, 8, 8, 8, 8, 8, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 7, 7, 7, 7, 7, 6, 7, 7, 7, 7, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 12, 12, 13, 13, 13, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 12, 12, 12, 12, 13, 13, 13, 2, 2, 2, 2, 2, 34, 34, 34, 35, 35, 35, 35, 35, 35, 35, 34, 34, 34, 34, 3, 3, 3, 2, 2, 2, 2, 10, 10, 10, 10, 10, 10, 10, 10, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 10, 10, 10, 2, 2, 2, 7, 6, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 7, 7, 7, 7, 7, 7, 7, 7, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 13, 13, 13, 13, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 5, 5, 5, 5, 5, 5, 5, 5, 5, 3, 12, 12, 12, 12, 13, 13, 13, 13, 2, 2, 2, 2, 2, 34, 34, 34, 34, 35, 35, 35, 35, 34, 34, 34, 34, 34, 3, 3, 3, 33, 2, 2, 2, 2, 10, 10, 10, 10, 10, 10, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 10, 10, 10, 2, 2, 2, 7, 6, 6, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 6, 6, 7, 7, 7, 7, 7, 7, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 13, 13, 13, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 5, 5, 5, 5, 5, 5, 5, 3, 3, 3, 12, 12, 12, 12, 12, 13, 13, 13, 13, 2, 2, 2, 2, 2, 33, 33, 34, 34, 34, 35, 34, 34, 34, 34, 34, 3, 3, 3, 33, 33, 2, 2, 2, 10, 10, 10, 10, 10, 10, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 10, 10, 10, 2, 2, 7, 7, 6, 6, 8, 6, 8, 8, 8, 8, 6, 6, 6, 8, 8, 8, 8, 6, 6, 6, 6, 6, 6, 6, 6, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 6, 7, 7, 7, 7, 7, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 13, 13, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 5, 5, 5, 5, 5, 3, 3, 3, 3, 3, 12, 12, 12, 12, 13, 13, 13, 13, 13, 2, 2, 2, 2, 2, 2, 34, 34, 34, 34, 34, 34, 34, 34, 34, 3, 3, 3, 33, 33, 2, 2, 2, 10, 10, 10, 10, 10, 10, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 10, 10, 10, 2, 2, 7, 7, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 8, 6, 6, 6, 6, 6, 6, 6, 6, 6, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 6, 7, 7, 7, 7, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 13, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 3, 3, 3, 3, 3, 12, 12, 12, 12, 13, 13, 13, 13, 13, 13, 2, 2, 2, 2, 2, 2, 2, 34, 34, 34, 34, 34, 34, 3, 3, 3, 33, 33, 2, 2, 2, 10, 10, 10, 10, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 10, 10, 10, 2, 2, 2, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 7, 7, 7, 7, 7, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 14, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 3, 3, 3, 3, 3, 12, 12, 12, 12, 12, 13, 13, 12, 12, 13, 2, 2, 2, 2, 2, 2, 2, 2, 2, 34, 34, 33, 3, 3, 3, 33, 33, 2, 2, 9, 10, 10, 10, 10, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 10, 10, 10, 2, 2, 2, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 7, 7, 7, 7, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 12, 12, 12, 12, 12, 12, 12, 14, 14, 14, 14, 14, 14, 14, 12, 12, 12, 12, 12, 14, 12, 12, 12, 12, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2, 2, 10, 10, 2, 2, 2, 2, 2, 2, 2, 33, 3, 3, 3, 33, 33, 2, 2, 9, 9, 10, 10, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 10, 10, 10, 2, 2, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 7, 3, 3, 3, 3, 3, 3, 3, 3, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 7, 7, 7, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 12, 12, 12, 12, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 12, 12, 12, 14, 14, 14, 13, 13, 13, 12, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 4, 2, 2, 3, 3, 3, 2, 2, 2, 2, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 10, 10, 10, 10, 2, 2, 6, 6, 6, 6, 2, 2, 2, 2, 6, 6, 6, 6, 6, 6, 6, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 7, 7, 7, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 12, 12, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 12, 12, 12, 12, 12, 12, 14, 14, 13, 13, 13, 12, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 10, 10, 10, 10, 2, 2, 6, 6, 2, 2, 2, 2, 2, 2, 2, 6, 2, 2, 2, 6, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 7, 7, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 13, 13, 14, 14, 14, 14, 14, 14, 14, 14, 13, 12, 12, 12, 12, 12, 12, 12, 12, 13, 13, 13, 13, 13, 13, 13, 13, 12, 12, 12, 12, 12, 12, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 10, 10, 9, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 6, 6, 6, 6, 6, 6, 6, 6, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 6, 6, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 13, 13, 14, 14, 14, 14, 14, 14, 14, 14, 14, 12, 12, 12, 12, 12, 13, 13, 13, 14, 13, 13, 13, 13, 13, 12, 12, 12, 12, 12, 12, 13, 13, 2, 2, 2, 10, 10, 9, 9, 9, 10, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 10, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 6, 6, 6, 6, 6, 6, 6, 6, 6, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 7, 7, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 13, 12, 14, 14, 14, 14, 14, 14, 14, 14, 12, 13, 13, 13, 13, 13, 13, 13, 13, 14, 14, 14, 14, 14, 12, 12, 12, 12, 12, 12, 13, 13, 2, 2, 2, 10, 10, 10, 10, 9, 9, 9, 9, 9, 9, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 6, 7, 6, 6, 6, 6, 6, 6, 6, 6, 6, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 6, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 12, 12, 12, 14, 12, 12, 12, 12, 12, 12, 13, 13, 13, 13, 13, 13, 12, 12, 14, 14, 14, 14, 13, 12, 12, 12, 12, 12, 12, 13, 2, 2, 2, 10, 10, 10, 10, 10, 10, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 3, 3, 3, 3, 3, 3, 3, 5, 5, 5, 5, 5, 9, 9, 9, 9, 9, 9, 10, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 5, 5, 5, 5, 5, 5, 5, 5, 5, 6, 7, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 12, 12, 12, 12, 12, 12, 12, 12, 13, 13, 13, 13, 13, 13, 13, 12, 12, 14, 14, 14, 13, 13, 13, 13, 12, 12, 12, 12, 13, 2, 2, 2, 9, 9, 10, 10, 10, 10, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 3, 3, 3, 3, 3, 5, 5, 5, 5, 5, 5, 5, 9, 9, 9, 9, 10, 3, 3, 3, 3, 3, 3, 3, 3, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 2, 2, 2, 2, 2, 7, 6, 6, 6, 6, 7, 7, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 5, 5, 5, 5, 5, 6, 7, 7, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 12, 12, 12, 12, 12, 12, 13, 13, 13, 13, 12, 12, 13, 13, 13, 14, 14, 14, 13, 13, 13, 13, 13, 12, 12, 13, 13, 2, 2, 10, 9, 9, 10, 10, 10, 10, 9, 9, 10, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 3, 5, 5, 5, 5, 5, 5, 5, 5, 5, 9, 9, 9, 3, 3, 3, 3, 3, 3, 3, 3, 9, 9, 9, 9, 9, 9, 9, 9, 2, 2, 2, 2, 2, 2, 2, 2, 7, 6, 6, 6, 6, 7, 7, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 7, 7, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 12, 12, 12, 12, 12, 12, 13, 13, 13, 13, 12, 12, 12, 14, 14, 14, 12, 12, 12, 13, 13, 13, 13, 13, 13, 13, 2, 2, 9, 9, 9, 9, 9, 9, 9, 10, 10, 10, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 10, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 9, 3, 3, 3, 3, 3, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 2, 2, 2, 2, 2, 2, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 7, 7, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 12, 12, 12, 12, 12, 13, 13, 13, 12, 12, 12, 12, 12, 14, 12, 12, 12, 12, 12, 13, 13, 13, 13, 13, 13, 2, 2, 9, 9, 9, 9, 9, 9, 9, 10, 10, 10, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 10, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 3, 3, 3, 3, 3, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 2, 2, 2, 2, 2, 7, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 7, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 12, 12, 12, 12, 13, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 13, 13, 13, 13, 13, 13, 13, 13, 2, 2, 2, 9, 9, 9, 9, 9, 9, 9, 10, 10, 10, 9, 9, 9, 9, 9, 9, 9, 9, 9, 10, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 3, 3, 3, 3, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 2, 2, 2, 2, 2, 2, 2, 7, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 12, 12, 12, 12, 12, 12, 13, 12, 12, 12, 12, 12, 12, 12, 13, 13, 13, 13, 13, 13, 13, 13, 13, 2, 2, 2, 9, 9, 9, 9, 9, 10, 10, 10, 10, 10, 10, 9, 9, 9, 9, 9, 9, 9, 9, 10, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 3, 3, 3, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 10, 10, 10, 10, 2, 2, 2, 2, 7, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 12, 12, 12, 12, 12, 13, 13, 12, 12, 12, 12, 12, 12, 13, 13, 13, 13, 13, 13, 13, 13, 12, 12, 2, 2, 9, 9, 9, 9, 9, 10, 9, 9, 9, 10, 10, 9, 9, 9, 9, 9, 9, 9, 9, 9, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 9, 9, 9, 9, 9, 9, 10, 9, 9, 9, 9, 9, 9, 9, 9, 9, 10, 10, 10, 10, 10, 10, 10, 2, 2, 7, 7, 7, 7, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 12, 12, 12, 12, 13, 13, 12, 12, 12, 12, 12, 12, 12, 13, 13, 13, 13, 13, 13, 12, 12, 12, 2, 2, 9, 9, 9, 9, 9, 9, 9, 9, 9, 10, 9, 10, 9, 9, 9, 9, 9, 9, 9, 9, 9, 5, 5, 5, 5, 5, 5, 5, 5, 5, 9, 9, 9, 9, 9, 10, 10, 10, 10, 9, 9, 9, 9, 9, 9, 9, 10, 10, 10, 10, 10, 10, 2, 2, 2, 2, 7, 6, 7, 7, 7, 7, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 7, 6, 6, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 12, 12, 12, 12, 13, 13, 12, 12, 12, 12, 12, 12, 12, 12, 12, 13, 13, 12, 12, 12, 12, 2, 2, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 10, 10, 10, 10, 10, 10, 9, 9, 9, 9, 9, 9, 5, 5, 5, 5, 5, 5, 5, 9, 9, 9, 9, 10, 10, 10, 10, 10, 10, 9, 9, 9, 9, 9, 9, 10, 10, 10, 10, 10, 10, 10, 2, 2, 2, 2, 7, 7, 7, 7, 7, 7, 7, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 7, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 12, 12, 12, 12, 13, 13, 13, 13, 13, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 2, 2, 9, 9, 9, 9, 9, 9, 9, 9, 9, 10, 10, 10, 10, 10, 10, 10, 9, 9, 9, 9, 9, 9, 9, 5, 5, 5, 5, 5, 9, 9, 9, 9, 10, 10, 10, 10, 10, 10, 10, 9, 9, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 2, 2, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 6, 6, 6, 6, 7, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 12, 12, 13, 13, 13, 13, 13, 13, 12, 12, 12, 12, 12, 12, 12, 12, 12, 2, 2, 2, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 10, 10, 10, 10, 10, 10, 9, 9, 11, 11, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 10, 10, 10, 10, 10, 10, 10, 9, 9, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 2, 2, 2, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 13, 13, 13, 13, 13, 13, 12, 12, 12, 12, 12, 12, 12, 12, 2, 2, 2, 2, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 10, 10, 10, 10, 10, 10, 11, 11, 11, 11, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 2, 2, 2, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 13, 13, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 2, 2, 2, 2, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 10, 10, 10, 10, 10, 10, 11, 11, 11, 11, 11, 11, 9, 9, 9, 9, 9, 9, 9, 9, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 2, 2, 2, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 12, 12, 12, 12, 12, 12, 12, 12, 2, 2, 2, 2, 2, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 10, 10, 10, 10, 10, 10, 11, 11, 11, 11, 11, 11, 9, 9, 9, 9, 9, 9, 9, 9, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 2, 2, 2, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 12, 12, 12, 12, 12, 2, 2, 2, 2, 2, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 10, 10, 10, 10, 10, 10, 11, 11, 11, 11, 11, 11, 9, 9, 9, 9, 9, 9, 9, 9, 9, 10, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 9, 9, 2, 2, 6, 6, 7, 7, 7, 7, 7, 7, 7, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 12, 12, 12, 2, 2, 2, 2, 9, 9, 9, 9, 9, 9, 9, 9, 10, 9, 9, 9, 9, 10, 10, 10, 10, 10, 9, 10, 10, 11, 11, 11, 11, 11, 11, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 2, 2, 6, 6, 6, 6, 7, 7, 7, 7, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 9, 9, 10, 10, 9, 9, 9, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 9, 9, 9, 10, 11, 11, 11, 11, 11, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 10, 10, 10, 10, 10, 10, 10, 9, 9, 10, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 2, 2, 2, 6, 6, 6, 6, 7, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 9, 9, 9, 10, 10, 10, 9, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 9, 9, 9, 9, 9, 11, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 10, 10, 10, 10, 10, 9, 9, 10, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 2, 2, 2, 6, 6, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 9, 9, 9, 9, 9, 10, 9, 9, 9, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 10, 10, 10, 9, 9, 9, 10, 10, 10, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 2, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 9, 9, 9, 9, 9, 9, 9, 9, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 10, 10, 10, 10, 9, 9, 9, 9, 9, 9, 9, 9, 9, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 9, 9, 9, 9, 9, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 9, 9, 10, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 10, 10, 10, 10, 9, 9, 9, 9, 10, 9, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 9, 9, 9, 9, 9, 10, 10, 10, 10, 10, 10, 9, 11, 11, 9, 9, 11, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 11, 11, 9, 9, 11, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 10, 10, 10, 10, 9, 9, 2, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 10, 10, 10, 10, 10, 10, 9, 9, 11, 11, 11, 11, 11, 11, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 11, 11, 11, 11, 11, 9, 9, 9, 9, 9, 9, 9, 10, 10, 10, 10, 10, 10, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 10, 10, 9, 9, 9, 9, 9, 11, 11, 11, 11, 9, 9, 9, 9, 9, 9, 9, 9, 10, 11, 11, 9, 9, 9, 11, 11, 11, 11, 9, 9, 9, 9, 9, 9, 9, 10, 10, 2, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 10, 10, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 9, 9, 9, 9, 9, 9, 9, 9, 10, 10, 10, 10, 10, 10, 10, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 9, 9, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] }, { id: 2, name: "props", type: "tilelayer", width: 192, height: 192, x: 0, y: 0, opacity: 1, visible: true, data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 103, 0, 117, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 117, 104, 104, 0, 0, 103, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 105, 104, 0, 0, 104, 0, 0, 0, 0, 0, 0, 104, 0, 117, 103, 0, 0, 103, 104, 0, 117, 104, 0, 0, 0, 0, 0, 104, 117, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 104, 0, 117, 104, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 104, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 104, 0, 0, 0, 0, 0, 104, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 103, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 117, 0, 0, 0, 0, 104, 0, 0, 0, 0, 0, 0, 0, 0, 103, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 111, 0, 0, 0, 0, 0, 104, 104, 0, 104, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 117, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 103, 104, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 103, 103, 0, 103, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 102, 0, 0, 0, 0, 0, 103, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 104, 0, 103, 0, 0, 0, 103, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 111, 0, 0, 0, 0, 0, 0, 0, 0, 0, 103, 103, 117, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 117, 0, 0, 0, 0, 0, 0, 0, 104, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 104, 0, 0, 0, 117, 103, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 102, 0, 0, 0, 0, 102, 0, 102, 0, 0, 0, 108, 0, 0, 0, 0, 0, 103, 0, 0, 0, 0, 0, 117, 0, 0, 0, 103, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 104, 117, 0, 117, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 108, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 104, 117, 0, 0, 0, 0, 0, 0, 0, 0, 104, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 104, 0, 0, 0, 103, 0, 0, 0, 0, 104, 0, 104, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 115, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 108, 102, 0, 0, 0, 0, 0, 0, 0, 0, 103, 0, 0, 0, 0, 0, 0, 104, 0, 0, 104, 0, 0, 117, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 103, 0, 0, 0, 0, 0, 117, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 0, 0, 0, 0, 0, 0, 0, 105, 0, 115, 115, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 102, 111, 108, 0, 0, 0, 0, 0, 0, 0, 0, 108, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 117, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 115, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 108, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 117, 0, 0, 0, 0, 0, 0, 0, 103, 0, 104, 0, 117, 103, 0, 0, 0, 0, 0, 103, 0, 0, 0, 0, 0, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 115, 115, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 111, 108, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 103, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 104, 0, 0, 103, 103, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 115, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 102, 108, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 108, 0, 0, 0, 0, 0, 103, 0, 0, 0, 0, 0, 104, 0, 0, 0, 0, 0, 103, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 104, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 103, 0, 0, 0, 0, 0, 0, 0, 0, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 111, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 104, 104, 104, 103, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 104, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 104, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 103, 0, 0, 0, 0, 103, 103, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 103, 103, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 0, 0, 117, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 108, 0, 0, 0, 103, 104, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 104, 104, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 115, 0, 115, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 108, 0, 0, 0, 0, 0, 0, 0, 0, 0, 108, 0, 0, 0, 0, 103, 0, 104, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 115, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 103, 104, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 117, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 117, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 115, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 115, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 108, 0, 0, 102, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 108, 0, 0, 0, 0, 0, 0, 0, 105, 103, 0, 0, 0, 0, 0, 0, 0, 104, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 108, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 115, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 117, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 111, 0, 0, 111, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 111, 0, 0, 0, 111, 0, 0, 0, 104, 104, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 115, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 108, 0, 0, 0, 0, 0, 108, 0, 0, 0, 102, 0, 0, 0, 0, 0, 0, 0, 0, 102, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 0, 0, 0, 0, 0, 0, 0, 105, 115, 0, 0, 0, 0, 0, 0, 0, 115, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 108, 111, 0, 0, 0, 0, 0, 0, 108, 0, 0, 0, 108, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 102, 0, 0, 0, 0, 104, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 117, 0, 0, 0, 0, 0, 0, 0, 105, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 111, 0, 0, 0, 0, 108, 0, 0, 108, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 104, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 115, 105, 0, 0, 0, 0, 0, 0, 115, 0, 0, 0, 0, 0, 0, 0, 0, 0, 115, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 108, 0, 111, 0, 111, 0, 0, 0, 108, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 0, 0, 0, 115, 115, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 108, 0, 0, 0, 0, 0, 0, 108, 0, 0, 0, 0, 0, 0, 0, 108, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 104, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 0, 0, 115, 0, 115, 0, 115, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 115, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 102, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 111, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 108, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 117, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 104, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 115, 0, 0, 0, 0, 115, 0, 0, 115, 0, 0, 115, 0, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 108, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 111, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 104, 103, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 103, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 115, 0, 0, 0, 117, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 104, 0, 103, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 115, 0, 105, 0, 105, 0, 0, 0, 0, 115, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 103, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 115, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 111, 0, 0, 0, 0, 0, 0, 0, 0, 108, 111, 108, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 103, 111, 0, 0, 0, 0, 103, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 103, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 117, 115, 0, 0, 0, 115, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 103, 113, 103, 0, 0, 0, 104, 0, 0, 0, 0, 0, 0, 0, 0, 0, 104, 0, 0, 0, 103, 0, 0, 0, 104, 0, 0, 0, 117, 0, 0, 0, 0, 0, 0, 115, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 115, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 111, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 103, 0, 0, 0, 0, 0, 0, 105, 103, 104, 0, 0, 0, 0, 103, 104, 0, 0, 0, 0, 104, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 117, 0, 0, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 115, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 115, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 108, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 113, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 111, 0, 0, 105, 117, 105, 103, 0, 0, 0, 0, 0, 103, 0, 103, 0, 0, 0, 0, 0, 0, 0, 0, 0, 103, 104, 0, 0, 0, 0, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 108, 108, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 108, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 103, 0, 0, 113, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 103, 0, 0, 105, 105, 105, 0, 0, 0, 0, 0, 0, 0, 103, 117, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 0, 0, 0, 0, 115, 0, 0, 0, 0, 0, 0, 0, 0, 115, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 111, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 103, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 115, 115, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 108, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 102, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 113, 0, 0, 0, 0, 0, 0, 0, 103, 105, 113, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 115, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 115, 115, 0, 0, 0, 0, 0, 0, 0, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 103, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 111, 105, 113, 105, 105, 105, 103, 105, 113, 113, 0, 0, 0, 0, 0, 104, 0, 103, 0, 0, 0, 0, 0, 0, 105, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 108, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 111, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 103, 0, 111, 105, 103, 0, 0, 0, 103, 0, 0, 0, 0, 0, 104, 0, 0, 0, 0, 0, 0, 0, 105, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 117, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 115, 0, 0, 0, 0, 0, 0, 0, 0, 115, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 108, 0, 0, 0, 0, 0, 0, 0, 102, 111, 102, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 113, 111, 0, 111, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 103, 103, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 105, 0, 0, 0, 0, 0, 105, 0, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 115, 0, 0, 0, 105, 0, 0, 115, 0, 0, 0, 115, 115, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 108, 0, 0, 0, 0, 0, 0, 0, 111, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 113, 0, 111, 113, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 105, 0, 0, 0, 0, 115, 0, 0, 0, 0, 0, 0, 115, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 115, 0, 0, 0, 105, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 111, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 111, 0, 0, 0, 0, 0, 0, 0, 0, 0, 111, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 105, 105, 105, 0, 0, 117, 0, 115, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 117, 0, 0, 115, 0, 0, 105, 0, 0, 0, 105, 0, 117, 117, 105, 105, 0, 105, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 108, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 111, 103, 0, 0, 0, 0, 0, 0, 0, 0, 0, 113, 0, 0, 0, 0, 111, 0, 0, 0, 0, 0, 0, 105, 105, 105, 105, 0, 117, 0, 115, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 115, 0, 0, 117, 0, 0, 105, 105, 115, 105, 0, 105, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 102, 0, 0, 0, 0, 0, 0, 0, 0, 108, 0, 0, 0, 0, 111, 105, 102, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 115, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 0, 0, 0, 115, 0, 0, 0, 117, 105, 105, 105, 105, 105, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 111, 0, 108, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 105, 108, 111, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 103, 111, 0, 0, 0, 0, 0, 103, 0, 0, 113, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 115, 0, 105, 0, 0, 115, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 117, 0, 0, 0, 0, 0, 0, 115, 0, 0, 115, 0, 115, 105, 105, 105, 115, 105, 105, 105, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 108, 111, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 108, 0, 102, 108, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 112, 0, 0, 0, 0, 0, 115, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 117, 105, 105, 105, 105, 117, 105, 105, 105, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 108, 0, 0, 0, 111, 0, 0, 0, 0, 108, 0, 0, 0, 0, 0, 108, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 108, 0, 0, 0, 0, 108, 0, 0, 108, 111, 0, 102, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 111, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 109, 0, 112, 0, 0, 0, 0, 0, 0, 117, 0, 0, 0, 0, 0, 105, 117, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 117, 105, 115, 105, 105, 105, 105, 105, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 111, 0, 0, 0, 0, 111, 0, 0, 0, 0, 0, 0, 0, 0, 0, 102, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 108, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 103, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 112, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 115, 0, 0, 0, 0, 0, 0, 0, 0, 0, 115, 0, 0, 117, 115, 105, 115, 105, 105, 105, 115, 105, 115, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 108, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 108, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 111, 103, 103, 111, 0, 113, 103, 0, 0, 0, 0, 0, 0, 0, 0, 112, 0, 0, 0, 0, 0, 0, 0, 115, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 115, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 111, 105, 105, 105, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 108, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 108, 0, 0, 0, 0, 0, 0, 103, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 111, 113, 0, 0, 0, 111, 105, 0, 0, 0, 0, 0, 0, 112, 0, 113, 113, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 115, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 115, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 105, 105, 105, 111, 105, 105, 0, 0, 0, 0, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 108, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 108, 0, 0, 0, 0, 103, 111, 0, 0, 0, 0, 103, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 103, 111, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 109, 112, 0, 0, 0, 0, 0, 0, 115, 115, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 0, 0, 117, 0, 0, 0, 0, 0, 105, 105, 105, 0, 105, 0, 106, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 108, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 108, 108, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 113, 105, 0, 0, 0, 0, 112, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 105, 0, 0, 0, 115, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 0, 115, 0, 0, 0, 115, 117, 105, 0, 0, 0, 0, 0, 0, 105, 105, 111, 106, 0, 0, 0, 0, 106, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 111, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 111, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 103, 103, 103, 0, 0, 0, 0, 112, 0, 0, 0, 0, 0, 0, 112, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 115, 0, 0, 0, 0, 0, 0, 0, 117, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 115, 115, 0, 0, 0, 0, 0, 0, 0, 105, 106, 0, 0, 0, 0, 0, 106, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 110, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 111, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 103, 113, 0, 0, 0, 0, 0, 0, 0, 109, 112, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 115, 0, 0, 0, 0, 0, 105, 105, 111, 0, 0, 0, 0, 0, 105, 0, 0, 111, 106, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 112, 112, 0, 0, 0, 112, 112, 112, 0, 0, 0, 0, 0, 0, 113, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 0, 0, 0, 0, 0, 0, 0, 0, 105, 105, 106, 0, 0, 105, 0, 0, 0, 0, 0, 105, 0, 0, 0, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 111, 0, 0, 0, 111, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 111, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 113, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 112, 109, 112, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 115, 0, 0, 105, 105, 105, 105, 105, 0, 105, 0, 105, 0, 0, 0, 0, 0, 0, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 103, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 113, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 103, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 112, 113, 0, 112, 0, 0, 0, 112, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 112, 109, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 105, 105, 105, 0, 0, 0, 106, 0, 0, 0, 0, 0, 0, 106, 0, 111, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 108, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 103, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 112, 112, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 115, 0, 0, 0, 0, 105, 105, 105, 105, 106, 0, 0, 0, 105, 0, 0, 0, 106, 0, 0, 111, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 108, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 111, 0, 111, 0, 0, 0, 0, 0, 0, 0, 0, 103, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 113, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 109, 0, 0, 0, 109, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 105, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 111, 106, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 105, 0, 0, 0, 0, 0, 110, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 111, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 111, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 109, 0, 0, 0, 0, 113, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 117, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 115, 115, 0, 0, 0, 106, 105, 0, 105, 106, 0, 0, 0, 0, 111, 0, 0, 0, 0, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 108, 108, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 111, 0, 0, 0, 113, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 113, 0, 0, 0, 0, 0, 112, 0, 113, 0, 0, 0, 0, 0, 0, 0, 0, 0, 115, 115, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 117, 0, 0, 0, 0, 0, 0, 0, 0, 105, 0, 0, 105, 0, 0, 0, 106, 0, 0, 0, 0, 0, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 110, 0, 0, 0, 0, 0, 110, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 108, 0, 0, 0, 0, 108, 105, 105, 0, 0, 0, 0, 113, 0, 0, 111, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 111, 0, 113, 0, 113, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 112, 0, 0, 0, 0, 0, 0, 0, 0, 0, 115, 105, 105, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 106, 0, 0, 0, 0, 105, 105, 0, 0, 0, 105, 0, 105, 106, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 110, 0, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 111, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 108, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 113, 113, 0, 0, 0, 0, 113, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 103, 111, 0, 0, 0, 0, 103, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 111, 0, 0, 0, 0, 0, 105, 0, 0, 0, 0, 0, 105, 0, 0, 0, 0, 0, 0, 105, 0, 106, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 110, 0, 0, 0, 111, 0, 0, 0, 0, 0, 0, 0, 0, 0, 110, 110, 0, 0, 0, 0, 110, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 103, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 113, 0, 0, 0, 103, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 106, 0, 105, 0, 0, 0, 0, 0, 0, 0, 0, 106, 0, 0, 0, 0, 0, 0, 105, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 110, 105, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 110, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 103, 0, 0, 0, 103, 113, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 103, 0, 0, 0, 0, 114, 0, 0, 0, 0, 0, 0, 0, 0, 0, 114, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 106, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 110, 0, 110, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 111, 0, 0, 0, 0, 110, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 111, 0, 103, 105, 103, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 103, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 112, 0, 112, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 105, 0, 0, 0, 106, 0, 0, 0, 0, 0, 0, 0, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 110, 0, 0, 0, 0, 110, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 110, 0, 0, 0, 105, 0, 0, 0, 0, 0, 0, 111, 105, 103, 0, 0, 113, 0, 103, 0, 0, 0, 111, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 109, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 111, 0, 0, 0, 0, 0, 0, 0, 0, 105, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 0, 0, 0, 110, 0, 0, 110, 111, 0, 0, 110, 0, 0, 0, 0, 0, 110, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 0, 0, 111, 0, 0, 0, 113, 0, 113, 0, 103, 103, 103, 0, 0, 0, 103, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 114, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 114, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 0, 0, 0, 105, 110, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 110, 0, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 103, 0, 0, 0, 113, 0, 103, 103, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 114, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 103, 114, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 113, 0, 0, 0, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 106, 0, 0, 0, 0, 0, 0, 0, 0, 0, 106, 0, 0, 0, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 110, 0, 0, 111, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 111, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 110, 0, 0, 0, 113, 111, 0, 0, 0, 111, 103, 0, 0, 0, 0, 103, 0, 111, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 114, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 112, 109, 0, 0, 106, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 110, 110, 0, 0, 0, 0, 0, 0, 0, 0, 0, 110, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 110, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 105, 0, 0, 0, 0, 105, 103, 0, 0, 0, 0, 0, 0, 0, 113, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 111, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 111, 0, 106, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 0, 0, 0, 0, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 110, 0, 0, 105, 0, 0, 0, 105, 0, 0, 0, 110, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 110, 0, 0, 105, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 103, 0, 111, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 103, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 106, 0, 0, 0, 0, 0, 0, 0, 0, 0, 103, 103, 114, 0, 0, 0, 0, 0, 0, 105, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 112, 0, 0, 0, 111, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 111, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 110, 0, 0, 0, 0, 0, 111, 110, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 110, 0, 0, 0, 105, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 103, 0, 0, 0, 103, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 103, 0, 0, 0, 103, 0, 0, 0, 0, 114, 0, 0, 0, 0, 0, 114, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 113, 0, 0, 109, 0, 0, 0, 0, 0, 0, 0, 0, 109, 105, 0, 0, 0, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 106, 105, 0, 0, 111, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 111, 0, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 103, 105, 0, 0, 0, 0, 0, 0, 0, 0, 103, 0, 0, 0, 103, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 114, 103, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 109, 0, 0, 0, 105, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 106, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 110, 105, 0, 0, 0, 0, 110, 0, 0, 110, 0, 0, 0, 0, 0, 0, 0, 0, 0, 110, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 110, 0, 0, 0, 0, 105, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 113, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 114, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 114, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 106, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 105, 0, 0, 0, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 110, 0, 105, 110, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 111, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 105, 114, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 103, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 114, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 113, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 0, 0, 0, 0, 110, 0, 0, 111, 105, 0, 0, 0, 0, 0, 103, 0, 0, 0, 0, 0, 0, 103, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 106, 105, 105, 114, 0, 114, 103, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 114, 103, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 112, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 110, 0, 0, 0, 110, 105, 0, 0, 105, 103, 105, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 114, 105, 114, 0, 0, 0, 0, 114, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 103, 0, 0, 0, 0, 0, 0, 0, 0, 103, 0, 0, 0, 112, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 111, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 111, 0, 110, 105, 110, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 110, 0, 0, 110, 0, 111, 111, 0, 0, 0, 111, 111, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 114, 0, 114, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 114, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 106, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 110, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 110, 110, 105, 0, 0, 0, 113, 105, 103, 105, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 114, 0, 103, 0, 0, 114, 0, 0, 0, 103, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 106, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 111, 0, 0, 0, 111, 110, 105, 110, 0, 0, 0, 0, 0, 105, 105, 105, 111, 0, 0, 113, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 109, 0, 0, 0, 0, 0, 105, 105, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 106, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 111, 105, 0, 0, 0, 0, 0, 110, 110, 0, 0, 110, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 111, 0, 0, 110, 110, 0, 111, 105, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 114, 0, 106, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 112, 0, 0, 0, 0, 113, 0, 0, 0, 0, 106, 0, 0, 106, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 111, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 110, 110, 105, 0, 0, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 103, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 103, 0, 0, 0, 0, 0, 114, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 106, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 106, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 110, 110, 111, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 111, 0, 0, 116, 105, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 114, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 110, 110, 0, 110, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 0, 110, 0, 0, 110, 0, 0, 0, 110, 0, 0, 0, 105, 105, 105, 105, 116, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 114, 0, 0, 0, 0, 0, 0, 0, 0, 114, 105, 114, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 111, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 0, 0, 0, 0, 0, 0, 110, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 110, 0, 0, 0, 0, 110, 0, 0, 0, 0, 0, 0, 105, 105, 105, 116, 116, 117, 0, 0, 0, 0, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 114, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 110, 0, 0, 0, 110, 110, 0, 0, 0, 116, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 103, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 0, 0, 0, 0, 0, 0, 110, 110, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 110, 0, 0, 0, 0, 0, 0, 117, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 114, 114, 114, 0, 114, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 106, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 110, 0, 0, 0, 0, 0, 0, 0, 110, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 110, 0, 0, 0, 116, 117, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 114, 114, 0, 114, 0, 0, 0, 0, 0, 0, 0, 0, 114, 114, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 110, 0, 110, 0, 0, 0, 116, 116, 0, 105, 116, 0, 0, 0, 0, 0, 116, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 103, 0, 0, 0, 0, 0, 0, 0, 0, 0, 114, 106, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 112, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 110, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 110, 0, 0, 0, 117, 116, 117, 0, 0, 0, 0, 0, 116, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 114, 114, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 103, 103, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 105, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 110, 110, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 114, 103, 103, 106, 0, 0, 0, 0, 0, 0, 0, 114, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 106, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 110, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 110, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 114, 0, 0, 0, 0, 0, 0, 0, 114, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 103, 0, 0, 0, 0, 0, 0, 0, 114, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 106, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 0, 0, 0, 0, 0, 111, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 110, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 114, 114, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 103, 0, 0, 0, 114, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 111, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 106, 0, 0, 0, 0, 0, 105, 0, 0, 0, 0, 0, 0, 105, 0, 0, 0, 0, 105, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 110, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 110, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 116, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 114, 0, 0, 103, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 106, 105, 0, 0, 0, 0, 106, 105, 106, 0, 0, 111, 0, 105, 106, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 110, 110, 0, 110, 0, 0, 110, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 116, 0, 0, 116, 116, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 114, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 112, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 112, 0, 0, 0, 0, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 0, 0, 0, 0, 0, 105, 105, 105, 0, 0, 0, 105, 0, 0, 0, 0, 0, 0, 0, 106, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 110, 110, 110, 110, 105, 105, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 114, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 114, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 106, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 111, 0, 105, 0, 0, 0, 0, 105, 105, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 110, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 111, 111, 105, 0, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 116, 117, 0, 116, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 103, 0, 0, 0, 114, 0, 114, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 106, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 110, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 116, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 114, 0, 0, 0, 0, 0, 0, 106, 114, 0, 114, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 112, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 0, 0, 111, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 117, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 114, 114, 103, 0, 114, 0, 0, 0, 0, 114, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 113, 0, 109, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 113, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 0, 0, 0, 0, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 0, 0, 0, 0, 110, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 116, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 114, 105, 114, 105, 114, 106, 0, 114, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 111, 106, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 0, 111, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 114, 103, 105, 105, 105, 114, 105, 106, 114, 105, 103, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 113, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 112, 0, 112, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 111, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 110, 110, 0, 110, 0, 0, 0, 110, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 116, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 114, 105, 105, 105, 105, 105, 114, 106, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 106, 0, 0, 0, 0, 105, 0, 0, 0, 0, 0, 0, 0, 0, 106, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 0, 0, 0, 105, 110, 0, 111, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 114, 106, 114, 105, 106, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 106, 106, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 110, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 116, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 113, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 109, 0, 0, 0, 0, 109, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 111, 0, 111, 0, 0, 0, 105, 0, 0, 0, 0, 0, 105, 0, 0, 0, 0, 0, 0, 106, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 110, 0, 0, 0, 0, 0, 110, 110, 110, 0, 0, 0, 0, 110, 0, 0, 0, 0, 110, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 116, 0, 0, 116, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 116, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 105, 105, 113, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 106, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 111, 0, 0, 0, 0, 0, 110, 0, 0, 0, 0, 105, 105, 111, 0, 0, 0, 0, 111, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 116, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 116, 0, 0, 0, 0, 0, 0, 117, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 113, 0, 0, 0, 0, 0, 0, 113, 0, 0, 0, 0, 0, 112, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 112, 0, 113, 105, 112, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 0, 0, 0, 0, 0, 0, 0, 111, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 110, 110, 0, 0, 0, 0, 0, 111, 0, 0, 110, 0, 0, 0, 110, 0, 0, 0, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 101, 0, 102, 0, 0, 0, 101, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 112, 0, 112, 0, 0, 0, 112, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 0, 0, 0, 0, 0, 105, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 111, 0, 110, 0, 0, 0, 0, 0, 0, 0, 0, 110, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 0, 102, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 112, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 117, 0, 0, 0, 0, 0, 105, 106, 0, 0, 0, 0, 0, 0, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 0, 0, 0, 0, 0, 0, 0, 0, 110, 110, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 102, 0, 0, 0, 0, 0, 0, 0, 102, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 112, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 106, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 101, 117, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 106, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 105, 105, 0, 0, 0, 0, 110, 105, 110, 0, 0, 110, 0, 111, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 113, 0, 0, 0, 0, 0, 0, 0, 0, 0, 109, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 105, 105, 0, 0, 0, 0, 0, 0, 110, 110, 110, 110, 0, 0, 0, 0, 0, 0, 105, 0, 0, 0, 0, 102, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 101, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 113, 0, 0, 0, 113, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 101, 101, 105, 117, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 101, 105, 101, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 105, 105, 105, 0, 0, 0, 0, 0, 0, 110, 110, 110, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 101, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 109, 113, 0, 0, 0, 0, 0, 0, 113, 0, 0, 109, 0, 113, 105, 105, 0, 0, 0, 0, 0, 0, 0, 0, 117, 0, 0, 117, 0, 101, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 101, 117, 105, 106, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 105, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 102, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 101, 101, 0, 0, 102, 102, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 109, 0, 113, 0, 0, 0, 0, 112, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 101, 0, 0, 117, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 101, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 106, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 101, 105, 101, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 102, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 102, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 116, 0, 0, 0, 0, 0, 0, 0, 0, 113, 0, 0, 113, 0, 0, 112, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 106, 0, 0, 0, 0, 0, 101, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 117, 0, 0, 101, 105, 101, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 101, 102, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 102, 102, 102, 105, 0, 0, 0, 116, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 113, 0, 113, 0, 0, 112, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 101, 0, 0, 0, 106, 106, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 102, 0, 0, 0, 101, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 102, 101, 105, 0, 0, 0, 0, 116, 117, 0, 0, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 116, 0, 0, 0, 112, 0, 0, 0, 0, 0, 0, 113, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 117, 0, 0, 0, 101, 106, 106, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 101, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 116, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 116, 0, 0, 0, 0, 0, 0, 0, 0, 0, 112, 0, 0, 112, 0, 0, 0, 0, 101, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 101, 0, 0, 0, 0, 101, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 101, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 101, 0, 0, 0, 0, 105, 105, 0, 0, 116, 116, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 116, 0, 0, 117, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 112, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 101, 106, 0, 0, 101, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 102, 0, 0, 0, 0, 0, 0, 0, 101, 0, 0, 0, 0, 102, 102, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 116, 0, 0, 116, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 116, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 117, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 101, 101, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 101, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 102, 0, 0, 0, 0, 0, 0, 101, 0, 101, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 117, 105, 0, 0, 0, 113, 112, 0, 0, 0, 0, 0, 0, 0, 101, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 101, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 102, 0, 0, 0, 0, 0, 0, 102, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 116, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 116, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 106, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 117, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 102, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 116, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 101, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 101, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 102, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 116, 0, 0, 0, 116, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 106, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 101, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 102, 0, 0, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 117, 0, 0, 0, 0, 0, 0, 0, 0, 0, 116, 0, 116, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 117, 0, 116, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 101, 101, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 106, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 102, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 116, 0, 0, 0, 0, 116, 116, 116, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 116, 0, 116, 0, 0, 0, 0, 0, 101, 101, 101, 0, 0, 0, 101, 0, 0, 0, 0, 0, 0, 0, 0, 101, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 102, 102, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 117, 0, 0, 0, 0, 0, 0, 116, 116, 116, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 101, 0, 0, 101, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 101, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 117, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 116, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 106, 0, 0, 101, 0, 0, 0, 0, 101, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 102, 0, 0, 0, 0, 0, 0, 0, 117, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 102, 102, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 101, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 106, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 102, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 101, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 101, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 102, 101, 101, 0, 0, 102, 0, 0, 0, 0, 102, 102, 0, 0, 0, 0, 0, 0, 0, 0, 102, 105, 102, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 101, 101, 101, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 102, 0, 0, 0, 0, 0, 102, 105, 0, 0, 0, 0, 102, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 102, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 102, 101, 0, 0, 0, 0, 0, 0, 101, 105, 102, 105, 101, 0, 101, 0, 101, 102, 0, 0, 0, 0, 0, 0, 0, 117, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 117, 0, 0, 0, 101, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 101, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 105, 0, 0, 0, 0, 0, 101, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 102, 0, 101, 0, 0, 102, 0, 0, 101, 0, 0, 105, 0, 102, 0, 102, 102, 0, 0, 0, 0, 101, 0, 0, 0, 0, 106, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 101, 0, 0, 0, 101, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 117, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 101, 0, 0, 0, 0, 0, 0, 105, 0, 0, 0, 102, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 116, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 101, 105, 102, 0, 0, 102, 102, 0, 0, 0, 0, 0, 106, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 101, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 101, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 101, 0, 0, 0, 0, 0, 0, 116, 105, 105, 105, 117, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 102, 0, 102, 0, 0, 0, 0, 0, 0, 101, 101, 102, 102, 0, 102, 105, 0, 0, 101, 0, 102, 102, 105, 0, 0, 106, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 101, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 101, 0, 0, 0, 0, 0, 0, 105, 116, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 102, 105, 102, 0, 102, 101, 0, 0, 0, 0, 0, 0, 0, 0, 102, 102, 0, 0, 0, 0, 0, 102, 0, 0, 0, 0, 0, 101, 0, 0, 0, 0, 0, 0, 0, 0, 0, 101, 0, 0, 0, 0, 0, 0, 106, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 102, 102, 102, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 116, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 101, 0, 0, 102, 0, 0, 102, 101, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 101, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 101, 102, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 101, 0, 0, 101, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 102, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 101, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 102, 102, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 106, 117, 0, 117, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 102, 0, 0, 0, 105, 0, 0, 0, 0, 0, 0, 102, 0, 102, 0, 102, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 102, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 101, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 101, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 102, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 102, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 102, 102, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 102, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 105, 102, 0, 0, 0, 101, 102, 0, 0, 0, 0, 0, 101, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 101, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 101, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 102, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 102, 0, 0, 0, 0, 0, 0, 101, 0, 0, 0, 0, 101, 102, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 101, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 0, 102, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 102, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 106, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 101, 0, 0, 0, 0, 0, 0, 0, 0, 102, 0, 0, 0, 102, 0, 0, 0, 0, 102, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 101, 0, 0, 0, 0, 0, 0, 0, 0, 117, 0, 117, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 101, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 102, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 102, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 102, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 101, 0, 0, 0, 101, 0, 0, 0, 0, 0, 0, 0, 0, 101, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 0, 0, 0, 0, 0, 102, 0, 0, 0, 0, 0, 0, 0, 0, 0, 101, 0, 0, 0, 0, 0, 0, 0, 102, 101, 0, 102, 101, 101, 102, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 102, 105, 0, 0, 0, 0, 0, 0, 0, 106, 0, 0, 0, 0, 101, 0, 0, 0, 0, 101, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 102, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 106, 0, 0, 0, 101, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 101, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 102, 0, 0, 0, 102, 0, 0, 0, 0, 102, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 101, 0, 0, 106, 0, 0, 0, 106, 0, 0, 0, 0, 0, 0, 0, 101, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 101, 0, 0, 0, 0, 0, 0, 0, 0, 105, 0, 0, 0, 0, 0, 0, 0, 101, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 101, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 102, 0, 0, 0, 0, 0, 0, 0, 117, 106, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 102, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 117, 0, 0, 0, 0, 0, 0, 0, 0, 101, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 101, 0, 0, 0, 0, 102, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 102, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 102, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 106, 0, 0, 101, 101, 0, 0, 0, 0, 0, 106, 0, 101, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 101, 102, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 102, 0, 101, 0, 102, 101, 0, 102, 102, 0, 102, 0, 0, 0, 106, 101, 0, 0, 0, 0, 0, 117, 0, 0, 0, 101, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 101, 0, 0, 102, 0, 0, 0, 0, 0, 0, 0, 101, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 101, 106, 0, 0, 101, 0, 106, 0, 0, 117, 101, 106, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 102, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 102, 0, 0, 0, 0, 0, 0, 0, 0, 0, 101, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 101, 0, 0, 0, 0, 101, 0, 0, 102, 0, 0, 0, 0, 0, 0, 0, 102, 0, 0, 0, 0, 117, 0, 101, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 101, 102, 0, 0, 0, 0, 0, 0, 0, 102, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 102, 0, 0, 0, 0, 0, 0, 0, 0, 0, 102, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 102, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 101, 0, 106, 0, 106, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 102, 101, 101, 0, 102, 0, 0, 0, 0, 101, 102, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 0, 0, 0, 0, 0, 0, 0, 0, 0, 102, 0, 0, 0, 0, 0, 0, 0, 0, 0, 102, 0, 0, 0, 0, 0, 101, 0, 117, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 102, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 102, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 102, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 102, 0, 0, 0, 0, 102, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 102, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 101, 0, 0, 102, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 105, 101, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 102, 102, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 102, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 102, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 102, 0, 102, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 101, 102, 0, 105, 101, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 102, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 101, 0, 0, 0, 101, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 102, 101, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 102, 0, 0, 0, 0, 0, 0, 0, 0, 101, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 101, 0, 102, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 101, 0, 102, 0, 101, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 102, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 102, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 102, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 101, 0, 0, 105, 101, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 102, 0, 0, 0, 0, 0, 0, 0, 0, 0, 102, 105, 102, 0, 0, 102, 0, 102, 105, 0, 101, 0, 0, 0, 0, 101, 0, 102, 0, 0, 0, 102, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 102, 0, 102, 0, 0, 0, 0, 101, 0, 0, 0, 0, 0, 0, 0, 0, 102, 0, 0, 0, 105, 105, 102, 101, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }, { id: 3, name: "zones", type: "tilelayer", width: 192, height: 192, x: 0, y: 0, opacity: 1, visible: false, data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 205, 205, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 205, 205, 205, 205, 205, 205, 205, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 206, 206, 205, 205, 205, 205, 205, 205, 205, 205, 205, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 206, 206, 206, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 205, 205, 205, 206, 206, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 207, 207, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 207, 207, 207, 207, 207, 207, 207, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 207, 206, 206, 206, 206, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 207, 207, 207, 206, 206, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 211, 206, 206, 211, 211, 211, 211, 211, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 206, 206, 206, 206, 206, 206, 206, 206, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 206, 206, 206, 206, 206, 206, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 211, 211, 211, 206, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 206, 206, 206, 206, 206, 211, 211, 211, 211, 211, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 206, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 206, 206, 206, 206, 206, 206, 206, 206, 206, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 206, 206, 206, 206, 206, 206, 206, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 206, 206, 206, 206, 206, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 206, 206, 206, 206, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 209, 209, 209, 209, 209, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 209, 209, 209, 209, 209, 209, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 209, 209, 209, 209, 209, 209, 209, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 208, 208, 208, 208, 208, 208, 208, 208, 208, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 205, 205, 204, 204, 204, 204, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 205, 205, 204, 204, 204, 204, 204, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 205, 204, 204, 204, 204, 204, 204, 204, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 204, 204, 204, 204, 204, 204, 204, 204, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 204, 204, 204, 204, 204, 204, 204, 204, 204, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 209, 209, 211, 211, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 205, 205, 204, 205, 205, 205, 205, 205, 205, 205, 205, 205, 204, 204, 204, 204, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 205, 205, 205, 205, 205, 205, 204, 204, 204, 204, 204, 204, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 212, 212, 212, 212, 212, 212, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 205, 205, 205, 205, 205, 205, 205, 205, 205, 205, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 207, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 205, 205, 205, 205, 205, 205, 205, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 207, 207, 207, 207, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 205, 205, 205, 205, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 207, 207, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 211, 210, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 210, 210, 210, 210, 210, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 210, 210, 210, 210, 210, 210, 210, 210, 210, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 211, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 211, 211, 211, 211, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 211, 211, 211, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 211, 211, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 212, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 203, 203, 203, 203, 203, 204, 204, 204, 204, 204, 204, 204, 204, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 212, 212, 212, 212, 212, 212, 212, 210, 210, 210, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 203, 203, 203, 203, 203, 203, 204, 204, 204, 204, 204, 204, 203, 203, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 208, 208, 208, 208, 201, 201, 201, 201, 201, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 208, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 203, 203, 203, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 203, 203, 203, 203, 203, 203, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 208, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 203, 203, 203, 203, 203, 203, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 208, 208, 208, 208, 208, 208, 208, 208, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 203, 203, 203, 203, 203, 203, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 204, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 208, 208, 208, 208, 208, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 203, 203, 203, 203, 203, 203, 204, 204, 203, 204, 204, 204, 204, 204, 204, 204, 204, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 208, 208, 208, 208, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 203, 203, 203, 203, 203, 203, 204, 203, 203, 203, 204, 204, 204, 204, 204, 204, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 208, 208, 208, 208, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 208, 208, 208, 208, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 208, 208, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 209, 209, 209, 209, 209, 209, 209, 209, 209, 209, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 209, 209, 209, 209, 210, 210, 209, 209, 209, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 209, 209, 209, 209, 210, 210, 210, 210, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 209, 209, 210, 210, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 202, 202, 202, 202, 210, 210, 210, 210, 210, 202, 210, 202, 202, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 202, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 210, 210, 210, 210, 202, 202, 202, 202, 202, 202, 202, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 202, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 202, 202, 202, 202, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 202, 202, 202, 202, 202, 202, 202, 210, 210, 210, 210, 210, 210, 210, 210, 210, 210, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 202, 202, 202, 202, 202, 202, 202, 202, 202, 210, 210, 210, 210, 210, 210, 210, 210, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 210, 210, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 201, 201, 201, 201, 201, 201, 202, 202, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 201, 201, 201, 201, 202, 202, 202, 202, 202, 201, 201, 201, 202, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 203, 203, 203, 203, 203, 203, 203, 203, 203, 203, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 203, 203, 203, 203, 203, 203, 203, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 203, 203, 203, 203, 203, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 201, 201, 201, 201, 201, 201, 201, 201, 201, 201, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 203, 203, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 201, 201, 201, 201, 201, 201, 201, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 203, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 201, 201, 201, 201, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 201, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 202, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 202, 202, 202, 202, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }, { id: 4, name: "spawns", type: "objectgroup", draworder: "topdown", opacity: 1, visible: true, x: 0, y: 0, objects: [{ id: 1, name: "elite-0-0", type: "elite", x: 3728, y: 4816, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 0 }, { name: "level", type: "int", value: 65 }, { name: "species", type: "int", value: 1 }, { name: "count", type: "int", value: 1 }] }, { id: 2, name: "camp-0-1", type: "camp", x: 3856, y: 4528, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 0 }, { name: "level", type: "int", value: 65 }, { name: "species", type: "int", value: 1 }, { name: "count", type: "int", value: 3 }] }, { id: 3, name: "camp-0-2", type: "camp", x: 4112, y: 5360, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 0 }, { name: "level", type: "int", value: 65 }, { name: "species", type: "int", value: 1 }, { name: "count", type: "int", value: 2 }] }, { id: 4, name: "camp-0-3", type: "camp", x: 4016, y: 4304, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 0 }, { name: "level", type: "int", value: 65 }, { name: "species", type: "int", value: 1 }, { name: "count", type: "int", value: 2 }] }, { id: 5, name: "camp-0-4", type: "camp", x: 4976, y: 3920, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 0 }, { name: "level", type: "int", value: 64 }, { name: "species", type: "int", value: 1 }, { name: "count", type: "int", value: 3 }] }, { id: 6, name: "camp-0-5", type: "camp", x: 5136, y: 4112, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 0 }, { name: "level", type: "int", value: 64 }, { name: "species", type: "int", value: 1 }, { name: "count", type: "int", value: 1 }] }, { id: 7, name: "camp-0-6", type: "camp", x: 4016, y: 4720, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 0 }, { name: "level", type: "int", value: 64 }, { name: "species", type: "int", value: 1 }, { name: "count", type: "int", value: 1 }] }, { id: 8, name: "camp-0-7", type: "camp", x: 4752, y: 4016, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 0 }, { name: "level", type: "int", value: 64 }, { name: "species", type: "int", value: 1 }, { name: "count", type: "int", value: 1 }] }, { id: 9, name: "camp-0-8", type: "camp", x: 4304, y: 4176, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 0 }, { name: "level", type: "int", value: 63 }, { name: "species", type: "int", value: 0 }, { name: "count", type: "int", value: 2 }] }, { id: 10, name: "camp-0-9", type: "camp", x: 5296, y: 4272, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 0 }, { name: "level", type: "int", value: 63 }, { name: "species", type: "int", value: 0 }, { name: "count", type: "int", value: 2 }] }, { id: 11, name: "camp-0-10", type: "camp", x: 4144, y: 5104, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 0 }, { name: "level", type: "int", value: 63 }, { name: "species", type: "int", value: 0 }, { name: "count", type: "int", value: 1 }] }, { id: 12, name: "camp-0-11", type: "camp", x: 4112, y: 4496, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 0 }, { name: "level", type: "int", value: 62 }, { name: "species", type: "int", value: 0 }, { name: "count", type: "int", value: 2 }] }, { id: 13, name: "camp-0-12", type: "camp", x: 4432, y: 5296, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 0 }, { name: "level", type: "int", value: 62 }, { name: "species", type: "int", value: 0 }, { name: "count", type: "int", value: 2 }] }, { id: 14, name: "camp-0-13", type: "camp", x: 4528, y: 4208, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 0 }, { name: "level", type: "int", value: 62 }, { name: "species", type: "int", value: 0 }, { name: "count", type: "int", value: 1 }] }, { id: 15, name: "camp-0-14", type: "camp", x: 5200, y: 4464, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 0 }, { name: "level", type: "int", value: 62 }, { name: "species", type: "int", value: 0 }, { name: "count", type: "int", value: 2 }] }, { id: 16, name: "camp-0-15", type: "camp", x: 4336, y: 4432, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 0 }, { name: "level", type: "int", value: 61 }, { name: "species", type: "int", value: 0 }, { name: "count", type: "int", value: 1 }] }, { id: 17, name: "camp-0-16", type: "camp", x: 4240, y: 4688, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 0 }, { name: "level", type: "int", value: 61 }, { name: "species", type: "int", value: 0 }, { name: "count", type: "int", value: 2 }] }, { id: 18, name: "camp-0-17", type: "camp", x: 5008, y: 4304, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 0 }, { name: "level", type: "int", value: 61 }, { name: "species", type: "int", value: 0 }, { name: "count", type: "int", value: 3 }] }, { id: 19, name: "camp-0-18", type: "camp", x: 4784, y: 4240, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 0 }, { name: "level", type: "int", value: 61 }, { name: "species", type: "int", value: 0 }, { name: "count", type: "int", value: 1 }] }, { id: 20, name: "boss-1-0", type: "boss", x: 2128, y: 5584, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 1 }, { name: "level", type: "int", value: 70 }, { name: "species", type: "int", value: 3 }, { name: "count", type: "int", value: 1 }] }, { id: 21, name: "camp-1-1", type: "camp", x: 3856, y: 5648, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 1 }, { name: "level", type: "int", value: 70 }, { name: "species", type: "int", value: 3 }, { name: "count", type: "int", value: 2 }] }, { id: 22, name: "camp-1-2", type: "camp", x: 3856, y: 5264, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 1 }, { name: "level", type: "int", value: 70 }, { name: "species", type: "int", value: 3 }, { name: "count", type: "int", value: 3 }] }, { id: 23, name: "camp-1-3", type: "camp", x: 2448, y: 5648, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 1 }, { name: "level", type: "int", value: 70 }, { name: "species", type: "int", value: 3 }, { name: "count", type: "int", value: 1 }] }, { id: 24, name: "camp-1-4", type: "camp", x: 2320, y: 5040, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 1 }, { name: "level", type: "int", value: 70 }, { name: "species", type: "int", value: 3 }, { name: "count", type: "int", value: 3 }] }, { id: 25, name: "camp-1-5", type: "camp", x: 3728, y: 5456, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 1 }, { name: "level", type: "int", value: 69 }, { name: "species", type: "int", value: 2 }, { name: "count", type: "int", value: 2 }] }, { id: 26, name: "camp-1-6", type: "camp", x: 2704, y: 5808, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 1 }, { name: "level", type: "int", value: 69 }, { name: "species", type: "int", value: 2 }, { name: "count", type: "int", value: 2 }] }, { id: 27, name: "camp-1-7", type: "camp", x: 2352, y: 5360, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 1 }, { name: "level", type: "int", value: 69 }, { name: "species", type: "int", value: 2 }, { name: "count", type: "int", value: 1 }] }, { id: 28, name: "camp-1-8", type: "camp", x: 3568, y: 5616, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 1 }, { name: "level", type: "int", value: 69 }, { name: "species", type: "int", value: 2 }, { name: "count", type: "int", value: 1 }] }, { id: 29, name: "camp-1-9", type: "camp", x: 3664, y: 5072, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 1 }, { name: "level", type: "int", value: 68 }, { name: "species", type: "int", value: 2 }, { name: "count", type: "int", value: 2 }] }, { id: 30, name: "camp-1-10", type: "camp", x: 3440, y: 4720, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 1 }, { name: "level", type: "int", value: 68 }, { name: "species", type: "int", value: 2 }, { name: "count", type: "int", value: 3 }] }, { id: 31, name: "camp-1-11", type: "camp", x: 3344, y: 5648, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 1 }, { name: "level", type: "int", value: 68 }, { name: "species", type: "int", value: 2 }, { name: "count", type: "int", value: 1 }] }, { id: 32, name: "camp-1-12", type: "camp", x: 3120, y: 4624, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 1 }, { name: "level", type: "int", value: 68 }, { name: "species", type: "int", value: 2 }, { name: "count", type: "int", value: 1 }] }, { id: 33, name: "camp-1-13", type: "camp", x: 2544, y: 4976, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 1 }, { name: "level", type: "int", value: 68 }, { name: "species", type: "int", value: 2 }, { name: "count", type: "int", value: 3 }] }, { id: 34, name: "camp-1-14", type: "camp", x: 3472, y: 5424, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 1 }, { name: "level", type: "int", value: 67 }, { name: "species", type: "int", value: 2 }, { name: "count", type: "int", value: 2 }] }, { id: 35, name: "camp-1-15", type: "camp", x: 3024, y: 5616, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 1 }, { name: "level", type: "int", value: 67 }, { name: "species", type: "int", value: 2 }, { name: "count", type: "int", value: 1 }] }, { id: 36, name: "camp-1-16", type: "camp", x: 2864, y: 4784, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 1 }, { name: "level", type: "int", value: 67 }, { name: "species", type: "int", value: 2 }, { name: "count", type: "int", value: 1 }] }, { id: 37, name: "camp-1-17", type: "camp", x: 3472, y: 5200, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 1 }, { name: "level", type: "int", value: 67 }, { name: "species", type: "int", value: 2 }, { name: "count", type: "int", value: 3 }] }, { id: 38, name: "camp-1-18", type: "camp", x: 2736, y: 5424, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 1 }, { name: "level", type: "int", value: 66 }, { name: "species", type: "int", value: 1 }, { name: "count", type: "int", value: 3 }] }, { id: 39, name: "camp-1-19", type: "camp", x: 2704, y: 5136, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 1 }, { name: "level", type: "int", value: 66 }, { name: "species", type: "int", value: 1 }, { name: "count", type: "int", value: 3 }] }, { id: 40, name: "camp-1-20", type: "camp", x: 3184, y: 5456, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 1 }, { name: "level", type: "int", value: 66 }, { name: "species", type: "int", value: 1 }, { name: "count", type: "int", value: 2 }] }, { id: 41, name: "camp-1-21", type: "camp", x: 3280, y: 4976, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 1 }, { name: "level", type: "int", value: 66 }, { name: "species", type: "int", value: 1 }, { name: "count", type: "int", value: 2 }] }, { id: 42, name: "camp-1-22", type: "camp", x: 3056, y: 4880, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 1 }, { name: "level", type: "int", value: 66 }, { name: "species", type: "int", value: 1 }, { name: "count", type: "int", value: 1 }] }, { id: 43, name: "elite-2-0", type: "elite", x: 592, y: 4208, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 2 }, { name: "level", type: "int", value: 75 }, { name: "species", type: "int", value: 4 }, { name: "count", type: "int", value: 1 }] }, { id: 44, name: "camp-2-1", type: "camp", x: 1968, y: 5296, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 2 }, { name: "level", type: "int", value: 75 }, { name: "species", type: "int", value: 4 }, { name: "count", type: "int", value: 3 }] }, { id: 45, name: "camp-2-2", type: "camp", x: 1712, y: 5328, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 2 }, { name: "level", type: "int", value: 75 }, { name: "species", type: "int", value: 4 }, { name: "count", type: "int", value: 2 }] }, { id: 46, name: "camp-2-3", type: "camp", x: 848, y: 4464, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 2 }, { name: "level", type: "int", value: 75 }, { name: "species", type: "int", value: 4 }, { name: "count", type: "int", value: 2 }] }, { id: 47, name: "camp-2-4", type: "camp", x: 944, y: 4272, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 2 }, { name: "level", type: "int", value: 74 }, { name: "species", type: "int", value: 4 }, { name: "count", type: "int", value: 1 }] }, { id: 48, name: "camp-2-5", type: "camp", x: 1744, y: 3920, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 2 }, { name: "level", type: "int", value: 74 }, { name: "species", type: "int", value: 4 }, { name: "count", type: "int", value: 1 }] }, { id: 49, name: "camp-2-6", type: "camp", x: 1328, y: 3952, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 2 }, { name: "level", type: "int", value: 74 }, { name: "species", type: "int", value: 4 }, { name: "count", type: "int", value: 3 }] }, { id: 50, name: "camp-2-7", type: "camp", x: 2128, y: 4912, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 2 }, { name: "level", type: "int", value: 74 }, { name: "species", type: "int", value: 4 }, { name: "count", type: "int", value: 2 }] }, { id: 51, name: "camp-2-8", type: "camp", x: 1968, y: 5072, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 2 }, { name: "level", type: "int", value: 73 }, { name: "species", type: "int", value: 4 }, { name: "count", type: "int", value: 2 }] }, { id: 52, name: "camp-2-9", type: "camp", x: 1456, y: 5136, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 2 }, { name: "level", type: "int", value: 73 }, { name: "species", type: "int", value: 4 }, { name: "count", type: "int", value: 1 }] }, { id: 53, name: "camp-2-10", type: "camp", x: 1712, y: 5104, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 2 }, { name: "level", type: "int", value: 73 }, { name: "species", type: "int", value: 4 }, { name: "count", type: "int", value: 3 }] }, { id: 54, name: "camp-2-11", type: "camp", x: 1104, y: 4464, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 2 }, { name: "level", type: "int", value: 72 }, { name: "species", type: "int", value: 3 }, { name: "count", type: "int", value: 1 }] }, { id: 55, name: "camp-2-12", type: "camp", x: 1136, y: 4720, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 2 }, { name: "level", type: "int", value: 72 }, { name: "species", type: "int", value: 3 }, { name: "count", type: "int", value: 3 }] }, { id: 56, name: "camp-2-13", type: "camp", x: 2e3, y: 4720, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 2 }, { name: "level", type: "int", value: 72 }, { name: "species", type: "int", value: 3 }, { name: "count", type: "int", value: 1 }] }, { id: 57, name: "camp-2-14", type: "camp", x: 1296, y: 4240, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 2 }, { name: "level", type: "int", value: 72 }, { name: "species", type: "int", value: 3 }, { name: "count", type: "int", value: 3 }] }, { id: 58, name: "camp-2-15", type: "camp", x: 1648, y: 4144, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 2 }, { name: "level", type: "int", value: 71 }, { name: "species", type: "int", value: 3 }, { name: "count", type: "int", value: 3 }] }, { id: 59, name: "camp-2-16", type: "camp", x: 1552, y: 4944, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 2 }, { name: "level", type: "int", value: 71 }, { name: "species", type: "int", value: 3 }, { name: "count", type: "int", value: 3 }] }, { id: 60, name: "camp-2-17", type: "camp", x: 1744, y: 4816, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 2 }, { name: "level", type: "int", value: 71 }, { name: "species", type: "int", value: 3 }, { name: "count", type: "int", value: 2 }] }, { id: 61, name: "camp-2-18", type: "camp", x: 1360, y: 4752, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 2 }, { name: "level", type: "int", value: 71 }, { name: "species", type: "int", value: 3 }, { name: "count", type: "int", value: 3 }] }, { id: 62, name: "boss-3-0", type: "boss", x: 1616, y: 3728, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 3 }, { name: "level", type: "int", value: 80 }, { name: "species", type: "int", value: 6 }, { name: "count", type: "int", value: 1 }] }, { id: 63, name: "camp-3-1", type: "camp", x: 944, y: 3920, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 3 }, { name: "level", type: "int", value: 80 }, { name: "species", type: "int", value: 6 }, { name: "count", type: "int", value: 2 }] }, { id: 64, name: "camp-3-2", type: "camp", x: 464, y: 3696, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 3 }, { name: "level", type: "int", value: 80 }, { name: "species", type: "int", value: 6 }, { name: "count", type: "int", value: 2 }] }, { id: 65, name: "camp-3-3", type: "camp", x: 1520, y: 2576, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 3 }, { name: "level", type: "int", value: 80 }, { name: "species", type: "int", value: 6 }, { name: "count", type: "int", value: 1 }] }, { id: 66, name: "camp-3-4", type: "camp", x: 656, y: 2384, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 3 }, { name: "level", type: "int", value: 80 }, { name: "species", type: "int", value: 6 }, { name: "count", type: "int", value: 1 }] }, { id: 67, name: "camp-3-5", type: "camp", x: 1168, y: 3760, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 3 }, { name: "level", type: "int", value: 79 }, { name: "species", type: "int", value: 6 }, { name: "count", type: "int", value: 3 }] }, { id: 68, name: "camp-3-6", type: "camp", x: 688, y: 3728, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 3 }, { name: "level", type: "int", value: 79 }, { name: "species", type: "int", value: 6 }, { name: "count", type: "int", value: 2 }] }, { id: 69, name: "camp-3-7", type: "camp", x: 1200, y: 2480, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 3 }, { name: "level", type: "int", value: 79 }, { name: "species", type: "int", value: 6 }, { name: "count", type: "int", value: 1 }] }, { id: 70, name: "camp-3-8", type: "camp", x: 432, y: 3472, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 3 }, { name: "level", type: "int", value: 79 }, { name: "species", type: "int", value: 6 }, { name: "count", type: "int", value: 2 }] }, { id: 71, name: "camp-3-9", type: "camp", x: 1360, y: 3568, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 3 }, { name: "level", type: "int", value: 79 }, { name: "species", type: "int", value: 6 }, { name: "count", type: "int", value: 3 }] }, { id: 72, name: "camp-3-10", type: "camp", x: 464, y: 2704, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 3 }, { name: "level", type: "int", value: 78 }, { name: "species", type: "int", value: 5 }, { name: "count", type: "int", value: 1 }] }, { id: 73, name: "camp-3-11", type: "camp", x: 976, y: 2512, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 3 }, { name: "level", type: "int", value: 78 }, { name: "species", type: "int", value: 5 }, { name: "count", type: "int", value: 1 }] }, { id: 74, name: "camp-3-12", type: "camp", x: 1520, y: 3120, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 3 }, { name: "level", type: "int", value: 78 }, { name: "species", type: "int", value: 5 }, { name: "count", type: "int", value: 2 }] }, { id: 75, name: "camp-3-13", type: "camp", x: 1456, y: 2896, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 3 }, { name: "level", type: "int", value: 78 }, { name: "species", type: "int", value: 5 }, { name: "count", type: "int", value: 1 }] }, { id: 76, name: "camp-3-14", type: "camp", x: 400, y: 3120, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 3 }, { name: "level", type: "int", value: 78 }, { name: "species", type: "int", value: 5 }, { name: "count", type: "int", value: 1 }] }, { id: 77, name: "camp-3-15", type: "camp", x: 976, y: 3600, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 3 }, { name: "level", type: "int", value: 77 }, { name: "species", type: "int", value: 5 }, { name: "count", type: "int", value: 1 }] }, { id: 78, name: "camp-3-16", type: "camp", x: 1296, y: 2736, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 3 }, { name: "level", type: "int", value: 77 }, { name: "species", type: "int", value: 5 }, { name: "count", type: "int", value: 2 }] }, { id: 79, name: "camp-3-17", type: "camp", x: 496, y: 2928, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 3 }, { name: "level", type: "int", value: 77 }, { name: "species", type: "int", value: 5 }, { name: "count", type: "int", value: 3 }] }, { id: 80, name: "camp-3-18", type: "camp", x: 1360, y: 3280, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 3 }, { name: "level", type: "int", value: 77 }, { name: "species", type: "int", value: 5 }, { name: "count", type: "int", value: 1 }] }, { id: 81, name: "camp-3-19", type: "camp", x: 720, y: 2768, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 3 }, { name: "level", type: "int", value: 77 }, { name: "species", type: "int", value: 5 }, { name: "count", type: "int", value: 2 }] }, { id: 82, name: "camp-3-20", type: "camp", x: 784, y: 3440, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 3 }, { name: "level", type: "int", value: 76 }, { name: "species", type: "int", value: 5 }, { name: "count", type: "int", value: 3 }] }, { id: 83, name: "camp-3-21", type: "camp", x: 1104, y: 3408, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 3 }, { name: "level", type: "int", value: 76 }, { name: "species", type: "int", value: 5 }, { name: "count", type: "int", value: 1 }] }, { id: 84, name: "camp-3-22", type: "camp", x: 976, y: 2736, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 3 }, { name: "level", type: "int", value: 76 }, { name: "species", type: "int", value: 5 }, { name: "count", type: "int", value: 3 }] }, { id: 85, name: "camp-3-23", type: "camp", x: 1232, y: 2960, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 3 }, { name: "level", type: "int", value: 76 }, { name: "species", type: "int", value: 5 }, { name: "count", type: "int", value: 2 }] }, { id: 86, name: "camp-3-24", type: "camp", x: 656, y: 3184, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 3 }, { name: "level", type: "int", value: 76 }, { name: "species", type: "int", value: 5 }, { name: "count", type: "int", value: 2 }] }, { id: 87, name: "elite-4-0", type: "elite", x: 2032, y: 656, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 4 }, { name: "level", type: "int", value: 85 }, { name: "species", type: "int", value: 8 }, { name: "count", type: "int", value: 1 }] }, { id: 88, name: "camp-4-1", type: "camp", x: 848, y: 2192, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 4 }, { name: "level", type: "int", value: 85 }, { name: "species", type: "int", value: 8 }, { name: "count", type: "int", value: 1 }] }, { id: 89, name: "camp-4-2", type: "camp", x: 1776, y: 688, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 4 }, { name: "level", type: "int", value: 85 }, { name: "species", type: "int", value: 8 }, { name: "count", type: "int", value: 1 }] }, { id: 90, name: "camp-4-3", type: "camp", x: 752, y: 1776, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 4 }, { name: "level", type: "int", value: 85 }, { name: "species", type: "int", value: 8 }, { name: "count", type: "int", value: 1 }] }, { id: 91, name: "camp-4-4", type: "camp", x: 976, y: 2e3, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 4 }, { name: "level", type: "int", value: 85 }, { name: "species", type: "int", value: 8 }, { name: "count", type: "int", value: 3 }] }, { id: 92, name: "camp-4-5", type: "camp", x: 1168, y: 2160, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 4 }, { name: "level", type: "int", value: 84 }, { name: "species", type: "int", value: 7 }, { name: "count", type: "int", value: 2 }] }, { id: 93, name: "camp-4-6", type: "camp", x: 1872, y: 976, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 4 }, { name: "level", type: "int", value: 84 }, { name: "species", type: "int", value: 7 }, { name: "count", type: "int", value: 1 }] }, { id: 94, name: "camp-4-7", type: "camp", x: 1616, y: 912, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 4 }, { name: "level", type: "int", value: 84 }, { name: "species", type: "int", value: 7 }, { name: "count", type: "int", value: 2 }] }, { id: 95, name: "camp-4-8", type: "camp", x: 2096, y: 1168, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 4 }, { name: "level", type: "int", value: 84 }, { name: "species", type: "int", value: 7 }, { name: "count", type: "int", value: 2 }] }, { id: 96, name: "camp-4-9", type: "camp", x: 1392, y: 1008, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 4 }, { name: "level", type: "int", value: 84 }, { name: "species", type: "int", value: 7 }, { name: "count", type: "int", value: 3 }] }, { id: 97, name: "camp-4-10", type: "camp", x: 1008, y: 1488, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 4 }, { name: "level", type: "int", value: 83 }, { name: "species", type: "int", value: 7 }, { name: "count", type: "int", value: 1 }] }, { id: 98, name: "camp-4-11", type: "camp", x: 2128, y: 1392, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 4 }, { name: "level", type: "int", value: 83 }, { name: "species", type: "int", value: 7 }, { name: "count", type: "int", value: 3 }] }, { id: 99, name: "camp-4-12", type: "camp", x: 1584, y: 2160, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 4 }, { name: "level", type: "int", value: 83 }, { name: "species", type: "int", value: 7 }, { name: "count", type: "int", value: 1 }] }, { id: 100, name: "camp-4-13", type: "camp", x: 1072, y: 1808, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 4 }, { name: "level", type: "int", value: 83 }, { name: "species", type: "int", value: 7 }, { name: "count", type: "int", value: 1 }] }, { id: 101, name: "camp-4-14", type: "camp", x: 1776, y: 2064, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 4 }, { name: "level", type: "int", value: 83 }, { name: "species", type: "int", value: 7 }, { name: "count", type: "int", value: 2 }] }, { id: 102, name: "camp-4-15", type: "camp", x: 1168, y: 1328, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 4 }, { name: "level", type: "int", value: 82 }, { name: "species", type: "int", value: 7 }, { name: "count", type: "int", value: 3 }] }, { id: 103, name: "camp-4-16", type: "camp", x: 2064, y: 1648, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 4 }, { name: "level", type: "int", value: 82 }, { name: "species", type: "int", value: 7 }, { name: "count", type: "int", value: 1 }] }, { id: 104, name: "camp-4-17", type: "camp", x: 1808, y: 1200, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 4 }, { name: "level", type: "int", value: 82 }, { name: "species", type: "int", value: 7 }, { name: "count", type: "int", value: 2 }] }, { id: 105, name: "camp-4-18", type: "camp", x: 1296, y: 1904, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 4 }, { name: "level", type: "int", value: 82 }, { name: "species", type: "int", value: 7 }, { name: "count", type: "int", value: 3 }] }, { id: 106, name: "camp-4-19", type: "camp", x: 1904, y: 1840, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 4 }, { name: "level", type: "int", value: 82 }, { name: "species", type: "int", value: 7 }, { name: "count", type: "int", value: 2 }] }, { id: 107, name: "camp-4-20", type: "camp", x: 1392, y: 1264, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 4 }, { name: "level", type: "int", value: 81 }, { name: "species", type: "int", value: 6 }, { name: "count", type: "int", value: 3 }] }, { id: 108, name: "camp-4-21", type: "camp", x: 1584, y: 1904, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 4 }, { name: "level", type: "int", value: 81 }, { name: "species", type: "int", value: 6 }, { name: "count", type: "int", value: 2 }] }, { id: 109, name: "camp-4-22", type: "camp", x: 1296, y: 1680, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 4 }, { name: "level", type: "int", value: 81 }, { name: "species", type: "int", value: 6 }, { name: "count", type: "int", value: 3 }] }, { id: 110, name: "camp-4-23", type: "camp", x: 1840, y: 1424, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 4 }, { name: "level", type: "int", value: 81 }, { name: "species", type: "int", value: 6 }, { name: "count", type: "int", value: 2 }] }, { id: 111, name: "camp-4-24", type: "camp", x: 1616, y: 1296, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 4 }, { name: "level", type: "int", value: 81 }, { name: "species", type: "int", value: 6 }, { name: "count", type: "int", value: 3 }] }, { id: 112, name: "boss-5-0", type: "boss", x: 2192, y: 848, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 5 }, { name: "level", type: "int", value: 90 }, { name: "species", type: "int", value: 9 }, { name: "count", type: "int", value: 1 }] }, { id: 113, name: "camp-5-1", type: "camp", x: 3856, y: 624, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 5 }, { name: "level", type: "int", value: 90 }, { name: "species", type: "int", value: 9 }, { name: "count", type: "int", value: 1 }] }, { id: 114, name: "camp-5-2", type: "camp", x: 3600, y: 1584, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 5 }, { name: "level", type: "int", value: 90 }, { name: "species", type: "int", value: 9 }, { name: "count", type: "int", value: 3 }] }, { id: 115, name: "camp-5-3", type: "camp", x: 2288, y: 1232, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 5 }, { name: "level", type: "int", value: 90 }, { name: "species", type: "int", value: 9 }, { name: "count", type: "int", value: 3 }] }, { id: 116, name: "camp-5-4", type: "camp", x: 3728, y: 1232, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 5 }, { name: "level", type: "int", value: 90 }, { name: "species", type: "int", value: 9 }, { name: "count", type: "int", value: 1 }] }, { id: 117, name: "camp-5-5", type: "camp", x: 2512, y: 496, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 5 }, { name: "level", type: "int", value: 89 }, { name: "species", type: "int", value: 9 }, { name: "count", type: "int", value: 3 }] }, { id: 118, name: "camp-5-6", type: "camp", x: 2704, y: 400, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 5 }, { name: "level", type: "int", value: 89 }, { name: "species", type: "int", value: 9 }, { name: "count", type: "int", value: 1 }] }, { id: 119, name: "camp-5-7", type: "camp", x: 2416, y: 1040, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 5 }, { name: "level", type: "int", value: 89 }, { name: "species", type: "int", value: 9 }, { name: "count", type: "int", value: 1 }] }, { id: 120, name: "camp-5-8", type: "camp", x: 3440, y: 432, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 5 }, { name: "level", type: "int", value: 89 }, { name: "species", type: "int", value: 9 }, { name: "count", type: "int", value: 3 }] }, { id: 121, name: "camp-5-9", type: "camp", x: 2448, y: 752, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 5 }, { name: "level", type: "int", value: 89 }, { name: "species", type: "int", value: 9 }, { name: "count", type: "int", value: 2 }] }, { id: 122, name: "camp-5-10", type: "camp", x: 3600, y: 656, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 5 }, { name: "level", type: "int", value: 88 }, { name: "species", type: "int", value: 9 }, { name: "count", type: "int", value: 1 }] }, { id: 123, name: "camp-5-11", type: "camp", x: 3504, y: 1264, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 5 }, { name: "level", type: "int", value: 88 }, { name: "species", type: "int", value: 9 }, { name: "count", type: "int", value: 2 }] }, { id: 124, name: "camp-5-12", type: "camp", x: 3216, y: 432, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 5 }, { name: "level", type: "int", value: 88 }, { name: "species", type: "int", value: 9 }, { name: "count", type: "int", value: 3 }] }, { id: 125, name: "camp-5-13", type: "camp", x: 2960, y: 432, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 5 }, { name: "level", type: "int", value: 88 }, { name: "species", type: "int", value: 9 }, { name: "count", type: "int", value: 3 }] }, { id: 126, name: "camp-5-14", type: "camp", x: 3120, y: 1424, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 5 }, { name: "level", type: "int", value: 87 }, { name: "species", type: "int", value: 8 }, { name: "count", type: "int", value: 2 }] }, { id: 127, name: "camp-5-15", type: "camp", x: 2640, y: 1104, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 5 }, { name: "level", type: "int", value: 87 }, { name: "species", type: "int", value: 8 }, { name: "count", type: "int", value: 3 }] }, { id: 128, name: "camp-5-16", type: "camp", x: 3472, y: 848, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 5 }, { name: "level", type: "int", value: 87 }, { name: "species", type: "int", value: 8 }, { name: "count", type: "int", value: 2 }] }, { id: 129, name: "camp-5-17", type: "camp", x: 3280, y: 656, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 5 }, { name: "level", type: "int", value: 87 }, { name: "species", type: "int", value: 8 }, { name: "count", type: "int", value: 3 }] }, { id: 130, name: "camp-5-18", type: "camp", x: 2832, y: 688, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 5 }, { name: "level", type: "int", value: 87 }, { name: "species", type: "int", value: 8 }, { name: "count", type: "int", value: 2 }] }, { id: 131, name: "camp-5-19", type: "camp", x: 3376, y: 1040, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 5 }, { name: "level", type: "int", value: 86 }, { name: "species", type: "int", value: 8 }, { name: "count", type: "int", value: 2 }] }, { id: 132, name: "camp-5-20", type: "camp", x: 3056, y: 624, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 5 }, { name: "level", type: "int", value: 86 }, { name: "species", type: "int", value: 8 }, { name: "count", type: "int", value: 1 }] }, { id: 133, name: "camp-5-21", type: "camp", x: 2864, y: 1200, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 5 }, { name: "level", type: "int", value: 86 }, { name: "species", type: "int", value: 8 }, { name: "count", type: "int", value: 2 }] }, { id: 134, name: "camp-5-22", type: "camp", x: 3216, y: 1200, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 5 }, { name: "level", type: "int", value: 86 }, { name: "species", type: "int", value: 8 }, { name: "count", type: "int", value: 3 }] }, { id: 135, name: "camp-5-23", type: "camp", x: 2768, y: 912, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 5 }, { name: "level", type: "int", value: 86 }, { name: "species", type: "int", value: 8 }, { name: "count", type: "int", value: 2 }] }, { id: 136, name: "elite-6-0", type: "elite", x: 4144, y: 752, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 6 }, { name: "level", type: "int", value: 95 }, { name: "species", type: "int", value: 11 }, { name: "count", type: "int", value: 1 }] }, { id: 137, name: "camp-6-1", type: "camp", x: 3952, y: 976, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 6 }, { name: "level", type: "int", value: 95 }, { name: "species", type: "int", value: 11 }, { name: "count", type: "int", value: 1 }] }, { id: 138, name: "camp-6-2", type: "camp", x: 4432, y: 784, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 6 }, { name: "level", type: "int", value: 95 }, { name: "species", type: "int", value: 11 }, { name: "count", type: "int", value: 1 }] }, { id: 139, name: "camp-6-3", type: "camp", x: 4944, y: 2256, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 6 }, { name: "level", type: "int", value: 95 }, { name: "species", type: "int", value: 11 }, { name: "count", type: "int", value: 2 }] }, { id: 140, name: "camp-6-4", type: "camp", x: 4496, y: 2352, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 6 }, { name: "level", type: "int", value: 95 }, { name: "species", type: "int", value: 11 }, { name: "count", type: "int", value: 2 }] }, { id: 141, name: "camp-6-5", type: "camp", x: 3920, y: 1264, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 6 }, { name: "level", type: "int", value: 94 }, { name: "species", type: "int", value: 11 }, { name: "count", type: "int", value: 3 }] }, { id: 142, name: "camp-6-6", type: "camp", x: 4176, y: 1008, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 6 }, { name: "level", type: "int", value: 94 }, { name: "species", type: "int", value: 11 }, { name: "count", type: "int", value: 3 }] }, { id: 143, name: "camp-6-7", type: "camp", x: 4688, y: 2224, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 6 }, { name: "level", type: "int", value: 94 }, { name: "species", type: "int", value: 11 }, { name: "count", type: "int", value: 1 }] }, { id: 144, name: "camp-6-8", type: "camp", x: 5072, y: 1968, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 6 }, { name: "level", type: "int", value: 94 }, { name: "species", type: "int", value: 11 }, { name: "count", type: "int", value: 2 }] }, { id: 145, name: "camp-6-9", type: "camp", x: 5104, y: 1264, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 6 }, { name: "level", type: "int", value: 94 }, { name: "species", type: "int", value: 11 }, { name: "count", type: "int", value: 3 }] }, { id: 146, name: "camp-6-10", type: "camp", x: 4720, y: 1008, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 6 }, { name: "level", type: "int", value: 93 }, { name: "species", type: "int", value: 10 }, { name: "count", type: "int", value: 3 }] }, { id: 147, name: "camp-6-11", type: "camp", x: 3984, y: 1488, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 6 }, { name: "level", type: "int", value: 93 }, { name: "species", type: "int", value: 10 }, { name: "count", type: "int", value: 2 }] }, { id: 148, name: "camp-6-12", type: "camp", x: 4400, y: 1040, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 6 }, { name: "level", type: "int", value: 93 }, { name: "species", type: "int", value: 10 }, { name: "count", type: "int", value: 3 }] }, { id: 149, name: "camp-6-13", type: "camp", x: 5104, y: 1552, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 6 }, { name: "level", type: "int", value: 93 }, { name: "species", type: "int", value: 10 }, { name: "count", type: "int", value: 3 }] }, { id: 150, name: "camp-6-14", type: "camp", x: 4144, y: 1936, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 6 }, { name: "level", type: "int", value: 93 }, { name: "species", type: "int", value: 10 }, { name: "count", type: "int", value: 1 }] }, { id: 151, name: "camp-6-15", type: "camp", x: 4048, y: 1712, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 6 }, { name: "level", type: "int", value: 92 }, { name: "species", type: "int", value: 10 }, { name: "count", type: "int", value: 2 }] }, { id: 152, name: "camp-6-16", type: "camp", x: 4528, y: 2064, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 6 }, { name: "level", type: "int", value: 92 }, { name: "species", type: "int", value: 10 }, { name: "count", type: "int", value: 2 }] }, { id: 153, name: "camp-6-17", type: "camp", x: 4816, y: 1200, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 6 }, { name: "level", type: "int", value: 92 }, { name: "species", type: "int", value: 10 }, { name: "count", type: "int", value: 3 }] }, { id: 154, name: "camp-6-18", type: "camp", x: 4208, y: 1296, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 6 }, { name: "level", type: "int", value: 92 }, { name: "species", type: "int", value: 10 }, { name: "count", type: "int", value: 1 }] }, { id: 155, name: "camp-6-19", type: "camp", x: 4752, y: 1968, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 6 }, { name: "level", type: "int", value: 92 }, { name: "species", type: "int", value: 10 }, { name: "count", type: "int", value: 3 }] }, { id: 156, name: "camp-6-20", type: "camp", x: 4912, y: 1392, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 6 }, { name: "level", type: "int", value: 91 }, { name: "species", type: "int", value: 10 }, { name: "count", type: "int", value: 2 }] }, { id: 157, name: "camp-6-21", type: "camp", x: 4368, y: 1904, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 6 }, { name: "level", type: "int", value: 91 }, { name: "species", type: "int", value: 10 }, { name: "count", type: "int", value: 1 }] }, { id: 158, name: "camp-6-22", type: "camp", x: 4912, y: 1680, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 6 }, { name: "level", type: "int", value: 91 }, { name: "species", type: "int", value: 10 }, { name: "count", type: "int", value: 1 }] }, { id: 159, name: "camp-6-23", type: "camp", x: 4496, y: 1232, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 6 }, { name: "level", type: "int", value: 91 }, { name: "species", type: "int", value: 10 }, { name: "count", type: "int", value: 2 }] }, { id: 160, name: "camp-6-24", type: "camp", x: 4240, y: 1584, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 6 }, { name: "level", type: "int", value: 91 }, { name: "species", type: "int", value: 10 }, { name: "count", type: "int", value: 1 }] }, { id: 161, name: "boss-7-0", type: "boss", x: 5456, y: 2224, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 7 }, { name: "level", type: "int", value: 100 }, { name: "species", type: "int", value: 13 }, { name: "count", type: "int", value: 1 }] }, { id: 162, name: "camp-7-1", type: "camp", x: 5488, y: 3792, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 7 }, { name: "level", type: "int", value: 100 }, { name: "species", type: "int", value: 13 }, { name: "count", type: "int", value: 2 }] }, { id: 163, name: "camp-7-2", type: "camp", x: 4816, y: 3728, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 7 }, { name: "level", type: "int", value: 100 }, { name: "species", type: "int", value: 13 }, { name: "count", type: "int", value: 1 }] }, { id: 164, name: "camp-7-3", type: "camp", x: 5552, y: 2448, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 7 }, { name: "level", type: "int", value: 100 }, { name: "species", type: "int", value: 13 }, { name: "count", type: "int", value: 2 }] }, { id: 165, name: "camp-7-4", type: "camp", x: 5168, y: 3728, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 7 }, { name: "level", type: "int", value: 99 }, { name: "species", type: "int", value: 12 }, { name: "count", type: "int", value: 1 }] }, { id: 166, name: "camp-7-5", type: "camp", x: 5488, y: 3568, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 7 }, { name: "level", type: "int", value: 99 }, { name: "species", type: "int", value: 12 }, { name: "count", type: "int", value: 2 }] }, { id: 167, name: "camp-7-6", type: "camp", x: 5712, y: 2960, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 7 }, { name: "level", type: "int", value: 99 }, { name: "species", type: "int", value: 12 }, { name: "count", type: "int", value: 3 }] }, { id: 168, name: "camp-7-7", type: "camp", x: 5552, y: 2672, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 7 }, { name: "level", type: "int", value: 99 }, { name: "species", type: "int", value: 12 }, { name: "count", type: "int", value: 2 }] }, { id: 169, name: "camp-7-8", type: "camp", x: 5296, y: 2544, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 7 }, { name: "level", type: "int", value: 98 }, { name: "species", type: "int", value: 12 }, { name: "count", type: "int", value: 2 }] }, { id: 170, name: "camp-7-9", type: "camp", x: 4976, y: 2576, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 7 }, { name: "level", type: "int", value: 98 }, { name: "species", type: "int", value: 12 }, { name: "count", type: "int", value: 2 }] }, { id: 171, name: "camp-7-10", type: "camp", x: 5040, y: 3536, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 7 }, { name: "level", type: "int", value: 98 }, { name: "species", type: "int", value: 12 }, { name: "count", type: "int", value: 3 }] }, { id: 172, name: "camp-7-11", type: "camp", x: 5552, y: 3344, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 7 }, { name: "level", type: "int", value: 97 }, { name: "species", type: "int", value: 12 }, { name: "count", type: "int", value: 2 }] }, { id: 173, name: "camp-7-12", type: "camp", x: 4848, y: 3408, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 7 }, { name: "level", type: "int", value: 97 }, { name: "species", type: "int", value: 12 }, { name: "count", type: "int", value: 3 }] }, { id: 174, name: "camp-7-13", type: "camp", x: 4784, y: 2800, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 7 }, { name: "level", type: "int", value: 97 }, { name: "species", type: "int", value: 12 }, { name: "count", type: "int", value: 1 }] }, { id: 175, name: "camp-7-14", type: "camp", x: 4848, y: 3152, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 7 }, { name: "level", type: "int", value: 97 }, { name: "species", type: "int", value: 12 }, { name: "count", type: "int", value: 2 }] }, { id: 176, name: "camp-7-15", type: "camp", x: 5456, y: 3152, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 7 }, { name: "level", type: "int", value: 96 }, { name: "species", type: "int", value: 11 }, { name: "count", type: "int", value: 3 }] }, { id: 177, name: "camp-7-16", type: "camp", x: 5424, y: 2896, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 7 }, { name: "level", type: "int", value: 96 }, { name: "species", type: "int", value: 11 }, { name: "count", type: "int", value: 3 }] }, { id: 178, name: "camp-7-17", type: "camp", x: 5008, y: 2800, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 7 }, { name: "level", type: "int", value: 96 }, { name: "species", type: "int", value: 11 }, { name: "count", type: "int", value: 3 }] }, { id: 179, name: "camp-7-18", type: "camp", x: 5168, y: 3344, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 7 }, { name: "level", type: "int", value: 96 }, { name: "species", type: "int", value: 11 }, { name: "count", type: "int", value: 2 }] }, { id: 180, name: "elite-8-0", type: "elite", x: 3792, y: 1968, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 8 }, { name: "level", type: "int", value: 105 }, { name: "species", type: "int", value: 14 }, { name: "count", type: "int", value: 1 }] }, { id: 181, name: "camp-8-1", type: "camp", x: 3536, y: 3888, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 8 }, { name: "level", type: "int", value: 105 }, { name: "species", type: "int", value: 14 }, { name: "count", type: "int", value: 1 }] }, { id: 182, name: "camp-8-2", type: "camp", x: 3408, y: 2352, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 8 }, { name: "level", type: "int", value: 105 }, { name: "species", type: "int", value: 14 }, { name: "count", type: "int", value: 1 }] }, { id: 183, name: "camp-8-3", type: "camp", x: 3760, y: 3984, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 8 }, { name: "level", type: "int", value: 105 }, { name: "species", type: "int", value: 14 }, { name: "count", type: "int", value: 2 }] }, { id: 184, name: "camp-8-4", type: "camp", x: 3920, y: 2224, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 8 }, { name: "level", type: "int", value: 105 }, { name: "species", type: "int", value: 14 }, { name: "count", type: "int", value: 3 }] }, { id: 185, name: "camp-8-5", type: "camp", x: 4048, y: 3920, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 8 }, { name: "level", type: "int", value: 105 }, { name: "species", type: "int", value: 14 }, { name: "count", type: "int", value: 3 }] }, { id: 186, name: "camp-8-6", type: "camp", x: 4144, y: 2192, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 8 }, { name: "level", type: "int", value: 104 }, { name: "species", type: "int", value: 14 }, { name: "count", type: "int", value: 1 }] }, { id: 187, name: "camp-8-7", type: "camp", x: 3664, y: 2384, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 8 }, { name: "level", type: "int", value: 104 }, { name: "species", type: "int", value: 14 }, { name: "count", type: "int", value: 3 }] }, { id: 188, name: "camp-8-8", type: "camp", x: 3888, y: 3760, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 8 }, { name: "level", type: "int", value: 104 }, { name: "species", type: "int", value: 14 }, { name: "count", type: "int", value: 2 }] }, { id: 189, name: "camp-8-9", type: "camp", x: 4304, y: 3792, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 8 }, { name: "level", type: "int", value: 104 }, { name: "species", type: "int", value: 14 }, { name: "count", type: "int", value: 3 }] }, { id: 190, name: "camp-8-10", type: "camp", x: 4656, y: 3632, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 8 }, { name: "level", type: "int", value: 104 }, { name: "species", type: "int", value: 14 }, { name: "count", type: "int", value: 1 }] }, { id: 191, name: "camp-8-11", type: "camp", x: 4016, y: 2416, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 8 }, { name: "level", type: "int", value: 103 }, { name: "species", type: "int", value: 14 }, { name: "count", type: "int", value: 3 }] }, { id: 192, name: "camp-8-12", type: "camp", x: 3696, y: 3472, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 8 }, { name: "level", type: "int", value: 103 }, { name: "species", type: "int", value: 14 }, { name: "count", type: "int", value: 1 }] }, { id: 193, name: "camp-8-13", type: "camp", x: 3696, y: 2640, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 8 }, { name: "level", type: "int", value: 103 }, { name: "species", type: "int", value: 14 }, { name: "count", type: "int", value: 1 }] }, { id: 194, name: "camp-8-14", type: "camp", x: 4336, y: 2448, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 8 }, { name: "level", type: "int", value: 103 }, { name: "species", type: "int", value: 14 }, { name: "count", type: "int", value: 2 }] }, { id: 195, name: "camp-8-15", type: "camp", x: 4528, y: 2544, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 8 }, { name: "level", type: "int", value: 103 }, { name: "species", type: "int", value: 14 }, { name: "count", type: "int", value: 3 }] }, { id: 196, name: "camp-8-16", type: "camp", x: 4048, y: 3600, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 8 }, { name: "level", type: "int", value: 102 }, { name: "species", type: "int", value: 13 }, { name: "count", type: "int", value: 3 }] }, { id: 197, name: "camp-8-17", type: "camp", x: 4272, y: 3536, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 8 }, { name: "level", type: "int", value: 102 }, { name: "species", type: "int", value: 13 }, { name: "count", type: "int", value: 3 }] }, { id: 198, name: "camp-8-18", type: "camp", x: 3824, y: 3248, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 8 }, { name: "level", type: "int", value: 102 }, { name: "species", type: "int", value: 13 }, { name: "count", type: "int", value: 1 }] }, { id: 199, name: "camp-8-19", type: "camp", x: 4592, y: 3152, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 8 }, { name: "level", type: "int", value: 102 }, { name: "species", type: "int", value: 13 }, { name: "count", type: "int", value: 2 }] }, { id: 200, name: "camp-8-20", type: "camp", x: 4112, y: 2672, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 8 }, { name: "level", type: "int", value: 102 }, { name: "species", type: "int", value: 13 }, { name: "count", type: "int", value: 2 }] }, { id: 201, name: "camp-8-21", type: "camp", x: 4336, y: 2704, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 8 }, { name: "level", type: "int", value: 101 }, { name: "species", type: "int", value: 13 }, { name: "count", type: "int", value: 1 }] }, { id: 202, name: "camp-8-22", type: "camp", x: 4432, y: 3344, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 8 }, { name: "level", type: "int", value: 101 }, { name: "species", type: "int", value: 13 }, { name: "count", type: "int", value: 1 }] }, { id: 203, name: "camp-8-23", type: "camp", x: 4528, y: 2896, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 8 }, { name: "level", type: "int", value: 101 }, { name: "species", type: "int", value: 13 }, { name: "count", type: "int", value: 3 }] }, { id: 204, name: "camp-8-24", type: "camp", x: 3920, y: 2896, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 8 }, { name: "level", type: "int", value: 101 }, { name: "species", type: "int", value: 13 }, { name: "count", type: "int", value: 2 }] }, { id: 205, name: "camp-8-25", type: "camp", x: 4144, y: 3344, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 8 }, { name: "level", type: "int", value: 101 }, { name: "species", type: "int", value: 13 }, { name: "count", type: "int", value: 2 }] }, { id: 206, name: "boss-9-0", type: "boss", x: 1712, y: 3376, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 9 }, { name: "level", type: "int", value: 110 }, { name: "species", type: "int", value: 16 }, { name: "count", type: "int", value: 1 }] }, { id: 207, name: "camp-9-1", type: "camp", x: 1936, y: 3248, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 9 }, { name: "level", type: "int", value: 110 }, { name: "species", type: "int", value: 16 }, { name: "count", type: "int", value: 2 }] }, { id: 208, name: "camp-9-2", type: "camp", x: 3440, y: 4272, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 9 }, { name: "level", type: "int", value: 110 }, { name: "species", type: "int", value: 16 }, { name: "count", type: "int", value: 1 }] }, { id: 209, name: "camp-9-3", type: "camp", x: 2256, y: 3248, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 9 }, { name: "level", type: "int", value: 110 }, { name: "species", type: "int", value: 16 }, { name: "count", type: "int", value: 2 }] }, { id: 210, name: "camp-9-4", type: "camp", x: 3344, y: 4048, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 9 }, { name: "level", type: "int", value: 110 }, { name: "species", type: "int", value: 16 }, { name: "count", type: "int", value: 3 }] }, { id: 211, name: "camp-9-5", type: "camp", x: 1872, y: 3632, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 9 }, { name: "level", type: "int", value: 109 }, { name: "species", type: "int", value: 16 }, { name: "count", type: "int", value: 3 }] }, { id: 212, name: "camp-9-6", type: "camp", x: 2704, y: 4784, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 9 }, { name: "level", type: "int", value: 109 }, { name: "species", type: "int", value: 16 }, { name: "count", type: "int", value: 3 }] }, { id: 213, name: "camp-9-7", type: "camp", x: 3184, y: 3888, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 9 }, { name: "level", type: "int", value: 109 }, { name: "species", type: "int", value: 16 }, { name: "count", type: "int", value: 1 }] }, { id: 214, name: "camp-9-8", type: "camp", x: 3120, y: 4400, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 9 }, { name: "level", type: "int", value: 109 }, { name: "species", type: "int", value: 16 }, { name: "count", type: "int", value: 3 }] }, { id: 215, name: "camp-9-9", type: "camp", x: 2096, y: 3568, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 9 }, { name: "level", type: "int", value: 108 }, { name: "species", type: "int", value: 15 }, { name: "count", type: "int", value: 2 }] }, { id: 216, name: "camp-9-10", type: "camp", x: 2352, y: 3440, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 9 }, { name: "level", type: "int", value: 108 }, { name: "species", type: "int", value: 15 }, { name: "count", type: "int", value: 1 }] }, { id: 217, name: "camp-9-11", type: "camp", x: 2e3, y: 4304, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 9 }, { name: "level", type: "int", value: 108 }, { name: "species", type: "int", value: 15 }, { name: "count", type: "int", value: 2 }] }, { id: 218, name: "camp-9-12", type: "camp", x: 2160, y: 4464, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 9 }, { name: "level", type: "int", value: 108 }, { name: "species", type: "int", value: 15 }, { name: "count", type: "int", value: 3 }] }, { id: 219, name: "camp-9-13", type: "camp", x: 3024, y: 4176, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 9 }, { name: "level", type: "int", value: 108 }, { name: "species", type: "int", value: 15 }, { name: "count", type: "int", value: 3 }] }, { id: 220, name: "camp-9-14", type: "camp", x: 2064, y: 4016, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 9 }, { name: "level", type: "int", value: 107 }, { name: "species", type: "int", value: 15 }, { name: "count", type: "int", value: 2 }] }, { id: 221, name: "camp-9-15", type: "camp", x: 2544, y: 4528, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 9 }, { name: "level", type: "int", value: 107 }, { name: "species", type: "int", value: 15 }, { name: "count", type: "int", value: 1 }] }, { id: 222, name: "camp-9-16", type: "camp", x: 2640, y: 3664, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 9 }, { name: "level", type: "int", value: 107 }, { name: "species", type: "int", value: 15 }, { name: "count", type: "int", value: 3 }] }, { id: 223, name: "camp-9-17", type: "camp", x: 2416, y: 3696, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 9 }, { name: "level", type: "int", value: 107 }, { name: "species", type: "int", value: 15 }, { name: "count", type: "int", value: 3 }] }, { id: 224, name: "camp-9-18", type: "camp", x: 2864, y: 3920, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 9 }, { name: "level", type: "int", value: 106 }, { name: "species", type: "int", value: 15 }, { name: "count", type: "int", value: 3 }] }, { id: 225, name: "camp-9-19", type: "camp", x: 2224, y: 3856, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 9 }, { name: "level", type: "int", value: 106 }, { name: "species", type: "int", value: 15 }, { name: "count", type: "int", value: 1 }] }, { id: 226, name: "camp-9-20", type: "camp", x: 2192, y: 4208, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 9 }, { name: "level", type: "int", value: 106 }, { name: "species", type: "int", value: 15 }, { name: "count", type: "int", value: 1 }] }, { id: 227, name: "camp-9-21", type: "camp", x: 2736, y: 4336, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 9 }, { name: "level", type: "int", value: 106 }, { name: "species", type: "int", value: 15 }, { name: "count", type: "int", value: 1 }] }, { id: 228, name: "camp-9-22", type: "camp", x: 2384, y: 4368, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 9 }, { name: "level", type: "int", value: 106 }, { name: "species", type: "int", value: 15 }, { name: "count", type: "int", value: 3 }] }, { id: 229, name: "elite-10-0", type: "elite", x: 2e3, y: 2992, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 10 }, { name: "level", type: "int", value: 115 }, { name: "species", type: "int", value: 18 }, { name: "count", type: "int", value: 1 }] }, { id: 230, name: "camp-10-1", type: "camp", x: 3504, y: 1872, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 10 }, { name: "level", type: "int", value: 115 }, { name: "species", type: "int", value: 18 }, { name: "count", type: "int", value: 2 }] }, { id: 231, name: "camp-10-2", type: "camp", x: 2288, y: 3056, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 10 }, { name: "level", type: "int", value: 115 }, { name: "species", type: "int", value: 18 }, { name: "count", type: "int", value: 3 }] }, { id: 232, name: "camp-10-3", type: "camp", x: 1744, y: 2576, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 10 }, { name: "level", type: "int", value: 115 }, { name: "species", type: "int", value: 18 }, { name: "count", type: "int", value: 3 }] }, { id: 233, name: "camp-10-4", type: "camp", x: 3376, y: 2064, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 10 }, { name: "level", type: "int", value: 115 }, { name: "species", type: "int", value: 18 }, { name: "count", type: "int", value: 2 }] }, { id: 234, name: "camp-10-5", type: "camp", x: 2096, y: 2800, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 10 }, { name: "level", type: "int", value: 114 }, { name: "species", type: "int", value: 17 }, { name: "count", type: "int", value: 3 }] }, { id: 235, name: "camp-10-6", type: "camp", x: 3248, y: 1840, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 10 }, { name: "level", type: "int", value: 114 }, { name: "species", type: "int", value: 17 }, { name: "count", type: "int", value: 2 }] }, { id: 236, name: "camp-10-7", type: "camp", x: 2352, y: 2768, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 10 }, { name: "level", type: "int", value: 114 }, { name: "species", type: "int", value: 17 }, { name: "count", type: "int", value: 3 }] }, { id: 237, name: "camp-10-8", type: "camp", x: 3120, y: 2256, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 10 }, { name: "level", type: "int", value: 114 }, { name: "species", type: "int", value: 17 }, { name: "count", type: "int", value: 2 }] }, { id: 238, name: "camp-10-9", type: "camp", x: 2576, y: 1424, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 10 }, { name: "level", type: "int", value: 114 }, { name: "species", type: "int", value: 17 }, { name: "count", type: "int", value: 1 }] }, { id: 239, name: "camp-10-10", type: "camp", x: 3120, y: 2032, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 10 }, { name: "level", type: "int", value: 113 }, { name: "species", type: "int", value: 17 }, { name: "count", type: "int", value: 3 }] }, { id: 240, name: "camp-10-11", type: "camp", x: 1904, y: 2320, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 10 }, { name: "level", type: "int", value: 113 }, { name: "species", type: "int", value: 17 }, { name: "count", type: "int", value: 3 }] }, { id: 241, name: "camp-10-12", type: "camp", x: 2096, y: 2544, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 10 }, { name: "level", type: "int", value: 113 }, { name: "species", type: "int", value: 17 }, { name: "count", type: "int", value: 3 }] }, { id: 242, name: "camp-10-13", type: "camp", x: 2992, y: 1776, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 10 }, { name: "level", type: "int", value: 113 }, { name: "species", type: "int", value: 17 }, { name: "count", type: "int", value: 2 }] }, { id: 243, name: "camp-10-14", type: "camp", x: 2800, y: 1616, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 10 }, { name: "level", type: "int", value: 113 }, { name: "species", type: "int", value: 17 }, { name: "count", type: "int", value: 1 }] }, { id: 244, name: "camp-10-15", type: "camp", x: 2256, y: 1584, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 10 }, { name: "level", type: "int", value: 112 }, { name: "species", type: "int", value: 17 }, { name: "count", type: "int", value: 3 }] }, { id: 245, name: "camp-10-16", type: "camp", x: 2448, y: 2544, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 10 }, { name: "level", type: "int", value: 112 }, { name: "species", type: "int", value: 17 }, { name: "count", type: "int", value: 3 }] }, { id: 246, name: "camp-10-17", type: "camp", x: 2928, y: 2160, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 10 }, { name: "level", type: "int", value: 112 }, { name: "species", type: "int", value: 17 }, { name: "count", type: "int", value: 3 }] }, { id: 247, name: "camp-10-18", type: "camp", x: 2480, y: 1648, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 10 }, { name: "level", type: "int", value: 112 }, { name: "species", type: "int", value: 17 }, { name: "count", type: "int", value: 3 }] }, { id: 248, name: "camp-10-19", type: "camp", x: 2096, y: 2032, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 10 }, { name: "level", type: "int", value: 112 }, { name: "species", type: "int", value: 17 }, { name: "count", type: "int", value: 3 }] }, { id: 249, name: "camp-10-20", type: "camp", x: 2672, y: 2384, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 10 }, { name: "level", type: "int", value: 111 }, { name: "species", type: "int", value: 16 }, { name: "count", type: "int", value: 2 }] }, { id: 250, name: "camp-10-21", type: "camp", x: 2832, y: 1968, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 10 }, { name: "level", type: "int", value: 111 }, { name: "species", type: "int", value: 16 }, { name: "count", type: "int", value: 2 }] }, { id: 251, name: "camp-10-22", type: "camp", x: 2672, y: 1808, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 10 }, { name: "level", type: "int", value: 111 }, { name: "species", type: "int", value: 16 }, { name: "count", type: "int", value: 2 }] }, { id: 252, name: "camp-10-23", type: "camp", x: 2320, y: 1808, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 10 }, { name: "level", type: "int", value: 111 }, { name: "species", type: "int", value: 16 }, { name: "count", type: "int", value: 2 }] }, { id: 253, name: "camp-10-24", type: "camp", x: 2256, y: 2256, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 10 }, { name: "level", type: "int", value: 111 }, { name: "species", type: "int", value: 16 }, { name: "count", type: "int", value: 3 }] }, { id: 254, name: "boss-11-0", type: "boss", x: 3312, y: 2512, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 11 }, { name: "level", type: "int", value: 120 }, { name: "species", type: "int", value: 19 }, { name: "count", type: "int", value: 1 }] }, { id: 255, name: "camp-11-1", type: "camp", x: 2480, y: 3024, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 11 }, { name: "level", type: "int", value: 120 }, { name: "species", type: "int", value: 19 }, { name: "count", type: "int", value: 2 }] }, { id: 256, name: "camp-11-2", type: "camp", x: 3472, y: 3440, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 11 }, { name: "level", type: "int", value: 120 }, { name: "species", type: "int", value: 19 }, { name: "count", type: "int", value: 2 }] }, { id: 257, name: "camp-11-3", type: "camp", x: 2736, y: 3472, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 11 }, { name: "level", type: "int", value: 119 }, { name: "species", type: "int", value: 19 }, { name: "count", type: "int", value: 3 }] }, { id: 258, name: "camp-11-4", type: "camp", x: 2960, y: 3568, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 11 }, { name: "level", type: "int", value: 119 }, { name: "species", type: "int", value: 19 }, { name: "count", type: "int", value: 3 }] }, { id: 259, name: "camp-11-5", type: "camp", x: 3568, y: 3152, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 11 }, { name: "level", type: "int", value: 119 }, { name: "species", type: "int", value: 19 }, { name: "count", type: "int", value: 1 }] }, { id: 260, name: "camp-11-6", type: "camp", x: 2608, y: 3216, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 11 }, { name: "level", type: "int", value: 118 }, { name: "species", type: "int", value: 19 }, { name: "count", type: "int", value: 1 }] }, { id: 261, name: "camp-11-7", type: "camp", x: 3504, y: 2928, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 11 }, { name: "level", type: "int", value: 118 }, { name: "species", type: "int", value: 19 }, { name: "count", type: "int", value: 1 }] }, { id: 262, name: "camp-11-8", type: "camp", x: 2672, y: 2832, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 11 }, { name: "level", type: "int", value: 117 }, { name: "species", type: "int", value: 18 }, { name: "count", type: "int", value: 3 }] }, { id: 263, name: "camp-11-9", type: "camp", x: 3344, y: 2768, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 11 }, { name: "level", type: "int", value: 117 }, { name: "species", type: "int", value: 18 }, { name: "count", type: "int", value: 1 }] }, { id: 264, name: "camp-11-10", type: "camp", x: 3024, y: 2672, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 11 }, { name: "level", type: "int", value: 117 }, { name: "species", type: "int", value: 18 }, { name: "count", type: "int", value: 2 }] }, { id: 265, name: "camp-11-11", type: "camp", x: 2960, y: 3344, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 11 }, { name: "level", type: "int", value: 116 }, { name: "species", type: "int", value: 18 }, { name: "count", type: "int", value: 1 }] }, { id: 266, name: "camp-11-12", type: "camp", x: 3248, y: 3280, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 11 }, { name: "level", type: "int", value: 116 }, { name: "species", type: "int", value: 18 }, { name: "count", type: "int", value: 3 }] }, { id: 267, name: "camp-11-13", type: "camp", x: 2768, y: 3056, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 11 }, { name: "level", type: "int", value: 116 }, { name: "species", type: "int", value: 18 }, { name: "count", type: "int", value: 1 }] }] }, { id: 5, name: "pois", type: "objectgroup", draworder: "topdown", opacity: 1, visible: true, x: 0, y: 0, objects: [{ id: 268, name: "\u0E1B\u0E23\u0E30\u0E15\u0E39\u0E27\u0E32\u0E23\u0E4C\u0E1B \u2022 \u0E25\u0E32\u0E19\u0E08\u0E2D\u0E14\u0E22\u0E32\u0E19\u0E2E\u0E35\u0E42\u0E23\u0E48", type: "warp", x: 4752, y: 4752, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 0 }] }, { id: 269, name: "\u0E1B\u0E23\u0E30\u0E15\u0E39\u0E27\u0E32\u0E23\u0E4C\u0E1B \u2022 \u0E1B\u0E48\u0E32\u0E40\u0E2B\u0E47\u0E14\u0E40\u0E23\u0E37\u0E2D\u0E07\u0E41\u0E2A\u0E07", type: "warp", x: 3056, y: 5168, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 1 }] }, { id: 270, name: "\u0E1B\u0E23\u0E30\u0E15\u0E39\u0E27\u0E32\u0E23\u0E4C\u0E1B \u2022 \u0E17\u0E38\u0E48\u0E07\u0E2A\u0E1B\u0E2D\u0E23\u0E4C\u0E2D\u0E33\u0E1E\u0E31\u0E19", type: "warp", x: 1584, y: 4560, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 2 }] }, { id: 271, name: "\u0E1B\u0E23\u0E30\u0E15\u0E39\u0E27\u0E32\u0E23\u0E4C\u0E1B \u2022 \u0E40\u0E19\u0E34\u0E19\u0E23\u0E31\u0E07\u0E1B\u0E25\u0E27\u0E01\u0E22\u0E31\u0E01\u0E29\u0E4C", type: "warp", x: 944, y: 3088, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 3 }] }, { id: 272, name: "\u0E1B\u0E23\u0E30\u0E15\u0E39\u0E27\u0E32\u0E23\u0E4C\u0E1B \u2022 \u0E2B\u0E19\u0E2D\u0E07\u0E19\u0E49\u0E33\u0E01\u0E23\u0E14", type: "warp", x: 1584, y: 1584, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 4 }] }, { id: 273, name: "\u0E1B\u0E23\u0E30\u0E15\u0E39\u0E27\u0E32\u0E23\u0E4C\u0E1B \u2022 \u0E1B\u0E48\u0E32\u0E04\u0E23\u0E34\u0E2A\u0E15\u0E31\u0E25\u0E44\u0E0B\u0E40\u0E1A\u0E2D\u0E23\u0E4C", type: "warp", x: 3056, y: 944, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 5 }] }, { id: 274, name: "\u0E1B\u0E23\u0E30\u0E15\u0E39\u0E27\u0E32\u0E23\u0E4C\u0E1B \u2022 \u0E2A\u0E38\u0E2A\u0E32\u0E19\u0E2B\u0E38\u0E48\u0E19\u0E23\u0E1A", type: "warp", x: 4560, y: 1584, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 6 }] }, { id: 275, name: "\u0E1B\u0E23\u0E30\u0E15\u0E39\u0E27\u0E32\u0E23\u0E4C\u0E1B \u2022 \u0E2B\u0E38\u0E1A\u0E23\u0E31\u0E07\u0E41\u0E21\u0E07\u0E1B\u0E48\u0E2D\u0E07", type: "warp", x: 5168, y: 3056, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 7 }] }, { id: 276, name: "\u0E1B\u0E23\u0E30\u0E15\u0E39\u0E27\u0E32\u0E23\u0E4C\u0E1B \u2022 \u0E19\u0E04\u0E23\u0E19\u0E35\u0E2D\u0E2D\u0E19\u0E23\u0E49\u0E32\u0E07", type: "warp", x: 4208, y: 3056, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 8 }] }, { id: 277, name: "\u0E1B\u0E23\u0E30\u0E15\u0E39\u0E27\u0E32\u0E23\u0E4C\u0E1B \u2022 \u0E23\u0E31\u0E07\u0E1C\u0E36\u0E49\u0E07\u0E40\u0E2B\u0E25\u0E47\u0E01", type: "warp", x: 2512, y: 4080, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 9 }] }, { id: 278, name: "\u0E1B\u0E23\u0E30\u0E15\u0E39\u0E27\u0E32\u0E23\u0E4C\u0E1B \u2022 \u0E23\u0E2D\u0E22\u0E41\u0E22\u0E01\u0E1E\u0E25\u0E31\u0E07\u0E21\u0E37\u0E14", type: "warp", x: 2480, y: 2064, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 10 }] }, { id: 279, name: "\u0E1B\u0E23\u0E30\u0E15\u0E39\u0E27\u0E32\u0E23\u0E4C\u0E1B \u2022 \u0E41\u0E01\u0E19\u0E14\u0E32\u0E27\u0E40\u0E1E\u0E25\u0E34\u0E07", type: "warp", x: 3056, y: 3056, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 11 }] }, { id: 280, name: "\u0E04\u0E25\u0E31\u0E07\u0E40\u0E2A\u0E1A\u0E35\u0E22\u0E07", type: "shop", x: 4560, y: 4784, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 0 }] }, { id: 281, name: "\u0E42\u0E23\u0E07\u0E2D\u0E31\u0E1B\u0E40\u0E01\u0E23\u0E14", type: "forge", x: 4784, y: 4560, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 0 }] }, { id: 282, name: "\u0E28\u0E39\u0E19\u0E22\u0E4C\u0E1D\u0E36\u0E01\u0E2E\u0E35\u0E42\u0E23\u0E48", type: "skills", x: 4624, y: 4592, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 0 }] }, { id: 283, name: "\u0E2A\u0E16\u0E32\u0E19\u0E35\u0E2D\u0E2D\u0E42\u0E23\u0E23\u0E32", type: "town", x: 4944, y: 4720, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 0 }] }, { id: 284, name: "\u0E1B\u0E23\u0E30\u0E15\u0E39\u0E1B\u0E48\u0E32\u0E0A\u0E35\u0E27\u0E30\u0E41\u0E2A\u0E07", type: "forest", x: 4880, y: 4912, width: 0, height: 0, point: true, rotation: 0, visible: true, properties: [{ name: "zone", type: "int", value: 0 }] }] }], nextlayerid: 6, nextobjectid: 285 };

// server/world.js
var HEROES3 = ["sword-cockro", "sword-dragonfly", "sword-cricket", "demon-scorpion"];
var PROTOCOL = "cockro-online-2";
var dist2 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
var finite = (...v) => v.every((x) => typeof x === "number" && Number.isFinite(x));
var World = class {
  constructor({ maxPlayers = 64, testRewards = false, roamers = false } = {}) {
    if (!Number.isInteger(maxPlayers) || maxPlayers < 1 || maxPlayers > 256) throw Error("invalid_capacity");
    this.testRewards = testRewards;
    this.maxPlayers = maxPlayers;
    this.players = /* @__PURE__ */ new Map();
    this.sleepers = /* @__PURE__ */ new Map();
    this.fights = /* @__PURE__ */ new Map();
    this.loot = [];
    this.lootSequence = 0;
    this.maps = { town: MAPS.town, forest: MAPS.forest, star: parseTiled(hero_star_default) };
    this.mobs = { town: [], forest: makePopulation().map((e) => ({ ...e, id: e.spawnId })), star: [] };
    this.events = [];
    this.sequence = 0;
    this.roamers = roamers ? createRoamers(this) : /* @__PURE__ */ new Map();
    for (const c of this.maps.star.spawns) for (let k = 0; k < c.count; k++) {
      const def = starMonster(c.level, { slot: c.species, elite: c.elite && !c.boss, boss: c.boss });
      let pos = { x: c.x + Math.cos(k * 2.4 + c.id) * (k ? 48 : 0), y: c.y + Math.sin(k * 2.4 + c.id) * (k ? 48 : 0) };
      if (!walkable(this.maps.star, pos)) pos = { x: c.x, y: c.y };
      this.mobs.star.push({ id: `${c.id}-${k}`, def, ...pos, homeX: pos.x, homeY: pos.y, hp: def.hp, state: "idle", clock: 1, face: 1 });
    }
  }
  getActor(id) {
    return this.players.get(id) || this.sleepers.get(id) || this.roamers.get(id);
  }
  actors() {
    return [...this.players.values(), ...this.sleepers.values(), ...this.roamers.values()];
  }
  makeActor(id, s) {
    normalizeFashion(s);
    const p = { id, s, name: s.name || "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E15\u0E31\u0E49\u0E07\u0E0A\u0E37\u0E48\u0E2D", map: "town", ...toWorld(MAPS.town.spawn, MAPS.town), hp: maxHP(s), mp: combatStats(s).mp, face: 1, anim: "idle", walkDX: 0.707, walkDY: 0.707, walkDistance: 0, animTime: 0, cd: {}, moveAt: Date.now() / 1e3, actionUntil: 0, seq: 0 };
    const w = s.worldState;
    if (w && this.maps[w.map] && walkable(this.maps[w.map], w)) {
      Object.assign(p, { map: w.map, x: w.x, y: w.y, hp: Math.min(maxHP(s), w.hp), mp: Math.min(combatStats(s).mp, w.mp), cd: { ...w.cd }, offlineSince: w.offlineSince || 0 });
    }
    return p;
  }
  restore(id, s) {
    if (!s.worldState || this.getActor(id)) return;
    const p = this.makeActor(id, s);
    p.offline = true;
    for (const r of p.s.pvpReports || []) if (r.pending) {
      r.pending = false;
      r.unread = true;
    }
    this.sleepers.set(id, p);
    return p;
  }
  join(id, s) {
    if (this.players.has(id)) throw Error("already_online");
    if (this.players.size >= this.maxPlayers) throw Error("room_full");
    const p = this.sleepers.get(id) || this.makeActor(id, s);
    this.sleepers.delete(id);
    p.s = s;
    p.name = s.name || p.name;
    Object.assign(p, { offline: false, seq: 0, moveAt: Date.now() / 1e3, entered: true });
    this.players.set(id, p);
    return p;
  }
  disconnect(p) {
    if (this.players.get(p.id) !== p) return;
    this.players.delete(p.id);
    p.offline = true;
    p.offlineSince = Date.now();
    p.anim = "idle";
    this.sleepers.set(p.id, p);
    capturePresence(p);
    p.dirty = true;
  }
  spawnLoot(p, e, now) {
    const rewards = monsterRewards(p.s, e.def);
    rewards.forEach((item, i) => this.loot.push({ ...item, id: `loot-${++this.lootSequence}`, owner: p.id, hero: p.s.hero, map: p.map, x: e.x + (i - 1) * 35, y: e.y + (i - 1) * -35, created: now, expires: now + LOOT_SECONDS }));
  }
  collectGround(now) {
    this.loot = this.loot.filter((d) => {
      if (now >= d.expires) return false;
      if (now - d.created < 0.35) return true;
      const p = this.players.get(d.owner);
      if (p && p.hp > 0 && p.map === d.map && (dist2(p, d) <= LOOT_RADIUS && dist2(traceStep(this.maps[p.map], p, d), d) < 1 || p.pet && dist2(p.pet, d) <= PET_PICKUP_RADIUS && dist2(p, d) <= 400 && dist2(traceStep(this.maps[p.map], p.pet, d), d) < 1) && collectLoot(p.s, d)) {
        p.dirty = true;
        this.event(p, { kind: "lootPickup", loot: d });
        return false;
      }
      return true;
    });
  }
  home(p) {
    return p.map === "town" || p.map === "star" && dist2(p, this.maps.star.spawn) < 430;
  }
  enter(p, map, gate = 0) {
    if (!Object.hasOwn(this.maps, map)) return false;
    gate = Number.isInteger(gate) ? gate : 0;
    let pos;
    if (map === "star") {
      if (!STAR_ZONES[gate] || p.s.level < STAR_ZONES[gate].min) return false;
      const g = this.maps.star.pois.find((q) => q.action === "warp" && q.zone === gate);
      pos = { x: g.world.x + 40, y: g.world.y + 70 };
    } else if (map === "forest") {
      if (!REGIONS[gate] || p.s.level < REGIONS[gate].min) return false;
      pos = toWorld(REGIONS[gate].entry, MAPS.forest);
    } else pos = toWorld(MAPS.town.spawn, MAPS.town);
    Object.assign(p, pos, { map, hp: maxHP(p.s), mp: combatStats(p.s).mp, anim: "idle", moveAt: Date.now() / 1e3 });
    return true;
  }
  event(p, data) {
    this.events.push({ id: ++this.sequence, map: p.map, player: p.id, x: p.x, y: p.y, ...data });
    if (this.events.length > 80) this.events.shift();
  }
  hit(p, e, amount, now) {
    if (e.hp <= 0) return;
    e.hp = Math.max(0, e.hp - amount);
    e.flash = 0.15;
    e.aggro = p.id;
    this.event(p, { kind: "hit", target: e.id, x: e.x, y: e.y, amount: Math.round(amount) });
    if (!e.hp) {
      e.respawnAt = now + (e.def.boss ? 25 : 8);
      e.state = "dead";
      e.clock = 1;
      const before = p.s.level;
      this.spawnLoot(p, e, now);
      if (p.s.level > before) {
        p.hp = maxHP(p.s);
        for (const r of knownSkills(p.s).filter((r2) => r2.level > before && r2.level <= p.s.level)) {
          const slot = [0, 1, 2, 3, 4].find((i) => !p.s.equipped[i]);
          if (slot !== void 0) p.s.equipped[slot] = r.id;
        }
      }
      p.dirty = true;
    }
  }
  command(p, d, now = Date.now() / 1e3) {
    if (!d || typeof d !== "object" || Array.isArray(d)) return;
    const s = p.s;
    if (d.type === "move") {
      if (!finite(d.x, d.y, d.seq) || d.seq <= p.seq || p.hp <= 0) return;
      p.seq = d.seq;
      const elapsed = Math.min(0.3, Math.max(0, now - p.moveAt));
      p.moveAt = now;
      const speed = ((s.hero.startsWith("sword") ? 165 : 160) + combatStats(s).speed) * movementMultiplier(s, now * 1e3);
      const n2 = dist2(p, d), allowed = speed * elapsed;
      const ratio = n2 ? Math.min(1, allowed / n2) : 0;
      const next = traceStep(this.maps[p.map], p, { x: p.x + (d.x - p.x) * ratio, y: p.y + (d.y - p.y) * ratio });
      const dx = next.x - p.x, dy = next.y - p.y;
      p.walkDistance += Math.hypot(dx, dy);
      p.anim = Math.hypot(dx, dy) > 0.1 ? "walk" : "idle";
      if (now < p.actionUntil) p.anim = p.actionKind;
      Object.assign(p, next);
      if (Math.hypot(dx, dy) > 0.1) p.dirty = true;
      if (Math.hypot(dx, dy) > 0.1) {
        p.face = dx - dy >= 0 ? 1 : -1;
        p.walkDX = dx;
        p.walkDY = dy;
        p.back = dx + dy < 0;
      }
      const destination = roadDestination(p.map, p, s.level, this.maps.star);
      if (destination && now > (p.cd.road || 0)) {
        const arrival = roadArrival(destination, this.maps.star);
        Object.assign(p, arrival, { map: destination.map, entered: true });
        p.cd.road = now + 2;
      }
      return;
    }
    if (d.type === "enter") {
      if (p.hp <= 0) return;
      if (now - (p.lastPvp || -Infinity) < 10) return;
      if (now < (p.cd.enter || 0)) return;
      p.cd.enter = now + 1;
      if (this.enter(p, d.map, d.gate)) p.entered = true;
      return;
    }
    if (d.type === "revive") {
      if (p.hp <= 0) {
        this.enter(p, "town");
        p.pvpShield = now + 10;
        p.entered = true;
      }
      return;
    }
    if (d.type === "op") {
      p.opResult = { ok: false, message: "\u0E04\u0E33\u0E02\u0E2D\u0E16\u0E35\u0E48\u0E40\u0E01\u0E34\u0E19\u0E44\u0E1B \u0E01\u0E23\u0E38\u0E13\u0E32\u0E25\u0E2D\u0E07\u0E43\u0E2B\u0E21\u0E48" };
      if (now < (p.cd.op || 0)) return;
      p.cd.op = now + 0.1;
      p.opResult = { ok: false, message: "\u0E17\u0E33\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E15\u0E23\u0E27\u0E08\u0E40\u0E07\u0E34\u0E19 \u0E27\u0E31\u0E2A\u0E14\u0E38 \u0E41\u0E25\u0E30\u0E1E\u0E37\u0E49\u0E19\u0E17\u0E35\u0E48\u0E01\u0E23\u0E30\u0E40\u0E1B\u0E4B\u0E32" };
      const atHome = this.home(p);
      if (MERCHANT_OPS.has(d.op) && p.map !== "town") {
        p.opResult.message = "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E04\u0E38\u0E22\u0E01\u0E31\u0E1A\u0E2B\u0E38\u0E48\u0E19\u0E1E\u0E48\u0E2D\u0E04\u0E49\u0E32 MERC-01 \u0E43\u0E19\u0E22\u0E32\u0E19";
        return;
      }
      switch (d.op) {
        case "readPvpReports": {
          for (const r2 of s.pvpReports || []) r2.unread = false;
          p.opResult.ok = true;
          break;
        }
        case "buyPet":
          p.opResult.ok = buyPet(s, d.id);
          break;
        case "equipPet":
          p.opResult.ok = equipPet(s, d.id === "none" ? null : d.id);
          break;
        case "buyExpTicket":
          p.opResult.ok = buyExpTicket(s, d.id);
          break;
        case "useExpTicket":
          p.opResult.ok = p.hp > 0 && useExpTicket(s, d.id, d.replaceUntil, now * 1e3);
          break;
        case "townBuff": {
          if (now - (p.lastPvp || -Infinity) < 10) break;
          const near = p.map === "town";
          if (grantTownBuff(p, this.testRewards, near, now * 1e3)) {
            p.hp = maxHP(s);
            p.mp = combatStats(s).mp;
            this.event(p, { kind: "buff" });
            p.opResult.ok = true;
          }
          break;
        }
        case "claimActivity":
          claimActivity(s, d.id, now * 1e3);
          break;
        case "rerollSpecial":
          if (atHome) rerollSpecial(s, d.slot);
          break;
        case "exchangeGold":
          p.opResult.ok = !!exchangeGold(s, Number(d.amount));
          break;
        case "buyShopGear":
          p.opResult.ok = !!buyShopGear(s, d.slot, d.tier);
          break;
        case "fashionWear":
          wearFashion(s, d.id);
          break;
        case "fashionRemove":
          removeFashion(s, d.slot);
          break;
        case "dailyCheckin":
          claimCheckin(s, now * 1e3);
          break;
        case "buy":
          p.opResult.ok = buyMerchantStack(s, d.op, null, d.quantity ?? 1, UPGRADE_ITEMS);
          break;
        case "buyMP":
          p.opResult.ok = buyMerchantStack(s, d.op, null, d.quantity ?? 1, UPGRADE_ITEMS);
          break;
        case "upgrade":
          break;
        case "buyUpgradeItem":
          if (typeof d.id === "string") p.opResult.ok = buyMerchantStack(s, d.op, d.id, d.quantity ?? 1, UPGRADE_ITEMS);
          break;
        case "allocateStats":
          p.opResult.ok = allocateStats(s, d.values);
          p.opResult.message = "\u0E41\u0E15\u0E49\u0E21\u0E44\u0E21\u0E48\u0E1E\u0E2D\u0E2B\u0E23\u0E37\u0E2D\u0E08\u0E33\u0E19\u0E27\u0E19\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07";
          break;
        case "socketGem":
          if (atHome && typeof d.id === "string" && typeof d.slot === "string") socketGem(s, d.slot, d.id);
          break;
        case "upgradeGear":
          if (atHome && typeof d.slot === "string") upgradeGear(s, d.slot);
          break;
        case "stat":
          if (typeof d.key === "string") allocateStat(s, d.key);
          break;
        case "train":
          if (typeof d.id === "string") trainSkill(s, d.id);
          break;
        case "equipSkill": {
          const r2 = knownSkills(s).find((r3) => r3.id === d.id && r3.level <= s.level);
          if (r2 && Number.isInteger(d.slot) && d.slot >= 0 && d.slot < 5) {
            const old = s.equipped.indexOf(r2.id);
            if (old >= 0) s.equipped[old] = null;
            s.equipped[d.slot] = r2.id;
          }
          break;
        }
        case "equip":
          if (typeof d.id === "string") equip(s, d.id);
          break;
        case "unequip":
          if (typeof d.slot === "string" && Object.hasOwn(s.equip, d.slot)) unequip(s, d.slot);
          break;
        case "sell":
          if (atHome && typeof d.id === "string") sell(s, d.id);
          break;
        default:
          return;
      }
      p.dirty = true;
      return;
    }
    if (p.hp <= 0) return;
    if (["attackPlayer", "skillPlayer"].includes(d.type)) {
      pvpAttack(this, p, d, now);
      return;
    }
    if (d.type === "mpPotion") {
      if (now < (p.cd.mpPotion || 0) || (s.mpPotions || 0) < 1 || p.mp >= combatStats(s).mp) return;
      p.cd.mpPotion = now + 6;
      s.mpPotions--;
      p.mp = Math.min(combatStats(s).mp, p.mp + combatStats(s).mp * 0.5);
      p.dirty = true;
      return;
    }
    if (d.type === "potion") {
      if (now < (p.cd.potion || 0) || s.potions < 1 || p.hp >= maxHP(s)) return;
      p.cd.potion = now + 4;
      s.potions--;
      p.hp = Math.min(maxHP(s), p.hp + maxHP(s) * 0.5);
      p.dirty = true;
      return;
    }
    if (d.type === "dash") {
      if (now < (p.cd.dash || 0) || !finite(d.x, d.y)) return;
      const n2 = dist2(p, d) || 1;
      Object.assign(p, traceStep(this.maps[p.map], p, { x: p.x + (d.x - p.x) / n2 * 150, y: p.y + (d.y - p.y) / n2 * 150 }));
      p.cd.dash = now + 2;
      p.inv = now + 0.6;
      p.entered = true;
      return;
    }
    if (!["attack", "skill"].includes(d.type) || this.home(p) || now < p.actionUntil) return;
    const targets = this.mobs[p.map].filter((e) => e.hp > 0).sort((a, b) => dist2(p, a) - dist2(p, b));
    const target = targets.find((e) => e.id === d.target) || targets[0];
    if (d.type === "attack") {
      const range = s.hero === "sword-dragonfly" ? 340 : 120;
      if (now < (p.cd.attack || 0) || !target || dist2(p, target) > range) return;
      const end = traceStep(this.maps[p.map], p, target);
      if (dist2(end, target) > 1) return;
      p.cd.attack = now + 0.46 * (1 - combatStats(s).haste);
      p.actionUntil = now + 0.35;
      p.actionKind = "attack";
      p.anim = "attack";
      this.hit(p, target, damage(s) * (Math.random() < combatStats(s).crit ? 1.5 : 1), now);
      this.event(p, { kind: "attack", hero: s.hero, aim: { x: target.x, y: target.y }, range });
      return;
    }
    if (!Number.isInteger(d.slot) || d.slot < 0 || d.slot > 4) return;
    const r = knownSkills(s).find((r2) => r2.id === s.equipped[d.slot] && r2.level <= s.level);
    if (!r) return;
    const k = compileSkill(r);
    if (now < (p.cd[r.id] || 0) || p.mp < k.mp) return;
    p.mp -= k.mp;
    p.cd[r.id] = now + k.cd;
    p.actionUntil = now + 0.5;
    p.actionKind = "skill";
    p.anim = "skill";
    p.castId = r.id;
    let aim = target ? { x: target.x, y: target.y } : { x: p.x + p.face * 150, y: p.y - p.face * 150 };
    const n = dist2(p, aim);
    if (n > k.range) aim = { x: p.x + (aim.x - p.x) / n * k.range, y: p.y + (aim.y - p.y) / n * k.range };
    const origin = { x: p.x, y: p.y }, length = dist2(origin, aim) || 1, direction = { x: (aim.x - origin.x) / length, y: (aim.y - origin.y) / length };
    let endpoint = { x: origin.x + direction.x * k.range, y: origin.y + direction.y * k.range };
    if (k.form === "dash") {
      endpoint = traceStep(this.maps[p.map], origin, endpoint);
      k.range = dist2(origin, endpoint);
      aim = endpoint;
    }
    const victims = skillTargets(k, origin, aim, targets).filter((e) => dist2(traceStep(this.maps[p.map], origin, e), e) < 1);
    if (k.form === "bolt" && victims.length) endpoint = { x: victims.at(-1).x, y: victims.at(-1).y };
    for (const e of victims) {
      if (dist2(traceStep(this.maps[p.map], p, e), e) > 1) continue;
      const amount = damage(s) * k.power * combatStats(s).spell * (1 + (s.skillRanks[r.id] || 0) * 0.06) * (k.element === "lightning" ? 1.2 : 1);
      this.hit(p, e, amount, now);
      if (k.mods.includes("drain")) p.hp = Math.min(maxHP(s), p.hp + Math.min(amount * 0.08, maxHP(s) * 0.08));
      if (e.hp > 0 && ["fire", "poison"].includes(k.element)) e.dot = { owner: p.id, left: k.element === "fire" ? 3 : 6, dps: damage(s) * (k.element === "fire" ? 0.15 : 0.1) };
      if (k.element === "ice") e.slow = now + 3;
    }
    if (k.form === "dash") Object.assign(p, endpoint);
    this.event(p, { kind: "skill", x: origin.x, y: origin.y, hero: s.hero, skillId: k.id, form: k.form, aim: ["field", "circle"].includes(k.form) ? aim : endpoint, color: k.color, radius: k.radius, range: k.range });
  }
  tick(dt, now = Date.now() / 1e3) {
    tickRoamers(this, dt, now);
    tickPvp(this, dt, now);
    for (const p of this.players.values()) stepPet(p, this.loot, dt, now, (a, b) => traceStep(this.maps[p.map], a, b));
    this.collectGround(now);
    for (const p of this.actors()) {
      if (p.offline && (!p.defender || now - (p.lastPvp || 0) > 10)) continue;
      if (p.s.townBuffUntil && (!this.testRewards || !buffActive(p.s, now * 1e3))) {
        p.s.townBuffUntil = 0;
        p.hp = Math.min(p.hp, maxHP(p.s));
        p.mp = Math.min(p.mp, combatStats(p.s).mp);
        p.dirty = true;
      }
      p.animTime += dt;
      applyRegen(p, dt, maxHP(p.s), combatStats(p.s).mp);
      p.mp = Math.min(combatStats(p.s).mp, p.mp + dt * manaRegen(p.s));
      if (this.home(p) && p.hp > 0 && now - (p.lastPvp || -Infinity) > 10) p.hp = Math.min(maxHP(p.s), p.hp + dt * maxHP(p.s) * 0.1);
      if (now - p.moveAt > 0.25 && now >= p.actionUntil) p.anim = "idle";
    }
    for (const map of ["forest", "star"]) {
      const players = [...this.players.values()].filter((p) => p.map === map && p.hp > 0 && !this.home(p));
      for (const e of this.mobs[map]) {
        e.clock = Math.max(0, (e.clock || 0) - dt);
        e.flash = Math.max(0, (e.flash || 0) - dt);
        e.moving = false;
        if (e.hp <= 0) {
          if (now >= e.respawnAt && players.every((p2) => dist2(p2, { x: e.homeX, y: e.homeY }) > 220)) Object.assign(e, { x: e.homeX, y: e.homeY, hp: e.def.hp, state: "idle", dot: null, aggro: null });
          continue;
        }
        if (e.dot?.left > 0) {
          const owner = this.players.get(e.dot.owner);
          if (owner && owner.map === map) this.hit(owner, e, e.dot.dps * Math.min(dt, e.dot.left), now);
          e.dot.left -= dt;
          if (e.hp <= 0) continue;
        }
        let p = players.find((p2) => p2.id === e.aggro && dist2(p2, e) < 700) || players.filter((p2) => aggressiveMonster(e.def) && dist2(p2, e) < 230).sort((a, b) => dist2(a, e) - dist2(b, e))[0];
        if (!p) {
          wanderMonster(e, this.maps[map], dt, now);
          continue;
        }
        const distance3 = dist2(p, e);
        if (e.returning || dist2(e, { x: e.homeX, y: e.homeY }) > 650) {
          e.returning = true;
          e.state = "idle";
          e.aggro = null;
          moveMonster(e, this.maps[map], { x: e.homeX, y: e.homeY }, e.def.speed * dt);
          if (dist2(e, { x: e.homeX, y: e.homeY }) < 12) {
            e.returning = false;
            e.hp = e.def.hp;
          }
          continue;
        }
        if (distance3 > 230 && e.aggro !== p.id && e.state !== "windup") {
          wanderMonster(e, this.maps[map], dt, now);
          continue;
        }
        const kind = e.def.attack, range = kind === "signature" ? Math.min(e.def.range, 350) : kind === "projectile" ? 280 : kind === "cone" ? 210 : kind === "burst" ? 150 : kind === "dash" ? 180 : 65;
        if (kind === "signature" && e.state === "windup") {
          if (e.clock <= 0) {
            const zones = monsterZones(e);
            this.event({ id: e.id, map, x: e.x, y: e.y }, { kind: "monsterSkill", zones, color: e.def.color, pattern: e.def.pattern });
            for (const victim of players) if (zones.some((z) => zoneContains(z, victim)) && dist2(traceStep(this.maps[map], e, victim), victim) < 1 && now > (victim.inv || 0)) {
              victim.hp = Math.max(0, victim.hp - e.def.damage * 100 / (100 + combatStats(victim.s).defense));
              victim.inv = now + 0.35;
            }
            if (["charge", "drill"].includes(e.def.pattern)) Object.assign(e, traceStep(this.maps[map], e, { x: e.x + Math.cos(e.angle) * e.def.range, y: e.y + Math.sin(e.angle) * e.def.range }));
            e.state = "idle";
            e.clock = e.def.cooldown;
          }
          continue;
        }
        if (e.state === "windup") {
          if (e.clock <= 0) {
            const end = { x: e.x + Math.cos(e.angle) * range, y: e.y + Math.sin(e.angle) * range };
            this.event({ id: e.id, map, x: e.x, y: e.y }, { kind: "monsterSkill", color: "#ffad65", pattern: kind === "projectile" ? "rail" : "rupture", zones: kind === "projectile" ? [{ type: "poly", points: [[e.x - 12 * Math.sin(e.angle), e.y + 12 * Math.cos(e.angle)], [end.x - 12 * Math.sin(e.angle), end.y + 12 * Math.cos(e.angle)], [end.x + 12 * Math.sin(e.angle), end.y - 12 * Math.cos(e.angle)], [e.x + 12 * Math.sin(e.angle), e.y - 12 * Math.cos(e.angle)]] }] : [{ type: "disk", x: e.x, y: e.y, radius: kind === "burst" ? 150 : kind === "cone" ? 200 : 85 }] });
            if (kind === "dash") {
              Object.assign(e, traceStep(this.maps[map], e, { x: e.x + Math.cos(e.angle) * 160, y: e.y + Math.sin(e.angle) * 160 }));
            }
            for (const victim of players) {
              const d = dist2(victim, e), dx = victim.x - e.x, dy = victim.y - e.y, along = dx * Math.cos(e.angle) + dy * Math.sin(e.angle), across = Math.abs(-dx * Math.sin(e.angle) + dy * Math.cos(e.angle));
              const hit = kind === "burst" ? d < 150 : kind === "cone" ? inCone(victim.x, victim.y, e.x, e.y, e.angle, 245, Math.PI * 0.7) : kind === "projectile" ? along > 0 && along < 315 && across < 28 : d < (kind === "dash" ? 85 : 100);
              if (hit && dist2(traceStep(this.maps[map], e, victim), victim) < 1 && now > (victim.inv || 0)) {
                victim.hp = Math.max(0, victim.hp - e.def.damage * 100 / (100 + combatStats(victim.s).defense));
                victim.inv = now + 0.35;
              }
            }
            e.state = "idle";
            e.clock = e.def.cooldown;
          }
          continue;
        }
        if (distance3 < range && e.clock <= 0) {
          e.state = "windup";
          e.clock = e.def.boss ? 1.1 : e.def.attack === "signature" ? 1 : 0.75;
          e.aimX = p.x;
          e.aimY = p.y;
          e.angle = Math.atan2(p.y - e.y, p.x - e.x);
        } else if (distance3 > range * 0.8) {
          const speed = e.def.speed * (now < (e.slow || 0) ? 0.65 : 1), step = Math.min(distance3 - range * 0.8, speed * dt);
          const next = traceStep(this.maps[map], e, { x: e.x + (p.x - e.x) / distance3 * step, y: e.y + (p.y - e.y) / distance3 * step });
          e.walkDistance = (e.walkDistance || 0) + dist2(e, next);
          e.moving = dist2(e, next) > 0.01;
          e.face = next.x - e.x - (next.y - e.y) >= 0 ? 1 : -1;
          Object.assign(e, next);
        }
      }
    }
  }
  snapshot(p, now = Date.now() / 1e3) {
    const actor = (q) => ({ id: q.id, pet: q.pet ? { ...q.pet } : null, offline: !!q.offline, shopTitle: q.offline ? "" : q.shopTitle || "", name: q.name, hero: q.s.hero, townBuffUntil: q.s.townBuffUntil || 0, auraLevel: auraLevel(q.s), appearance: appearance(q.s), level: q.s.level, x: q.x, y: q.y, hp: q.hp, maxHp: maxHP(q.s), face: q.face, anim: q.hp <= 0 ? "dead" : q.anim, animTime: q.animTime, walkDX: q.walkDX, walkDY: q.walkDY, walkDistance: q.walkDistance, back: q.back, castId: q.castId });
    const self = { ...actor(p), map: p.map, mp: p.mp, actionRemaining: Math.max(0, p.actionUntil - now), save: p.s, correction: !!p.entered, cooldowns: Object.fromEntries(Object.entries(p.cd).map(([k, v]) => [k, Math.max(0, v - now)])) };
    p.entered = false;
    return { type: "state", serverTime: now * 1e3, self, online: this.players.size, loot: this.loot.filter((d) => d.map === p.map && dist2(p, d) < 1700).map((d) => ({ ...d, owner: void 0 })), players: this.actors().filter((q) => q !== p && q.map === p.map && dist2(p, q) < 1800).sort((a, b) => dist2(p, a) - dist2(p, b)).slice(0, 32).map(actor), monsters: this.mobs[p.map].filter((e) => dist2(p, e) < 1700).map((e) => ({ id: e.id, x: e.x, y: e.y, def: e.def, hp: e.hp, state: e.state, clock: e.clock, angle: e.angle, aimX: e.aimX, aimY: e.aimY, face: e.face, flash: e.flash, moving: e.moving, walkDistance: e.walkDistance })), events: this.events.filter((e) => e.map === p.map && dist2(p, e) < 1800) };
  }
};

// server/server.js
function startServer({ port = 8091, host = "127.0.0.1", directory = "./online-data", test = false, testRewards = false, roamers = !test, maxPlayers = Number(process.env.COCKRO_MAX_PLAYERS || 64), adUnit = process.env.ADMOB_REWARDED_UNIT_ID || "", ssvVerifier, billingVerifier } = {}) {
  (0, import_node_fs8.mkdirSync)(directory, { recursive: true, mode: 448 });
  const accounts = createAccounts(directory);
  const world = new World({ maxPlayers, testRewards, roamers }), connections = /* @__PURE__ */ new Set(), limits = /* @__PURE__ */ new Map(), activeAccounts = /* @__PURE__ */ new Set();
  let diskFailure = false;
  const ssvStatus = { verified: 0, rejected: 0, lastError: null };
  function allow(ip) {
    const now = Date.now();
    let q = (limits.get(ip) || []).filter((t) => t > now - 6e4);
    if (q.length >= Math.max(30, maxPlayers * 2)) return false;
    q.push(now);
    limits.set(ip, q);
    return true;
  }
  const persist = (p) => {
    if (p.roamer) return;
    if (commerce.failed) throw Error("save_unavailable");
    if (accounts.deletion.isCharacterDeleted(p.id)) throw Error("account_deleted");
    try {
      if (p.map) capturePresence(p);
      const path = (0, import_node_path8.join)(directory, p.id + ".json");
      (0, import_node_fs8.writeFileSync)(path + ".tmp", JSON.stringify(p.s), { mode: 384 });
      (0, import_node_fs8.renameSync)(path + ".tmp", path);
      p.dirty = false;
      p.lastSaved = Date.now();
    } catch {
      diskFailure = true;
      throw Error("save_unavailable");
    }
  };
  const commerce = createCommerce(directory, { players: () => world.players, getActor: (id) => world.getActor(id), capture: capturePresence });
  for (const file of (0, import_node_fs8.readdirSync)(directory).filter((n) => /^[a-f0-9]{64}\.json$/.test(n))) {
    try {
      const state = validSave(JSON.parse((0, import_node_fs8.readFileSync)((0, import_node_path8.join)(directory, file), "utf8")));
      if (state && !accounts.deletion.isCharacterDeleted(file.slice(0, -5))) world.restore(file.slice(0, -5), state);
    } catch {
      diskFailure = true;
    }
  }
  const billing = createBillingService(directory, billingVerifier);
  const adsEnabled = /^ca-app-pub-\d{16}\/\d{10}$/.test(adUnit) && !adUnit.includes("3940256099942544");
  const verifySSV = ssvVerifier || createSSVVerifier({ unit: adUnit });
  let verifying = 0;
  const server = import_node_http.default.createServer(async (req, res) => {
    if (req.url?.startsWith("/online/ads/ssv?")) {
      res.setHeader("Cache-Control", "no-store");
      if (!adsEnabled || req.method !== "GET") {
        res.writeHead(404);
        return res.end();
      }
      if (verifying >= 8) {
        res.writeHead(503);
        return res.end();
      }
      verifying++;
      try {
        const data = await verifySSV(req.url.split("?")[1]);
        ssvStatus.verified++;
        if (data.user_id === "0".repeat(64) && data.custom_data === "0".repeat(48)) {
          const stamp = Number(data.timestamp);
          if (!Number.isFinite(stamp) || Math.abs(Date.now() - stamp) > 3e5) throw Error("expired_probe");
          res.writeHead(200);
          return res.end("Verified configuration; no reward granted");
        }
        const live = world.getActor(data.user_id), path = (0, import_node_path8.join)(directory, data.user_id + ".json");
        if (!live && !(0, import_node_fs8.existsSync)(path)) throw Error("unknown_account");
        const state = structuredClone(live ? live.s : JSON.parse((0, import_node_fs8.readFileSync)(path, "utf8")));
        const changed = applyVerifiedReward(state, data);
        if (changed) {
          const holder = { id: data.user_id, s: state };
          persist(holder);
          if (live) {
            live.s = state;
            live.dirty = false;
            const ticket = state.adTickets.find((t) => t.nonce === data.custom_data);
            for (const socket of connections) {
              if (socket.player?.() === live) {
                send(socket, world.snapshot(live));
                send(socket, { type: "adReward", item: ticket.item });
              }
            }
          }
        }
        res.writeHead(200);
        res.end("OK");
      } catch (error) {
        ssvStatus.rejected++;
        ssvStatus.lastError = ["wrong_ad_unit", "wrong_reward", "invalid_reward_identity", "invalid_signature", "duplicate_parameter", "invalid_callback", "keys_unavailable", "expired_probe", "unknown_account", "unknown_ticket", "expired_reward", "used_ticket", "duplicate_transaction", "inventory_full", "save_unavailable"].includes(error.message) ? error.message : "verification_failed";
        res.writeHead(error.message === "save_unavailable" || error.message === "keys_unavailable" ? 503 : 400);
        res.end("Unverified reward");
      } finally {
        verifying--;
      }
      return;
    }
    if (req.url === "/online/health") {
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Cache-Control", "no-store");
      res.writeHead(diskFailure ? 503 : 200);
      res.end(JSON.stringify({ ok: !diskFailure, version: PROTOCOL, release: "4.37.0", identityCleanupPublicKey: accounts.deletion.publicKey, ssv: ssvStatus, advancedSpecies: 20, forestSpecies: 20, forestRoaming: true, forestPopulation: world.mobs.forest.length, forestBosses: world.mobs.forest.filter((e) => e.def.boss).length, roamingCharacters: world.roamers.size, players: world.players.size, offlinePlayers: world.sleepers.size, persistentPvp: true, groundLoot: true, capacity: world.maxPlayers }));
    } else {
      res.writeHead(404);
      res.end();
    }
  });
  const wss = new import_websocket_server.default({ noServer: true, maxPayload: 4096, perMessageDeflate: false });
  server.on("upgrade", (req, socket, head) => {
    const origin = req.headers.origin;
    const validOrigin = origin === "https://appassets.androidplatform.net" || origin === "https://cockro-game-updates.vercel.app" || /^https:\/\/cockro-game-updates-[a-z0-9-]+\.vercel\.app$/.test(origin || "") || test && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin || "");
    const ip = req.socket.remoteAddress === "127.0.0.1" ? req.headers["x-real-ip"] || req.socket.remoteAddress : req.socket.remoteAddress;
    if (req.url !== "/online/world" || !validOrigin || connections.size >= maxPlayers + 16 || !allow(ip)) {
      socket.end("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws));
  });
  const send = (ws, data) => {
    if (ws.readyState === 1 && ws.bufferedAmount < 262144) {
      if (data.type === "state") data.stalls = data.self.map === "town" ? commerce.stalls().filter((it) => Math.hypot(it.x - data.self.x, it.y - data.self.y) < 1800).slice(0, 64) : [];
      const packet = stateForWire(data, ws.eventCursor || 0);
      ws.send(JSON.stringify(packet));
      if (packet.type === "state") for (const e of packet.events) ws.eventCursor = Math.max(ws.eventCursor || 0, e.id);
    } else ws.close(1013, "slow_connection");
  };
  const chat = createChat({ connections, send });
  wss.on("connection", (ws) => {
    connections.add(ws);
    let p = null, count = 0, since = Date.now();
    const timer = setTimeout(() => ws.close(1008, "handshake_timeout"), 6e3);
    ws.alive = true;
    ws.on("pong", () => ws.alive = true);
    ws.on("error", () => {
    });
    let managing = false;
    ws.on("message", async (raw) => {
      if (managing) return;
      if (commerce.failed) {
        ws.close(1011);
        return;
      }
      try {
        const now = Date.now();
        if (now - since >= 1e3) {
          count = 0;
          since = now;
        }
        if (++count > 35) throw Error("rate_limit");
        const d = JSON.parse(raw);
        if (!d || Array.isArray(d) || typeof d !== "object") throw Error("invalid_message");
        if (!p && ["manage", "authStart", "authFinish"].includes(d.type)) {
          managing = true;
          clearTimeout(timer);
          try {
            let result;
            if (d.type === "authStart") {
              if (d.token) {
                try {
                  if (activeAccounts.has(accounts.resolve(d.token))) throw Error("already_online");
                } catch (e) {
                  if (e.message !== "login_required") throw e;
                }
              }
              result = await accounts.authStart(d.token, d.purpose);
            } else if (d.type === "authFinish") {
              result = await accounts.authFinish(d.flow, d.code);
            } else {
              if (activeAccounts.has(accounts.resolve(d.token))) throw Error("already_online");
              const owner = accounts.resolve(d.token);
              try {
                if (d.action === "delete" && commerce.ownsListedItems(owner, characterId(owner, d.character))) throw Error("shop_items_pending");
                result = d.action === "purchaseHistory" ? billing.history(owner, d.offset ?? 0) : await accounts.manage(d.token, d);
                if (d.action === "purchaseHistory") {
                  const roster = characterRoster(directory, owner);
                  for (const r of result.purchases) {
                    const c = roster.find((c2) => characterId(owner, c2.id) === r.character);
                    r.characterName = r.characterName || (c ? "\u0E0A\u0E48\u0E2D\u0E07 " + (CHARACTER_SLOTS.indexOf(c.id) + 1) + " (\u0E44\u0E21\u0E48\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E0A\u0E37\u0E48\u0E2D\u0E40\u0E14\u0E34\u0E21)" : "\u0E15\u0E31\u0E27\u0E25\u0E30\u0E04\u0E23\u0E17\u0E35\u0E48\u0E16\u0E39\u0E01\u0E25\u0E1A");
                    delete r.character;
                  }
                }
              } finally {
                if (accounts.deletion.isDeleted(owner)) commerce.removeAccount(owner);
                if (result && d.action === "delete" || accounts.deletion.isDeleted(owner)) {
                  const ids = d.action === "delete" ? [characterId(owner, d.character)] : CHARACTER_SLOTS.map((slot) => characterId(owner, slot));
                  for (const id of ids) {
                    for (const [key, fight] of [...world.fights]) if (fight.a === id || fight.b === id) finishFight(world, key, "interrupted", "interrupted", Date.now() / 1e3);
                    world.sleepers.delete(id);
                  }
                }
              }
            }
            send(ws, { type: "accountResult", ...result });
          } catch (e) {
            send(ws, { type: "error", message: e.message });
          } finally {
            ws.close(1e3);
          }
          return;
        }
        if (!p) {
          if (d.type !== "hello" || d.version !== PROTOCOL) throw Error("version_mismatch");
          let token = d.token;
          let created = false;
          if (d.preview === true && !token) throw Error("invalid_token");
          if (d.create === true && !token) {
            if (!test) throw Error("login_required");
            if (!HEROES3.includes(d.hero)) throw Error("invalid_hero");
            if ((0, import_node_fs8.readdirSync)(directory).filter((n) => n.endsWith(".json")).length >= 5e3) throw Error("account_capacity");
            token = (0, import_node_crypto11.randomBytes)(32).toString("hex");
            created = true;
          }
          if (typeof token !== "string" || !/^\w{64}$/.test(token)) throw Error("invalid_token");
          const account = created ? (0, import_node_crypto11.createHash)("sha256").update(token).digest("hex") : accounts.resolve(token);
          for (const slot of CHARACTER_SLOTS) {
            const body = world.sleepers.get(characterId(account, slot));
            if (body?.dirty) persist(body);
          }
          const main = created ? fresh(d.hero) : readCharacter(directory, account);
          if (!main && !accounts.exists(account)) throw Error("account_missing");
          if (d.preview === true) {
            send(ws, { type: "roster", characters: characterRoster(directory, account) });
            clearTimeout(timer);
            ws.close(1e3);
            return;
          }
          if (activeAccounts.has(account) || accounts.busy.has(account)) throw Error("already_online");
          let character = d.character || "main", state;
          if (d.newCharacter === true && !created) {
            if (!HEROES3.includes(d.hero)) throw Error("invalid_hero");
            character = CHARACTER_SLOTS.find((slot) => !readCharacter(directory, account, slot));
            if (!character) throw Error("character_limit");
            state = fresh(d.hero);
          } else state = character === "main" ? main : readCharacter(directory, account, character);
          if (!state) throw Error("character_missing");
          if (!created && !d.newCharacter && !characterName(state.name)) throw Error("name_required");
          if (created || d.newCharacter === true) {
            const name = characterName(d.name);
            if (!name) throw Error("invalid_name");
            state.name = name;
          }
          const id = characterId(account, character);
          if (testRewards && (created || d.newCharacter === true)) state.gold = 1e6;
          accounts.referrals.deliver(account, character, state, (value) => {
            const file = (0, import_node_path8.join)(directory, id + ".json");
            (0, import_node_fs8.writeFileSync)(file + ".tmp", JSON.stringify(value));
            (0, import_node_fs8.renameSync)(file + ".tmp", file);
          }, { welcome: (created || d.newCharacter === true) && characterRoster(directory, account).length === 0 });
          if (!testRewards) state.townBuffUntil = 0;
          p = world.join(id, state);
          p.account = account;
          p.character = character;
          activeAccounts.add(account);
          persist(p);
          state = p.s;
          clearTimeout(timer);
          send(ws, { type: "welcome", release: "4.37.0", id, character, chatEnabled: true, token: created ? token : void 0, save: state, adsEnabled, testRewards, billingEnabled: billing.enabled, billingOwner: account });
          send(ws, world.snapshot(p));
          return;
        }
        if (d.type === "chat") {
          try {
            chat.handle(p, d);
          } catch (e) {
            send(ws, { type: "chatError", message: e.message });
          }
          return;
        }
        if (d.type === "commerce") {
          try {
            const result = commerce.run(p, d);
            for (const socket of connections) {
              const actor = socket.player?.();
              if (actor) send(socket, world.snapshot(actor));
            }
            send(ws, { type: "commerceResult", ok: true, ...result });
          } catch (e) {
            send(ws, { type: "commerceResult", ok: false, message: e.message, ...commerce.failed ? {} : commerce.view(p) });
            if (commerce.failed) {
              diskFailure = true;
              for (const socket of connections) socket.close(1011);
            }
          }
          return;
        }
        if (d.type === "billingPurchase") {
          managing = true;
          p.economyBusy = true;
          try {
            const reward2 = await billing.redeem(p, d, persist);
            send(ws, world.snapshot(p));
            send(ws, { type: "billingResult", ok: true, ...reward2 });
          } catch (e) {
            send(ws, { type: "billingResult", ok: false, message: ["payment_pending", "wrong_account", "wallet_full", "billing_unavailable", "purchase_busy"].includes(e.message) ? e.message : "purchase_not_verified" });
          } finally {
            managing = false;
            p.economyBusy = false;
            if (ws.readyState !== 1) activeAccounts.delete(p.account);
          }
          return;
        }
        if (d.type === "testAdTicket" || d.type === "testAdComplete") {
          if (!testRewards) {
            send(ws, { type: "adError", message: "test_rewards_disabled" });
            return;
          }
          try {
            const copy = structuredClone(p.s);
            if (d.type === "billingPurchase") {
              managing = true;
              p.economyBusy = true;
              try {
                const reward2 = await billing.redeem(p, d, persist);
                send(ws, world.snapshot(p));
                send(ws, { type: "billingResult", ok: true, ...reward2 });
              } catch (e) {
                send(ws, { type: "billingResult", ok: false, message: ["payment_pending", "wrong_account", "wallet_full", "billing_unavailable", "purchase_busy"].includes(e.message) ? e.message : "purchase_not_verified" });
              } finally {
                managing = false;
                p.economyBusy = false;
                if (ws.readyState !== 1) activeAccounts.delete(p.account);
              }
              return;
            }
            if (d.type === "testAdTicket") {
              const ticket = issueTestTicket(copy, d.item);
              persist({ id: p.id, s: copy });
              p.s = copy;
              send(ws, { type: "adTicket", user: p.id, nonce: ticket.nonce, item: ticket.item, test: true });
            } else {
              const reward2 = completeTestTicket(copy, d.nonce);
              persist({ id: p.id, s: copy });
              p.s = copy;
              send(ws, world.snapshot(p));
              send(ws, { type: "adReward", ...reward2 });
            }
          } catch (error) {
            send(ws, { type: "adError", message: error.message });
          }
          return;
        }
        if (d.type === "adTicket") {
          if (!adsEnabled) {
            send(ws, { type: "adError", message: "ads_disabled" });
            return;
          }
          try {
            const copy = structuredClone(p.s), ticket = issueRewardTicket(copy, d.item);
            persist({ id: p.id, s: copy });
            p.s = copy;
            p.dirty = false;
            send(ws, { type: "adTicket", user: p.id, nonce: ticket.nonce, item: ticket.item });
          } catch (error) {
            send(ws, { type: "adError", message: error.message === "save_unavailable" ? "save_unavailable" : "ad_pending" });
          }
          return;
        }
        world.command(p, d);
        if (p.dirty && ["op", "potion", "mpPotion", "enter", "revive"].includes(d.type)) persist(p);
        if (d.type === "op") {
          send(ws, world.snapshot(p));
          send(ws, { type: "opResult", op: d.op, requestId: d.requestId, ...p.opResult });
        }
      } catch (error) {
        send(ws, { type: "error", message: ["login_required", "name_required", "invalid_name", "already_online", "room_full", "account_missing", "save_unavailable", "character_missing", "character_limit"].includes(error.message) ? error.message : "invalid_request" });
        if (!p || error.message === "save_unavailable") ws.close(1008);
      }
    });
    ws.on("close", () => {
      clearTimeout(timer);
      connections.delete(ws);
      if (p) {
        commerce.lockVault(p);
        world.disconnect(p);
        try {
          persist(p);
        } catch {
        }
        if (!managing) activeAccounts.delete(p.account);
      }
    });
    ws.player = () => p;
  });
  let previous = Date.now();
  const ticker = setInterval(() => {
    const now = Date.now();
    if (commerce.failed) return;
    commerce.refreshSigns();
    world.tick(Math.min(0.2, (now - previous) / 1e3), now / 1e3);
    previous = now;
    for (const p of world.sleepers.values()) {
      if (p.dirty && now - (p.lastSaved || 0) >= 1e3) {
        try {
          persist(p);
        } catch {
        }
      }
    }
    for (const ws of connections) {
      const p = ws.player();
      if (!p) continue;
      try {
        if (p.dirty && now - (p.lastSaved || 0) >= 5e3) persist(p);
        send(ws, world.snapshot(p));
      } catch {
        send(ws, { type: "error", message: "save_unavailable" });
        ws.close(1011);
      }
    }
  }, 100);
  const deletionWorker = setInterval(() => accounts.deletion.processPending().catch(() => {
  }), 6e4);
  accounts.deletion.processPending().catch(() => {
  });
  const heartbeat = setInterval(() => {
    for (const ws of connections) {
      if (!ws.alive) {
        ws.terminate();
        continue;
      }
      ws.alive = false;
      ws.ping();
    }
    for (const [ip, q] of limits) if (q.at(-1) < Date.now() - 6e4) limits.delete(ip);
  }, 2e4);
  server.listen(port, host);
  const close = async () => {
    clearInterval(ticker);
    clearInterval(heartbeat);
    clearInterval(deletionWorker);
    for (const key of [...world.fights.keys()]) finishFight(world, key, "interrupted", "interrupted", Date.now() / 1e3);
    for (const p of world.actors()) {
      try {
        persist(p);
      } catch {
      }
    }
    for (const ws of connections) ws.terminate();
    await new Promise((ok) => server.close(ok));
  };
  return { server, world, close };
}

// server/release-backup.js
var import_node_fs9 = require("node:fs");
var import_node_path9 = require("node:path");
function backupBefore416(directory, release = "4.16.0") {
  (0, import_node_fs9.mkdirSync)(directory, { recursive: true, mode: 448 });
  const root = (0, import_node_path9.join)(directory, "release-backups"), final = (0, import_node_path9.join)(root, "before-" + release);
  if ((0, import_node_fs9.existsSync)((0, import_node_path9.join)(final, "complete.json"))) return false;
  (0, import_node_fs9.mkdirSync)(root, { recursive: true, mode: 448 });
  const stage = (0, import_node_path9.join)(root, `before-${release}-${Date.now()}-${process.pid}`);
  (0, import_node_fs9.mkdirSync)(stage, { mode: 448 });
  const names = (0, import_node_fs9.readdirSync)(directory).filter((n) => /^[a-f0-9]{64}\.json$/.test(n));
  for (const name of names) (0, import_node_fs9.copyFileSync)((0, import_node_path9.join)(directory, name), (0, import_node_path9.join)(stage, name), import_node_fs9.constants.COPYFILE_EXCL);
  for (const name of ["accounts", "deleted-characters", "account-deletions", "commerce.json", "commerce-pending.json", "referrals.json", "play-receipts", "account-cleanup-key.pem"]) if ((0, import_node_fs9.existsSync)((0, import_node_path9.join)(directory, name))) (0, import_node_fs9.cpSync)((0, import_node_path9.join)(directory, name), (0, import_node_path9.join)(stage, name), { recursive: true, errorOnExist: true, force: false });
  (0, import_node_fs9.writeFileSync)((0, import_node_path9.join)(stage, "complete.json"), JSON.stringify({ release, accounts: names.length, created: (/* @__PURE__ */ new Date()).toISOString() }), { mode: 384, flag: "wx" });
  (0, import_node_fs9.renameSync)(stage, final);
  console.log(`Pre-${release} backup complete: ${names.length} accounts`);
  return true;
}

// admob-config.json
var admob_config_default = {
  appId: "ca-app-pub-4585492700643566~3340769116",
  rewardedUnitId: "ca-app-pub-4585492700643566/6530873388",
  internalTestRewards: true
};

// server/main.js
backupBefore416(process.env.COCKRO_ONLINE_DATA || "/var/lib/cockro-online", "4.34.0");
var app = startServer({ testRewards: (process.env.COCKRO_TEST_REWARDS ?? String(admob_config_default.internalTestRewards || false)) === "true", directory: process.env.COCKRO_ONLINE_DATA || "/var/lib/cockro-online", port: Number(process.env.PORT || 8091), adUnit: process.env.ADMOB_REWARDED_UNIT_ID ?? admob_config_default.rewardedUnitId });
console.log("COCKRO online server started on loopback");
for (const sig of ["SIGTERM", "SIGINT"]) process.on(sig, async () => {
  await app.close();
  process.exit(0);
});
