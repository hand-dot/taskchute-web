import React from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import { withStyles } from 'material-ui/styles';
import Grid from 'material-ui/Grid';
import Typography from 'material-ui/Typography';
import TextField from 'material-ui/TextField';
import Button from 'material-ui/Button';
import Paper from 'material-ui/Paper';
import google from '../images/google.svg';

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

function Signup(props) {
  const { classes, login } = props;
  return (
    <Grid className={classes.root} container spacing={0} alignItems="stretch" justify="center">
      <Grid item xs={12}>
        <Paper style={{ minHeight: '100vh' }} square elevation={0}>
          <div className={classes.content}>
            <Typography variant="title">
              アカウントを新規作成
            </Typography>
            <div style={{ fontSize: 12, marginBottom: 10 }}>
              OR<Link to="/login">アカウントにサインイン</Link>
            </div>
            <Typography variant="caption" gutterBottom>
              *現在グーグルログインしかご利用いただけません。
            </Typography>
            <Typography variant="caption" gutterBottom>
              *現在Beta版のため一部の機能を除いてアプリをお試しできます。(データがクリアさせる可能性があります。)
            </Typography>
            <Typography variant="caption" gutterBottom>
              *現在ログインしていただくと2018年7~8月の正式リリース時にお知らせメールを送信させていただきます。
            </Typography>
            <form style={{ marginTop: '2em' }}>
              <TextField
                id="username"
                label="ユーザー名"
                InputLabelProps={{
                  shrink: true,
                }}
                disabled
                placeholder="たとえば田中太郎"
                fullWidth
                margin="normal"
              />
              <TextField
                id="email"
                label="メールアドレス"
                InputLabelProps={{
                  shrink: true,
                }}
                disabled
                placeholder="たとえばuser@example.com"
                fullWidth
                margin="normal"
              />
              <TextField
                id="password"
                type="password"
                label="パスワード"
                InputLabelProps={{
                  shrink: true,
                }}
                disabled
                placeholder="8文字以上入力してください"
                fullWidth
                margin="normal"
              />
              <Button variant="raised" disabled className={classes.button}>アカウントを作成</Button>
            </form>
            <Typography gutterBottom>
              OR
            </Typography>
            <Button onClick={login} variant="raised" color="primary" className={classes.button}><img src={google} alt="google" height="20" />　グーグルアカウントでログインする</Button>
            <div style={{ fontSize: 12, marginBottom: 10 }}>
              <Link to="/top">Topに戻る</Link>
            </div>
          </div>
        </Paper>
      </Grid>
    </Grid>
  );
}

Signup.propTypes = {
  login: PropTypes.func.isRequired,
  classes: PropTypes.object.isRequired, // eslint-disable-line
};

export default withStyles(styles)(Signup);

