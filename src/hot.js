import moment from 'moment';
import debounce from 'lodash.debounce';
import hotSchema from './schemas/hotSchema';
import constants from './constants';
import util from './util';
import logo from './images/logo.png';

const BLUE = '#ff9b9b';
const RED = '#4f93fc';
const GRAY = '#cfcfcf';

const isNotificationSupport = 'Notification' in window && Notification;

const columns = [
  {
    title: '作業内容',
    data: 'title',
    type: 'text',
    /* eslint no-param-reassign: ["error", { "props": false }] */
    renderer(instance, td, row, col, prop, value) {
      td.innerHTML = value;
      if (instance.getDataAtRowProp(row, 'startTime') !== '' && instance.getDataAtRowProp(row, 'endTime') !== '') {
        if (td.parentNode.classList.contains('progress')) td.parentNode.classList.remove('progress');
        td.parentNode.classList.add('done');
      } else {
        td.parentNode.classList.remove('done');
      }
      return td;
    },
  },
  {
    title: '<span title="見積時間 数値で入力してください。">見積(分)</span>',
    data: 'estimate',
    type: 'numeric',
    allowInvalid: false,
    colWidths: 32,
  },
  {
    title: '<span title="HH:mm の形式で入力してください。(例)19:20">開始時刻</span>',
    data: 'startTime',
    type: 'time',
    colWidths: 32,
    timeFormat: 'HH:mm',
    allowInvalid: false,
    correctFormat: true,
    renderer(instance, td, row, col, prop, value) {
      td.innerHTML = value;
      if (value !== '' && !td.parentNode.classList.contains('done')) {
        td.parentNode.classList.add('progress');
      }
      return td;
    },
  },
  {
    title: '<span title="HH:mm の形式で入力してください。(例)19:20">終了時刻</span>',
    data: 'endTime',
    type: 'time',
    colWidths: 32,
    timeFormat: 'HH:mm',
    allowInvalid: false,
    correctFormat: true,
    renderer(instance, td, row, col, prop, value) {
      td.innerHTML = value;
      if (value === '') {
        const startTimeVal = instance.getDataAtRowProp(row, 'startTime');
        const estimateVal = instance.getDataAtRowProp(row, 'estimate');
        if (startTimeVal !== '' && estimateVal !== '') {
          td.innerHTML = `<div style="color:${GRAY}">${moment(startTimeVal, 'HH:mm').add(estimateVal, 'minutes').format('HH:mm')}</div>`; // eslint-disable-line no-param-reassign
        }
      }
      return td;
    },
  },
  {
    title: '<span title="終了時刻を記入後、自動入力されます。 (編集不可)">実績(分)</span>',
    data: 'actually',
    type: 'numeric',
    readOnly: true,
    validator: false,
    colWidths: 32,
    /* eslint no-param-reassign: ["error", { "props": false }] */
    renderer(instance, td, row, col, prop, value) {
      td.classList.add('htDimmed');
      const startTimeVal = instance.getDataAtRowProp(row, 'startTime');
      const endTimeVal = instance.getDataAtRowProp(row, 'endTime');
      if (startTimeVal && endTimeVal) {
        const diff = util.getTimeDiff(startTimeVal, endTimeVal);
        const overdueSign = Math.sign(diff - instance.getDataAtRowProp(row, 'estimate') || 0);
        if (overdueSign === 1) {
          // 差分が見積もりよりも少ない
          td.style.color = BLUE;
          value = diff; // eslint-disable-line no-param-reassign
        } else if (overdueSign === 0) {
          // 差分が見積もりと同じ
          value = diff; // eslint-disable-line no-param-reassign
        } else if (overdueSign === -1) {
          // 差分が見積もりよりも多い
          td.style.color = RED;
          value = diff; // eslint-disable-line no-param-reassign
        }
      } else {
        value = ''; // eslint-disable-line no-param-reassign
      }
      td.innerHTML = value;
      return td;
    },
  },
  {
    title: '備考',
    data: 'memo',
    type: 'text',
  },
];

