import * as firebase from 'firebase';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withStyles } from 'material-ui/styles';
import moment from 'moment';
import cloneDeep from 'lodash.clonedeep';

import Handsontable from 'handsontable';
import 'handsontable/dist/handsontable.full.css';

import Typography from 'material-ui/Typography';
import Grid from 'material-ui/Grid';
import { LinearProgress } from 'material-ui/Progress';
import Button from 'material-ui/Button';
import IconButton from 'material-ui/IconButton';
import Tooltip from 'material-ui/Tooltip';

import '../styles/handsontable-custom.css';

import GlobalHeader from './GlobalHeader';
import Dashboad from './Dashboad';
import TaskListCtl from './TaskListCtl';
import HelpDialog from './HelpDialog';

import firebaseConf from '../configs/firebase';
import { bindShortcut, hotConf, emptyHotData } from '../hot';

import constants from '../constants';

import util from '../util';

const initialState = {
  userId: '',
  loading: true,
  notifiable: true,
  saveable: false,
  isOpenHelpDialog: false,
  date: moment().format('YYYY-MM-DD'),
  lastSaveTime: { hour: 0, minute: 0, second: 0 },
  allTasks: [],
};

const styles = {
  root: {
    margin: '0 auto',
    paddingBottom: 20,
    maxWidth: constants.APPWIDTH,
  },
  navButton: {
    height: '100%',
    width: '100%',
  },
  helpButton: {
    fontSize: 15,
    width: 20,
    height: 20,
  },
};

const NotificationClone = (() => ('Notification' in window ? cloneDeep(Notification) : false))();
firebase.initializeApp(firebaseConf);

// FIXME リファクタリング #66
let prevKey = null;

let hot = null;

// 行の並び替えにも対応した空行を除いたハンズオンテーブルのデータ取得メソッド
const getHotTasks = () => {
  if (hot) {
    const emptyRow = JSON.stringify(cloneDeep(emptyHotData[0]));
    const hotData = hot.getSourceData().map((data, index) => hot.getSourceDataAtRow(hot.toPhysicalRow(index)));
    return cloneDeep(hotData.filter(data => emptyRow !== JSON.stringify(data)));
  }
  return cloneDeep(emptyHotData);
};

class App extends Component {
  constructor(props) {
    super(props);
    this.state = initialState;
  }

  componentWillMount() {
    // 初期値の最終保存時刻
    this.setState({
      lastSaveTime: util.getCrrentTimeObj(),
    });
    window.addEventListener('keydown', (e) => {
      if (prevKey === 'Control' && e.key === 's') {
        e.preventDefault();                      
        // テーブルを保存
        this.saveHot();
      } else if (prevKey === 'Control' && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
        // 基準日を変更
        this.setState({ date: moment(this.state.date).add(e.key === 'ArrowRight' ? 1 : -1, 'day').format('YYYY-MM-DD') });
        setTimeout(() => {
          this.fetchTask().then((snapshot) => {
            const data = snapshot.exists() ? snapshot.val() : cloneDeep(emptyHotData);
            hot.updateSettings({ data });
          });
        }, 0);
      } else if (e.key === '?') {    
        this.setState({ isOpenHelpDialog: !this.state.isOpenHelpDialog });
      }
      prevKey = e.key;
      return false;
    });
    window.addEventListener('beforeunload', (e) => {
      if (this.state.saveable) {
        const dialogText = '保存していない内容があります。';
        e.returnValue = dialogText;
        return dialogText;
      }
    });
  }

  componentDidMount() {
    const self = this;
    hot = new Handsontable(document.getElementById('hot'), Object.assign(hotConf, {
      // 各種callbackでテーブルの状態をstateに反映
      afterRowMove() { self.setStateFromHot(); },
      beforeChangeRender() { self.setStateFromHot(); },
      afterCreateRow() { self.setStateFromHot(); },
      afterRemoveRow() { self.setStateFromHot(); },
      afterUpdateSettings() { self.setStateFromHot(true); },
      afterInit() {
        self.setStateFromHot();
        bindShortcut(this);
      },
    }));
    window.hot = hot;
  }

