import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import AppBar from '@material-ui/core/AppBar';
import Button from '@material-ui/core/Button';
import Toolbar from '@material-ui/core/Toolbar';
import Grid from '@material-ui/core/Grid';
import IconButton from '@material-ui/core/IconButton';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import Avatar from '@material-ui/core/Avatar';
import Info from '@material-ui/icons/Info';
import Help from '@material-ui/icons/Help';
import Notifications from '@material-ui/icons/Notifications';
import HelpDialog from '../components/HelpDialog';
import constants from '../constants';
import i18n from '../i18n';
import title from '../images/title.png';
import person from '../images/person.svg';

const styles = theme => ({
  root: {
    minHeight: theme.mixins.toolbar.minHeight,
  },
  appBar: {
    zIndex: theme.zIndex.drawer + 1,
  },
  button: {
    minWidth: 70,
    padding: 3,
    fontSize: 9,
    margin: theme.spacing.unit,
  },
  userPhoto: {
    width: 25,
    height: 25,
  },
  iconButton: {
  },
  toolbar: {
    maxWidth: '100%',
    margin: '0 auto',
  },
  title: {
    marginRight: 'auto',
  },
  link: {
    textDecoration: 'none',
  },
});

function handleMenuItem(event) {
  const menuItemKey = event.currentTarget.getAttribute('data-menu-item-key');
  if (constants.menuItemKey.CONTACT === menuItemKey) {
    window.open(constants.CONTACT_URL);
  } else if (constants.menuItemKey.GIT === menuItemKey) {
    window.open(constants.REPOSITORY_URL);
  } else if (constants.menuItemKey.ROADMAP === menuItemKey) {
    window.open(constants.ROADMAP_URL);
  } else if (constants.menuItemKey.COMMUNITY === menuItemKey) {
    window.open(constants.COMMUNITY_URL);
  } else if (constants.menuItemKey.BLOG === menuItemKey) {
    window.open(constants.BLOG_URL);
  }
}
class GlobalHeader extends Component {
  constructor(props) {
    super(props);
    this.state = {
      login: false,
      anchorEl: null,
      openMenuKey: '',
    };
  }

  componentWillMount() {
  }

