import * as firebase from 'firebase';
import React, { Component } from 'react';
import ReactGA from 'react-ga';
import PropTypes from 'prop-types';
import { withStyles } from 'material-ui/styles';
import { Switch, Route, withRouter } from 'react-router-dom';
import { CircularProgress } from 'material-ui/Progress';
import Dialog, {
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from 'material-ui/Dialog';
import Button from 'material-ui/Button';
import AsyncContainer from './AsyncContainer';

import firebaseConf from '../configs/firebase';
import '../styles/keyframes.css';
import util from '../util';
import constants from '../constants';

const GlobalHeader = AsyncContainer(() => import('./GlobalHeader').then(module => module.default), {});
const Top = AsyncContainer(() => import('./Top').then(module => module.default), {});
const Login = AsyncContainer(() => import('./Login').then(module => module.default), {});
const Logout = AsyncContainer(() => import('./Logout').then(module => module.default), {});
const Signup = AsyncContainer(() => import('./Signup').then(module => module.default), {});
const Scripts = AsyncContainer(() => import('./Scripts').then(module => module.default), {});
const Taskontable = AsyncContainer(() => import('./Taskontable').then(module => module.default), {});
const WorkSheets = AsyncContainer(() => import('./WorkSheets').then(module => module.default), {});

firebase.initializeApp(firebaseConf);

const styles = {
  root: {
    minHeight: '100vh',
  },
  content: {
    overflow: 'hidden',
    padding: 0,
  },
};

const database = firebase.database();

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      user: {
        displayName: '', photoURL: '', uid: '', email: '',
      },
      isOpenSupportBrowserDialog: false,
      isOpenHelpDialog: false,
      loginProggres: true,
    };
  }

  componentWillMount() {
    // 認証でfirebaseのdefaultのhosturl(https://myapp.firebaseapp.com)にリダイレクトされた場合にURLを書き換える処理
    // https:// stackoverflow.com/questions/34212039/redirect-to-firebase-hosting-custom-domain
    const url = process.env.NODE_ENV === 'production' ? [constants.URL] : [constants.DEVURL1, constants.DEVURL2];
    if (url.indexOf(window.location.origin) === -1) window.location.href = constants.URL;

    firebase.auth().onAuthStateChanged((user) => {
      if (user) {
        // dimension1はgaではuidとしている
        ReactGA.set({ dimension1: user.uid });
        const promises = [database.ref(`/users/${user.uid}/settings/`).once('value'), database.ref(`/users/${user.uid}/teams/`).once('value')];
        Promise.all(promises).then((snapshots) => {
          const [settings, teams] = snapshots;
          if (settings.exists()) {
            const mySettings = settings.val();
            this.setState({
              user: {
                displayName: mySettings.displayName, photoURL: mySettings.photoURL, uid: mySettings.uid, email: mySettings.email,
              },
            });
          } else {
            const mySettings = {
              displayName: user.displayName, photoURL: user.photoURL, uid: user.uid, email: user.email,
            };
            this.setState({ user: mySettings });
            database.ref(`/users/${user.uid}/settings/`).set(mySettings);
          }
          if (teams.exists() && teams.val() !== []) {
            // 自分のidと自分のチームのid
            return teams.val().map(team => team.id).concat([user.uid]);
          }
          return [];
        }).then((myWorkSheetsIds) => {
          // ログイン時 or 自分のシートのIDを含まないURLではワークシートの選択(urlルート)に飛ばす
          const pathname = this.props.location.pathname.replace('/', '');
          if (pathname === '/login' || pathname === '/signup' || !myWorkSheetsIds.includes(pathname)) {
            this.props.history.push('/');
          }
        });
      }
      this.setState({ loginProggres: false });
    });
  }

  componentDidMount() {
  }

  openHelpDialog() {
    this.setState({ isOpenHelpDialog: true });
  }

  closeHelpDialog() {
    this.setState({ isOpenHelpDialog: false });
  }

  toggleHelpDialog() {
    this.setState({ isOpenHelpDialog: !this.state.isOpenHelpDialog });
  }

  login() {
    if (util.isSupportBrowser()) {
      this.setState({ loginProggres: true });
      const provider = new firebase.auth.GoogleAuthProvider();
      firebase.auth().signInWithRedirect(provider);
    } else {
      this.setState({ isOpenSupportBrowserDialog: true });
    }
  }

  logout() {
    firebase.auth().signOut().then(() => {
      // userの初期化
      this.setState({ user: { displayName: '', photoURL: '', uid: '' } });
      this.props.history.push('/logout');
    }).catch((error) => {
      throw new Error(error);
    });
  }

  goScripts() {
    this.props.history.push(`/${this.state.user.uid}/scripts`);
  }

  goWorkSheets() {
    this.props.history.push('/');
  }

  render() {
    const { classes } = this.props;
    return (
      <div className={classes.root}>
        <GlobalHeader
          user={this.state.user}
          isOpenHelpDialog={this.state.isOpenHelpDialog}
          openHelpDialog={this.openHelpDialog.bind(this)}
          closeHelpDialog={this.closeHelpDialog.bind(this)}
          logout={this.logout.bind(this)}
          goScripts={this.goScripts.bind(this)}
          goWorkSheets={this.goWorkSheets.bind(this)}
        />
        <Switch>
          <Route exact strict path="/" render={(props) => { if (this.state.user.uid !== '') { return <WorkSheets user={this.state.user} {...props} />; } return (<Top {...props} />); }} />
          <Route exact strict path="/signup" render={props => <Signup login={this.login.bind(this)} {...props} />} />
          <Route exact strict path="/login" render={props => <Login login={this.login.bind(this)} {...props} />} />
          <Route exact strict path="/logout" render={props => <Logout {...props} />} />
          <Route exact strict path="/:id" render={(props) => { if (this.state.user.uid !== '') { return <Taskontable userId={this.state.user.uid} toggleHelpDialog={this.toggleHelpDialog.bind(this)} {...props} />; } return null; }} />
          <Route exact strict path="/:id/scripts" render={(props) => { if (this.state.user.uid !== '') { return <Scripts userId={this.state.user.uid} {...props} />; } return null; }} />
        </Switch>
        <Dialog open={this.state.loginProggres}>
          <CircularProgress className={classes.content} size={60} />
        </Dialog>
        <Dialog open={this.state.isOpenSupportBrowserDialog}>
          <DialogTitle>サポート対象外ブラウザです</DialogTitle>
          <DialogContent>
            <DialogContentText>
            本サービスは現在{constants.SUPPORTEDBROWSERS}での動作をサポートしております。<br />
            お手数ですが、{constants.SUPPORTEDBROWSERS}で開きなおすか、下記のボタンを押してダウンロードして下さい。
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                window.open(constants.CHROME_DL_URL);
                this.setState({ isOpenSupportBrowserDialog: false });
              }}
              color="primary"
              autoFocus
            >
              ダウンロードする
            </Button>
          </DialogActions>
        </Dialog>
      </div>
    );
  }
}

App.propTypes = {
  classes: PropTypes.object.isRequired, // eslint-disable-line
  history: PropTypes.object.isRequired, // eslint-disable-line
};


export default withRouter(withStyles(styles)(App));

