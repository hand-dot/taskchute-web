import { firebase } from '@firebase/app';
import React, { Component } from 'react';
import ReactGA from 'react-ga';
import PropTypes from 'prop-types';
import { withStyles } from 'material-ui/styles';
import { Switch, Route, withRouter } from 'react-router-dom';
import { CircularProgress } from 'material-ui/Progress';
import Snackbar from 'material-ui/Snackbar';
import Dialog, {
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from 'material-ui/Dialog';
import Button from 'material-ui/Button';

import '../styles/keyframes.css';
import util from '../util';
import constants from '../constants';

import GlobalHeader from './GlobalHeader';
import Top from './Top';
import Login from './Login';
import Logout from './Logout';
import Signup from './Signup';
import Scripts from './Scripts';
import Settings from './Settings';
import Taskontable from './Taskontable';
import WorkSheets from './WorkSheets';

const messaging = util.getMessaging();
const auth = util.getAuth();
const database = util.getDatabase();

const styles = {
  root: {
    minHeight: '100vh',
  },
  circularProgress: {
    overflow: 'hidden',
    padding: 0,
  },
};

// constants.authType.EMAIL_AND_PASSWORDの方法でユーザーを登録すると
// displayNameが設定されないため一次的にこの変数に格納する。
let tmpDisplayName = '';

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      user: {
        displayName: '', photoURL: '', uid: '', email: '', fcmToken: '',
      },
      isOpenSupportBrowserDialog: false,
      isOpenHelpDialog: false,
      processing: true,
    };
  }

  componentWillMount() {
    // 認証でfirebaseのdefaultのhosturl(https://myapp.firebaseapp.com)にリダイレクトされた場合にURLを書き換える処理
    // https:// stackoverflow.com/questions/34212039/redirect-to-firebase-hosting-custom-domain
    const url = process.env.NODE_ENV === 'production' ? [constants.URL] : [constants.DEVURL1, constants.DEVURL2];
    if (url.indexOf(window.location.origin) === -1) window.location.href = constants.URL;

    auth.onAuthStateChanged((user) => {
      if (user) {
        // dimension1はgaではuidとしている
        ReactGA.set({ dimension1: user.uid });

        // トークン更新のモニタリング
        if (messaging) {
          messaging.onTokenRefresh(() => {
            messaging.getToken().then((refreshedToken) => {
              database.ref(`/users/${user.uid}/settings/fcmToken`).set(refreshedToken);
            }).catch((err) => {
              throw new Error(`トークン更新のモニタリングに失敗: ${err}`);
            });
          });
        }

        // ログイン後にどこのページからスタートするかをハンドリングする。
        // また、招待されている場合、この処理でチームに参加する。
        Promise.all([
          database.ref(`/users/${user.uid}/settings/`).once('value'),
          database.ref(`/users/${user.uid}/teams/`).once('value'),
          messaging ? messaging.requestPermission().then(() => messaging.getToken()).catch(() => '') : '',
        ]).then((snapshots) => {
          const [settings, teams, fcmToken] = snapshots;
          if (settings.exists()) {
            const mySettings = settings.val();
            this.setState({
              user: {
                displayName: mySettings.displayName, photoURL: mySettings.photoURL, uid: mySettings.uid, email: mySettings.email, fcmToken,
              },
            });
            // fcmTokenは更新されている可能性を考えて空じゃない場合ログイン後、必ず更新する。
            if (fcmToken) database.ref(`/users/${user.uid}/settings/fcmToken`).set(fcmToken);
          } else {
            // アカウント作成後の処理
            const mySettings = {
              displayName: user.displayName || tmpDisplayName, photoURL: user.photoURL || '', uid: user.uid, email: user.email, fcmToken,
            };
            this.setState({ user: mySettings });
            // EMAIL_AND_PASSWORDでユーザーを作成した場合、displayNameがnullなので、firebaseのauthで管理しているユーザーのプロフィールを更新する
            if (!user.displayName) user.updateProfile({ displayName: tmpDisplayName });
            database.ref(`/users/${user.uid}/settings/`).set(mySettings);
          }
          return (teams.exists() && teams.val() !== []) ? teams.val().concat([user.uid]) : [user.uid]; // 自分のidと自分のチームのid or 自分のid
        }).then((myWorkSheetsIds) => {
          const pathname = this.props.location.pathname.replace('/', '');
          const fromInviteEmail = util.getQueryVariable('team') !== '';
          if (!fromInviteEmail && (pathname === 'login' || pathname === 'signup' || pathname === 'index.html')) { // ■ログイン時はワークシートの選択(urlルート)に飛ばす
            this.props.history.push('/');
          } else if (pathname !== '' && (fromInviteEmail || !myWorkSheetsIds.includes(pathname))) { // ■招待の可能性がある場合の処理
            const teamId = fromInviteEmail ? util.getQueryVariable('team') : pathname;
            database.ref(`/teams/${teamId}/invitedEmails/`).once('value').then((invitedEmails) => {
              // 自分のメールアドレスがチームの招待中メールアドレスリストに存在するかチェックする。
              if (!invitedEmails.exists() || !Array.isArray(invitedEmails.val()) || invitedEmails.val() === [] || !invitedEmails.val().includes(user.email)) { // 違った場合はワークシートの選択に飛ばす
                this.props.history.push('/');
                return;
              }
              // 自分が招待されていた場合は自分のチームに加え、チームのメンバーに自分を加える
              Promise.all([database.ref(`/users/${user.uid}/teams/`).once('value'), database.ref(`/teams/${teamId}/users/`).once('value')]).then((snapshots) => {
                const [myTeamIds, teamUserIds] = snapshots;
                const promises = [
                  database.ref(`/users/${user.uid}/teams/`).set((myTeamIds.exists() ? myTeamIds.val() : []).concat([teamId])), // 自分の参加しているチームにチームのidを追加
                  database.ref(`/teams/${teamId}/users/`).set((teamUserIds.exists() ? teamUserIds.val() : []).concat([user.uid])), // 参加しているチームのユーザーに自分のidを追加
                  database.ref(`/teams/${teamId}/invitedEmails/`).set(invitedEmails.val().filter(email => email !== user.email)), // 参加しているチーム招待中メールアドレスリストから削除
                ];
                return Promise.all(promises);
              }).then(() => {
                database.ref(`/teams/${teamId}/users/`).once('value').then((teamUserIds) => {
                  if (teamUserIds.exists() && Array.isArray(teamUserIds.val()) && teamUserIds.val().includes(user.uid)) { // 参加しているチームのユーザーに自分のidが含まれていたら目的のチームidに遷移できる
                    this.props.history.push(`/${teamId}`);
                  } else {
                    this.props.history.push('/');
                  }
                });
              });
            });
          } // else ■自分の所属しているチームへの直遷移
        });
      }
      this.setState({ processing: false });
    });
  }

  componentDidMount() {
  }

  handleUser({ displayName, email, photoURL }) {
    this.setState({ user: Object.assign(this.state.user, { displayName, email, photoURL }) });
  }

  signup({
    type, username, email, password,
  }) {
    this.setState({ processing: true });
    if (type === constants.authType.EMAIL_AND_PASSWORD) {
      if (username === '') {
        this.setState({ processing: false, isOpenSnackbar: true, snackbarText: 'ユーザー名を入力してください。' });
        return;
      }
      if (!util.validateEmail(email) || password.length < 6) {
        this.setState({ processing: false, isOpenSnackbar: true, snackbarText: 'メールアドレスとパスワードを正しく入力してください。' });
        return;
      }
      tmpDisplayName = username;
      auth.createUserWithEmailAndPassword(email, password).then(() => {
        this.setState({ processing: false, isOpenSnackbar: true, snackbarText: 'アカウントを作成しました。' });
      }, (e) => {
        this.setState({ processing: false, isOpenSnackbar: true, snackbarText: 'アカウント作成に失敗しました。' });
        throw new Error(`アカウント作成に失敗:${e}`);
      });
    }
  }

  login({ type, email, password }) {
    if (util.isSupportBrowser()) {
      this.setState({ processing: true });
      if (type === constants.authType.GOOGLE) {
        auth.signInWithRedirect(new firebase.auth.GoogleAuthProvider());
      } else if (type === constants.authType.EMAIL_AND_PASSWORD) {
        if (!util.validateEmail(email) || password.length < 6) {
          this.setState({ processing: false, isOpenSnackbar: true, snackbarText: 'メールアドレスとパスワードを正しく入力してください。' });
          return;
        }
        auth.signInWithEmailAndPassword(email, password).then(() => {
          this.setState({ processing: false, isOpenSnackbar: true, snackbarText: 'ログインしました。' });
        }, () => {
          this.setState({ processing: false, isOpenSnackbar: true, snackbarText: 'ログインに失敗しました。' });
        });
      }
    } else {
      this.setState({ isOpenSupportBrowserDialog: true });
    }
  }

  logout() {
    auth.signOut().then(() => {
      // userの初期化
      this.setState({
        user: {
          displayName: '', photoURL: '', uid: '', email: '',
        },
      });
      this.props.history.push('/logout');
    }).catch((error) => {
      throw new Error(error);
    });
  }

  goSettings() {
    this.props.history.push(`/${this.state.user.uid}/settings`);
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
          openHelpDialog={() => { this.setState({ isOpenHelpDialog: true }); }}
          closeHelpDialog={() => { this.setState({ isOpenHelpDialog: false }); }}
          logout={this.logout.bind(this)}
          goSettings={this.goSettings.bind(this)}
          goScripts={this.goScripts.bind(this)}
          goWorkSheets={this.goWorkSheets.bind(this)}
        />
        <Switch>
          <Route exact strict path="/" render={(props) => { if (this.state.user.uid !== '') { return <WorkSheets user={this.state.user} {...props} />; } return (<Top {...props} />); }} />
          <Route exact strict path="/signup" render={props => <Signup signup={this.signup.bind(this)} login={this.login.bind(this)} {...props} />} />
          <Route exact strict path="/login" render={props => <Login login={this.login.bind(this)} {...props} />} />
          <Route exact strict path="/logout" render={props => <Logout {...props} />} />
          <Route
            exact
            strict
            path="/:id"
            render={(props) => {
              if (this.state.user.uid !== '') {
                return (
                  <Taskontable
                    userId={this.state.user.uid}
                    userName={this.state.user.displayName}
                    userPhotoURL={this.state.user.photoURL}
                    toggleHelpDialog={() => { this.setState({ isOpenHelpDialog: !this.state.isOpenHelpDialog }); }}
                    {...props}
                  />
              );
              }
              // TODO ここでうまくlogin or signup にリダイレクトすることで
              // https://github.com/hand-dot/taskontable/issues/358 このチケットを消化できそう
              // ネックになっている部分が、loginではなく、signupに遷移されたときに"/:id"が消えてしまう。
              // また、トップページに遷移されたときも/:idが消えてしまう。
              // トップページに遷移されたときは仕方ないにしろ、login → signupの遷移などでは/:idを引き継ぎたい。
              // クエリパラメーターが引き回し可能ならそれにしてもいいかもしれない。
              return <Login login={this.login.bind(this)} {...props} />;
            }}
          />
          <Route exact strict path="/:id/scripts" render={(props) => { if (this.state.user.uid !== '') { return <Scripts userId={this.state.user.uid} {...props} />; } return null; }} />
          <Route exact strict path="/:id/settings" render={(props) => { if (this.state.user.uid !== '') { return <Settings user={this.state.user} handleUser={this.handleUser.bind(this)} {...props} />; } return null; }} />
        </Switch>
        <Dialog open={this.state.processing}>
          <CircularProgress className={classes.circularProgress} size={60} />
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
        <Snackbar
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          open={this.state.isOpenSnackbar}
          onClose={() => { this.setState({ isOpenSnackbar: false, snackbarText: '' }); }}
          message={this.state.snackbarText}
        />
      </div>
    );
  }
}

App.propTypes = {
  classes: PropTypes.object.isRequired, // eslint-disable-line
  history: PropTypes.object.isRequired, // eslint-disable-line
  location: PropTypes.object.isRequired, // eslint-disable-line
};


export default withRouter(withStyles(styles)(App));