  componentDidMount() {
    if (window.Headway) window.Headway.init({ selector: '#changelog', account: constants.HEADWAY_ACCOUNT });
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.user.uid !== '') {
      this.setState({ login: true });
    } else {
      this.setState({ login: false });
    }
    setTimeout(() => this.forceUpdate());
  }

  closeMenu() {
    this.setState({ anchorEl: null, openMenuKey: '' });
  }

  handleMenu(event) {
    const menuKey = event.currentTarget.getAttribute('data-menu-key');
    this.setState({ anchorEl: event.currentTarget, openMenuKey: menuKey });
  }

  logout() {
    this.closeMenu();
    setTimeout(() => this.props.logout());
  }

  goSettings() {
    this.closeMenu();
    setTimeout(() => this.props.goSettings());
  }

  render() {
    const {
      user, openSideBar, isOpenHelpDialog, openHelpDialog, closeHelpDialog, history, classes,
    } = this.props;
    const { anchorEl } = this.state;

    return (
      <AppBar color="default" className={classes.appBar}>
        <Grid container alignItems="stretch" justify="center" spacing={0} className={classes.toolbar}>
          <Grid item xs={12}>
            <Toolbar style={{ paddingLeft: 0 }} className={classes.root}>
              {(() => {
                if (this.state.login) {
                  return (
                    <Button className={classes.title} onClick={openSideBar}>
                      <img src={title} alt="taskontable" height="18" />
                    </Button>
                  );
                }
                return (
                  <Button className={classes.title} onClick={() => { history.push('/'); }}>
                    <img src={title} alt="taskontable" height="18" />
                  </Button>
                );
              })()}
              {(() => {
                if (!this.state.login) {
                  return (
                    <div style={{ display: 'inline-flex' }}>
                      <Link className={classes.link} to="/login">
                        <Button className={classes.button}>
                          {i18n.t('common.logIn')}
                        </Button>
                      </Link>
                      <Link className={classes.link} to="/signup">
                        <Button className={classes.button}>
                          {i18n.t('common.signUp')}
                        </Button>
                      </Link>
                    </div>);
                }
                return (
                  <div style={{ display: 'inline-flex' }}>
                    <div>
                      <IconButton className={classes.iconButton} onClick={this.handleMenu.bind(this)} data-menu-key="user">
                        <Avatar className={classes.userPhoto} src={user.photoURL ? user.photoURL : person} />
                      </IconButton>
                      <Menu
                        anchorEl={anchorEl}
                        open={this.state.openMenuKey === 'user'}
                        onClose={this.closeMenu.bind(this)}
                      >
                        <MenuItem title={user.email}>
                          {i18n.t('common.userName')}
:
                          {' '}
                          {user.displayName}
                        </MenuItem>
                        <MenuItem onClick={this.goSettings.bind(this)}>
                          {i18n.t('common.accountSettings')}
                        </MenuItem>
                        <MenuItem onClick={this.logout.bind(this)}>
                          {i18n.t('common.logOut')}
                        </MenuItem>
                      </Menu>
                    </div>
                    <div>
                      <IconButton className={classes.iconButton} onClick={openHelpDialog}>
                        <Help />
                      </IconButton>
                    </div>
                    <div>
                      <IconButton className={classes.iconButton} onClick={this.handleMenu.bind(this)} data-menu-key="info">
                        <Info />
                      </IconButton>
                      <Menu
                        anchorEl={anchorEl}
                        open={this.state.openMenuKey === 'info'}
                        onClose={this.closeMenu.bind(this)}
                      >
                        <MenuItem onClick={handleMenuItem} data-menu-item-key={constants.menuItemKey.CONTACT}>
                          {i18n.t('external.contact')}
                        </MenuItem>
                        <MenuItem onClick={handleMenuItem} data-menu-item-key={constants.menuItemKey.ROADMAP}>
                          {i18n.t('external.roadMap')}
                        </MenuItem>
                        <MenuItem onClick={handleMenuItem} data-menu-item-key={constants.menuItemKey.BLOG}>
                          {i18n.t('external.blog')}
                        </MenuItem>
                        <MenuItem onClick={handleMenuItem} data-menu-item-key={constants.menuItemKey.COMMUNITY}>
                          {i18n.t('external.community')}
                        </MenuItem>
                        <MenuItem onClick={handleMenuItem} data-menu-item-key={constants.menuItemKey.GIT}>
                          {i18n.t('external.github')}
                        </MenuItem>
                        <MenuItem disabled>
version:
                          {constants.APP_VERSION}
                        </MenuItem>
                      </Menu>
                    </div>
                  </div>);
              })()}
              <div style={{ display: 'inline-flex' }}>
                <IconButton className={classes.iconButton}>
                  <Notifications />
                  <span style={{ position: 'absolute', left: 15, top: 15 }} id="changelog" />
                </IconButton>
              </div>
            </Toolbar>
          </Grid>
        </Grid>
        <HelpDialog
          open={isOpenHelpDialog}
          onClose={closeHelpDialog}
        />
        <script async src="//cdn.headwayapp.co/widget.js" />
      </AppBar>
    );
  }
}

GlobalHeader.propTypes = {
  user: PropTypes.shape({
    displayName: PropTypes.string.isRequired,
    email: PropTypes.string.isRequired,
    photoURL: PropTypes.string.isRequired,
    uid: PropTypes.string.isRequired,
  }).isRequired,
  openSideBar: PropTypes.func.isRequired,
  isOpenHelpDialog: PropTypes.bool.isRequired,
  openHelpDialog: PropTypes.func.isRequired,
  closeHelpDialog: PropTypes.func.isRequired,
  logout: PropTypes.func.isRequired,
  goSettings: PropTypes.func.isRequired,
  history: PropTypes.object.isRequired, // eslint-disable-line
  classes: PropTypes.object.isRequired, // eslint-disable-line
  theme: PropTypes.object.isRequired, // eslint-disable-line
};

export default withStyles(styles, { withTheme: true })(GlobalHeader);