  setAInitialState() {
    this.setState(initialState);
  }

  setStateFromHot(isUpdateSettings) {
    const hotTasks = getHotTasks();
    if (isUpdateSettings) {
      this.setState({
        saveable: false,
        allTasks: hotTasks,
      });
    } else if (JSON.stringify(this.state.allTasks) !== JSON.stringify(hotTasks)) {
      this.setState({
        saveable: true,
        allTasks: hotTasks,
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
      this.setState(() => ({
        loading: false,
      }));
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
        hot.updateSettings({ data: cloneDeep(emptyHotData) });
      }
    }, 0);
  }

  changeDate(event) {
    if (!hot) return;
    const nav = event.currentTarget.getAttribute('data-date-nav');
    let date;
    if (nav) {
      date = moment(this.state.date).add(nav === 'next' ? 1 : -1, 'day').format('YYYY-MM-DD');
    } else {
      event.persist();
      date = event.target.value;
    }
    if (!this.state.saveable || window.confirm('保存していない内容があります。')) {
      this.setState(() => ({
        date,
      }));
      setTimeout(() => {
        this.fetchTask().then((snapshot) => {
          const data = snapshot.exists() ? snapshot.val() : cloneDeep(emptyHotData);
          hot.updateSettings({ data });
        });
      }, 0);
    }
  }

  saveHot() {
    if (hot) {
      // 並び変えられたデータを取得するために処理が入っている。
      this.saveTask(getHotTasks());
    }
  }

  saveTask(data) {
    this.setState(() => ({
      loading: true,
    }));
    firebase.database().ref(`/${this.state.userId}/${this.state.date}`).set(data).then(() => {
      this.setState(() => ({
        loading: false,
        lastSaveTime: util.getCrrentTimeObj(),
        saveable: false,
      }));
    });
  }

  openHelpDialog() {
    this.setState({ isOpenHelpDialog: true });
  }

  closeHelpDialog() {
    this.setState({ isOpenHelpDialog: false });
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
        <Grid container alignItems="stretch" justify="center" spacing={0} className={classes.root}>
          <Grid item xs={1}>
            <Button color="default" className={classes.navButton} onClick={this.changeDate.bind(this)} data-date-nav="prev" >
              <i className="fa fa-angle-left fa-lg" />
            </Button>
          </Grid>
          <Grid item xs={10}>
            <Grid item xs={12} className={classes.root}>
              <Dashboad
                date={this.state.date}
                changeDate={this.changeDate.bind(this)}
                allTasks={this.state.allTasks}
              />
            </Grid>
            <Grid item xs={12}>
              <div style={{ padding: '0 5px' }}>
                <Typography gutterBottom type="title">
                  {this.state.date.replace(/-/g, '/')} のタスク一覧
                  <Tooltip title="? を入力してください" placement="top">
                    <IconButton className={classes.helpButton} color="default" onClick={this.openHelpDialog.bind(this)}>
                      <i className="fa fa-question-circle-o" aria-hidden="true" />
                    </IconButton>
                  </Tooltip>
                </Typography>
                <TaskListCtl
                  lastSaveTime={this.state.lastSaveTime}
                  saveHot={this.saveHot.bind(this)}
                  notifiable={this.state.notifiable}
                  toggleNotifiable={this.toggleNotifiable.bind(this)}
                />
              </div>
              <LinearProgress style={{ visibility: this.state.loading ? 'visible' : 'hidden' }} />
              <div id="hot" />
            </Grid>
          </Grid>
          <Grid item xs={1}>
            <Button color="default" className={classes.navButton} onClick={this.changeDate.bind(this)} data-date-nav="next" >
              <i className="fa fa-angle-right fa-lg" />
            </Button>
          </Grid>
        </Grid>
        <HelpDialog
          open={this.state.isOpenHelpDialog}
          onRequestClose={this.closeHelpDialog.bind(this)}
        />
      </div>
    );
  }
}

App.propTypes = {
  classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(App);
