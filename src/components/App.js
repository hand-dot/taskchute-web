import * as firebase from 'firebase';
import React, { Component } from 'react';
import Handsontable from 'handsontable';
import 'handsontable/dist/handsontable.full.css';

import Typography from 'material-ui/Typography';
import Grid from 'material-ui/Grid';

import GlobalHeader from './GlobalHeader';
import TodaySummary from './TodaySummary';
import DatePicker from './DatePicker';

import firebaseConf from '../confings/firebase';
import hotConf from '../confings/hot';
import '../styles/App.css';

class App extends Component {
  componentWillMount() {
    firebase.initializeApp(firebaseConf);
    const starCountRef = firebase.database().ref('/test/msg');
    starCountRef.on('value', (snapshot) => {
      console.log(snapshot.val());
    });
  }
  componentDidMount() {
    const hot = new Handsontable(document.getElementById('hot'), Object.assign(hotConf, {
    }));
  }
  render() {
    return (
      <div>
        <GlobalHeader />
        <div className="App">
          <Typography gutterBottom type="headline">
            概要
          </Typography>
          <div>
            <Grid container spacing={40}>
              <Grid item xs={6}>
                <Typography gutterBottom type="subheading">
                  本日のサマリ
                </Typography>
                <DatePicker />
                <TodaySummary
                  data={{
                    estimate: { hour: 8, task: 10 },
                    done: { hour: 4, task: 6 },
                  }}
                />
              </Grid>
              <Grid item xs={6}>
                <Grid item xs={12}>
                  <Typography gutterBottom type="subheading">
                    現在時刻
                  </Typography>
                  <Typography type="display2">16:20</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography gutterBottom type="subheading">
                    終了予定
                  </Typography>
                  <Typography type="display2">22:20</Typography>
                </Grid>
              </Grid>
              <Grid item xs={12}>
                <Typography gutterBottom type="headline">
                  タスク一覧
                </Typography>
                <div id="hot" />
              </Grid>
            </Grid>
          </div>
        </div>
      </div>
    );
  }
}

export default App;
