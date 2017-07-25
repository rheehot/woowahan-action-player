# woowahan-action-player

[![npm](https://img.shields.io/npm/v/woowahan-action-player.svg?style=flat-square)]()
[![npm](https://img.shields.io/npm/dm/woowahan-action-player.svg?style=flat-square)]()
[![npm](https://img.shields.io/npm/l/woowahan-action-player.svg?style=flat-square)]()

Action flow control middleware for woowahanjs

#### requirements

* woowahanjs v0.3.0 higher

## Install

```
$ npm install --save-dev woowahan-action-player
```

## Setup

```javascript
import Woowahan from 'woowahan';
import ActionPlayer from 'woowahan-action-player';

const app = new Woowahan();

app.set(ActionPlayer);

```

## Use

```javascript
import Woowahan from 'woowahan';
import { FETCH_DATA1, FETCH_DATA2 } from './actions';

export default Woowahan.View.create('myView', {

  actions: {
    fetchGroupName: {
      immediate: false,
      preventDupliateCall: true, // default false 
      sequence: true,
      tasks: [
        {
          name: FETCH_DATA1,
          params: {
            type: 'xxid'
          }
        },
        {
          name: FETCH_DATA1,
          /**
           뷰의 메소드를 문자열 지정 방식도 지원
           ex) params: 'buildParams', 
          **/
          params(prev) {
            let p = {};
            
            p.subtype = prev.subtype;
            
            return p;
          }
        }
      ],

      finish: 'fetchDataDone',

      error(err) {
        console.error(err);
      }
    },
  },
  
  fetchDataDone(results) {
    console.log(results[FETCH_DATA1]);
    console.log(results[FETCH_DATA2]);
  },

  onSubmit() {
    this.fetchGroupName();
  }

});

```
