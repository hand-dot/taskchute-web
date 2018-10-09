import React, { Component } from 'react';
import PropTypes from 'prop-types';
import debounce from 'lodash.debounce';
import { withStyles } from '@material-ui/core/styles';
import Avatar from '@material-ui/core/Avatar';
import ChipInput from 'material-ui-chip-input';
import Typography from '@material-ui/core/Typography';
import TextField from '@material-ui/core/TextField';
import IconButton from '@material-ui/core/IconButton';
import Button from '@material-ui/core/Button';
import Snackbar from '@material-ui/core/Snackbar';
import Dialog from '@material-ui/core/Dialog';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogContent from '@material-ui/core/DialogContent';
import DialogActions from '@material-ui/core/DialogActions';
import CircularProgress from '@material-ui/core/CircularProgress';
import FormGroup from '@material-ui/core/FormGroup';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Checkbox from '@material-ui/core/Checkbox';
import Delete from '@material-ui/icons/Delete';
import Sms from '@material-ui/icons/Sms';
import Email from '@material-ui/icons/Email';
import PersonAdd from '@material-ui/icons/PersonAdd';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import person from '../images/person.svg';
import util from '../utils/util';
import i18n from '../i18n';
import constants from '../constants';
import notifiIcon from '../images/notifiIcon.png';

const URL = `${window.location.protocol}//${window.location.host}`;

const styles = theme => ({
  root: {
    display: 'flex',
  },
  formControl: {
    margin: theme.spacing.unit * 3,
  },
  group: {
    margin: `${theme.spacing.unit}px 0`,
  },
  actionIcon: {
    width: 35,
    height: 35,
  },
  userPhoto: {
    width: 35,
    height: 35,
    textAlign: 'center',
    margin: '0 auto',
  },
  membersContainer: {
    display: 'inline-flex',
    flexDirection: 'row',
    alignItems: 'center',
  },
  member: {
    textAlign: 'center',
    maxWidth: 200,
    minWidth: 110,
    display: 'inline-block',
    padding: theme.spacing.unit,
    borderRadius: theme.spacing.unit,
    '&:hover': {
      background: theme.palette.grey[50],
    },
  },
  memberText: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  circularProgress: {
    overflow: 'hidden',
    padding: 0,
  },
  input: {
    width: '100%',
  },
});

const getBlankTarget = () => util.cloneDeep({
  type: '',
  uid: '',
  displayName: '',
  email: '',
  photoURL: '',
  fcmToken: '',
});

class Members extends Component {
  constructor(props) {
    super(props);
    this.addMember = debounce(this.addMember, constants.RENDER_DELAY);
    this.state = {
      invitationEmails: [],
      notificationMessage: '',
      isNotificateAllMember: false,
      target: {
        type: '',
        uid: '',
        displayName: '',
        email: '',
        photoURL: '',
        fcmToken: '',
      },
      snackbarText: '',
      isOpenSnackbar: false,
      isOpenAddMemberModal: false,
      isOpenRemoveMemberModal: false,
      isOpenResendEmailModal: false,
      isOpenSendNotificationModal: false,
      processing: false,
    };
  }

  sendInviteEmail(to) {
    const supportEmail = constants.EMAIL;
    const { userName, worksheetName, worksheetId } = this.props;
    const urlParam = `?email=${encodeURIComponent(to)}&worksheet=${worksheetId}`;
    const loginUrl = `${URL}/login${urlParam}`;
    const signupUrl = `${URL}/signup${urlParam}`;
    return util.sendEmail({
      to,
      from: supportEmail,
      subject: i18n.t('mail.invite.subject_userName_worksheetName', { userName, worksheetName }),
      body: i18n.t('mail.invite.body_userName_worksheetName_loginUrl_signupUrl', {
        userName, worksheetName, loginUrl, signupUrl,
      }) + i18n.t('mail.footer'),
    });
  }

