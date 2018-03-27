import React, { Component } from 'react';
import PropTypes from 'prop-types';
import AppBar from 'material-ui/AppBar';
import Tabs, { Tab } from 'material-ui/Tabs';

import constants from '../constants';
import util from '../util';

import TaskList from './TaskList';

class TaskPool extends Component {
  constructor(props) {
    super(props);
    this.state = {
      tab: constants.taskPoolType.HIGHPRIORITY,
    };
  }

  addTask(task) {
    this.props.changePoolTasks(constants.taskActionType.ADD, this.state.tab, task);
  }

  editTask(task, index) {
    this.props.changePoolTasks(constants.taskActionType.EDIT, this.state.tab, { task, index });
  }

  moveTable(index) {
    this.props.changePoolTasks(constants.taskActionType.MOVE_TABLE, this.state.tab, index);
  }

  removeTask(index) {
    if (window.confirm(`${this.props.poolTasks[this.state.tab][index].title} を本当に削除しますか？`)) {
      this.props.changePoolTasks(constants.taskActionType.REMOVE, this.state.tab, index);
    }
  }
  downTask(index) {
    this.props.changePoolTasks(constants.taskActionType.DOWN, this.state.tab, index);
  }

  upTask(index) {
    this.props.changePoolTasks(constants.taskActionType.UP, this.state.tab, index);
  }
  bottomToTask(index) {
    this.props.changePoolTasks(constants.taskActionType.BOTTOM, this.state.tab, index);
  }

  topToTask(index) {
    this.props.changePoolTasks(constants.taskActionType.TOP, this.state.tab, index);
  }
  handleTabChange(event, tab) {
    this.setState({ tab });
  }

  render() {
    const { poolTasks } = this.props;
    return (
      <div>
        <AppBar style={{ boxShadow: 'none', borderBottom: '1px solid #ccc' }} color="inherit" position="static">
          {(() => {
            if (!util.isMobile()) {
              return (
                <Tabs scrollable scrollButtons="on" fullWidth value={this.state.tab} onChange={this.handleTabChange.bind(this)} indicatorColor={constants.brandColor.base.BLUE} textColor="inherit">
                  <Tab value={constants.taskPoolType.HIGHPRIORITY} fullWidth style={{ maxWidth: 'none' }} label="すぐにやる" />
                  <Tab value={constants.taskPoolType.LOWPRIORITY} fullWidth style={{ maxWidth: 'none' }} label="いつかやる" />
                  <Tab value={constants.taskPoolType.REGULAR} fullWidth style={{ maxWidth: 'none' }} label="定期的" />
                </Tabs>
              );
            }
            return (
              <Tabs scrollable scrollButtons="on" fullWidth value={this.state.tab} onChange={this.handleTabChange.bind(this)} indicatorColor={constants.brandColor.base.BLUE} textColor="inherit">
                <Tab value={constants.taskPoolType.HIGHPRIORITY} fullWidth style={{ maxWidth: 'none' }} label="すぐにやる" />
                <Tab value={constants.taskPoolType.LOWPRIORITY} fullWidth style={{ maxWidth: 'none' }} label="いつかやる" />
              </Tabs>
            );
          })()}
        </AppBar>
        {(() => {
          let tasks = null;
          if (this.state.tab === constants.taskPoolType.HIGHPRIORITY) {
            tasks = poolTasks.highPriorityTasks;
          } else if (this.state.tab === constants.taskPoolType.LOWPRIORITY) {
            tasks = poolTasks.lowPriorityTasks;
          } else if (this.state.tab === constants.taskPoolType.REGULAR) {
            tasks = poolTasks.regularTasks;
          }
          return (<TaskList
            addTask={this.addTask.bind(this)}
            editTask={this.editTask.bind(this)}
            moveTable={this.moveTable.bind(this)}
            removeTask={this.removeTask.bind(this)}
            downTask={this.downTask.bind(this)}
            upTask={this.upTask.bind(this)}
            bottomToTask={this.bottomToTask.bind(this)}
            topToTask={this.topToTask.bind(this)}
            tasks={tasks}
            isRegularTask={this.state.tab === constants.taskPoolType.REGULAR}
          />);
        })()}
      </div>
    );
  }
}

TaskPool.propTypes = {
  poolTasks: PropTypes.shape({
    highPriorityTasks: PropTypes.array.isRequired,
    lowPriorityTasks: PropTypes.array.isRequired,
    regularTasks: PropTypes.array.isRequired,
  }).isRequired,
  changePoolTasks: PropTypes.func.isRequired,
};

export default TaskPool;

