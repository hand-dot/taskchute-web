import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import Grid from '@material-ui/core/Grid';
import Paper from '@material-ui/core/Paper';
import Divider from '@material-ui/core/Divider';
import Title from './Title';
import SnsShare from './SnsShare';
import Bmc from './Bmc';
import GithubStart from './GithubStart';
import constants from '../constants';
import i18n from '../i18n';
import appStore from '../images/app_store.png';
import googlePlay from '../images/google_play.png';
import chromeWebstore from '../images/chrome_webstore.png';

const styles = {
  content: {
    paddingBottom: '3em',
    paddingLeft: 10,
    paddingRight: 10,
    maxWidth: 960,
    margin: '0 auto',
  },
};

class Footer extends Component {
  componentDidMount() {
    window.twttr.widgets.load(this.twitterFollowButton);
  }

  render() {
    const { classes } = this.props;
    return (
      <Grid spacing={0} container alignItems="stretch" justify="center">
        <Grid item xs={12}>
          <Divider style={{ margin: '0 0 4em' }} />
          <Paper square elevation={0}>
            <div className={classes.content}>
              <Title />
              <Grid spacing={0} container alignItems="stretch" justify="center" style={{ paddingTop: '4em' }}>
                <Grid item xs={12} sm={4} style={{ marginBottom: '2em', textAlign: 'center' }} className={classes.center}>
                  <a style={{ fontSize: 12, margin: '0 .4em' }} href={`https://chrome.google.com/webstore/detail/${constants.CHROME_EXTENTION_ID}`} target="_blank">
                    <img src={chromeWebstore} alt="ChromeWebstore" />
                  </a>
                </Grid>
                <Grid item xs={12} sm={4} style={{ marginBottom: '2em', textAlign: 'center' }} className={classes.center}>
                  <a style={{ fontSize: 12, margin: '0 .4em' }} href={`${constants.SUBSCRIBE_URL}`} target="_blank">
                    <img src={appStore} alt="AppStore" />
                  </a>
                </Grid>
                <Grid item xs={12} sm={4} style={{ marginBottom: '2em', textAlign: 'center' }} className={classes.center}>
                  <a style={{ fontSize: 12, margin: '0 .4em' }} href={`${constants.SUBSCRIBE_URL}`} target="_blank">
                    <img src={googlePlay} alt="GooglePlay" />
                  </a>
                </Grid>
                <Grid item xs={12} sm={2} style={{ marginBottom: '2em', textAlign: 'center' }} className={classes.center}>
                  <a style={{ fontSize: 12, margin: '0 .4em' }} href={constants.CONTACT_URL} target="_blank">
                    {i18n.t('external.contact')}
                  </a>
                </Grid>
                <Grid item xs={12} sm={2} style={{ marginBottom: '2em', textAlign: 'center' }} className={classes.center}>
                  <a style={{ fontSize: 12, margin: '0 .4em' }} href={constants.COMMUNITY_URL} target="_blank">
                    {i18n.t('external.community')}
                  </a>
                </Grid>
                <Grid item xs={12} sm={2} style={{ marginBottom: '2em', textAlign: 'center' }} className={classes.center}>
                  <a style={{ fontSize: 12, margin: '0 .4em' }} href={constants.BLOG_URL} target="_blank">
                    {i18n.t('external.blog')}
                  </a>
                </Grid>
                <Grid item xs={12} sm={2} style={{ marginBottom: '2em', textAlign: 'center' }} className={classes.center}>
                  <a style={{ fontSize: 12, margin: '0 .4em' }} href={constants.ROADMAP_URL} target="_blank">
                    {i18n.t('external.roadMap')}
                  </a>
                </Grid>
                <Grid item xs={12} sm={2} style={{ marginBottom: '2em', textAlign: 'center' }} className={classes.center}>
                  <a style={{ fontSize: 12, margin: '0 .4em' }} href={constants.PRESSKIT_URL} target="_blank">
                    {i18n.t('external.pressKit')}
                  </a>
                </Grid>
                <Grid item xs={12} style={{ marginBottom: '1em', textAlign: 'center' }} className={classes.center}>
                  <div style={{ marginBottom: '1em' }}>
                    <GithubStart
                      title="Star hand-dot/taskontable on GitHub"
                      user="hand-dot"
                      repo="taskontable"
                      size="small"
                      width="80"
                      height="20"
                    />
                  </div>
                  <div style={{ marginBottom: '1em' }}>
                    <a ref={(twitterFollowButton) => { this.twitterFollowButton = twitterFollowButton; }} href="https://twitter.com/taskontable?ref_src=twsrc%5Etfw" className="twitter-follow-button" data-show-count="false">
                    Follow @taskontable
                    </a>
                  </div>
                  <div style={{ marginBottom: '1em' }}>
                    <SnsShare title={constants.TITLE} shareUrl={constants.URL} />
                  </div>
                  <div>
                    <Bmc id={constants.BMC_ID} />
                  </div>
                </Grid>
              </Grid>
            </div>
          </Paper>
        </Grid>
      </Grid>
    );
  }
}


Footer.propTypes = {
  classes: PropTypes.object.isRequired, // eslint-disable-line
  theme: PropTypes.object.isRequired, // eslint-disable-line
};

export default withStyles(styles, { withTheme: true })(Footer);
