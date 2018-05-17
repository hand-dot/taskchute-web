import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';
import Paper from '@material-ui/core/Paper';
import google from '../images/google.svg';
import constants from '../constants';
import util from '../util';

const styles = {
  root: {
    minHeight: '100vh',
  },
  content: {
    padding: '6em 2em',
    maxWidth: 660,
    margin: '0 auto',
    textAlign: 'center',
  },
  button: {
    marginTop: 15,
    marginBottom: 15,
    width: '100%',
  },
};
class Login extends Component {
  constructor(props) {
    super(props);
    this.state = {
      email: '',
      password: '',
    };
  }
  componentWillMount() {
    // 招待されたメールからメールアドレスを設定する処理。
    if (this.props.location.search) {
      this.setState({ email: util.getQueryVariable('email') });
    }
  }
  login(type) {
    const obj = {
      email: '',
      password: '',
    };
    if (type === constants.authType.GOOGLE) {
      obj.type = type;
    } else if (type === constants.authType.EMAIL_AND_PASSWORD) {
      obj.type = type;
      obj.email = this.state.email;
      obj.password = this.state.password;
    }
    this.props.login(obj);
  }
  render() {
    const { classes } = this.props;
    return (
      <Grid className={classes.root} container spacing={0} alignItems="stretch" justify="center">
        <Grid item xs={12}>
          <Paper style={{ minHeight: '100vh' }} square elevation={0}>
            <div className={classes.content}>
              <Typography variant="headline" gutterBottom>
                {constants.TITLE}にログイン
              </Typography>
              <div style={{ fontSize: 12, marginBottom: 20 }}>
              OR<Link to={this.props.location.search === '' ? '/signup' : `/signup${this.props.location.search}`}>アカウント作成</Link>
              </div>
              <Typography variant="caption" gutterBottom>
            *現在Beta版のため一部の機能を除いてアプリをお試しできます。(データがクリアさせる可能性があります。)
              </Typography>
              <Typography variant="caption" gutterBottom>
              *現在ログインしていただくと2018年7~8月の正式リリース時にお知らせメールを送信させていただきます。
              </Typography>
              <form style={{ marginTop: '2em' }}>
                <TextField
                  value={this.state.email}
                  onChange={(e) => { this.setState({ email: e.target.value }); }}
                  disabled={this.props.location.search !== ''}
                  id="email"
                  label="メールアドレス"
                  InputLabelProps={{
                  shrink: true,
                }}
                  placeholder="たとえばuser@example.com"
                  fullWidth
                  margin="normal"
                />
                <TextField
                  value={this.state.password}
                  onChange={(e) => { this.setState({ password: e.target.value }); }}
                  autoFocus={this.props.location.search !== ''}
                  autoComplete="password"
                  id="password"
                  type="password"
                  label="パスワード"
                  InputLabelProps={{
                  shrink: true,
                }}
                  placeholder="6文字以上入力してください"
                  fullWidth
                  margin="normal"
                />
                <Button onClick={this.login.bind(this, constants.authType.EMAIL_AND_PASSWORD)} variant="raised" className={classes.button}>ログイン</Button>
              </form>
              <Typography gutterBottom>
              OR
              </Typography>
              <Button onClick={this.login.bind(this, constants.authType.GOOGLE)} variant="raised" color="primary" className={classes.button}><img src={google} alt="google" height="20" />　グーグルアカウントでログインする</Button>
              <div style={{ fontSize: 12, marginBottom: 10 }}>
                <Link to="/">Topに戻る</Link>
              </div>
            </div>
          </Paper>
        </Grid>
      </Grid>
    );
  }
}

Login.propTypes = {
  login: PropTypes.func.isRequired,
  classes: PropTypes.object.isRequired, // eslint-disable-line
  location: PropTypes.object.isRequired, // eslint-disable-line
};

export default withStyles(styles)(Login);

