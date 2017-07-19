# woowahan-action-player

Action flow control middleware for woowahanjs

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
      preventDupliateCall: 2000, 
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
