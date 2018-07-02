import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';
import Divider from '@material-ui/core/Divider';
import Dialog from '@material-ui/core/Dialog';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import IconButton from '@material-ui/core/IconButton';
import Close from '@material-ui/icons/Close';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import SnsShare from '../components/SnsShare';
import HowtoUse from '../components/HowtoUse';
import constants from '../constants';
import util from '../util';
import i18n from '../i18n';
import '../styles/helpdialog.css';

const styles = {
  root: {
    minHeight: '100vh',
  },
  flex: {
    flex: 1,
  },
  closeBtn: {
    marginLeft: 'auto',
    marginRight: 20,
  },
  content: {
    padding: '4.5em 2em 0',
  },
  block: {
    fontSize: 22,
    margin: 5,
  },
};


class Hello extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isOpenHowtoUseDialog: false,
    };
  }

  componentWillMount() {
    setTimeout(() => {
      if (!util.isMobile()) {
        window.onkeydown = (e) => {
          if (constants.shortcuts.TOGGLE_HELP(e)) {
            e.preventDefault();
            this.props.toggleHelpDialog();
          }
        };
      }
    });
  }

  render() {
    const { classes } = this.props;
    return (
      <Grid className={classes.root} container spacing={0} alignItems="stretch">
        <Grid item xs={12}>
          <div className={classes.content}>
            <Typography gutterBottom variant="title">
              {i18n.t('hello.wellcome')}
              <Button onClick={() => { this.setState({ isOpenHowtoUseDialog: true }); }} color="primary">
                {i18n.t('hello.seeHowTouse')}
              </Button>
            </Typography>
            <div style={{ marginTop: 30, marginBottom: 30 }}>
              <Typography gutterBottom variant="body2">
                Community
                <span role="img" aria-label="Community">
                  😉
                </span>
              </Typography>
              <p dangerouslySetInnerHTML={{ __html: i18n.t('hello.community') }} />
              <a href={constants.COMMUNITY_URL} target="_blank">
                {i18n.t('common.join')}
                <span role="img" aria-label="Help">
                  🚀
                </span>
              </a>
            </div>
            <Divider />
            <div style={{ marginTop: 30, marginBottom: 30 }}>
              <Typography gutterBottom variant="body2">
                Help
                <span role="img" aria-label="Help">
                  😵
                </span>
              </Typography>
              <p dangerouslySetInnerHTML={{ __html: i18n.t('hello.help') }} />
            </div>
            <Divider />
            <div style={{ marginTop: 30, marginBottom: 30 }}>
              <Typography gutterBottom variant="body2">
              Please
                <span role="img" aria-label="Help">
                  🙏
                </span>
              </Typography>
              <p>
                {i18n.t('hello.please1')}
              </p>
              <SnsShare title={constants.TITLE} shareUrl={constants.URL} />
              <br />
              <p>
                {i18n.t('hello.please2')}
              </p>
              <iframe title="Star hand-dot/taskontable on GitHub" src="https://ghbtns.com/github-btn.html?user=hand-dot&repo=taskontable&type=star&count=true&size=large" frameBorder="0" scrolling="0" />
            </div>
            <Divider />
          </div>
        </Grid>
        <Dialog
          fullScreen
          open={this.state.isOpenHowtoUseDialog}
          onClose={() => { this.setState({ isOpenHowtoUseDialog: false }); }}
          aria-labelledby="how-to-use-dialog"
        >
          <AppBar position="static" color="default">
            <Toolbar>
              <Typography variant="title" color="inherit" className={classes.flex}>
                {i18n.t('hello.howTouse')}
              </Typography>
              <IconButton className={classes.closeBtn} onClick={() => { this.setState({ isOpenHowtoUseDialog: false }); }}>
                <Close />
              </IconButton>
            </Toolbar>
          </AppBar>
          <DialogTitle id="how-to-use-dialog">
            {i18n.t('hello.howTouse')}
          </DialogTitle>
          <DialogContent>
            <DialogContentText />
            <HowtoUse />
          </DialogContent>
        </Dialog>
      </Grid>
    );
  }
}

Hello.propTypes = {
  toggleHelpDialog: PropTypes.func.isRequired,
  classes: PropTypes.object.isRequired, // eslint-disable-line
  theme: PropTypes.object.isRequired, // eslint-disable-line
};

export default withStyles(styles, { withTheme: true })(Hello);
