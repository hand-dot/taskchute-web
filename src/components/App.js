import * as firebase from 'firebase';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withStyles } from 'material-ui/styles';
import moment from 'moment';
import cloneDeep from 'lodash.clonedeep';
import debounce from 'lodash.debounce';

import Handsontable from 'handsontable';
import 'handsontable/dist/handsontable.full.css';

import Typography from 'material-ui/Typography';
import Grid from 'material-ui/Grid';
import { LinearProgress } from 'material-ui/Progress';
import Button from 'material-ui/Button';
import Paper from 'material-ui/Paper';
import Hidden from 'material-ui/Hidden';

import '../styles/handsontable-custom.css';

import GlobalHeader from './GlobalHeader';
import Dashboard from './Dashboard';
import TableCtl from './TableCtl';
import TaskPool from './TaskPool';
import DatePicker from './DatePicker';

import firebaseConf from '../configs/firebase';
import { bindShortcut, hotConf, getEmptyHotData, emptyRow, getHotTasksIgnoreEmptyTask, setDataForHot } from '../hot';

import constants from '../constants';

import util from '../util';

const initialState = {
  userId: '',
  loading: true,
  notifiable: true,
  saveable: false,
  isOpenDashboard: false,
  isOpenTaskPool: false,
  date: moment().format('YYYY-MM-DD'),
  lastSaveTime: { hour: 0, minute: 0, second: 0 },
  tableTasks: getEmptyHotData(),
  poolTasks: {
    highPriorityTasks: [],
    lowPriorityTasks: [],
    regularTasks: [],
    dailyTasks: [],
  },
};

