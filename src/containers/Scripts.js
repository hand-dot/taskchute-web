import React, { Component } from 'react';
import debounce from 'lodash.debounce';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import Snackbar from '@material-ui/core/Snackbar';
import Grid from '@material-ui/core/Grid';
import Divider from '@material-ui/core/Divider';
import Tooltip from '@material-ui/core/Tooltip';
import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';
import Switch from '@material-ui/core/Switch';
import Refresh from '@material-ui/icons/Refresh';
import Handsontable from 'handsontable';
import 'handsontable/dist/handsontable.full.min.css';
import { Controlled as CodeMirror } from 'react-codemirror2';
import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/material.css';
import 'codemirror/mode/javascript/javascript';
import constants from '../constants';
import '../styles/handsontable-custom.css';
import { hotConf, getHotTasksIgnoreEmptyTask, setDataForHot } from '../hot';
import ScriptsEditor from '../components/ScriptsEditor';
import UnderDevelopment from '../components/UnderDevelopment';
import exampleTaskData from '../exampleDatas/exampleTaskData';
import exampleImportScript from '../exampleDatas/exampleImportScript';
import exampleExportScript from '../exampleDatas/exampleExportScript';
import tableTaskSchema from '../schemas/tableTaskSchema';
import util from '../utils/util';
import i18n from '../i18n';

const database = util.getDatabase();

const editorOptions = {
  mode: 'javascript',
  theme: 'material',
  lineNumbers: true,
};

const styles = {
  root: {
    paddingTop: '5em',
    minHeight: '100vh',
    padding: '4em 2em 2em',
    width: '100%',
    margin: '0 auto',
  },
  button: {
    fontSize: 11,
    minWidth: 25,
  },
  divider: {
    margin: '0 1rem',
  },
};

class Scripts extends Component {
  constructor(props) {
    super(props);
    this.exampleHot = null;
    this.syncStateByRender = debounce(this.syncStateByRender, constants.RENDER_DELAY);
    this.state = {
      worksheetId: '',
      isOpenSaveSnackbar: false,
      isOpenScriptSnackbar: false,
      scriptSnackbarText: '',
      exampleTaskData: '',
      scriptEnable: false,
      importScript: '',
      exportScript: '',
      importScriptBk: '',
      exportScriptBk: '',
    };
  }

  componentWillMount() {
    // 認証していないユーザーとメンバー以外をルートに返す
    const worksheetId = encodeURI(this.props.match.params.id);
    if (this.props.userId && worksheetId) {
      database.ref(`/${constants.API_VERSION}/worksheets/${worksheetId}/members/`).once('value').then((memberIds) => {
        if (memberIds.exists() && Array.isArray(memberIds.val()) && memberIds.val().includes(this.props.userId)) {
          this.setState({ worksheetId });
          // メンバーを取得する処理
          Promise.all(memberIds.val().map(uid => database.ref(`/${constants.API_VERSION}/users/${uid}/settings/`).once('value'))).then((members) => {
            const memberDatas = members.filter(member => member.exists()).map(member => member.val());
            setTimeout(() => {
              if (this.exampleHot) {
                hotConf.columns[hotConf.columns.findIndex(column => column.data === 'assign')].selectOptions = memberDatas.reduce((obj, member) => Object.assign(obj, { [member.uid]: member.displayName }), {});
                this.exampleHot.updateSettings(Object.assign(this.exampleHot.getSettings, {
                  userId: this.props.userId,
                  members: memberDatas,
                }));
              } else {
                this.props.history.push('/');
              }
            });
          });
          // スクリプトのオンオフを取得する処理
          database.ref(`/${constants.API_VERSION}/worksheets/${worksheetId}/scripts/enable`).once('value').then((enable) => {
            if (enable.exists() && enable.val()) this.setState({ scriptEnable: true });
          });
          // 各スクリプトを取得する処理
          setTimeout(() => {
            this.loadScript('importScript');
            this.loadScript('exportScript');
          });
        } else {
          this.props.history.push('/');
        }
      });
    } else {
      this.props.history.push('/');
    }
  }

  componentDidMount() {
    if (!this.props.userId) return;
    const self = this;
    this.exampleHot = new Handsontable(this.exampleHotDom, Object.assign({}, hotConf, {
      userId: this.props.userId,
      isActiveNotifi: false,
      renderAllRows: true,
      height: 300,
      minRows: 10,
      afterRender() { self.syncStateByRender(); },
    }));
    setDataForHot(this.exampleHot, util.cloneDeep(exampleTaskData));
  }

