import React, { Component } from 'react';
import PropTypes from 'prop-types';
import cloneDeep from 'lodash.clonedeep';
import { withStyles } from 'material-ui/styles';
import IconButton from 'material-ui/IconButton';
import Menu, { MenuItem } from 'material-ui/Menu';
import Input from 'material-ui/Input';
import Table, { TableBody, TableCell, TableHead, TableRow } from 'material-ui/Table';

import MultipleSelect from './MultipleSelect';

import taskSchema from '../taskSchema';
import constants from '../constants';

const styles = {
  root: {
    padding: 0,
    minHeight: 210,
    maxHeight: 420,
    overflowY: 'scroll',
  },
  actionIcon: {
    fontSize: 15,
  },
  actionIcons: {
    width: 110,
    margin: '0 auto',
  },
  cell: {
    border: '1px solid rgba(235, 235, 235, 1)',
    padding: '0 5px',
  },
  cellInput: {
    color: '#000',
    fontSize: 12,
  },
};


function getTaskSchema() {
  // regularTasksで使用する曜日と、周期をtaskSchemaに追加する
  return Object.assign({ dayOfWeek: [], week: [] }, taskSchema);
}

class TaskList extends Component {
  constructor(props) {
    super(props);
    this.state = {
      anchorEl: [],
      addTask: getTaskSchema(),
      editTask: getTaskSchema(),
      editingTaskIndex: -1,
    };
  }

