import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withStyles } from 'material-ui/styles';
import IconButton from 'material-ui/IconButton';
import Typography from 'material-ui/Typography';
import Menu, { MenuItem } from 'material-ui/Menu';
import TextField from 'material-ui/TextField';
import Input from 'material-ui/Input';
import Table, { TableBody, TableCell, TableHead, TableRow } from 'material-ui/Table';
import MultipleSelect from './MultipleSelect';
import poolTaskSchema from '../schemas/poolTaskSchema';
import constants from '../constants';
import util from '../util';
import style from '../assets/style';

const styles = style.table;

const CustomTableCell = withStyles(theme => ({
  root: {
    border: '1px solid #CCC',
  },
  head: {
    backgroundColor: '#f3f3f3',
  },
}))(TableCell);

function getPoolTaskSchema() {
  return util.setIdIfNotExist(util.cloneDeep(poolTaskSchema));
}

class TaskList extends Component {
  constructor(props) {
    super(props);
    this.state = {
      anchorEl: [],
      [constants.taskStateType.add]: getPoolTaskSchema(),
      [constants.taskStateType.edit]: getPoolTaskSchema(),
      editingTaskIndex: -1,
    };
  }

  componentWillReceiveProps() {
    this.setState({ editingTaskIndex: -1 });
  }

