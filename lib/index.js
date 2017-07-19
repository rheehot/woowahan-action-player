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
          const sequenceProcessing = actionValue.sequence || false;
          const tasks = Array.isArray(actionValue.tasks)
            ? actionValue.tasks : [actionValue.tasks];
          const finish = typeof actionValue.finish === 'function'
            ? actionValue.finish : context[actionValue.finish];

          if (sequenceProcessing) {
            this[actionName] = function() {
              const promiseTasks = tasks.map(__action__ => {
                return function(data = {}) {
                  return new Promise(function(resolve, reject) {
                    let params = {};

                    if ('params' in __action__) {
                      params = (typeof __action__.params === 'function')
                        ? __action__.params.call(context, data.__prev__ || {})
                        : __action__.params;
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
                    delete data.__prev__;
                    finish.call(context, data);
                  })
                .catch(function() {
                  console.warn('악!');
                });
            }.bind(this);
          } else {
            this[actionName] = function() {
              let actionList = tasks.map(task => task.name);

              const promiseTasks = tasks.map(task => {
                return new Promise(function(resolve, reject) {
                  let params = {};

                  if ('params' in task) {
                    params = (typeof task.params === 'function')
                      ? task.params.call(context)
                      : task.params;
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
                    finish.apply(context, [data[0][actionList[0]].err, data[0][actionList[0]].resp]);
                  } else {
                    actionList.forEach(actionName => result[actionName] = data.find(d => actionName in d)[actionName] );
                    finish.call(context, result);
                  }
                })
                .catch(function() {
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
