import React, { Component } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { withStyles } from '@material-ui/core/styles';
import IconButton from '@material-ui/core/IconButton';
import Typography from '@material-ui/core/Typography';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import TextField from '@material-ui/core/TextField';
import Input from '@material-ui/core/Input';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import MoreHoriz from '@material-ui/icons/MoreHoriz';
import Edit from '@material-ui/icons/Edit';
import Save from '@material-ui/icons/Save';
import Add from '@material-ui/icons/Add';
import tableTaskSchema from '../schemas/tableTaskSchema';
import constants from '../constants';
import style from '../assets/style';
import util from '../util';
import i18n from '../i18n';

const styles = style.table;

const CustomTableCell = withStyles(() => ({
  root: {
    border: '1px solid #CCC',
  },
  head: {
    backgroundColor: '#f3f3f3',
  },
}))(TableCell);

function getTableTaskSchema() {
  return util.setIdIfNotExist(util.cloneDeep(tableTaskSchema));
}

class TaskTableMobile extends Component {
  constructor(props) {
    super(props);
    this.state = {
      anchorEl: [],
      [constants.taskStateType.add]: getTableTaskSchema(),
      [constants.taskStateType.edit]: getTableTaskSchema(),
      editingTaskIndex: -1,
    };
  }

  componentWillReceiveProps() {
    this.setState({ anchorEl: [], editingTaskIndex: -1 });
  }

  shouldComponentUpdate(nextProps, nextState) {
    if (!util.equal(this.state.anchorEl, nextState.anchorEl)) return true;
    if (!util.equal(this.state[constants.taskStateType.add], nextState[constants.taskStateType.add])) return true;
    if (!util.equal(this.state[constants.taskStateType.edit], nextState[constants.taskStateType.edit])) return true;
    if (this.state.editingTaskIndex !== nextState.editingTaskIndex) return true;
    if (util.equal(this.props.tableTasks, nextProps.tableTasks)) return false;
    return true;
  }

  openTaskAction(index, e) {
    const anchorEl = Object.assign([], this.state.anchorEl);
    anchorEl[index] = e.currentTarget;
    this.setState({ anchorEl, editingTaskIndex: -1 });
  }

  closeTaskAction(index) {
    const anchorEl = Object.assign([], this.state.anchorEl);
    anchorEl[index] = null;
    this.setState({ anchorEl });
  }

  doTaskAction(index, taskActionType) {
    this.closeTaskAction(index);
    if (taskActionType === constants.taskActionType.REMOVE && window.confirm(`${i18n.t('taskPool.areYouSureDelete_target', { target: this.props.tableTasks[index].title })}`)) {
      this.props.changeTableTasks(constants.taskActionType.REMOVE, index);
    } else if (taskActionType !== constants.taskActionType.REMOVE) {
      this.props.changeTableTasks(taskActionType, index);
    }
  }

  changeTask(type, prop, e) {
    const task = Object.assign({}, this.state[type]);
    task[prop] = e.target.value;
    this.setState({ [type]: task });
  }

  addTask() {
    if (this.state[constants.taskStateType.add].title === '') {
      alert(`${i18n.t('taskPool.canNotSaveWhenIsEmpty_target', { target: i18n.t('taskPool.title') })}`);
      return;
    }
    // タスクを追加した場合には割当を自動的に自分にする
    this.state[constants.taskStateType.add].assign = this.props.userId;
    this.props.changeTableTasks(constants.taskActionType.ADD, this.state[constants.taskStateType.add]);
    this.setState({ [constants.taskStateType.add]: getTableTaskSchema() });
    setTimeout(() => { this.root.scrollTop = this.root.scrollHeight; });
  }

  editTask(index) {
    if (this.state.editingTaskIndex === index) {
      // 編集を保存する場合
      if (this.state[constants.taskStateType.edit].title === '') {
        alert(`${i18n.t('taskPool.canNotSaveWhenIsEmpty_target', { target: i18n.t('taskPool.title') })}`);
        return;
      }
      if (!util.equal(this.props.tableTasks[index], this.state[constants.taskStateType.edit])) {
        this.props.changeTableTasks(constants.taskActionType.EDIT, { task: this.state[constants.taskStateType.edit], index });
      }
      this.setState({ editingTaskIndex: -1, [constants.taskStateType.edit]: getTableTaskSchema() });
    } else {
      // 編集スタート
      this.setState({
        editingTaskIndex: index,
        [constants.taskStateType.edit]: this.props.tableTasks[index],
        [constants.taskStateType.add]: getTableTaskSchema(),
      });
    }
  }