  shouldComponentUpdate(nextProps, nextState) {
    if (!util.equal(this.state.anchorEl, nextState.anchorEl)) return true;
    if (!util.equal(this.state[constants.taskStateType.add], nextState[constants.taskStateType.add])) return true;
    if (!util.equal(this.state[constants.taskStateType.edit], nextState[constants.taskStateType.edit])) return true;
    if (this.state.editingTaskIndex !== nextState.editingTaskIndex) return true;
    if (this.props.isRegularTask !== nextProps.isRegularTask) return true;
    if (util.equal(this.props.tasks, nextProps.tasks)) return false;
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

  changeTaskTitle(type, e) {
    const task = Object.assign({}, this.state[type]);
    task.title = e.target.value;
    this.setState({ [type]: task });
  }

  changeTaskMemo(type, e) {
    const task = Object.assign({}, this.state[type]);
    task.memo = e.target.value;
    this.setState({ [type]: task });
  }

  changeTaskEstimate(type, e) {
    const task = Object.assign({}, this.state[type]);
    task.estimate = e.target.value;
    this.setState({ [type]: task });
  }

  changeTaskStartTime(type, e) {
    const task = Object.assign({}, this.state[type]);
    task.startTime = e.target.value;
    this.setState({ [type]: task });
  }

  changeTaskEndTime(type, e) {
    const task = Object.assign({}, this.state[type]);
    task.endTime = e.target.value;
    this.setState({ [type]: task });
  }

  changeDayOfWeek(type, e) {
    const task = Object.assign({}, this.state[type]);
    task.dayOfWeek = e.target.value;
    this.setState({ [type]: task });
  }

  changeWeek(type, e) {
    const task = Object.assign({}, this.state[type]);
    task.week = e.target.value;
    this.setState({ [type]: task });
  }

  editTask(index) {
    if (this.state.editingTaskIndex === index) {
      // 編集を保存する場合
      if (this.state[constants.taskStateType.edit].title === '') {
        alert('作業内容が空の状態では保存できません。');
        return;
      }
      if (this.props.isRegularTask) {
        if (this.state[constants.taskStateType.edit].week.length === 0) {
          alert('第何週が空の状態では保存できません。');
          return;
        } else if (this.state[constants.taskStateType.edit].dayOfWeek.length === 0) {
          alert('何曜日が空の状態では保存できません。');
          return;
        }
      }
      if (!util.equal(this.props.tasks[index], this.state[constants.taskStateType.edit])) {
        this.props.editTask(this.state[constants.taskStateType.edit], index);
      }
      this.setState({ editingTaskIndex: -1, [constants.taskStateType.edit]: getPoolTaskSchema() });
    } else {
      // 編集スタート
      this.setState({
        editingTaskIndex: index,
        [constants.taskStateType.edit]: this.props.tasks[index],
        [constants.taskStateType.add]: getPoolTaskSchema(),
      });
    }
  }

  moveTable(index) {
    this.closeTaskAction(index);
    this.props.moveTable(index);
  }

  removeTask(index) {
    this.closeTaskAction(index);
    this.props.removeTask(index);
  }

  downTask(index) {
    this.closeTaskAction(index);
    this.props.downTask(index);
  }

  upTask(index) {
    this.closeTaskAction(index);
    this.props.upTask(index);
  }

  bottomToTask(index) {
    this.closeTaskAction(index);
    this.props.bottomToTask(index);
  }

  topToTask(index) {
    this.closeTaskAction(index);
    this.props.topToTask(index);
  }

  addTask() {
    if (this.state[constants.taskStateType.add].title === '') {
      alert('作業内容が空の状態では保存できません。');
      return;
    }
    if (this.props.isRegularTask) {
      if (this.state[constants.taskStateType.add].week.length === 0) {
        alert('第何週が空の状態では保存できません。');
        return;
      } else if (this.state[constants.taskStateType.add].dayOfWeek.length === 0) {
        alert('何曜日が空の状態では保存できません。');
        return;
      }
    }
    this.props.addTask(this.state[constants.taskStateType.add]);
    this.setState({ [constants.taskStateType.add]: getPoolTaskSchema() });
    setTimeout(() => { this.root.scrollTop = this.root.scrollHeight; });
  }

  render() {
    const { tasks, isRegularTask, classes } = this.props;
    return (
      <div ref={(root) => { this.root = root; }} className={classes.root}>
        <Table>
          <TableHead>
            <TableRow className={classes.taskRow}>
              <CustomTableCell className={classes.cellInput} padding="none">作業内容</CustomTableCell>
              <CustomTableCell className={classes.cellInput} padding="none">備考</CustomTableCell>
              <CustomTableCell className={classes.miniCellInput} padding="none">見積</CustomTableCell>
              {(() => (isRegularTask ? <CustomTableCell className={classes.miniCellInput} padding="none">開始時刻</CustomTableCell> : null))()}
              {(() => (isRegularTask ? <CustomTableCell className={classes.miniCellInput} padding="none">第何週</CustomTableCell> : null))()}
              {(() => (isRegularTask ? <CustomTableCell className={classes.miniCellInput} padding="none">何曜日</CustomTableCell> : null))()}
              <CustomTableCell className={classes.miniCellInput} padding="none">編集</CustomTableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tasks.map((task, index) => (
              <TableRow className={classes.taskRow} key={task.id} >
                <CustomTableCell padding="none">
                  <Input
                    fullWidth
                    className={classes.cellInput}
                    onChange={this.changeTaskTitle.bind(this, constants.taskStateType.edit)}
                    value={this.state.editingTaskIndex !== index ? task.title : this.state[constants.taskStateType.edit].title}
                    disabled={this.state.editingTaskIndex !== index}
                    disableUnderline={this.state.editingTaskIndex !== index}
                  />
                </CustomTableCell>
                <CustomTableCell padding="none">
                  <Input
                    fullWidth
                    className={classes.cellInput}
                    onChange={this.changeTaskMemo.bind(this, constants.taskStateType.edit)}
                    value={this.state.editingTaskIndex !== index ? task.memo : this.state[constants.taskStateType.edit].memo}
                    disabled={this.state.editingTaskIndex !== index}
                    disableUnderline={this.state.editingTaskIndex !== index}
                  />
                </CustomTableCell>
                <CustomTableCell padding="none">
                  <Input
                    className={classes.miniCellInput}
                    type="number"
                    onChange={this.changeTaskEstimate.bind(this, constants.taskStateType.edit)}
                    value={this.state.editingTaskIndex !== index ? task.estimate : this.state[constants.taskStateType.edit].estimate}
                    disabled={this.state.editingTaskIndex !== index}
                    disableUnderline={this.state.editingTaskIndex !== index}
                  />
                </CustomTableCell>
                {(() => {
                  if (isRegularTask) {
                    return (
                      <CustomTableCell padding="none">
                        <TextField
                          type="time"
                          className={classes.miniCellInput}
                          InputProps={{ style: { fontSize: 11 }, disableUnderline: this.state.editingTaskIndex !== index }}
                          onChange={this.changeTaskStartTime.bind(this, constants.taskStateType.edit)}
                          value={this.state.editingTaskIndex !== index ? task.startTime : this.state[constants.taskStateType.edit].startTime}
                          placeholder="開始時刻"
                          disabled={this.state.editingTaskIndex !== index}
                        />
                      </CustomTableCell>
                    );
                  }
                  return null;
                })()}
                {(() => {
                  if (isRegularTask) {
                    return (
                      <CustomTableCell padding="none">
                        <MultipleSelect
                          className={classes.miniCellInput}
                          value={this.state.editingTaskIndex !== index ? task.week : this.state[constants.taskStateType.edit].week}
                          options={[1, 2, 3, 4, 5]}
                          onChange={this.changeWeek.bind(this, constants.taskStateType.edit)}
                          disabled={this.state.editingTaskIndex !== index}
                        />
                      </CustomTableCell>
                    );
                  }
                  return null;
                })()}
                {(() => {
                  if (isRegularTask) {
                    return (
                      <CustomTableCell padding="none">
                        <MultipleSelect
                          className={classes.miniCellInput}
                          value={this.state.editingTaskIndex !== index ? task.dayOfWeek : this.state[constants.taskStateType.edit].dayOfWeek}
                          options={constants.DAY_OF_WEEK_STR}
                          onChange={this.changeDayOfWeek.bind(this, constants.taskStateType.edit)}
                          disabled={this.state.editingTaskIndex !== index}
                        />
                      </CustomTableCell>
                    );
                  }
                  return null;
                })()}
                <CustomTableCell style={{ textAlign: 'center' }} padding="none">
                  <div className={classes.actionIcons}>
                    <IconButton className={classes.actionIcon} color="default" onClick={this.editTask.bind(this, index)}>
                      <i className={this.state.editingTaskIndex !== index ? 'fa fa-pencil' : 'fa fa-floppy-o'} />
                    </IconButton>
                    <span>/</span>
                    <IconButton className={classes.actionIcon} color="default" onClick={this.openTaskAction.bind(this, index)}>
                      <i className="fa fa-ellipsis-v" />
                    </IconButton>
                    <Menu
                      anchorEl={this.state.anchorEl[index]}
                      open={Boolean(this.state.anchorEl[index] || false)}
                      onClose={this.closeTaskAction.bind(this, index)}
                    >
                      <MenuItem key={'moveTable'} onClick={this.moveTable.bind(this, index)}>
                        <i className="fa fa-download" />
                        <Typography variant="caption">テーブルに移動</Typography>
                      </MenuItem>
                      <MenuItem key={'topToTask'} onClick={this.topToTask.bind(this, index)}>
                        <i className="fa fa-angle-double-up" />
                        <Typography variant="caption">先頭に移動</Typography>
                      </MenuItem>
                      <MenuItem key={'upTask'} onClick={this.upTask.bind(this, index)}>
                        <i className="fa fa-angle-up" />
                        <Typography variant="caption">1つ上に移動</Typography>
                      </MenuItem>
                      <MenuItem key={'downTask'} onClick={this.downTask.bind(this, index)}>
                        <i className="fa fa-angle-down" />
                        <Typography variant="caption">1つ下に移動</Typography>
                      </MenuItem>
                      <MenuItem key={'bottomToTask'} onClick={this.bottomToTask.bind(this, index)}>
                        <i className="fa fa-angle-double-down" />
                        <Typography variant="caption">末尾に移動</Typography>
                      </MenuItem>
                      <MenuItem key={'removeTask'} onClick={this.removeTask.bind(this, index)}>
                        <i className="fa fa-trash-o" />
                        <Typography variant="caption">削除</Typography>
                      </MenuItem>
                    </Menu>
                  </div>
                </CustomTableCell>
              </TableRow>
            ))}
            <TableRow>
              <CustomTableCell padding="none">
                <Input
                  fullWidth
                  className={classes.cellInput}
                  onChange={this.changeTaskTitle.bind(this, constants.taskStateType.add)}
                  value={this.state[constants.taskStateType.add].title}
                  placeholder="作業内容"
                  disabled={this.state.editingTaskIndex !== -1}
                  disableUnderline={this.state.editingTaskIndex !== -1}
                />
              </CustomTableCell>
              <CustomTableCell padding="none">
                <Input
                  fullWidth
                  className={classes.cellInput}
                  onChange={this.changeTaskMemo.bind(this, constants.taskStateType.add)}
                  value={this.state[constants.taskStateType.add].memo}
                  placeholder="備考"
                  disabled={this.state.editingTaskIndex !== -1}
                  disableUnderline={this.state.editingTaskIndex !== -1}
                />
              </CustomTableCell>
              <CustomTableCell padding="none">
                <Input
                  className={classes.miniCellInput}
                  type="number"
                  onChange={this.changeTaskEstimate.bind(this, constants.taskStateType.add)}
                  value={this.state[constants.taskStateType.add].estimate}
                  placeholder="見積"
                  disabled={this.state.editingTaskIndex !== -1}
                  disableUnderline={this.state.editingTaskIndex !== -1}
                />
              </CustomTableCell>
              {(() => {
                if (isRegularTask) {
                  return (
                    <CustomTableCell padding="none">
                      <TextField
                        type="time"
                        className={classes.miniCellInput}
                        InputProps={{ style: { fontSize: 11 }, disableUnderline: this.state.editingTaskIndex !== -1 }}
                        onChange={this.changeTaskStartTime.bind(this, constants.taskStateType.add)}
                        value={this.state[constants.taskStateType.add].startTime}
                        placeholder="開始時刻"
                        disabled={this.state.editingTaskIndex !== -1}
                      />
                    </CustomTableCell>
                  );
                }
                return null;
              })()}
              {(() => {
                if (isRegularTask) {
                  return (
                    <CustomTableCell padding="none">
                      <MultipleSelect
                        className={classes.miniCellInput}
                        value={this.state[constants.taskStateType.add].week}
                        options={[1, 2, 3, 4, 5]}
                        onChange={this.changeWeek.bind(this, constants.taskStateType.add)}
                        disabled={this.state.editingTaskIndex !== -1}
                      />
                    </CustomTableCell>
                  );
                }
                return null;
              })()}
              {(() => {
                if (isRegularTask) {
                  return (
                    <CustomTableCell padding="none">
                      <MultipleSelect
                        className={classes.miniCellInput}
                        value={this.state[constants.taskStateType.add].dayOfWeek}
                        options={constants.DAY_OF_WEEK_STR}
                        onChange={this.changeDayOfWeek.bind(this, constants.taskStateType.add)}
                        disabled={this.state.editingTaskIndex !== -1}
                      />
                    </CustomTableCell>
                  );
                }
                return null;
              })()}
              <CustomTableCell style={{ textAlign: 'center' }} padding="none">
                <IconButton className={classes.actionIcon} color="default" onClick={this.addTask.bind(this)} disabled={this.state.editingTaskIndex !== -1}>
                  <i className="fa fa-plus" />
                </IconButton>
              </CustomTableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    );
  }
}

TaskList.propTypes = {
  tasks: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    estimate: PropTypes.any.isRequired,
    endTime: PropTypes.string.isRequired,
    startTime: PropTypes.string.isRequired,
    memo: PropTypes.string.isRequired,
  })).isRequired,
  addTask: PropTypes.func.isRequired,
  editTask: PropTypes.func.isRequired,
  moveTable: PropTypes.func.isRequired,
  removeTask: PropTypes.func.isRequired,
  downTask: PropTypes.func.isRequired,
  upTask: PropTypes.func.isRequired,
  bottomToTask: PropTypes.func.isRequired,
  topToTask: PropTypes.func.isRequired,
  isRegularTask: PropTypes.bool.isRequired,
  classes: PropTypes.object.isRequired, // eslint-disable-line
  theme: PropTypes.object.isRequired, // eslint-disable-line
};

export default withStyles(styles, { withTheme: true })(TaskList);
