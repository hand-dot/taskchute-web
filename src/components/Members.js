import * as firebase from 'firebase';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withStyles } from 'material-ui/styles';
import Avatar from 'material-ui/Avatar';
import Typography from 'material-ui/Typography';
import TextField from 'material-ui/TextField';
import IconButton from 'material-ui/IconButton';
import Button from 'material-ui/Button';
import Dialog, { DialogContent, DialogTitle, DialogActions } from 'material-ui/Dialog';
import { CircularProgress } from 'material-ui/Progress';
import util from '../util';
import constants from '../constants';

const styles = theme => ({
  actionIcon: {
    width: 25,
    height: 25,
  },
  userPhoto: {
    width: 25,
    height: 25,
    textAlign: 'center',
    margin: '0 auto',
  },
  membersContainer: {
    display: 'inline-flex',
    flexDirection: 'row',
    alignItems: 'center',
  },
  member: {
    maxWidth: 200,
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
});

const database = firebase.database();
class Members extends Component {
  constructor(props) {
    super(props);
    this.state = {
      invitationEmail: '',
      removeTarget: {
        type: '',
        uid: '',
        displayName: '',
        email: '',
        photoURL: '',
      },
      isOpenAddMemberModal: false,
      isOpenRemoveMemberModal: false,
      processing: false,
    };
  }

  addMember() {
    if (util.validateEmail(this.state.invitationEmail)) {
      if (this.props.members.map(member => member.email).includes(this.state.invitationEmail)) {
        alert('このメールアドレスは既にメンバーに存在します。');
        this.setState({ invitationEmail: '' });
        return;
      }
      this.setState({ processing: true });
      // teamのデータベースのinvitedにメールアドレスがない場合メールアドレスを追加する。
      database.ref(`/teams/${this.props.teamId}/invitedEmails/`).once('value').then((snapshot) => {
        const invitedEmails = [];
        if (snapshot.exists() && snapshot.val() !== [] && !snapshot.val().includes(this.state.invitationEmail)) {
          invitedEmails.push(...(snapshot.val().concat([this.state.invitationEmail])));
        } else {
          invitedEmails.push(this.state.invitationEmail);
        }
        database.ref(`/teams/${this.props.teamId}/invitedEmails/`).set(invitedEmails);
      });
      // 招待メールの送信
      fetch(`https://us-central1-taskontable.cloudfunctions.net/sendgridEmail?sg_key=${constants.SENDGRID_API_KEY}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json; charset=utf-8' },
        mode: 'no-cors',
        body: JSON.stringify({
          to: this.state.invitationEmail,
          from: constants.EMAIL,
          subject: `${constants.TITLE}へのご招待 - ${this.props.userName} さんから、${constants.TITLE}のワークシート「${this.props.teamName}」への招待が届いています。`,
          body: `${this.props.userName} さんから、${constants.TITLE}のワークシート「${this.props.teamName}」への招待が届いています。

まだ、アカウント作成がお済でない場合は ${window.location.protocol}//${window.location.host}/signup からアカウントを作成し、"ログインを済ませた状態"で 

${window.location.protocol}//${window.location.host}/${this.props.teamId} から参加してください。

------>> Build Your WorkFlow ----------->>>--

${constants.TITLE}

e-mail: ${constants.EMAIL}

HP: ${window.location.protocol}//${window.location.host}

------>> Build Your WorkFlow ----------->>>--`,
        }),
      }).then(
        () => {
          alert('招待メールを送信しました。');
          this.props.handleInvitedEmails(this.props.invitedEmails.concat([this.state.invitationEmail]).filter((x, i, self) => self.indexOf(x) === i));
          this.setState({ invitationEmail: '', isOpenAddMemberModal: false, processing: false });
        },
        () => {
          alert('招待メールの送信に失敗しました。');
          this.setState({ processing: false });
        },
      );
    } else {
      alert('メールアドレスとして正しくありません。');
    }
  }

  removeMemberOrInvitedEmail() {
    if (this.state.removeTarget.type === constants.handleUserType.MEMBER) {
      this.setState({ processing: true });
      database.ref(`/users/${this.state.removeTarget.uid}/teams/`).once('value').then((snapshot) => {
        if (!snapshot.exists() && !Array.isArray(snapshot.val())) {
          // メンバーが最新でない可能性がある。
          // TODO ここダサい。
          alert('メンバーの再取得が必要なためリロードします。');
          window.location.reload();
        }
        return snapshot.val().filter(teamId => teamId !== this.props.teamId);
      }).then((newTeamIds) => {
        if (this.props.userId === this.state.removeTarget.uid && !window.confirm(`${this.props.teamName}から自分を削除しようとしています。もう一度参加するためにはメンバーに招待してもらう必要があります。よろしいですか？`)) {
          this.setState({ isOpenRemoveMemberModal: false, processing: false });
          return;
        }
        if (newTeamIds.length === 0 && !window.confirm(`${this.props.teamName}からメンバーがいなくなります。このチームに二度と遷移できなくなりますがよろしいですか？`)) {
          this.setState({ isOpenRemoveMemberModal: false, processing: false });
          return;
        }
        // TODO ここはcloudfunctionでusersのチームから値を削除し、realtimeデータベースのusers/$uid/.writeは自分しか書き込み出来ないようにしたほうがよさそう。
        database.ref(`/users/${this.state.removeTarget.uid}/teams/`).set(newTeamIds).then(() => {
          const newMembers = this.props.members.filter(member => member.email !== this.state.removeTarget.email);
          this.props.handleMembers(newMembers);
          if (this.props.userId === this.state.removeTarget.uid) setTimeout(() => { window.location.reload(); });
          this.setState({
            processing: false,
            isOpenRemoveMemberModal: false,
            removeTarget: {
              type: '',
              uid: '',
              displayName: '',
              email: '',
              photoURL: '',
            },
          });
        });
      });
    } else if (this.state.removeTarget.type === constants.handleUserType.INVITED) {
      const newEmails = this.props.invitedEmails.filter(invitedEmail => invitedEmail !== this.state.removeTarget.email);
      this.props.handleInvitedEmails(newEmails);
      this.setState({
        isOpenRemoveMemberModal: false,
        removeTarget: {
          type: '',
          uid: '',
          displayName: '',
          email: '',
          photoURL: '',
        },
      });
    }
  }

  render() {
    const {
      teamName, members, invitedEmails, classes, theme,
    } = this.props;
    return (
      <div style={{ padding: theme.spacing.unit, overflow: 'auto' }}>
        <Typography variant="subheading">
          {teamName}のメンバー
        </Typography>
        <div className={classes.membersContainer}>
          {members.length === 0 ? <Typography align="center" variant="caption">メンバーがいません</Typography> : members.map(member => (
            <div className={classes.member} key={member.uid} title={`${member.displayName} - ${member.email}`}>
              <IconButton
                className={classes.actionIcon}
                color="default"
                onClick={() => {
                  this.setState({
                    isOpenRemoveMemberModal: true,
                    removeTarget: Object.assign({
                      type: constants.handleUserType.MEMBER,
                      uid: '',
                      displayName: '',
                      email: '',
                      photoURL: '',
                      }, {
                        uid: member.uid,
                        displayName: member.displayName,
                        email: member.email,
                        photoURL: member.photoURL,
                      }),
                  });
                }}
              >
                <i className="fa fa-times-circle" aria-hidden="true" />
              </IconButton>
              <Typography className={classes.memberText} align="center" variant="caption">{member.displayName}</Typography>
              {member.photoURL ? <Avatar className={classes.userPhoto} src={member.photoURL} /> : <div className={classes.userPhoto}><i style={{ fontSize: 25 }} className="fa fa-user-circle fa-2" /></div>}
              <Typography className={classes.memberText} align="center" variant="caption">{member.email}</Typography>
            </div>
          ))}
          <span style={{ padding: theme.spacing.unit * 4 }}>/</span>
          {invitedEmails.length === 0 ? <Typography align="center" variant="caption">誰も招待されていません。</Typography> : invitedEmails.map(invitedEmail => (
            <div className={classes.member} key={invitedEmail} title={`招待中 - ${invitedEmail}`}>
              <IconButton
                className={classes.actionIcon}
                color="default"
                onClick={() => {
                  this.setState({
                    isOpenRemoveMemberModal: true,
                    removeTarget: Object.assign({
                      type: constants.handleUserType.INVITED,
                      uid: '',
                      displayName: '',
                      email: '',
                      photoURL: '',
                      }, {
                        email: invitedEmail,
                      }),
                  });
                }}
              >
                <i className="fa fa-times-circle" aria-hidden="true" />
              </IconButton>
              <Typography className={classes.memberText} align="center" variant="caption">招待中</Typography>
              <div className={classes.userPhoto}><i style={{ fontSize: 25 }} className="fa fa-user-circle fa-2" /></div>
              <Typography className={classes.memberText} align="center" variant="caption">{invitedEmail}</Typography>
            </div>
          ))}
          <span style={{ padding: theme.spacing.unit * 4 }}>/</span>
          <div>
            <IconButton color="default" onClick={() => { this.setState({ isOpenAddMemberModal: true }); }}>
              <i className="fa fa-plus" />
            </IconButton>
          </div>
        </div>
        <Dialog
          open={this.state.isOpenAddMemberModal}
          onClose={() => { this.setState({ invitationEmail: '', isOpenAddMemberModal: false }); }}
          aria-labelledby="add-member-dialog-title"
        >
          <DialogTitle id="add-member-dialog-title">メンバーを追加する</DialogTitle>
          <DialogContent>
            <TextField
              onChange={(e) => { this.setState({ invitationEmail: e.target.value }); }}
              value={this.state.invitationEmail}
              autoFocus
              margin="dense"
              id="email"
              type="email"
              label="メールアドレス"
              fullWidth
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => { this.setState({ isOpenAddMemberModal: false }); }} color="primary">キャンセル</Button>
            <Button onClick={this.addMember.bind(this)} color="primary">招待メールを送信</Button>
          </DialogActions>
        </Dialog>
        <Dialog
          open={this.state.isOpenRemoveMemberModal}
          onClose={() => { this.setState({ isOpenRemoveMemberModal: false }); }}
          aria-labelledby="remove-member-dialog-title"
        >
          <DialogTitle id="remove-member-dialog-title">{this.state.removeTarget.type === constants.handleUserType.MEMBER ? 'メンバー' : '招待中のユーザー'}を削除する</DialogTitle>
          <DialogContent>
            <Typography variant="body1" gutterBottom>本当に{this.state.removeTarget.type === constants.handleUserType.MEMBER ? `メンバーの${this.state.removeTarget.displayName}` : `招待中のユーザーの${this.state.removeTarget.email}`}を削除してもよろしいですか？</Typography>
            <Typography variant="caption">*削除後は再度招待しないとこのワークシートにアクセスできなくなります。</Typography>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => { this.setState({ isOpenRemoveMemberModal: false }); }}
              color="primary"
            >キャンセル
            </Button>
            <Button onClick={this.removeMemberOrInvitedEmail.bind(this)} color="primary">削除</Button>
          </DialogActions>
        </Dialog>
        <Dialog open={this.state.processing}>
          <CircularProgress className={classes.circularProgress} size={60} />
        </Dialog>

      </div>
    );
  }
}

Members.propTypes = {
  userId: PropTypes.string.isRequired,
  userName: PropTypes.string.isRequired,
  members: PropTypes.arrayOf(PropTypes.shape({
    displayName: PropTypes.string.isRequired,
    photoURL: PropTypes.string.isRequired,
    uid: PropTypes.string.isRequired,
    email: PropTypes.string.isRequired,
  })).isRequired,
  invitedEmails: PropTypes.arrayOf(PropTypes.string.isRequired).isRequired,
  teamId: PropTypes.string.isRequired,
  teamName: PropTypes.string.isRequired,
  handleMembers: PropTypes.func.isRequired,
  handleInvitedEmails: PropTypes.func.isRequired,
  classes: PropTypes.object.isRequired, // eslint-disable-line
  theme: PropTypes.object.isRequired, // eslint-disable-line
};
export default withStyles(styles, { withTheme: true })(Members);