const styles = {
  root: {
    margin: '0 auto',
    paddingBottom: 20,
    maxWidth: constants.APPWIDTH,
  },
  navButton: {
    color: '#fff',
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

let hot = null;


class App extends Component {
  constructor(props) {
    super(props);
    this.state = initialState;
    this.fireShortcut = debounce(this.fireShortcut, constants.KEYEVENT_DELAY);
    this.setStateFromUpdateHot = debounce(this.setStateFromUpdateHot, constants.RENDER_DELAY);
    this.setStateFromRenderHot = debounce(this.setStateFromRenderHot, constants.RENDER_DELAY);
  }

  componentWillMount() {
    // 初期値の最終保存時刻
    this.setState({
      lastSaveTime: util.getCrrentTimeObj(),
    });
    window.addEventListener('keydown', (e) => {
      if (e.ctrlKey && Object.values(constants.shortcuts).find(shortcut => shortcut === e.keyCode) !== undefined) {
        e.preventDefault();
        this.fireShortcut(e);
      }
    });
    window.addEventListener('beforeunload', (e) => {
      if (this.state.saveable) {
        const dialogText = '保存していない内容があります。';
        e.returnValue = dialogText;
        return dialogText;
      }
      return false;
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
          } else if (key === 'reverse_taskpool_hight' || key === 'reverse_taskpool_low') {
            const [index] = this.getSelected();
            const taskPoolType = key === 'reverse_taskpool_hight' ? constants.taskPoolType.HIGHPRIORITY : constants.taskPoolType.LOWPRIORITY;
            self.moveTableTaskToPoolTask(taskPoolType, index, this);
          } else if (key === 'done_task') {
            const [row] = this.getSelected();
            this.setDataAtRowProp(row, 'startTime', moment().format('HH:mm'));
            this.setDataAtRowProp(row, 'endTime', moment().format('HH:mm'));
          }
        },
        items: {
          row_above: {
            name: '上に行を追加する',
          },
          row_below: {
            name: '下に行を追加する',
          },
          hsep1: '---------',
          remove_row: {
            name: '行を削除する',
          },
          hsep2: '---------',
          reverse_taskpool_hight: {
            name: '[すぐにやる]に戻す',
            disabled() {
              const [startRow, startCol, endRow, endCol] = this.getSelected();
              return startRow !== endRow || startCol !== endCol;
            },
          },
          reverse_taskpool_low: {
            name: '[いつかやる]に戻す',
            disabled() {
              const [startRow, startCol, endRow, endCol] = this.getSelected();
              return startRow !== endRow || startCol !== endCol;
            },
          },
          hsep3: '---------',
          set_current_time: {
            name: '現在時刻を入力する',
            disabled() {
              const [startRow, startCol, endRow, endCol] = this.getSelected();
              const prop = this.colToProp(startCol);
              return startRow !== endRow || startCol !== endCol || !(prop === 'endTime' || prop === 'startTime');
            },
          },
          done_task: {
            name: 'タスクを完了にする',
            disabled() {
              const [startRow, startCol, endRow, endCol] = this.getSelected();
              return (startRow !== endRow || startCol !== endCol) || !this.getDataAtRowProp(startRow, 'title');
            },
          },
        },
      },
      afterRender() { self.setStateFromRenderHot(); },
      afterUpdateSettings() { self.setStateFromUpdateHot(); },
      afterInit() { bindShortcut(this); },
    }));
    window.hot = hot;
  }

  setAInitialState() {
    this.setState(cloneDeep(initialState));
  }

  setStateFromRenderHot() {
    const hotTasks = getHotTasksIgnoreEmptyTask(hot);
    const tableTasksStr = JSON.stringify(this.state.tableTasks);
    if (JSON.stringify(hotTasks) !== '[]' && tableTasksStr !== '[]' && tableTasksStr !== JSON.stringify(hotTasks)) {
      this.setState({
        saveable: true,
        tableTasks: hotTasks,
      });
    }
    setTimeout(() => this.forceUpdate());
  }

  setStateFromUpdateHot() {
    this.setState({
      saveable: false,
      tableTasks: getHotTasksIgnoreEmptyTask(hot),
    });
    setTimeout(() => this.forceUpdate());
  }

  fireShortcut(e) {
    if ((e.keyCode === constants.shortcuts.NEXTDATE || e.keyCode === constants.shortcuts.PREVDATE)) {
      // 基準日を変更
      if (this.state.saveable && !window.confirm('保存していない内容があります。')) return false;
      this.setState({ date: moment(this.state.date).add(e.keyCode === 190 ? 1 : -1, 'day').format('YYYY-MM-DD') });
      setTimeout(() => { this.initTableTask(); });
    } else if (e.keyCode === constants.shortcuts.SAVE) {
      this.saveHot();
    } else if (e.keyCode === constants.shortcuts.INSERT) {
      if (hot) hot.alter('insert_row');
    } else if (e.keyCode === constants.shortcuts.TOGGLE_DASHBOAD) {
      this.toggleDashboard();
    } else if (e.keyCode === constants.shortcuts.TOGGLE_TASKPOOL) {
      this.toggleTaskPool();
    } else if (e.keyCode === constants.shortcuts.SELECT_TABLE) {
      hot.selectCell(0, 0);
    }
    return false;
  }

  toggleDashboard() {
    this.setState({ isOpenDashboard: !this.state.isOpenDashboard });
  }

  toggleTaskPool() {
    this.setState({ isOpenTaskPool: !this.state.isOpenTaskPool });
  }

  changePoolTasks(taskPoolActionType, taskPoolType, value) {
    if (taskPoolActionType === constants.taskPoolActionType.ADD) {
      this.addPoolTask(taskPoolType, value);
    } else if (taskPoolActionType === constants.taskPoolActionType.EDIT) {
      this.editPoolTask(taskPoolType, value);
    } else if (taskPoolActionType === constants.taskPoolActionType.MOVE) {
      this.movePoolTaskToTableTask(taskPoolType, value);
    } else if (taskPoolActionType === constants.taskPoolActionType.REMOVE) {
      this.removePoolTask(taskPoolType, value);
    } else if (taskPoolActionType === constants.taskPoolActionType.DOWN) {
      this.downPoolTask(taskPoolType, value);
    } else if (taskPoolActionType === constants.taskPoolActionType.UP) {
      this.upPoolTask(taskPoolType, value);
    }
    setTimeout(() => this.savePoolTasks(this.state.poolTasks));
  }

  addPoolTask(taskPoolType, task) {
    const poolTasks = Object.assign({}, this.state.poolTasks);
    poolTasks[taskPoolType].push(task);
    this.setState({ poolTasks });
  }

  editPoolTask(taskPoolType, { task, index }) {
    const poolTasks = Object.assign({}, this.state.poolTasks);
    poolTasks[taskPoolType][index] = task;
    this.setState({ poolTasks });
  }


  removePoolTask(taskPoolType, index) {
    const poolTasks = Object.assign({}, this.state.poolTasks);
    poolTasks[taskPoolType].splice(index, 1);
    this.setState({ poolTasks });
  }

  downPoolTask(taskPoolType, index) {
    if (this.state.poolTasks[taskPoolType].length === index + 1) return;
    const poolTasks = cloneDeep(this.state.poolTasks);
    poolTasks[taskPoolType].splice(index, 2, poolTasks[taskPoolType][index + 1], poolTasks[taskPoolType][index]);
    this.setState({ poolTasks });
  }

  upPoolTask(taskPoolType, index) {
    if (index === 0) return;
    const poolTasks = cloneDeep(this.state.poolTasks);
    poolTasks[taskPoolType].splice(index - 1, 2, poolTasks[taskPoolType][index], poolTasks[taskPoolType][index - 1]);
    this.setState({ poolTasks });
  }

  movePoolTaskToTableTask(taskPoolType, index) {
    if (!hot) return;
    const hotData = hot.getSourceData().map((data, i) => hot.getSourceDataAtRow(hot.toPhysicalRow(i)));
    let insertPosition = hotData.lastIndexOf(data => JSON.stringify(emptyRow) === JSON.stringify(data));
    if (insertPosition === -1) {
      insertPosition = this.state.tableTasks.length;
    }
    const target = Object.assign({}, this.state.poolTasks[taskPoolType][index]);
    Object.keys(target).forEach((key) => {
      hot.setDataAtRowProp(insertPosition, key, target[key]);
    });
    if (taskPoolType === constants.taskPoolType.HIGHPRIORITY ||
       taskPoolType === constants.taskPoolType.LOWPRIORITY) {
      this.removePoolTask(taskPoolType, index);
    }
    // タスクプールからテーブルタスクに移動したら保存する
    setTimeout(() => { this.saveHot(); });
  }

  moveTableTaskToPoolTask(taskPoolType, index, hotInstance) {
    const task = hotInstance.getSourceDataAtRow(index);
    if (!task.title) {
      alert('作業内容が未記入のタスクはタスクプールに戻せません。');
      return;
    }
    this.addPoolTask(taskPoolType, hotInstance.getSourceDataAtRow(index));
    hotInstance.alter('remove_row', index);
    // テーブルタスクからタスクプールに移動したら保存する
    setTimeout(() => { this.saveHot(); });
  }

  toggleNotifiable(event, checked) {
    if ('Notification' in window) {
      Notification = checked ? NotificationClone : false;　// eslint-disable-line
      this.setState(() => ({
        notifiable: checked,
      }));
      if (!checked) {
        hot.getData().forEach((data, index) => {
          hot.removeCellMeta(index, hot.propToCol('startTime'), 'notification');
        });
        hot.render();
      }
    }
  }

  attachTableTasks() {
    if (hot) {
      hot.updateSettings({ data: getEmptyHotData() });
      firebase.database().ref(`/${this.state.userId}/tableTasks`).on('value', (snapshot) => {
        this.setState(() => ({
          loading: true,
        }));
        if (snapshot.exists()) {
          if ((this.state.poolTasks.dailyTasks.length === 0 || snapshot.exists()) && !util.isSameObj(getHotTasksIgnoreEmptyTask(hot), snapshot.val()[this.state.date])) {
            // デイリーのタスクが空 or サーバーにタスクが存在した場合 かつ、
            // サーバーから配信されたデータが自分のデータと違う場合サーバーのデータでテーブルを初期化する
            setDataForHot(hot, snapshot.val()[this.state.date]);
          }
        }
        this.setState(() => ({
          loading: false,
        }));
      });
    }
  }

  fetchTableTask() {
    this.setState(() => ({
      loading: true,
    }));
    return firebase.database().ref(`/${this.state.userId}/tableTasks/${this.state.date}`).once('value').then((snapshot) => {
      this.setState(() => ({
        loading: false,
      }));
      return snapshot;
    });
  }

  initTableTask() {
    this.fetchTableTask().then((snapshot) => {
      if (hot) {
        hot.updateSettings({ data: getEmptyHotData() });
        if (this.state.poolTasks.dailyTasks.length === 0 || snapshot.exists()) {
          // デイリーのタスクが空 or サーバーにタスクが存在した場合サーバーのデータでテーブルを初期化する
          setDataForHot(hot, snapshot.val());
        } else {
          // デイリーのタスクが設定されており、サーバーにデータが存在しない場合
          setDataForHot(hot, this.state.poolTasks.dailyTasks);
        }
      }
    });
  }

  attachPoolTasks() {
    firebase.database().ref(`/${this.state.userId}/poolTasks`).on('value', (snapshot) => {
      if (snapshot.exists()) {
        const poolTasks = snapshot.val();
        const statePoolTasks = Object.assign({}, this.state.poolTasks);
        statePoolTasks.highPriorityTasks = poolTasks.highPriorityTasks ? poolTasks.highPriorityTasks : [];
        statePoolTasks.lowPriorityTasks = poolTasks.lowPriorityTasks ? poolTasks.lowPriorityTasks : [];
        statePoolTasks.regularTasks = poolTasks.regularTasks ? poolTasks.regularTasks : [];
        statePoolTasks.dailyTasks = poolTasks.dailyTasks ? poolTasks.dailyTasks : [];
        this.setState({
          poolTasks: statePoolTasks,
        });
      }
    });
  }

  savePoolTasks(poolTasks) {
    firebase.database().ref(`/${this.state.userId}/poolTasks`).set(poolTasks);
  }

  changeUserId(e) {
    this.setState({ userId: e.target.value });
  }

  loginCallback(userId) {
    this.setState({ userId });
    // userIdが更新されたあとに処理する
    setTimeout(() => {
      // タスクプールをサーバーと同期開始
      this.attachPoolTasks();
      // テーブルをサーバーと同期開始
      this.attachTableTasks();
    });
  }

  logoutCallback() {
    // stateの初期化
    this.setAInitialState();
    // テーブルのクリア
    setTimeout(() => { if (hot) hot.updateSettings({ data: getEmptyHotData() }); });
  }

  changeDate(event) {
    if (!hot) return;
    const nav = event.currentTarget.getAttribute('data-date-nav');
    let date;
    if (nav) {
      date = moment(this.state.date).add(nav === 'next' ? 1 : -1, 'day').format('YYYY-MM-DD');
    } else if (moment(event.target.value).isValid()) {
      event.persist();
      date = event.target.value;
    } else {
      date = constants.INITIALDATE;
    }
    if (!this.state.saveable || window.confirm('保存していない内容があります。')) {
      this.setState(() => ({
        date,
      }));
      setTimeout(() => { this.initTableTask(); });
    }
  }

  saveHot() {
    if (hot) {
      // 並び変えられたデータを取得するために処理が入っている。
      this.saveTableTask(getHotTasksIgnoreEmptyTask(hot));
    }
  }

  saveTableTask(data) {
    this.setState(() => ({
      loading: true,
    }));
    firebase.database().ref(`/${this.state.userId}/tableTasks/${this.state.date}`).set(data.length === 0 ? getEmptyHotData() : data).then(() => {
      this.setState(() => ({
        loading: false,
        lastSaveTime: util.getCrrentTimeObj(),
        saveable: false,
      }));
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
        <Grid container alignItems="stretch" justify="center" className={classes.root}>
          <Hidden xsDown>
            <Grid item xs={0} sm={1}>
              <Button color="default" className={classes.navButton} onClick={this.changeDate.bind(this)} data-date-nav="prev" >
                <i className="fa fa-angle-left fa-lg" />
              </Button>
            </Grid>
          </Hidden>
          <Grid item xs={12} sm={10}>
            <Grid item xs={12} className={classes.root}>
              <Dashboard
                isOpenDashboard={this.state.isOpenDashboard}
                toggleDashboard={this.toggleDashboard.bind(this)}
                tableTasks={this.state.tableTasks}
              />
              <TaskPool
                isOpenTaskPool={this.state.isOpenTaskPool}
                toggleTaskPool={this.toggleTaskPool.bind(this)}
                poolTasks={this.state.poolTasks}
                changePoolTasks={this.changePoolTasks.bind(this)}
              />
            </Grid>
            <Grid item xs={12}>
              <Paper elevation={1}>
                <div style={{ padding: '24px 24px 0' }}>
                  <i className="fa fa-table fa-lg" />
                  <Typography style={{ display: 'inline', marginRight: 20 }}>
                    　テーブル
                  </Typography>
                  <DatePicker value={this.state.date} changeDate={this.changeDate.bind(this)} label={''} />
                  <Hidden xsDown>
                    <TableCtl
                      lastSaveTime={this.state.lastSaveTime}
                      saveHot={this.saveHot.bind(this)}
                      notifiable={this.state.notifiable}
                      toggleNotifiable={this.toggleNotifiable.bind(this)}
                    />
                  </Hidden>
                </div>
                <div style={{ paddingTop: 10 }}>
                  <LinearProgress style={{ visibility: this.state.loading ? 'visible' : 'hidden' }} />
                  <div id="hot" />
                </div>
              </Paper>
            </Grid>
          </Grid>
          <Hidden xsDown>
            <Grid item xs={0} sm={1}>
              <Button color="default" className={classes.navButton} onClick={this.changeDate.bind(this)} data-date-nav="next" >
                <i className="fa fa-angle-right fa-lg" />
              </Button>
            </Grid>
          </Hidden>
        </Grid>
      </div>
    );
  }
}

App.propTypes = {
  classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(App);
