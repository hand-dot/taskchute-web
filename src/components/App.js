import cloneDeep from 'lodash.clonedeep';
import * as firebase from 'firebase';
import React, { Component } from 'react';
import moment from 'moment';
import Handsontable from 'handsontable';
import 'handsontable/dist/handsontable.full.css';

import Typography from 'material-ui/Typography';
import TextField from 'material-ui/TextField';
import Grid from 'material-ui/Grid';
import Input from 'material-ui/Input';
import Button from 'material-ui/Button';
import SaveIcon from 'material-ui-icons/Save';
import AddIcon from 'material-ui-icons/Add';
import Switch from 'material-ui/Switch';
import { FormControlLabel, FormGroup } from 'material-ui/Form';
import ExpansionPanel, {
  ExpansionPanelSummary,
  ExpansionPanelDetails,
} from 'material-ui/ExpansionPanel';
import Dialog, {
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from 'material-ui/Dialog';
import ExpandMoreIcon from 'material-ui-icons/ExpandMore';
import { LinearProgress } from 'material-ui/Progress';
import Tooltip from 'material-ui/Tooltip';

import initialState from '../state/initialState'

import GlobalHeader from './GlobalHeader';
import TodaySummary from './TodaySummary';
import DatePicker from './DatePicker';
import CategoryList from './CategoryList';
import Clock from './Clock';

import firebaseConf from '../confings/firebase';
import hotConf from '../confings/hot';
import '../styles/App.css';

// ローディングが早すぎて一回もロードされてないように見えるため、
// デザイン目的で最低でも1秒はローディングするようにしている。実際ないほうが良い。
const loadingDuration = 1000;

const NotificationClone = (() => ('Notification' in window ? cloneDeep(Notification) : false))();
firebase.initializeApp(firebaseConf);

let hot;

function updateHotCategory(source) {
  const $hotConf = cloneDeep(hotConf);
  $hotConf.columns[$hotConf.columns.findIndex(col => col.data === 'category')].source = source;
  if (hot) hot.updateSettings({ columns: $hotConf.columns });
}

function addTask() {
  if (hot) {
    hot.alter('insert_row');
  }
}

class App extends Component {
  constructor(props) {
    super(props);
    this.state = initialState;
  }

  componentWillMount() {
    // 初期値の現在時刻と終了時刻
    const currentMoment = moment();
    const timeObj = {
      hour: currentMoment.hour(),
      minute: currentMoment.minute(),
      second: currentMoment.second(),
    };
    this.setState({
      currentTime: timeObj,
      endTime: timeObj,
      lastSaveTime: timeObj,
    });
  }

  componentDidMount() {
    this.logIn();
    const self = this;
    hot = new Handsontable(document.getElementById('hot'), Object.assign(hotConf, {
      beforeChangeRender() {
        self.setStateFromHot();
      },
      afterCreateRow() {
        self.setStateFromHot();
      },
      afterRemoveRow() {
        self.setStateFromHot();
      },
    }));
    this.setStateFromHot();
    this.initCategories();
  }

  setAInitialState() {
    this.setState(initialState);
  }

  setStateFromHot() {
    const sourceData = cloneDeep(hot.getSourceData());
    if (JSON.stringify(this.state.allTasks) === JSON.stringify(sourceData)) return;
    const totalMinute = (datas, prop) => datas.map(data => (typeof data[prop] === 'number' ? data[prop] : 0)).reduce((p, c) => p + c, 0);
    const remainingData = sourceData.filter(data => !data.done);
    const remainingMinute = totalMinute(remainingData, 'estimate');
    const doneData = sourceData.filter(data => data.done);
    const currentMoment = moment();
    const endMoment = moment().add(remainingMinute, 'minutes');
    this.setState(() => ({
      allTasks: sourceData,
      estimateTasks: { minute: totalMinute(sourceData, 'estimate'), taskNum: sourceData.length },
      remainingTasks: { minute: remainingMinute, taskNum: remainingData.length },
      doneTasks: { minute: totalMinute(doneData, 'estimate'), taskNum: doneData.length },
      actuallyTasks: { minute: totalMinute(doneData, 'actually'), taskNum: doneData.length },
      currentTime: {
        hour: currentMoment.hour(),
        minute: currentMoment.minute(),
        second: currentMoment.second(),
      },
      endTime: { hour: endMoment.hour(),
        minute: endMoment.minute(),
        second: endMoment.second(),
      },
    }));
  }

  changeUserId(e) {
    this.setState({ userId: e.target.value });
  }

  logIn() {
    // FIXME localstrage実装は暫時対応
    const userId = localStorage.getItem('userId') || this.state.userId;
    if (userId) {
      localStorage.setItem('userId', userId);
      this.setState({ userId });
      // テーブルの初期化
      setTimeout(() => {
        this.fetchTask(this.state.userId, this.state.date).then((snapshot) => {
          if (hot && snapshot.exists()) {
            hot.updateSettings({ data: snapshot.val() });
            this.setStateFromHot();
          }
        });
      }, 0);
      this.closeLoginDialog();
    } else {
      this.openLoginDialog();
    }
  }

  logOut() {
    // FIXME localstrage実装は暫時対応
    localStorage.removeItem('userId');
    // stateの初期化
    this.setAInitialState();
    // テーブルのクリア
    setTimeout(() => {
      if (hot) {
        hot.updateSettings({ data: {} });
      }
    }, 0);
    this.openLoginDialog();
  }

  openLoginDialog() {
    this.setState({ isOpenLoginDialog: true });
  }

  closeLoginDialog() {
    this.setState({ isOpenLoginDialog: false });
  }

  toggleNotifiable(event, checked) {
    if ('Notification' in window) {
      Notification = checked ? NotificationClone : false;　// eslint-disable-line
      this.setState(() => ({
        notifiable: checked,
      }));
    }
  }

  changeDate(event) {
    if (!hot) return;
    event.persist();
    this.setState(() => ({
      date: event.target.value,
    }));
    this.fetchTask(this.state.userId, event.target.value).then((snapshot) => {
      if (snapshot.exists()) {
        // データが存在していたら読み込む
        hot.updateSettings({ data: snapshot.val() });
      } else {
        // データが存在していないので、テーブルを空にする
        hot.updateSettings({ data: {} });
      }
      this.setStateFromHot();
    });
  }

  initCategories() {
    const labels = ['生活', '業務', '雑務', '休憩'];
    const timestamp = Date.now();
    const initCategories = labels.map((label, index) => ({ id: timestamp + index, text: label }));
    this.setState(() => ({
      categories: initCategories,
      categoryInput: '',
    }));
    updateHotCategory(initCategories.map(cat => cat.text));
  }

  changeCategoryInput(e) {
    this.setState({ categoryInput: e.target.value });
  }

  addCategory(e) {
    e.preventDefault();
    if (!this.state.categoryInput.length) {
      return;
    }
    const newItem = {
      text: this.state.categoryInput,
      id: Date.now(),
    };
    this.setState(prevState => ({
      categories: prevState.categories.concat(newItem),
      categoryInput: '',
    }));
    updateHotCategory(this.state.categories.concat(newItem).map(cat => cat.text));
  }

  removeCategory(index) {
    const categories = cloneDeep(this.state.categories);
    categories.splice(index, 1);
    this.setState(() => ({
      categories,
    }));
    updateHotCategory(categories.map(cat => cat.text));
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

  fetchTask(userId, date) {
    this.setState(() => ({
      loading: true,
    }));
    return firebase.database().ref(`/${userId}/${date}`).once('value').then((snapshot) => {
      setTimeout(() => {
        this.setState(() => ({
          loading: false,
        }));
      }, loadingDuration);
      return snapshot;
    });
  }

  render() {
    return (
      <div>
        <GlobalHeader userId={this.state.userId} logOut={this.logOut.bind(this)} />
        <div className="App">
          <div>
            <Grid container spacing={5}>
              <Grid item xs={12} className="dashboad">
                <ExpansionPanel defaultExpanded>
                  <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>ダッシュボード</Typography>
                  </ExpansionPanelSummary>
                  <ExpansionPanelDetails>
                    <Grid item xs={4}>
                      <Typography gutterBottom type="title">
                        本日のサマリ
                      </Typography>
                      <DatePicker value={this.state.date} changeDate={this.changeDate.bind(this)} />
                      <TodaySummary
                        data={{
                          estimateTasks: this.state.estimateTasks,
                          doneTasks: this.state.doneTasks,
                          actuallyTasks: this.state.actuallyTasks,
                          remainingTasks: this.state.remainingTasks,
                        }}
                      />
                    </Grid>
                    <Grid item xs={4}>
                      <Typography gutterBottom type="title">
                       時刻
                      </Typography>
                      <Grid container spacing={5}>
                        <Grid item xs={6}>
                          <Clock title={'現在時刻'} caption="" time={this.state.currentTime} />
                        </Grid>
                        <Grid item xs={6}>
                          <Clock title={'終了時刻*'} caption="*残タスクの合計時間" time={this.state.endTime} updateFlg />
                        </Grid>
                      </Grid>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography title="*追加・削除したカテゴリはタスク一覧カテゴリ列の選択肢に反映されます。" gutterBottom type="title">
                        カテゴリ*
                      </Typography>
                      <CategoryList categories={this.state.categories} removeCategory={this.removeCategory.bind(this)} />
                      <form onSubmit={this.addCategory.bind(this)}>
                        <Input
                          placeholder="カテゴリを追加"
                          onChange={this.changeCategoryInput.bind(this)}
                          value={this.state.categoryInput}
                        />
                      </form>
                    </Grid>
                  </ExpansionPanelDetails>
                </ExpansionPanel>
              </Grid>
              <Grid item xs={12} className="tasklist">
                <Typography gutterBottom type="title">
                  {this.state.date.replace(/-/g, '/')} のタスク一覧
                </Typography>
                <Grid container spacing={5}>
                  <Grid item xs={6}>
                    <FormGroup>
                      <Typography type="caption" gutterBottom>
                         *通知予約を行うには見積を入力したタスクの開始時刻を入力(変更)してください。
                      </Typography>
                      <Typography type="caption" gutterBottom>
                         *通知が予約されたら開始時刻のセルに [ ! ] マークがつきます。
                      </Typography>
                      <Typography type="caption" gutterBottom>
                        *開始時刻を削除、もしくは終了時刻を入力すると予約を削除することができます。
                      </Typography>
                      <FormControlLabel
                        control={
                          <Switch
                            disabled={!('Notification' in window)}
                            checked={this.state.notifiable}
                            onChange={this.toggleNotifiable.bind(this)}
                          />
                        }
                        label={`開始したタスクの終了時刻通知${!('Notification' in window) ? '(ブラウザが未対応です。)' : ''}`}
                      />
                    </FormGroup>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography type="caption" gutterBottom>
                      *セル上で右クリックすることで行の追加・削除を行うことができます。
                    </Typography>
                    <Typography type="caption" gutterBottom>
                      *行を選択しドラッグアンドドロップでタスクを入れ替えることができます。
                    </Typography>
                    <Typography type="caption" gutterBottom>
                        *マウスカーソルを列ヘッダーに上に重ねると各列の説明を見ることができます。
                    </Typography>
                    <div style={{ margin: '15px 0', textAlign: 'right' }}>
                      <Button raised onClick={addTask} color="default">
                        <AddIcon />
                          追加
                      </Button>
                      <Tooltip id="tooltip-top" title={`最終保存時刻 : ${(`00${this.state.lastSaveTime.hour}`).slice(-2)}:${(`00${this.state.lastSaveTime.minute}`).slice(-2)}`} placement="top">
                        <Button raised onClick={this.saveHot.bind(this)} color="default">
                          <SaveIcon />
                         保存
                        </Button>
                      </Tooltip>

                    </div>
                  </Grid>
                  <Grid item xs={12} style={{ paddingTop: 0 }}>
                    <LinearProgress style={{ display: this.state.loading ? 'block' : 'none' }} />
                    <div id="hot" />
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </div>
        </div>
        <Dialog open={this.state.isOpenLoginDialog}>
          <DialogTitle>ユーザーIDを入力して下さい</DialogTitle>
          <DialogContent>
            <DialogContentText>
                TaskChute WEB はただいま開発中です。<br />
                しかし一部機能を試していただくことは可能です。<br />
              <br />
                タスクの入力・保存・読み込みはできますが、
                現時点ではユーザー登録を行いませんので、あなた自身でユーザーIDを入力して下さい。<br />
              <br />
                以降、同じユーザーIDを入力すると<br />
                保存したタスクを読み込むことができます。<br />
              <br />
            </DialogContentText>
            <TextField
              value={this.state.userId}
              onChange={this.changeUserId.bind(this)}
              required
              autoFocus
              margin="dense"
              id="userId"
              label="ユーザーID"
              fullWidth
            />
            <Typography type="caption" gutterBottom>
               *ログイン機能実装後に以前に保存したデータは削除されます。あらかじめご了承ください。
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={this.logIn.bind(this)} color="primary">
                はじめる
            </Button>
          </DialogActions>
        </Dialog>
      </div>
    );
  }
}

export default App;
