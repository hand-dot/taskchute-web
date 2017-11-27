import cloneDeep from 'lodash.clonedeep';
import * as firebase from 'firebase';
import React, { Component } from 'react';
import moment from 'moment';
import Handsontable from 'handsontable';
import 'handsontable/dist/handsontable.full.css';

import Typography from 'material-ui/Typography';
import Grid from 'material-ui/Grid';
import Input from 'material-ui/Input';

import GlobalHeader from './GlobalHeader';
import TodaySummary from './TodaySummary';
import DatePicker from './DatePicker';
import CategoryList from './CategoryList';
import Clock from './Clock';


import firebaseConf from '../confings/firebase';
import hotConf from '../confings/hot';
import '../styles/App.css';

let hot;
function updateHotCategory(source) {
  const $hotConf = cloneDeep(hotConf);
  $hotConf.columns[$hotConf.columns.findIndex(col => col.data === 'category')].source = source;
  if (hot) {
    hot.updateSettings({
      columns: $hotConf.columns,
    });
  }
}

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      categories: [],
      categoryInput: '',
    };
  }

  componentWillMount() {
    firebase.initializeApp(firebaseConf);
    const starCountRef = firebase.database().ref('/test/msg');
    starCountRef.on('value', (snapshot) => {
      console.log(snapshot.val());
    });
  }

  componentDidMount() {
    hot = new Handsontable(document.getElementById('hot'), Object.assign(hotConf, {
      afterCreateRow(index, amount, source) {
        // TODO 本日のサマリ用の見積もりタスクの計算に使用する
        console.log('afterCreateRow');
        console.log(index, amount, source);
      },
      afterRemoveRow(index, amount) {
        // TODO 本日のサマリ用の見積もりタスクの計算に使用する
        console.log('afterRemoveRow');
        console.log(index, amount);
      },
    }));
    console.log(hot.getSourceData());
    this.setDefaultCategories();
  }

  setDefaultCategories() {
    const defaultCategories = [{
      text: 'ライフスタイル',
      id: Date.now() + 1,
    },
    {
      text: '業務',
      id: Date.now() + 2,
    },
    {
      text: '雑務',
      id: Date.now() + 3,
    }];
    this.setState(() => ({
      categories: defaultCategories,
      categoryInput: '',
    }));
    updateHotCategory(defaultCategories.map(cat => cat.text));
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

  render() {
    return (
      <div>
        <GlobalHeader />
        <div className="App">
          <div>
            <Grid container spacing={40}>
              <Grid item xs={3}>
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
              <Grid item xs={3}>
                <Typography gutterBottom type="subheading">
                  日別サマリ
                </Typography>
              </Grid>
              <Grid item xs={3}>
                <Grid item xs={12}>
                  <Clock title={'現在時刻'} moment={moment()} updateFlg />
                </Grid>
                <Grid item xs={12}>
                  <Clock title={'終了時刻'} moment={moment().add(4, 'hours')} updateFlg={false} />
                </Grid>
              </Grid>
              <Grid item xs={3}>
                <div>
                  <Typography gutterBottom type="subheading">
                    カテゴリ
                  </Typography>
                  <CategoryList categories={this.state.categories} removeCategory={this.removeCategory.bind(this)} />
                  <form onSubmit={this.addCategory.bind(this)}>
                    <Input
                      onChange={this.changeCategoryInput.bind(this)}
                      value={this.state.categoryInput}
                    />
                  </form>
                </div>
              </Grid>
              <Grid item xs={12}>
                <Typography gutterBottom type="headline">
                  タスク一覧
                </Typography>
                <Typography type="caption" gutterBottom>
                  *セルの上で右クリックすることで行の追加、削除を行うことができます。
                </Typography>
                <Typography type="caption" gutterBottom>
                  *行を選択、ドラッグアンドドロップすることでタスクを入れ替えることができます。
                </Typography>
                <Typography type="caption" gutterBottom>
                  *マウスカーソルを列ヘッダーに上に重ねると各列の説明を見ることができます。
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