  render() {
    const { tableTasks, readOnly, classes } = this.props;
    return (
      <div ref={(root) => { this.root = root; }} className={classes.root}>
        <Table>
          <TableHead>
            <TableRow className={classes.taskRow}>
              <CustomTableCell padding="none">{i18n.t('columns.title')}</CustomTableCell>
              <CustomTableCell padding="none">{i18n.t('columns.memo')}</CustomTableCell>
              <CustomTableCell padding="none">{i18n.t('columns.startTime')}</CustomTableCell>
              <CustomTableCell padding="none">{i18n.t('columns.endTime')}</CustomTableCell>
              <CustomTableCell padding="none">{i18n.t('common.edit')}</CustomTableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tableTasks.map((task, index) => (
              <TableRow
                className={classes.taskRow}
                key={task.id}
                style={(() => {
                  const obj = {};
                  if (task.startTime && task.endTime) {
                    obj.backgroundColor = constants.cellColor.DONE;
                  } else if (task.estimate === '') {
                    obj.backgroundColor = constants.cellColor.WARNING;
                  } else if (this.props.isActive && task.startTime) {
                    // 本日のタスクの場合,開始時刻、見積もりが設定してあるタスクなので、実行中の色,予約の色,終了が近づいている色をつける処理
                    const nowTimeVal = moment().format(constants.TIMEFMT);
                    const expectedEndTimeVal = moment(task.startTime, constants.TIMEFMT).add(task.estimate, 'minutes').format(constants.TIMEFMT);
                    const timeDiffMinute = util.getTimeDiffMinute(nowTimeVal, expectedEndTimeVal);
                    if (timeDiffMinute < 1) {
                      obj.backgroundColor = constants.cellColor.OUT;
                    } else {
                      obj.backgroundColor = util.getTimeDiffMinute(nowTimeVal, task.startTime) < 1 ? constants.cellColor.RUNNING : constants.cellColor.RESERVATION;
                    }
                  }
                  return obj;
                })()}
              >
                <CustomTableCell padding="none">
                  <Input
                    className={classes.cellInput}
                    fullWidth
                    onChange={this.changeTask.bind(this, constants.taskStateType.edit, 'title')}
                    value={this.state.editingTaskIndex !== index ? task.title : this.state[constants.taskStateType.edit].title}
                    disabled={this.state.editingTaskIndex !== index}
                    disableUnderline={this.state.editingTaskIndex !== index}
                  />
                </CustomTableCell>
                <CustomTableCell padding="none">
                  <Input
                    className={classes.miniCellInput}
                    type="number"
                    onChange={this.changeTask.bind(this, constants.taskStateType.edit, 'estimate')}
                    value={this.state.editingTaskIndex !== index ? task.estimate : this.state[constants.taskStateType.edit].estimate}
                    disabled={this.state.editingTaskIndex !== index}
                    disableUnderline={this.state.editingTaskIndex !== index}
                  />
                </CustomTableCell>
                <CustomTableCell padding="none">
                  <TextField
                    type="time"
                    className={classes.miniCellInput}
                    InputProps={{ style: { fontSize: 11 }, disableUnderline: this.state.editingTaskIndex !== index }}
                    onChange={this.changeTask.bind(this, constants.taskStateType.edit, 'startTime')}
                    value={this.state.editingTaskIndex !== index ? task.startTime : this.state[constants.taskStateType.edit].startTime}
                    disabled={this.state.editingTaskIndex !== index}
                  />
                </CustomTableCell>
                <CustomTableCell padding="none">
                  <TextField
                    type="time"
                    className={classes.miniCellInput}
                    InputProps={{ style: { fontSize: 11 }, disableUnderline: this.state.editingTaskIndex !== index }}
                    onChange={this.changeTask.bind(this, constants.taskStateType.edit, 'endTime')}
                    value={this.state.editingTaskIndex !== index ? task.endTime : this.state[constants.taskStateType.edit].endTime}
                    disabled={this.state.editingTaskIndex !== index}
                  />
                </CustomTableCell>
                <CustomTableCell style={{ textAlign: 'center' }} padding="none">
                  <div className={classes.actionIcons}>
                    <IconButton disabled={readOnly} className={classes.actionIcon} color="default" onClick={this.editTask.bind(this, index)}>
                      {this.state.editingTaskIndex !== index ? <Edit style={{ fontSize: 16 }} /> : <Save style={{ fontSize: 16 }} />}
                    </IconButton>
                    <span>/</span>
                    <IconButton disabled={readOnly} className={classes.actionIcon} color="default" onClick={this.openTaskAction.bind(this, index)}>
                      <MoreHoriz style={{ fontSize: 16 }} />
                    </IconButton>
                    <Menu
                      anchorEl={this.state.anchorEl[index]}
                      open={Boolean(this.state.anchorEl[index] || false)}
                      onClose={this.closeTaskAction.bind(this, index)}
                    >
                      <MenuItem key="movePoolHighPriority" disabled={task.endTime !== ''} onClick={this.doTaskAction.bind(this, index, constants.taskActionType.MOVE_POOL_HIGHPRIORITY)}>
                        <Typography variant="caption">{i18n.t('hot.reverseTaskpoolHight')}</Typography>
                      </MenuItem>
                      <MenuItem key="movePoolLowPriority" disabled={task.endTime !== ''} onClick={this.doTaskAction.bind(this, index, constants.taskActionType.MOVE_POOL_LOWPRIORITY)}>
                        <Typography variant="caption">{i18n.t('hot.reverseTaskpoolLow')}</Typography>
                      </MenuItem>
                      <MenuItem key="topToTask" onClick={this.doTaskAction.bind(this, index, constants.taskActionType.TOP)}>
                        <Typography variant="caption">{i18n.t('taskPool.moveToTop')}</Typography>
                      </MenuItem>
                      <MenuItem key="upTask" onClick={this.doTaskAction.bind(this, index, constants.taskActionType.UP)}>
                        <Typography variant="caption">{i18n.t('taskPool.moveUpOne')}</Typography>
                      </MenuItem>
                      <MenuItem key="downTask" onClick={this.doTaskAction.bind(this, index, constants.taskActionType.DOWN)}>
                        <Typography variant="caption">{i18n.t('taskPool.moveOneDown')}</Typography>
                      </MenuItem>
                      <MenuItem key="bottomToTask" onClick={this.doTaskAction.bind(this, index, constants.taskActionType.BOTTOM)}>
                        <Typography variant="caption">{i18n.t('taskPool.moveToBottom')}</Typography>
                      </MenuItem>
                      <MenuItem key="removeTask" onClick={this.doTaskAction.bind(this, index, constants.taskActionType.REMOVE)}>
                        <Typography variant="caption">{i18n.t('common.remove')}</Typography>
                      </MenuItem>
                    </Menu>
                  </div>
                </CustomTableCell>
              </TableRow>
            ))}
            <TableRow className={classes.taskRow}>
              <CustomTableCell padding="none">
                <Input
                  className={classes.cellInput}
                  fullWidth
                  onChange={this.changeTask.bind(this, constants.taskStateType.add, 'title')}
                  value={this.state[constants.taskStateType.add].title}
                  placeholder={i18n.t('columns.title')}
                  disabled={this.state.editingTaskIndex !== -1}
                  disableUnderline={this.state.editingTaskIndex !== -1}
                />
              </CustomTableCell>
              <CustomTableCell padding="none">
                <Input
                  className={classes.miniCellInput}
                  type="number"
                  onChange={this.changeTask.bind(this, constants.taskStateType.add, 'estimate')}
                  value={this.state[constants.taskStateType.add].estimate}
                  placeholder={i18n.t('columns.estimate')}
                  disabled={this.state.editingTaskIndex !== -1}
                  disableUnderline={this.state.editingTaskIndex !== -1}
                />
              </CustomTableCell>
              <CustomTableCell padding="none">
                <TextField
                  type="time"
                  className={classes.miniCellInput}
                  InputProps={{ style: { fontSize: 11 }, disableUnderline: this.state.editingTaskIndex !== -1 }}
                  onChange={this.changeTask.bind(this, constants.taskStateType.add, 'startTime')}
                  value={this.state[constants.taskStateType.add].startTime}
                  placeholder={i18n.t('columns.startTime')}
                  disabled={this.state.editingTaskIndex !== -1}
                />
              </CustomTableCell>
              <CustomTableCell padding="none">
                <TextField
                  type="time"
                  className={classes.miniCellInput}
                  InputProps={{ style: { fontSize: 11 }, disableUnderline: this.state.editingTaskIndex !== -1 }}
                  onChange={this.changeTask.bind(this, constants.taskStateType.add, 'endTime')}
                  value={this.state[constants.taskStateType.add].endTime}
                  placeholder={i18n.t('columns.endTime')}
                  disabled={this.state.editingTaskIndex !== -1}
                />
              </CustomTableCell>
              <CustomTableCell style={{ textAlign: 'center' }} padding="none">
                <IconButton className={classes.actionIcon} color="default" onClick={this.addTask.bind(this)} disabled={readOnly || this.state.editingTaskIndex !== -1}>
                  <Add style={{ fontSize: 16 }} />
                </IconButton>
              </CustomTableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    );
  }
}

TaskTableMobile.propTypes = {
  userId: PropTypes.string.isRequired,
  tableTasks: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    assign: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    estimate: PropTypes.any.isRequired,
    endTime: PropTypes.string.isRequired,
    startTime: PropTypes.string.isRequired,
    memo: PropTypes.string.isRequired,
  })).isRequired,
  changeTableTasks: PropTypes.func.isRequired,
  isActive: PropTypes.bool.isRequired,
  readOnly: PropTypes.bool.isRequired,
  classes: PropTypes.object.isRequired, // eslint-disable-line
  theme: PropTypes.object.isRequired, // eslint-disable-line
};

export default withStyles(styles, { withTheme: true })(TaskTableMobile);
