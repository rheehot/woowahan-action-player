'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

exports.default = Dispatcher;

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var PREVENT_DUPLIATE_CALL_KEY = '__prevent_dupliate_call__';

function actionCreator(type, data) {
  data = data || {};

  return {
    wwtype: 'action',
    type: type,
    data: data
  };
}

function Dispatcher() {
  this.mwtype = 'view';

  this.before = function (view) {
    if ('actions' in view) {
      Object.keys(view.actions).forEach(function (actionName) {
        (function () {
          var _this = this;

          var context = this;
          var actionValue = this.actions[actionName];

          if (_typeof(actionValue.tasks) !== 'object') {
            return console.warn('Action tasks only support arrays or object types');
          }

          /*
           작업을 실행하는 기본 순서는 병렬 실행이다.
           */
          var preventDupliateCall = actionValue.preventDupliateCall || false;
          var sequenceProcessing = actionValue.sequence || false;
          var tasks = Array.isArray(actionValue.tasks) ? actionValue.tasks : [actionValue.tasks];
          var finish = typeof actionValue.finish === 'function' ? actionValue.finish : context[actionValue.finish];

          /**
           * 중복 호출 설정을 설정하거나 초기화 한다
           * 1. 첫 번째 호출이고, 중복 호출을
           */
          var initPreventDupliateCall = function initPreventDupliateCall() {
            if (preventDupliateCall) {
              if (_this.hasOwnProperty(PREVENT_DUPLIATE_CALL_KEY)) {
                if (_this[PREVENT_DUPLIATE_CALL_KEY][actionName]) {
                  console.warn('Action "' + actionName + '" canceled with duplicate call');
                  return false;
                } else {
                  // 최초 호출 타임스탬프 설정
                  _this[PREVENT_DUPLIATE_CALL_KEY][actionName] = Date.now();
                }
              } else {
                _this[PREVENT_DUPLIATE_CALL_KEY] = _defineProperty({}, actionName, Date.now());
              }
            }

            return true;
          };

          var washingDishes = function washingDishes() {
            delete _this.__prev__;

            if (_this.hasOwnProperty(PREVENT_DUPLIATE_CALL_KEY)) {
              delete _this[PREVENT_DUPLIATE_CALL_KEY][actionName];
            }
          };

          if (sequenceProcessing) {
            this[actionName] = function () {
              if (!initPreventDupliateCall()) return;

              var promiseTasks = tasks.map(function (__action__) {
                return function () {
                  var data = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

                  return new Promise(function (resolve, reject) {
                    var params = {};

                    if ('params' in __action__) {
                      params = typeof __action__.params === 'function' ? __action__.params.call(context, data.__prev__ || {}) : _typeof(__action__.params) === 'object' ? __action__.params : context[__action__.params].call(context, data.__prev__ || {});
                    }

                    if (params === null) {
                      return reject('canceled!!');
                    }

                    context.dispatch(actionCreator(__action__.name, params), function (err, resp) {
                      data[__action__.name] = { err: err, resp: resp };
                      data.__prev__ = resp;
                      resolve(data);
                    });
                  });
                };
              });

              promiseTasks.reduce(function (cur, next) {
                return cur.then(next);
              }, Promise.resolve()).then(function (data) {
                washingDishes();
                finish.call(context, data);
              }).catch(function () {
                washingDishes();
                console.warn('악!');
              });
            }.bind(this);
          } else {
            this[actionName] = function () {
              if (!initPreventDupliateCall()) return;

              if (preventDupliateCall) {
                if (this.hasOwnProperty(PREVENT_DUPLIATE_CALL_KEY)) {}
              }

              var actionList = tasks.map(function (task) {
                return task.name;
              });

              var promiseTasks = tasks.map(function (task) {
                return new Promise(function (resolve, reject) {
                  var params = {};

                  if ('params' in task) {
                    params = typeof task.params === 'function' ? task.params.call(context) : _typeof(task.params) === 'object' ? task.params : context[task.params].call(context);
                  }

                  if (params === null) {
                    return reject('canceled!!');
                  }

                  context.dispatch(actionCreator(task.name, params), function (err, resp) {
                    resolve(_defineProperty({}, task.name, { err: err, resp: resp }));
                  });
                });
              });

              Promise.all(promiseTasks).then(function (data) {
                var result = {};

                if (data.length === 1 && actionList.length === 1) {
                  finish.apply(context, [data[0][actionList[0]].err, data[0][actionList[0]].resp]);
                } else {
                  actionList.forEach(function (actionName) {
                    return result[actionName] = data.find(function (d) {
                      return actionName in d;
                    })[actionName];
                  });
                  finish.call(context, result);
                }

                washingDishes();
              }).catch(function () {
                washingDishes();
                console.warn('악!', arguments);
              });
            }.bind(this);
          }

          if (actionValue.immediate) {
            this[actionName].call(this);
          }
        }).call(view);
      });
    }
  };
}