const manageNotification = (hotInstance, row, prop, newVal) => {
  // ブラウザ通知をサポートしていなければ処理を抜ける
  if (!isNotificationSupport) return;
  const col = hotInstance.propToCol(prop);
  // 値が不正な場合は処理を抜ける
  if (!hotInstance.getCellMeta(row, col).valid) return;
  if (prop === 'startTime') {
    // 新しい値が空の場合は既に登録されている通知を削除
    if (newVal === '') {
      const startNotifiId = hotInstance.getCellMeta(row, col).startNotifiId;
      const endNotifiId = hotInstance.getCellMeta(row, col).endNotifiId;
      if (startNotifiId || endNotifiId) {
        clearTimeout(startNotifiId);
        clearTimeout(endNotifiId);
        hotInstance.removeCellMeta(row, col, 'startNotifiId');
        hotInstance.removeCellMeta(row, col, 'endNotifiId');
        hotInstance.render();
        return;
      }
    }
    // FIXME 関数化
    // --------------------------開始時刻に表示する通知の設定--------------------------
    const startNotifiMoment = moment(newVal, 'HH:mm');
    const startTimeOut = startNotifiMoment.diff(moment());
    if (startNotifiMoment.isValid() && startTimeOut > 0) {
    // 権限を取得し通知を登録
      Notification
        .requestPermission()
        .then(() => {
        // タイマーを登録(セルにタイマーIDを設定)
          const notifiId = setTimeout(() => {
            // タイマーが削除されていた場合には何もしない
            if (!hotInstance.getCellMeta(row, col).startNotifiId) return;
            hotInstance.removeCellMeta(row, col, 'startNotifiId');
            const taskTitle = hotInstance.getDataAtRowProp(row, 'title');
            const notifi = new Notification(taskTitle ? `${taskTitle}の開始時刻です。` : 'タスクの開始時刻です。', {
              icon: logo,
            });
            notifi.onclick = () => {
              notifi.close();
              window.focus();
              hotInstance.selectCell(row, hotInstance.propToCol('startTime'));
            };
            hotInstance.render();
          }, startTimeOut);
          // 既に設定されているタイマーを削除
          hotInstance.removeCellMeta(row, col, 'startNotifiId');
          hotInstance.setCellMeta(row, col, 'startNotifiId', notifiId);
          hotInstance.render();
        });
    }
    // --------------------------終了時刻に表示する通知の設定--------------------------
    const estimateVal = hotInstance.getDataAtRowProp(row, 'estimate');
    // 見積もり時刻が空か0 もしくは 見積もり時間が不正な場合、処理を抜ける
    if (estimateVal === '' || estimateVal === 0 || !Number.isInteger(+estimateVal)) return;
    const endNotifiMoment = moment(newVal, 'HH:mm').add(estimateVal, 'minutes');
    const endTimeOut = endNotifiMoment.diff(moment());
    if (endNotifiMoment.isValid() && endTimeOut > 0) {
    // 権限を取得し通知を登録
      Notification
        .requestPermission()
        .then(() => {
        // タイマーを登録(セルにタイマーIDを設定)
          const notifiId = setTimeout(() => {
          // タイマーが削除されていた場合には何もしない
            if (!hotInstance.getCellMeta(row, col).endNotifiId) return;
            hotInstance.removeCellMeta(row, col, 'endNotifiId');
            const taskTitle = hotInstance.getDataAtRowProp(row, 'title');
            const notifi = new Notification(taskTitle ? `${taskTitle}の終了時刻です。` : 'タスクの終了時刻です。', {
              icon: logo,
            });
            notifi.onclick = () => {
              notifi.close();
              window.focus();
              hotInstance.selectCell(row, hotInstance.propToCol('endTime'));
            };
            hotInstance.render();
          }, endTimeOut);
          // 既に設定されているタイマーを削除
          hotInstance.removeCellMeta(row, col, 'endNotifiId');
          hotInstance.setCellMeta(row, col, 'endNotifiId', notifiId);
          hotInstance.render();
        });
    }
  } else if (prop === 'endTime') {
    // startTimeのセルにタイマーIDがあれば確認をして削除
    const startTimeCol = hotInstance.propToCol('startTime');
    const endNotifiId = hotInstance.getCellMeta(row, startTimeCol).endNotifiId;
    const startNotifiId = hotInstance.getCellMeta(row, startTimeCol).startNotifiId;
    if (startNotifiId || endNotifiId) {
      clearTimeout(startNotifiId);
      clearTimeout(endNotifiId);
      hotInstance.removeCellMeta(row, startTimeCol, 'startNotifiId');
      hotInstance.removeCellMeta(row, startTimeCol, 'endNotifiId');
      hotInstance.render();
    }
  }
};

