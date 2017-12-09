import cloneDeep from 'lodash.clonedeep';
import * as firebase from 'firebase';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';

import Handsontable from 'handsontable';
import 'handsontable/dist/handsontable.full.css';

import Typography from 'material-ui/Typography';
import Grid from 'material-ui/Grid';

import Card, { CardContent } from 'material-ui/Card';
import { LinearProgress } from 'material-ui/Progress';

import { withStyles } from 'material-ui/styles';

import GlobalHeader from './GlobalHeader';
import Dashboad from './Dashboad';
import TaskListCtl from './TaskListCtl';

import firebaseConf from '../confings/firebase';
import { hotConf, emptyHotData } from '../confings/hot';

const initialState = {
  userId: '',
  loading: true,
  notifiable: true,
  date: moment().format('YYYY-MM-DD'),
  lastSaveTime: { hour: 0, minute: 0, second: 0 },
  allTasks: [],
};

const styles = {
  root: {
    margin: '0 auto',
    maxWidth: 1280,
  },
};


// ローディングが早すぎて一回もロードされてないように見えるため、
// デザイン目的で最低でも1秒はローディングするようにしている。実際ないほうが良い。
const loadingDuration = 1000;

const NotificationClone = (() => ('Notification' in window ? cloneDeep(Notification) : false))();
firebase.initializeApp(firebaseConf);

let hot = null;

class App extends Component {
  constructor(props) {
    super(props);
    this.state = initialState;
  }

  componentWillMount() {
    // 初期値の最終保存時刻
    const currentMoment = moment();
    const timeObj = {
      hour: currentMoment.hour(),
      minute: currentMoment.minute(),
      second: currentMoment.second(),
    };
    this.setState({
      lastSaveTime: timeObj,
    });
  }

  componentDidMount() {
    const self = this;
    hot = new Handsontable(document.getElementById('hot'), Object.assign(hotConf, {
      contextMenu: {
        callback(key) {
          if (key === 'set_current_time') {
            const [row, col] = this.getSelected();
            this.setDataAtCell(row, col, moment().format('HH:mm'));
          }
        },
        items: {
          set_current_time: {
            name: '現在時刻を入力する',
            disabled() {
              const [startRow, startCol, endRow, endCol] = this.getSelected();
              const prop = this.colToProp(startCol);
              return startRow !== endRow || startCol !== endCol || !(prop === 'endTime' || prop === 'startTime');
            },
          },
          hsep1: '---------',
          row_above: {
            name: '上に行を追加する',
          },
          row_below: {
            name: '下に行を追加する',
          },
          hsep2: '---------',
          remove_row: {
            name: '行を削除する',
            disabled() {
              return this.getSelected()[0] === 0;
            },
          },
        },
      },
      beforeChangeRender() {
        self.setStateFromHot();
      },
      afterCreateRow() {
        self.setStateFromHot();
      },
      afterRemoveRow() {
        self.setStateFromHot();
      },
      afterUpdateSettings() {
        self.setStateFromHot();
      },
    }));
    window.hot = hot;
    this.setStateFromHot();
  }

  setAInitialState() {
    this.setState(initialState);
  }

  setStateFromHot() {
    if (hot) {
      const sourceData = cloneDeep(hot.getSourceData());
      if (JSON.stringify(this.state.allTasks) === JSON.stringify(sourceData)) return;
      this.setState({
        allTasks: sourceData,
      });
    }
  }

  toggleNotifiable(event, checked) {
    if ('Notification' in window) {
      Notification = checked ? NotificationClone : false;　// eslint-disable-line
      this.setState(() => ({
        notifiable: checked,
      }));
    }
  }

  fetchTask() {
    this.setState(() => ({
      loading: true,
    }));
    return firebase.database().ref(`/${this.state.userId}/${this.state.date}`).once('value').then((snapshot) => {
      setTimeout(() => {
        this.setState(() => ({
          loading: false,
        }));
      }, loadingDuration);
      return snapshot;
    });
  }

  changeUserId(e) {
    this.setState({ userId: e.target.value });
  }

  loginCallback(userId) {
    this.setState({ userId });
    // テーブルの初期化
    setTimeout(() => {
      this.fetchTask().then((snapshot) => {
        if (hot && snapshot.exists()) {
          hot.updateSettings({ data: snapshot.val() });
        }
      });
    }, 0);
  }

  logoutCallback() {
    // stateの初期化
    this.setAInitialState();
    // テーブルのクリア
    setTimeout(() => {
      if (hot) {
        hot.updateSettings({ data: emptyHotData });
      }
    }, 0);
  }

  changeDate(event) {
    if (!hot) return;
    event.persist();
    this.setState(() => ({
      date: event.target.value,
    }));
    setTimeout(() => {
      this.fetchTask().then((snapshot) => {
        if (snapshot.exists()) {
          // データが存在していたら読み込む
          hot.updateSettings({ data: snapshot.val() });
        } else {
          // データが存在していないので、テーブルを空にする
          hot.updateSettings({ data: emptyHotData });
        }
      });
    }, 0);
  }

  saveHot() {
    if (hot) {
      const sourceData = hot.getSourceData();
      let isEmptyTask = true;
      sourceData.forEach((data) => {
        Object.entries(data).forEach((entry) => {
          if (entry[1]) isEmptyTask = false;
        });
      });
      // タスク一覧に何もデータが入っていなかったら保存しない
      if (!isEmptyTask) {
        this.saveTask(sourceData);
      } else {
        alert('タスクがありません。');
      }
    }
  }

  saveTask(data) {
    const currentMoment = moment();
    const timeObj = {
      hour: currentMoment.hour(),
      minute: currentMoment.minute(),
      second: currentMoment.second(),
    };
    this.setState(() => ({
      loading: true,
      lastSaveTime: timeObj,
    }));
    firebase.database().ref(`/${this.state.userId}/${this.state.date}`).set(data).then(() => {
      setTimeout(() => {
        this.setState(() => ({
          loading: false,
        }));
      }, loadingDuration);
    });
  }

  render() {
    const { classes } = this.props;
    return (
      <div>
        <GlobalHeader
          userId={this.state.userId}
          changeUserId={this.changeUserId.bind(this)}
          loginCallback={this.loginCallback.bind(this)}
          logoutCallback={this.logoutCallback.bind(this)}
        />
        <Grid container spacing={5} className={classes.root}>
          <Card>
            <CardContent>
              <Dashboad
                date={this.state.date}
                changeDate={this.changeDate.bind(this)}
                allTasks={this.state.allTasks}
              />
              <Grid item xs={12}>
                <Typography gutterBottom type="title">
                  {this.state.date.replace(/-/g, '/')} のタスク一覧
                </Typography>
                <Grid container spacing={5}>
                  <TaskListCtl
                    lastSaveTime={this.state.lastSaveTime}
                    saveHot={this.saveHot.bind(this)}
                    notifiable={this.state.notifiable}
                    toggleNotifiable={this.toggleNotifiable.bind(this)}
                  />
                  <Grid item xs={12}>
                    <LinearProgress style={{ visibility: this.state.loading ? 'visible' : 'hidden' }} />
                    <div id="hot" />
                  </Grid>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </div>
    );
  }
}

App.propTypes = {
  classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(App);