  componentWillUnmount() {
    if (!this.exampleHot) return;
    this.exampleHot.destroy();
    this.exampleHot = null;
  }

  syncStateByRender() {
    if (!this.exampleHot) return;
    const hotTasks = getHotTasksIgnoreEmptyTask(this.exampleHot);
    if (!util.equal(hotTasks, this.state.exampleTaskData)) {
      this.setState({ exampleTaskData: JSON.stringify(hotTasks, null, '\t') });
    }
  }

  backToWorkSheet() {
    if (this.state.importScript !== this.state.importScriptBk || this.state.exportScript !== this.state.exportScriptBk) {
      if (!window.confirm('保存していない内容がありますが、ワークシートに戻ってもよろしいですか？')) return;
    }
    this.props.history.push(`/${this.state.worksheetId}`);
  }

  resetExampleHot() {
    if (!window.confirm('テーブルをリセットしてもよろしいですか？')) return;
    this.exampleHot.loadData(util.cloneDeep(exampleTaskData));
  }

  loadScript(scriptType) {
    return database.ref(`/${constants.API_VERSION}/worksheets/${this.state.worksheetId}/scripts/${scriptType}`).once('value').then((snapshot) => {
      const script = snapshot.exists() && snapshot.val() ? snapshot.val() : '// not set scripts. please load sample scripts!';
      this.setState({ [scriptType]: script, [`${scriptType}Bk`]: script });
    });
  }

  resetScript(scriptType) {
    if (scriptType !== 'exportScript' && scriptType !== 'importScript') return;
    if (!window.confirm(`${scriptType}を保存前に戻してもよろしいですか？`)) return;
    this.loadScript(scriptType);
  }

  saveScript(scriptType) {
    if (scriptType !== 'exportScript' && scriptType !== 'importScript') return;
    if (!window.confirm(`${scriptType}を保存してもよろしいですか？`)) return;
    database.ref(`/${constants.API_VERSION}/worksheets/${this.state.worksheetId}/scripts/${scriptType}`).set(this.state[scriptType]).then(() => {
      this.setState({ isOpenSaveSnackbar: true, [`${scriptType}Bk`]: this.state[scriptType] });
    });
  }

  fireScript(scriptType) {
    if (scriptType !== 'exportScript' && scriptType !== 'importScript') return;
    if (!window.confirm(`${scriptType}を実行してもよろしいですか？`)) return;
    const data = getHotTasksIgnoreEmptyTask(this.exampleHot);
    const script = this.state[scriptType];
    util.runWorker(script, data).then((result) => {
      setDataForHot(this.exampleHot, result);
      this.setState({ isOpenScriptSnackbar: true, scriptSnackbarText: `${scriptType}を実行しました。` });
    }, (reason) => {
      const scriptSnackbarText = reason ? `エラー[${scriptType}]：${reason}` : `${scriptType}を実行しましたがpostMessageの引数に問題があるため処理を中断しました。`;
      this.setState({ isOpenScriptSnackbar: true, scriptSnackbarText });
    });
  }

  loadExampleScript(scriptType) {
    if (scriptType !== 'exportScript' && scriptType !== 'importScript') return;
    if (!window.confirm(`${scriptType}のサンプルをロードしてもよろしいですか？`)) return;
    this.setState({ [scriptType]: scriptType === 'exportScript' ? exampleExportScript.toString() : exampleImportScript.toString() });
  }

  closeSnackbars() {
    this.setState({ isOpenSaveSnackbar: false, isOpenScriptSnackbar: false });
  }

  handleScript(scriptType, script) {
    this.setState({ [scriptType]: script });
  }

  handleScriptEnable(event) {
    event.persist();
    this.setState({ scriptEnable: event.target.checked });
    database.ref(`/${constants.API_VERSION}/worksheets/${this.state.worksheetId}/scripts/enable`).set(event.target.checked).then(() => {
      this.setState({ isOpenScriptSnackbar: true, scriptSnackbarText: `スクリプトを${event.target.checked ? '有効' : '無効'}にしました。` });
    });
  }