export const bindShortcut = (hot) => {
  // ショートカット処理
  hot.addHook('afterDocumentKeyDown', debounce((e) => {
    // ハンズオンテーブル以外のキーダウンイベントでは下記の処理をしない
    if (e.path && e.path[0] && e.path[0].id !== 'HandsontableCopyPaste') return;
    const selected = hot.getSelected();
    if (!selected) return;
    const [startRow, startCol, endRow, endCol] = selected;
    if (e.ctrlKey) {
      if (constants.shortcuts.HOT_CURRENTTIME(e)) {
        // 現在時刻を入力
        const prop = hot.colToProp(startCol);
        // 選択しているセルが1つかつ、開始時刻・終了時刻のカラム
        if (startRow === endRow && startCol === endCol && (prop === 'endTime' || prop === 'startTime')) {
          hot.setDataAtCell(startRow, startCol, moment().format('HH:mm'));
        }
      }
      hot.render();
    }
  }, constants.KEYEVENT_DELAY));
};

export const getEmptyHotData = () => [util.cloneDeep(hotSchema)];

export const getEmptyRow = () => getEmptyHotData()[0];

export const getHotTasksIgnoreEmptyTask = (hotInstance) => {
  if (hotInstance) {
    const hotData = [];
    const rowCount = hotInstance.countSourceRows();
    for (let index = 0; index < rowCount; index += 1) {
      hotData[index] = hotInstance.getSourceDataAtRow(hotInstance.toPhysicalRow(index));
    }
    return util.cloneDeep(hotData.filter(data => !util.equal(getEmptyRow(), data)));
  }
  return getEmptyHotData();
};

export const setDataForHot = (hotInstance, datas) => {
  if (!Array.isArray(datas)) return;
  const dataForHot = [];
  util.cloneDeep(datas).forEach((data, rowIndex) => {
    if (!util.equal(getEmptyRow(), data)) {
      Object.entries(data).forEach(([key, value]) => {
        dataForHot.push([rowIndex, key, value]);
      });
    }
  });
  hotInstance.setDataAtRowProp(dataForHot);
};

export const hotConf = {
  autoRowSize: false,
  autoColumnSize: false,
  stretchH: 'all',
  comments: true,
  rowHeaders: true,
  rowHeaderWidth: 25,
  autoInsertRow: false,
  manualRowMove: true,
  minRows: 10,
  colWidths: Math.round(constants.APPWIDTH / columns.length),
  columns,
  data: getEmptyHotData(),
  dataSchema: hotSchema,
  afterChange(changes) {
    if (!changes) return;
    const changesLength = changes.length;
    for (let i = 0; i < changesLength; i += 1) {
      const [row, prop, oldVal, newVal] = changes[i];
      if ((prop === 'startTime' || prop === 'endTime') && oldVal !== newVal) {
        manageNotification(this, row, prop, newVal);
      }
    }
  },
};