  addMember() {
    const { state } = this;
    const stateInvitationEmails = state.invitationEmails;
    const { handleInvitedEmails, invitedEmails } = this.props;
    if (stateInvitationEmails.length === 0) {
      alert(i18n.t('validation.must_target', { target: i18n.t('common.emailAddress') }));
      return;
    }
    this.setState({ processing: true });
    Promise.all(stateInvitationEmails.map(this.sendInviteEmail.bind(this)))
      .then(
        () => {
          const allInvitedEmails = invitedEmails.concat(stateInvitationEmails);
          const uniqueEmails = allInvitedEmails.filter((x, i, self) => self.indexOf(x) === i);
          handleInvitedEmails(uniqueEmails).then(() => {
            this.setState({
              isOpenSnackbar: true,
              snackbarText: i18n.t('members.sentAnInvitationEmail'),
              invitationEmails: [],
              isOpenAddMemberModal: false,
              processing: false,
            });
          });
        },
        () => {
          this.setState({
            isOpenSnackbar: true,
            snackbarText: i18n.t('members.failedToSendInvitationMail'),
            processing: false,
          });
        },
      );
  }


  /**
   * メンバーもしくは招待中のメンバーを削除します。
   */
  removeMember() {
    const { target } = this.state;
    const {
      type,
      uid,
      email,
    } = target;
    const {
      userId,
      worksheetId,
      worksheetName,
      members,
      handleMembers,
      invitedEmails,
      handleInvitedEmails,
    } = this.props;
    if (type === constants.handleUserType.MEMBER) {
      const newMembers = members.filter(member => member.email !== email);
      if ((userId === uid && !window.confirm(i18n.t('members.deletingMyselfFrom_worksheetName', { worksheetName })))
      || (newMembers.length === 0 && !window.confirm(i18n.t('members.noMembersFrom_worksheetName', { worksheetName })))) {
        this.setState({ isOpenRemoveMemberModal: false });
        return;
      }
      this.setState({ processing: true });
      fetch('https://us-central1-taskontable.cloudfunctions.net/removeUserWorksheetsById',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json; charset=utf-8' },
          mode: 'no-cors',
          body: JSON.stringify({ userId: uid, apiVersion: constants.API_VERSION, worksheetId }),
        }).then(() => {
        handleMembers(newMembers);
        if (userId === uid) setTimeout(() => { window.location.reload(); });
        this.setState({
          processing: false,
          isOpenRemoveMemberModal: false,
          target: getBlankTarget(),
        });
      });
    } else if (type === constants.handleUserType.INVITED) {
      const newEmails = invitedEmails.filter(invitedEmail => invitedEmail !== email);
      handleInvitedEmails(newEmails);
      this.setState({
        isOpenRemoveMemberModal: false,
        target: getBlankTarget(),
      });
    }
  }

  /**
   * 招待中のメンバーにメールを再送信します。
   */
  resendEmail() {
    const { target } = this.state;
    if (target.type === constants.handleUserType.INVITED) {
      this.setState({ processing: true });
      // 招待メールの再送信
      this.sendInviteEmail(target.email).then(
        () => {
          this.setState({
            isOpenSnackbar: true,
            snackbarText: i18n.t('members.resentAnInvitationEmail'),
            processing: false,
            isOpenResendEmailModal: false,
          });
        },
        () => {
          this.setState({
            isOpenSnackbar: true,
            snackbarText: i18n.t('members.failedToResendInvitationMail'),
            processing: false,
          });
        },
      );
    }
  }

  /**
   * メンバーに通知を送信します。
   */
  sendNotification() {
    const { target, notificationMessage, isNotificateAllMember } = this.state;
    const {
      userName,
      worksheetId,
      userPhotoURL,
      members,
      userId,
    } = this.props;
    if (target.type === constants.handleUserType.MEMBER) {
      const promises = [];
      const title = `🔔 ${i18n.t('members.notificationFrom_userName', { userName })}`;
      const message = `${userName}: ${notificationMessage ? `${notificationMessage}` : i18n.t('members.pleaseCheckTheSchedule')}`;
      const url = `${URL}/${worksheetId}`;
      const icon = userPhotoURL || notifiIcon; // TODO notifiIconじゃなくてデフォルトのユーザーアイコンを決めるべき
      promises.push(util.sendNotification({
        title, body: message, url, icon, to: target.fcmToken,
      }).then(res => res.ok));
      if (isNotificateAllMember) {
        const others = members.filter(member => member.uid !== userId
           && member.fcmToken !== target.fcmToken && member.fcmToken);
        const otherFcmTokens = others.map(member => member.fcmToken);
        promises.push(...otherFcmTokens.map(otherFcmToken => util.sendNotification({
          title, body: message, url, icon, to: otherFcmToken,
        }).then(res => res.ok)));
      }
      Promise.all(promises).then((res) => {
        let snackbarText;
        if (res.every(r => r)) {
          snackbarText = i18n.t('members.sentNotification');
        } else if (res.every(r => !r)) {
          snackbarText = i18n.t('members.failedToSendNotification');
        } else {
          snackbarText = i18n.t('members.failedToSendSomeNotifications');
        }
        this.setState({
          isOpenSnackbar: true, snackbarText, isOpenSendNotificationModal: false, notificationMessage: '',
        });
      });
    }
  }

  addEmail(email) {
    const { members } = this.props;
    const { invitationEmails } = this.state;
    if (email === '') {
      return;
    }
    if (util.validateEmail(email)) {
      if (members.map(member => member.email).includes(email)) {
        this.setState({ isOpenSnackbar: true, snackbarText: i18n.t('members.emailAlreadyExistsInTheMember') });
      } else {
        invitationEmails.push(email);
      }
    } else {
      this.setState({ isOpenSnackbar: true, snackbarText: i18n.t('validation.invalid_target', { target: i18n.t('common.emailAddress') }) });
    }
  }

  render() {
    const {
      members, invitedEmails, userId, classes, theme,
    } = this.props;
    const {
      isOpenAddMemberModal,
      invitationEmails,
      isOpenRemoveMemberModal,
      isOpenResendEmailModal,
      isOpenSendNotificationModal,
      target,
      notificationMessage,
      isNotificateAllMember,
      processing,
      isOpenSnackbar,
      snackbarText,
    } = this.state;
    return (
      <div>
        <div style={{
          padding: theme.spacing.unit, display: 'inline-flex', flexDirection: 'row', alignItems: 'center',
        }}
        >
          <div>
            <Typography variant="subtitle1" style={{ paddingLeft: theme.spacing.unit }}>
              {i18n.t('worksheet.members')}
            </Typography>
            <div className={classes.membersContainer}>
              {members.length === 0 ? (
                <div style={{ minHeight: 100, display: 'flex', alignItems: 'center' }}>
                  <Typography align="center" variant="caption">
                    {i18n.t('members.noMembers')}
                  </Typography>
                </div>
              ) : members.map(member => (
                <div className={classes.member} key={member.uid}>
                  <IconButton
                    className={classes.actionIcon}
                    color="default"
                    onClick={() => {
                      this.setState({
                        isOpenRemoveMemberModal: true,
                        target: {
                          type: constants.handleUserType.MEMBER,
                          uid: member.uid,
                          displayName: member.displayName,
                          email: member.email,
                          photoURL: member.photoURL,
                          fcmToken: member.fcmToken,
                        },
                      });
                    }}
                  >
                    <Delete style={{ fontSize: 16 }} />
                  </IconButton>
                  /
                  <span>
                    <IconButton
                      disabled={!member.fcmToken || member.uid === userId}
                      className={classes.actionIcon}
                      color="default"
                      onClick={() => {
                        this.setState({
                          isOpenSendNotificationModal: true,
                          target: {
                            type: constants.handleUserType.MEMBER,
                            uid: member.uid,
                            displayName: member.displayName,
                            email: member.email,
                            photoURL: member.photoURL,
                            fcmToken: member.fcmToken,
                          },
                        });
                      }}
                    >
                      <Sms style={{ fontSize: 16 }} />
                    </IconButton>
                  </span>
                  <Typography title={member.displayName} className={classes.memberText} align="center" variant="caption">
                    {member.displayName}
                  </Typography>
                  <Avatar
                    className={classes.userPhoto}
                    src={member.photoURL ? member.photoURL : person}
                  />
                </div>
              ))}
            </div>
          </div>
          <div>
            <Typography variant="subtitle1" style={{ paddingLeft: theme.spacing.unit * 6 }}>
              {i18n.t('members.inviting')}
            </Typography>
            <div className={classes.membersContainer}>
              <span style={{ padding: theme.spacing.unit * 4 }}>
/
              </span>
              {invitedEmails.length === 0 ? (
                <div style={{ minHeight: 100, display: 'flex', alignItems: 'center' }}>
                  <Typography align="center" variant="caption" style={{ minWidth: 150 }}>
                    {i18n.t('members.noOneIsInvited')}
                  </Typography>
                </div>
              ) : invitedEmails.map(invitedEmail => (
                <div className={classes.member} key={invitedEmail}>
                  <IconButton
                    className={classes.actionIcon}
                    color="default"
                    onClick={() => {
                      this.setState({
                        isOpenRemoveMemberModal: true,
                        target: Object.assign(getBlankTarget(), {
                          type: constants.handleUserType.INVITED,
                          email: invitedEmail,
                        }),
                      });
                    }}
                  >
                    <Delete style={{ fontSize: 16 }} />
                  </IconButton>
                   /
                  <IconButton
                    className={classes.actionIcon}
                    color="default"
                    onClick={() => {
                      this.setState({
                        isOpenResendEmailModal: true,
                        target: Object.assign(getBlankTarget(), {
                          type: constants.handleUserType.INVITED,
                          email: invitedEmail,
                        }),
                      });
                    }}
                  >
                    <Email style={{ fontSize: 16 }} />
                  </IconButton>
                  <Typography className={classes.memberText} align="center" variant="caption">
                    {invitedEmail}
                  </Typography>
                  <Avatar className={classes.userPhoto} src={person} />
                </div>
              ))}
            </div>
          </div>
          <div style={{ marginTop: '2em' }}>
            <span style={{ padding: theme.spacing.unit * 4 }}>
/
            </span>
            <IconButton color="default" onClick={() => { this.setState({ isOpenAddMemberModal: true }); }}>
              <PersonAdd />
            </IconButton>
          </div>
          {/* メンバーの追加モーダル */}
          <Dialog
            open={isOpenAddMemberModal}
            onClose={() => { this.setState({ isOpenAddMemberModal: false }); }}
            aria-labelledby="add-member-dialog-title"
            fullWidth
          >
            <DialogTitle id="add-member-dialog-title">
              {i18n.t('members.addMembers')}
            </DialogTitle>
            <DialogContent>
              <ChipInput
                autoFocus
                value={invitationEmails}
                onAdd={(email) => { this.addEmail(email); }}
                onBlur={(e) => { this.addEmail(e.target.value); }}
                onDelete={(email) => {
                  this.setState({
                    invitationEmails:
                  invitationEmails.filter(invitationEmail => invitationEmail !== email),
                  });
                }}
                InputProps={{
                  classes: {
                    input: classes.input,
                  },
                }}
                label={i18n.t('common.emailAddress')}
                fullWidthInput
                fullWidth
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => { this.setState({ invitationEmails: [], isOpenAddMemberModal: false }); }} color="primary">
                {i18n.t('common.cancel')}
              </Button>
              <Button onClick={this.addMember.bind(this)} color="primary">
                {i18n.t('members.sendAnInvitationEmail')}
              </Button>
            </DialogActions>
          </Dialog>
          {/* メンバーの削除モーダル */}
          <Dialog
            open={isOpenRemoveMemberModal}
            onClose={() => { this.setState({ isOpenRemoveMemberModal: false }); }}
            aria-labelledby="remove-member-dialog-title"
          >
            <DialogTitle id="remove-member-dialog-title">
              {i18n.t('common.remove_target', { target: i18n.t('worksheet.members') })}
            </DialogTitle>
            <DialogContent>
              <Typography gutterBottom>
                {i18n.t('common.areYouSureRemove_target', { target: target.type === constants.handleUserType.MEMBER ? target.displayName : target.email })}
              </Typography>
              <Typography variant="caption">
*
                {i18n.t('members.afterRemoveCantAccess')}
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => { this.setState({ isOpenRemoveMemberModal: false }); }} color="primary">
                {i18n.t('common.cancel')}
              </Button>
              <Button onClick={this.removeMember.bind(this)} color="primary">
                {i18n.t('common.remove')}
              </Button>
            </DialogActions>
          </Dialog>
          {/* 招待中のメンバーメール再送信モーダル */}
          <Dialog
            open={isOpenResendEmailModal}
            onClose={() => { this.setState({ isOpenResendEmailModal: false }); }}
            aria-labelledby="resend-email-dialog-title"
          >
            <DialogTitle id="resend-email-dialog-title">
              {i18n.t('members.resendAnInvitationEmail')}
            </DialogTitle>
            <DialogContent>
              <Typography gutterBottom>
                {i18n.t('members.areYouSureResendInvitationEmailTo_target', { target: target.email })}
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => { this.setState({ isOpenResendEmailModal: false }); }} color="primary">
                {i18n.t('common.cancel')}
              </Button>
              <Button onClick={this.resendEmail.bind(this)} color="primary">
                {i18n.t('common.resend')}
              </Button>
            </DialogActions>
          </Dialog>
          {/* メンバー通知モーダル */}
          <Dialog
            open={isOpenSendNotificationModal}
            onClose={() => { this.setState({ isOpenSendNotificationModal: false }); }}
            aria-labelledby="send-notification-dialog-title"
          >
            <DialogTitle id="send-notification-dialog-title">
              {i18n.t('members.sendNotification')}
            </DialogTitle>
            <DialogContent>
              <Typography gutterBottom>
                {i18n.t('members.areYouSureSendNotificationTo_target', { target: target.displayName })}
              </Typography>
              <TextField
                maxLength={100}
                onChange={(e) => { this.setState({ notificationMessage: e.target.value }); }}
                value={notificationMessage}
                autoFocus
                margin="dense"
                id="message"
                type="message"
                label={i18n.t('members.message')}
                placeholder={i18n.t('common.forExample') + i18n.t('members.pleaseCheckTheSchedule')}
                fullWidth
              />
              <FormGroup row>
                <FormControlLabel
                  control={(
                    <Checkbox
                      color="primary"
                      checked={isNotificateAllMember}
                      onChange={() => {
                        this.setState({
                          isNotificateAllMember:
                        !isNotificateAllMember,
                        });
                      }}
                      value="isNotificateAllMember"
                    />
                  )}
                  label={i18n.t('members.notifyOtherMembers')}
                />
                <Typography variant="caption" gutterBottom>
                  (*
                  {i18n.t('members.doNotNoifyMeAndNotificationBlockingMembers')}
                  )
                </Typography>
              </FormGroup>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => { this.setState({ isOpenSendNotificationModal: false }); }} color="primary">
                {i18n.t('common.cancel')}
              </Button>
              <Button onClick={this.sendNotification.bind(this)} color="primary">
                {i18n.t('common.send')}
              </Button>
            </DialogActions>
          </Dialog>
          <Dialog open={processing}>
            <div style={{ padding: theme.spacing.unit }}>
              <CircularProgress className={classes.circularProgress} />
            </div>
          </Dialog>
        </div>
        <Snackbar
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          open={isOpenSnackbar}
          onClose={() => { this.setState({ isOpenSnackbar: false, snackbarText: '' }); }}
          ContentProps={{ 'aria-describedby': 'info-id' }}
          message={(
            <span id="info-id" style={{ display: 'flex', alignItems: 'center' }}>
              <CheckCircleIcon style={{ color: constants.brandColor.base.GREEN }} />
              <span style={{ paddingLeft: theme.spacing.unit }}>
                {snackbarText}
              </span>
            </span>
          )}
        />
      </div>
    );
  }
}

Members.propTypes = {
  userId: PropTypes.string.isRequired,
  userName: PropTypes.string.isRequired,
  userPhotoURL: PropTypes.string.isRequired,
  members: PropTypes.arrayOf(PropTypes.shape({
    displayName: PropTypes.string.isRequired,
    photoURL: PropTypes.string.isRequired,
    uid: PropTypes.string.isRequired,
    email: PropTypes.string.isRequired,
    fcmToken: PropTypes.string.isRequired,
  })).isRequired,
  invitedEmails: PropTypes.arrayOf(PropTypes.string.isRequired).isRequired,
  worksheetId: PropTypes.string.isRequired,
  worksheetName: PropTypes.string.isRequired,
  handleMembers: PropTypes.func.isRequired,
  handleInvitedEmails: PropTypes.func.isRequired,
  classes: PropTypes.object.isRequired, // eslint-disable-line
  theme: PropTypes.object.isRequired, // eslint-disable-line
};
export default withStyles(styles, { withTheme: true })(Members);