  render() {
    const {
      scriptEnable,
      importScript,
      importScriptBk,
      exportScript,
      exportScriptBk,
      isOpenSaveSnackbar,
      isOpenScriptSnackbar,
      scriptSnackbarText,
    } = this.state;
    const { classes, theme } = this.props;
    return (
      <Grid className={classes.root} container spacing={theme.spacing.unit} alignItems="stretch" justify="center">
        <Grid item xs={12} style={{ paddingBottom: '3em' }}>
          <Typography variant="title">
            {i18n.t('worksheet.plugIns')}
          </Typography>
          <Typography gutterBottom variant="caption">
            {i18n.t('scripts.description')}
          </Typography>
          <UnderDevelopment />
        </Grid>
        <Grid item xs={12}>
          <Typography gutterBottom variant="subheading">
            スクリプトの利用(ON/OFF)
            <span className={classes.divider}>
              /
            </span>
            <div style={{ display: 'inline-block' }}>
              <Switch
                color="primary"
                checked={scriptEnable}
                onChange={this.handleScriptEnable.bind(this)}
                value="scriptEnable"
              />
            </div>
          </Typography>
        </Grid>
        <Grid item xs={12}>
          <Divider style={{ margin: '1.5em 0' }} />
          <Typography gutterBottom variant="subheading">
              ワークシートのデータの例
            <span className={classes.divider}>
              /
            </span>
            <Tooltip title="リセット" placement="top">
              <div style={{ display: 'inline-block' }}>
                <Button className={classes.button} onClick={this.resetExampleHot.bind(this)} variant="raised" color="default">
                  <Refresh style={{ fontSize: 13 }} />
                </Button>
              </div>
            </Tooltip>
          </Typography>
          <Typography gutterBottom variant="caption">
              タスクのスキーマは
            {JSON.stringify(tableTaskSchema)}
            このようになっております。
          </Typography>
          <Typography gutterBottom variant="caption">
              ワークシートのデータは左のテーブルに対して右のJSON形式(配列)で保存されます。
          </Typography>
        </Grid>
        <Grid item xs={8}>
          <div>
            <div ref={(node) => { this.exampleHotDom = node; }} />
          </div>
        </Grid>
        <Grid item xs={4}>
          <CodeMirror
            value={this.state.exampleTaskData}
            options={Object.assign({}, editorOptions, { readOnly: true })}
          />
        </Grid>

        <Grid item xs={12}>
          <Divider style={{ margin: '1.5em 0' }} />
          <ScriptsEditor
            scriptType="importScript"
            script={importScript}
            scriptBk={importScriptBk}
            exampleScript={exampleImportScript.toString()}
            editorOptions={editorOptions}
            resetScript={this.resetScript.bind(this, 'importScript')}
            saveScript={this.saveScript.bind(this, 'importScript')}
            fireScript={this.fireScript.bind(this, 'importScript')}
            loadExampleScript={this.loadExampleScript.bind(this, 'importScript')}
            handleScript={this.handleScript.bind(this)}
          />
        </Grid>
        <Grid item xs={12}>
          <Divider style={{ margin: '1.5em 0' }} />
          <ScriptsEditor
            scriptType="exportScript"
            script={exportScript}
            scriptBk={exportScriptBk}
            exampleScript={exampleExportScript.toString()}
            editorOptions={editorOptions}
            resetScript={this.resetScript.bind(this, 'exportScript')}
            saveScript={this.saveScript.bind(this, 'exportScript')}
            fireScript={this.fireScript.bind(this, 'exportScript')}
            loadExampleScript={this.loadExampleScript.bind(this, 'exportScript')}
            handleScript={this.handleScript.bind(this)}
          />
        </Grid>
        <Grid item xs={12}>
          <Divider style={{ margin: '1.5em 0' }} />
          <Button size="small" onClick={this.backToWorkSheet.bind(this)} variant="raised">
            {i18n.t('common.backToPreviousPage')}
          </Button>
        </Grid>
        <Snackbar
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          open={isOpenSaveSnackbar}
          onClose={this.closeSnackbars.bind(this)}
          message="保存しました。"
        />
        <Snackbar
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          open={isOpenScriptSnackbar}
          onClose={this.closeSnackbars.bind(this)}
          message={scriptSnackbarText}
        />
      </Grid>
    );
  }
}
Scripts.propTypes = {
  userId: PropTypes.string.isRequired,
  history: PropTypes.object.isRequired, // eslint-disable-line
  classes: PropTypes.object.isRequired, // eslint-disable-line
  match: PropTypes.object.isRequired, // eslint-disable-line
  theme: PropTypes.object.isRequired, // eslint-disable-line
};

export default withStyles(styles, { withTheme: true })(Scripts);
