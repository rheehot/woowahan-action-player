const PREVENT_DUPLIATE_CALL_KEY = '__prevent_dupliate_call__';

function actionCreator(type, data) {
  data = data || {};

  return {
    wwtype: 'action',
    type: type,
    data
  };
}

export default function Dispatcher() {
  this.mwtype = 'view';

  this.before = function(view) {
    if ('actions' in view) {
      Object.keys(view.actions).forEach(actionName => {
        (function() {
          const context = this;
          const actionValue = this.actions[actionName];

          if (typeof actionValue.tasks !== 'object') {
            return console.warn('Action tasks only support arrays or object types');
          }

          /*
           작업을 실행하는 기본 순서는 병렬 실행이다.
           */
          const preventDupliateCall = actionValue.preventDupliateCall || false;
          const sequenceProcessing = actionValue.sequence || false;
          const tasks = Array.isArray(actionValue.tasks)
            ? actionValue.tasks : [actionValue.tasks];
          const finish = typeof actionValue.finish === 'function'
            ? actionValue.finish : context[actionValue.finish];

          /**
           * 중복 호출 설정을 설정하거나 초기화 한다
           * 1. 첫 번째 호출이고, 중복 호출을
           */
          const initPreventDupliateCall = () => {
            if (preventDupliateCall) {
              if (this.hasOwnProperty(PREVENT_DUPLIATE_CALL_KEY)) {
                if (this[PREVENT_DUPLIATE_CALL_KEY][actionName]) {
                  console.warn(`Action "${actionName}" canceled with duplicate call`);
                  return false;
                } else {
                  // 최초 호출 타임스탬프 설정
                  this[PREVENT_DUPLIATE_CALL_KEY][actionName] = Date.now();
                }
              } else {
                this[PREVENT_DUPLIATE_CALL_KEY] = {
                  [actionName]: Date.now()
                };
              }
            }

            return true;
          };

          const washingDishes = () => {
            delete this.__prev__;

            if (this.hasOwnProperty(PREVENT_DUPLIATE_CALL_KEY)) {
              delete this[PREVENT_DUPLIATE_CALL_KEY][actionName];
            }
          };

          if (sequenceProcessing) {
            this[actionName] = function(userData) {
              if (!initPreventDupliateCall()) return;

              const promiseTasks = tasks.map(__action__ => {
                return function(data = {}) {
                  return new Promise(function(resolve, reject) {
                    let params = {};

                    if ('params' in __action__) {
                      params = (typeof __action__.params === 'function')
                        ? __action__.params.call(context, data.__prev__ || {})
                        : (typeof __action__.params === 'object')
                            ? __action__.params
                            : context[__action__.params].call(context, data.__prev__ || {});
                    }

                    if (params === null) {
                      return reject('canceled!!');
                    }

                    context.dispatch(actionCreator(__action__.name, params), function(err, resp) {
                      data[__action__.name] = { err, resp };
                      data.__prev__ = resp;
                      resolve(data);
                    });
                  });
                };
              });

              promiseTasks.reduce((cur, next) => cur.then(next), Promise.resolve())
                .then(function(data) {
                  washingDishes();
                  finish.call(context, data, userData);
                })
                .catch(function() {
                  washingDishes();
                  console.warn('악!');
                });
            }.bind(this);
          } else {
            this[actionName] = function(userData) {
              if (!initPreventDupliateCall()) return;

              if (preventDupliateCall) {
                if (this.hasOwnProperty(PREVENT_DUPLIATE_CALL_KEY)) {

                }
              }

              let actionList = tasks.map(task => task.name);

              const promiseTasks = tasks.map(task => {
                return new Promise(function(resolve, reject) {
                  let params = {};

                  if ('params' in task) {
                    params = (typeof task.params === 'function')
                      ? task.params.call(context)
                      : (typeof task.params === 'object')
                          ? task.params
                          : context[task.params].call(context);
                  }

                  if (params === null) {
                    return reject('canceled!!');
                  }

                  context.dispatch(actionCreator(task.name, params), function(err, resp) {
                    resolve({ [task.name]: { err, resp } });
                  });
                });
              });

              Promise.all(promiseTasks)
                .then(function(data) {
                  let result = { };

                  if (data.length === 1 && actionList.length === 1) {
                    finish.apply(context, [data[0][actionList[0]].err, data[0][actionList[0]].resp, userData]);
                  } else {
                    actionList.forEach(actionName => result[actionName] = data.find(d => actionName in d)[actionName] );
                    finish.call(context, result, userData);
                  }

                  washingDishes();
                })
                .catch(function() {
                  washingDishes();
                  console.warn('악!', arguments);
                });
            }.bind(this);
          }

          if (actionValue.immediate) {
            this[actionName].call(this);
          }
        }).call(view);
      })
    }
  };
}