  openTaskAction(index, e) {
    const anchorEl = Object.assign([], this.state.anchorEl);
    anchorEl[index] = e.currentTarget;
    this.setState({
      anchorEl,
      editingTaskIndex: -1,
    });
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

  changeDayOfWeek(type, e) {
    // console.log(e.target.value, 'changeDayOfWeek');
    const task = Object.assign({}, this.state[type]);
    task.dayOfWeek = e.target.value;
    this.setState({ [type]: task });
  }

  changeWeek(type, e) {
    // console.log(e.target.value, 'changeWeek');
    const task = Object.assign({}, this.state[type]);
    task.week = e.target.value;
    this.setState({ [type]: task });
  }

  editTask(index) {
    if (this.state.editingTaskIndex === index) {
      // 編集を保存する場合
      if (this.state.editTask.title === '') {
        alert('作業内容が空の状態では保存できません。');
        return;
      }
      if (this.props.isRegularTask) {
        if (this.state.editTask.week.length === 0) {
          alert('第何週が空の状態では保存できません。');
          return;
        } else if (this.state.editTask.dayOfWeek.length === 0) {
          alert('何曜日が空の状態では保存できません。');
          return;
        }
      }
      this.props.editTask(cloneDeep(this.state.editTask), index);
      this.setState({ editingTaskIndex: -1, editTask: getTaskSchema() });
    } else {
      // 編集スタート
      this.setState({ editTask: cloneDeep(this.props.tasks[index]) });
      setTimeout(() => {
        this.setState({ editingTaskIndex: index });
      });
    }
  }

  moveTask(index) {
    this.closeTaskAction(index);
    this.props.moveTask(index);
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

  addTask() {
    if (this.state.addTask.title === '') {
      alert('作業内容が空の状態では保存できません。');
      return;
    }
    if (this.props.isRegularTask) {
      if (this.state.addTask.week.length === 0) {
        alert('第何週が空の状態では保存できません。');
        return;
      } else if (this.state.addTask.dayOfWeek.length === 0) {
        alert('何曜日が空の状態では保存できません。');
        return;
      }
    }
    this.props.addTask(cloneDeep(this.state.addTask));
    this.setState({ addTask: getTaskSchema() });
    const $root = this.root;
    setTimeout(() => { $root.scrollTop = $root.scrollHeight; });
  }

  render() {
    const { tasks, isRegularTask, classes } = this.props;
    return (
      <div ref={(root) => { this.root = root; }} className={classes.root}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="none" className={classes.cell}>作業内容</TableCell>
              <TableCell padding="none" className={classes.cell}>備考</TableCell>
              <TableCell padding="none" className={classes.cell}>見積</TableCell>
              {(() => (isRegularTask ? <TableCell padding="none" className={classes.cell}>第何週</TableCell> : null))()}
              {(() => (isRegularTask ? <TableCell padding="none" className={classes.cell}>何曜日</TableCell> : null))()}
              <TableCell padding="none" className={classes.cell}>アクション</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tasks.map((n, index) => (
              <TableRow key={index.toString()}>
                <TableCell padding="none" className={classes.cell}>
                  <Input
                    className={classes.cellInput}
                    fullWidth
                    onChange={this.changeTaskTitle.bind(this, 'editTask')}
                    value={this.state.editingTaskIndex !== index ? n.title : this.state.editTask.title}
                    disabled={this.state.editingTaskIndex !== index}
                    disableUnderline={this.state.editingTaskIndex !== index}
                  />
                </TableCell>
                <TableCell padding="none" className={classes.cell}>
                  <Input
                    className={classes.cellInput}
                    fullWidth
                    onChange={this.changeTaskMemo.bind(this, 'editTask')}
                    value={this.state.editingTaskIndex !== index ? n.memo : this.state.editTask.memo}
                    disabled={this.state.editingTaskIndex !== index}
                    disableUnderline={this.state.editingTaskIndex !== index}
                  />
                </TableCell>
                <TableCell padding="none" className={classes.cell}>
                  <Input
                    className={classes.cellInput}
                    type="number"
                    fullWidth
                    onChange={this.changeTaskEstimate.bind(this, 'editTask')}
                    value={this.state.editingTaskIndex !== index ? n.estimate : this.state.editTask.estimate}
                    disabled={this.state.editingTaskIndex !== index}
                    disableUnderline={this.state.editingTaskIndex !== index}
                  />
                </TableCell>
                {(() => {
                  if (isRegularTask) {
                    return (
                      <TableCell padding="none" className={classes.cell}>
                        <MultipleSelect
                          label={'第何週'}
                          value={this.state.editingTaskIndex !== index ? n.week : this.state.editTask.week}
                          options={[1, 2, 3, 4, 5]}
                          onChange={this.changeWeek.bind(this, 'editTask')}
                          disabled={this.state.editingTaskIndex !== index}
                        />
                      </TableCell>
                    );
                  }
                  return null;
                })()}
                {(() => {
                  if (isRegularTask) {
                    return (
                      <TableCell padding="none" className={classes.cell}>
                        <MultipleSelect
                          label={'何曜日'}
                          value={this.state.editingTaskIndex !== index ? n.dayOfWeek : this.state.editTask.dayOfWeek}
                          options={constants.DAY_OF_WEEK_STR}
                          onChange={this.changeDayOfWeek.bind(this, 'editTask')}
                          disabled={this.state.editingTaskIndex !== index}
                        />
                      </TableCell>
                    );
                  }
                  return null;
                })()}
                <TableCell padding="none" className={classes.cell}>
                  <div className={classes.actionIcons}>
                    <IconButton className={classes.actionIcon} color="default" onClick={this.editTask.bind(this, index)}>
                      <i className={this.state.editingTaskIndex !== index ? 'fa fa-pencil' : 'fa fa-floppy-o'} />
                    </IconButton>
                    <span>/</span>
                    <IconButton className={classes.actionIcon} color="default" onClick={this.openTaskAction.bind(this, index)}>
                      <i className="fa fa-ellipsis-h" />
                    </IconButton>
                    <Menu
                      anchorEl={this.state.anchorEl[index]}
                      open={Boolean(this.state.anchorEl[index] || false)}
                      onClose={this.closeTaskAction.bind(this, index)}
                    >
                      <MenuItem key={'moveTask'} onClick={this.moveTask.bind(this, index)}>
                        <i className="fa fa-download" />
                      テーブルに移動
                      </MenuItem>
                      <MenuItem key={'downTask'} onClick={this.downTask.bind(this, index)}>
                        <i className="fa fa-arrow-down" />
                      1つ下に移動
                      </MenuItem>
                      <MenuItem key={'upTask'} onClick={this.upTask.bind(this, index)}>
                        <i className="fa fa-arrow-up" />
                      1つ上に移動
                      </MenuItem>
                      <MenuItem key={'removeTask'} onClick={this.removeTask.bind(this, index)}>
                        <i className="fa fa-trash-o" />
                      削除
                      </MenuItem>
                    </Menu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell padding="none" className={classes.cell}>
                <Input
                  className={classes.cellInput}
                  fullWidth
                  onChange={this.changeTaskTitle.bind(this, 'addTask')}
                  value={this.state.addTask.title}
                  placeholder="作業内容"
                />
              </TableCell>
              <TableCell padding="none" className={classes.cell}>
                <Input
                  className={classes.cellInput}
                  fullWidth
                  onChange={this.changeTaskMemo.bind(this, 'addTask')}
                  value={this.state.addTask.memo}
                  placeholder="備考"
                />
              </TableCell>
              <TableCell padding="none" className={classes.cell}>
                <Input
                  className={classes.cellInput}
                  type="number"
                  fullWidth
                  onChange={this.changeTaskEstimate.bind(this, 'addTask')}
                  value={this.state.addTask.estimate}
                  placeholder="見積"
                />
              </TableCell>
              {(() => {
                if (isRegularTask) {
                  return (
                    <TableCell padding="none" className={classes.cell}>
                      <MultipleSelect
                        label={'第何週'}
                        value={this.state.addTask.week}
                        options={[1, 2, 3, 4, 5]}
                        onChange={this.changeWeek.bind(this, 'addTask')}
                        disabled={false}
                      />
                    </TableCell>
                  );
                }
                return null;
              })()}
              {(() => {
                if (isRegularTask) {
                  return (
                    <TableCell padding="none" className={classes.cell}>
                      <MultipleSelect
                        label={'何曜日'}
                        value={this.state.addTask.dayOfWeek}
                        options={constants.DAY_OF_WEEK_STR}
                        onChange={this.changeDayOfWeek.bind(this, 'addTask')}
                        disabled={false}
                      />
                    </TableCell>
                  );
                }
                return null;
              })()}
              <TableCell style={{ textAlign: 'center' }} padding="none" className={classes.cell}>
                <IconButton className={classes.actionIcon} color="default" onClick={this.addTask.bind(this)}>
                  <i className="fa fa-plus" />
                </IconButton>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    );
  }
}

TaskList.propTypes = {
  tasks: PropTypes.array.isRequired,
  addTask: PropTypes.func.isRequired,
  editTask: PropTypes.func.isRequired,
  moveTask: PropTypes.func.isRequired,
  removeTask: PropTypes.func.isRequired,
  downTask: PropTypes.func.isRequired,
  upTask: PropTypes.func.isRequired,
  isRegularTask: PropTypes.bool.isRequired,
  classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(TaskList);
