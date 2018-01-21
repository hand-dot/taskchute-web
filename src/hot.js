import moment from 'moment';
import debounce from 'lodash.debounce';
import taskSchema from './schemas/tableTaskSchema';
import constants from './constants';
import util from './util';
import logo from './images/logo.png';

const BLUE = '#ff9b9b';
const RED = '#4f93fc';
const GRAY = '#cfcfcf';

const isNotificationSupport = 'Notification' in window && Notification;

const columns = [
  {
    title: '<span title="タスクが完了すると自動でチェックされます。(編集不可) ">*済</span>',
    data: 'done',
    type: 'checkbox',
    readOnly: true,
    validator: false,
    colWidths: 18,
    /* eslint no-param-reassign: ["error", { "props": false }] */
    renderer(instance, td, row, col, prop, value) {
      td.classList.add('htCenter');
      td.classList.add('htMiddle');
      td.classList.add('htDimmed');
      td.innerHTML = `<input class="htCheckboxRendererInput" type="checkbox" ${value ? 'checked' : ''}>`;
      if (value) td.parentNode.classList.add('done');
      td.parentNode.style.color = value ? GRAY : '';
      return td;
    },
  },
  {
    title: '作業内容',
    data: 'title',
    type: 'text',
  },
  {
    title: '<span title="見積時間 数値で入力してください。">見積(分)</span>',
    data: 'estimate',
    type: 'numeric',
    allowInvalid: false,
    colWidths: 28,
  },
  {
    title: '<span title="HH:mm の形式で入力してください。(例)19:20">開始時刻</span>',
    data: 'startTime',
    type: 'time',
    colWidths: 32,
    timeFormat: 'HH:mm',
    allowInvalid: false,
    correctFormat: true,
    renderer(instance, td, row, col, prop, value, cellProperties) {
      td.innerHTML = value;
      const valid = cellProperties.valid;
      if (valid === false) {
        td.classList.add('htInvalid');
        return td;
      }
      if (value !== '' && !td.parentNode.classList.contains('done')) {
        td.parentNode.classList.add('progress');
      } else if (value === '' && instance.getCellMeta(row, instance.propToCol('endTime'))) {
        instance.removeCellMeta(row, instance.propToCol('endTime'), 'temporaryTime');
      }
      const notification = cellProperties.notification;
      if (notification) {
        td.innerHTML = `<div title="${notification.time}通知予約済">${value} <i class="fa fa-bell-o"></i></div>`; // eslint-disable-line no-param-reassign
        instance.setCellMeta(row, instance.propToCol('endTime'), 'temporaryTime', notification.time);
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
    renderer(instance, td, row, col, prop, value, cellProperties) {
      td.innerHTML = value;
      const valid = cellProperties.valid;
      if (valid === false) {
        td.classList.add('htInvalid');
        return td;
      }
      const temporaryTime = cellProperties.temporaryTime;
      if (temporaryTime && value === '') {
        td.innerHTML = `<div style="color:${GRAY}">${temporaryTime}(仮)</div>`; // eslint-disable-line no-param-reassign
      }
      return td;
    },
  },
  {
    title: '<span title="終了時刻を記入後、自動入力されます。 (編集不可)">*実績(分)</span>',
    data: 'actually',
    type: 'numeric',
    readOnly: true,
    validator: false,
    colWidths: 28,
    /* eslint no-param-reassign: ["error", { "props": false }] */
    renderer(instance, td, row, col, prop, value) {
      td.classList.add('htDimmed');
      td.innerHTML = value;
      // 見積もりに対して実績がオーバーしていれば編集したセルにoverdueという属性をtrueにする
      // 見積もりに対して実績がむしろマイナスだった場合はoverdueをfalseにする
      const estimateVal = instance.getDataAtRowProp(row, 'estimate');
      const actuallyVal = instance.getDataAtRowProp(row, 'actually');
      if (!Number.isInteger(+estimateVal) && !Number.isInteger(+actuallyVal)) return td;
      const overdueSign = Math.sign(actuallyVal - estimateVal);
      if (overdueSign === 1) {
        td.style.color = BLUE;
      } else if (overdueSign === -1) {
        td.style.color = RED;
      }
      return td;
    },
  },
  {
    title: '備考',
    data: 'memo',
    type: 'text',
  },
];

const calculateTask = (hotInstance, row, prop) => {
  const col = hotInstance.propToCol(prop);
  if (prop === 'startTime' || prop === 'endTime') {
    // 変更したセルが開始時刻 or 終了時刻の場合、実績を自動入力し、済をチェックする処理
    const startTimeVal = hotInstance.getDataAtRowProp(row, 'startTime');
    const endTimeVal = hotInstance.getDataAtRowProp(row, 'endTime');
    if (startTimeVal === null || endTimeVal === null) return;
    if (startTimeVal === '' || endTimeVal === '') {
      // 入力値が空の場合、実績を空にし、済のチェックをはずす
      hotInstance.setDataAtRowProp(row, 'done', false);
      hotInstance.setDataAtRowProp(row, 'actually', '');
    } else if (startTimeVal.indexOf(':') !== -1 && endTimeVal.indexOf(':') !== -1) {
      // 実績を入力し、済をチェックする処理の開始
      const [startTimeHour, startTimeMinute] = startTimeVal.split(':');
      const [endTimeHour, endTimeMinute] = endTimeVal.split(':');
      // 入力値のチェック
      if (!Number.isInteger(+startTimeHour) && !Number.isInteger(+startTimeMinute) &&
      !Number.isInteger(+endTimeHour) && !Number.isInteger(+endTimeMinute)) return;
      // 開始時刻、終了時刻が有効な値の場合
      const diff = moment().hour(endTimeHour).minute(endTimeMinute).diff(moment().hour(startTimeHour).minute(startTimeMinute), 'minutes');
      const commentsPlugin = hotInstance.getPlugin('comments');
      if (!isNaN(diff) && Math.sign(diff) !== -1) {
        // 実績を入力し、済をチェックする
        hotInstance.setDataAtRowProp(row, 'actually', diff);
        hotInstance.setDataAtRowProp(row, 'done', true);
        // ヴァリデーションエラーを消す処理
        const targetCol = hotInstance.propToCol(prop === 'startTime' ? 'endTime' : 'startTime');
        const targetCellMeta = hotInstance.getCellMeta(row, targetCol);
        if (!targetCellMeta.valid) {
          hotInstance.setCellMeta(row, targetCol, 'valid', true);
          commentsPlugin.removeCommentAtCell(targetCellMeta.row, targetCellMeta.col);
        }
      } else {
        // 開始時刻と終了時刻の関係がおかしい
        // 実績、済をクリアする
        hotInstance.setDataAtRowProp(row, 'actually', '');
        hotInstance.setDataAtRowProp(row, 'done', false);
        // ヴァリデーションエラーを追加する処理
        const cellMeta = hotInstance.getCellMeta(row, col);
        if (cellMeta.valid) {
          hotInstance.setCellMeta(row, col, 'valid', false);
          commentsPlugin.setCommentAtCell(row, col, '開始時刻に対して終了時刻が不正です。');
          commentsPlugin.showAtCell(row, col);
        }
      }
    }
  }
};

const manageNotification = (hotInstance, row, prop, newVal) => {
  // ブラウザ通知をサポートしていなければ処理を抜ける
  if (!isNotificationSupport) return;
  const col = hotInstance.propToCol(prop);
  if (prop === 'startTime') {
    // 新しい値が空の場合は既に登録されている通知を削除
    if (newVal === '') {
      const notification = hotInstance.getCellMeta(row, col).notification;
      if (notification) {
        clearTimeout(notification.id);
        hotInstance.removeCellMeta(row, col, 'notification');
        hotInstance.render();
        return;
      }
    }

    const estimateVal = hotInstance.getDataAtRowProp(row, 'estimate');
    const notifiMoment = moment(newVal, 'HH:mm').add(estimateVal, 'minutes');
    const timeOut = notifiMoment.toDate().getTime() - Date.now();
    // 下記の場合、処理を抜ける
    // ・終了予定時刻が不正
    // ・すでに済がチェックされているタスク
    // ・過去のアラーム
    // ・見積もり時刻が空か0
    // ・開始時刻がヴァリデーションエラー
    // ・見積もり時間が不正
    if (!notifiMoment.isValid() ||
      hotInstance.getDataAtRowProp(row, 'done') ||
      timeOut < 0 ||
      estimateVal === '' || estimateVal === 0 ||
      !hotInstance.getCellMeta(row, col).valid ||
      !Number.isInteger(+estimateVal)) {
      return;
    }

    // 権限を取得し通知を登録
    Notification
      .requestPermission()
      .then(() => {
        // 既に設定されているタイマーを削除
        hotInstance.removeCellMeta(row, col, 'notification');
        // タイマーを登録(セルにタイマーIDを設定)
        const notifiId = setTimeout(() => {
          // タイマーが削除されていた場合には何もしない
          if (!hotInstance.getCellMeta(row, col).notification) return;
          hotInstance.removeCellMeta(row, col, 'notification');
          const taskTitle = hotInstance.getDataAtRowProp(row, 'title');
          const notifi = new Notification(taskTitle ? `${taskTitle}の終了時刻です。` : 'タスクの終了時刻です。', {
            icon: logo,
          });
          notifi.onclick = () => {
            notifi.close();
            window.focus();
            hotInstance.selectCell(row, hotInstance.propToCol('endTime'));
          };
          // クリックされなければ5分後に消す
          setTimeout(notifi.close.bind(notifi), 300000);
          hotInstance.render();
        }, timeOut);
        hotInstance.setCellMeta(row, col, 'notification', { id: notifiId, time: notifiMoment.format('HH:mm') });
        hotInstance.render();
      });
  } else if (prop === 'endTime') {
    // startTimeのセルにタイマーIDがあれば確認をして削除
    const startTimeCol = hotInstance.propToCol('startTime');
    const notification = hotInstance.getCellMeta(row, startTimeCol).notification;
    if (notification) {
      clearTimeout(notification.id);
      hotInstance.removeCellMeta(row, startTimeCol, 'notification');
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
    const [startRow, startCol, endRow, endCol] = [selected[0], selected[1], selected[2], selected[3]];
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

export const getEmptyHotData = () => [util.cloneDeep(taskSchema)];

export const getEmptyRow = () => getEmptyHotData()[0];

export const getHotTasksIgnoreEmptyTask = (hotInstance) => {
  if (hotInstance) {
    const hotData = hotInstance.getSourceData().map((data, index) => hotInstance.getSourceDataAtRow(hotInstance.toPhysicalRow(index)));
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
  dataSchema: taskSchema,
  afterChange(changes) {
    if (!changes) return;
    changes.forEach((change) => {
      const [row, prop, oldVal, newVal] = change;
      if ((prop === 'startTime' || prop === 'endTime') && oldVal !== newVal) {
        // FIXME パフォーマンスが悪いのでレンダラーですべてを行いたい
        calculateTask(this, row, prop);
        manageNotification(this, row, prop, newVal);
      }
    });
  },
};
