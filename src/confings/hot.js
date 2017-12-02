import moment from 'moment';
import cloneDeep from 'lodash.clonedeep';

const dataSchema = { done: false, category: '', title: '', estimate: '', startTime: '', endTime: '', actually: '', memo: '', impre: '' };
const data = [cloneDeep(dataSchema)];
const columns = [
  {
    title: '<span title="タスクが完了すると自動でチェックされます。(編集不可) ">済</span>',
    data: 'done',
    type: 'checkbox',
    colWidths: 30,
    readOnly: true,
    className: 'htCenter htMiddle',
  },
  {
    title: '<span title="タスクの分類項目として使用する。">カテゴリ</span>',
    data: 'category',
    type: 'dropdown',
    source: [],
    colWidths: 100,
    validator: false,
  },
  {
    title: '<span title="具体的な作業(タスク)の内容を入力してください。">作業内容</span>',
    data: 'title',
    type: 'text',
  },
  {
    title: '<span title="見積時間 数値で入力してください。">見積(分)</span>',
    data: 'estimate',
    type: 'numeric',
    colWidths: 60,
  },
  {
    title: '<span title="HH:mm の形式で入力してください。(例)19:20">開始時刻</span>',
    data: 'startTime',
    type: 'time',
    colWidths: 60,
    timeFormat: 'HH:mm',
    correctFormat: true,
    renderer(instance, td, row, col, prop, value, cellProperties) {
      td.innerHTML = value;
      const notification = cellProperties.notification;
      if (notification) {
        td.innerHTML = `<div title="${notification.time}通知予約済">${value}<span style="font-size: 10pt;">[!]</span></div>`; // eslint-disable-line no-param-reassign
      }
      return td;
    },
  },
  {
    title: '<span title="HH:mm の形式で入力してください。(例)19:20">終了時刻</span>',
    data: 'endTime',
    type: 'time',
    colWidths: 60,
    timeFormat: 'HH:mm',
    correctFormat: true,
  },
  {
    title: '<span title="終了時刻を記入後、自動入力されます。 (編集不可)">実績(分)</span>',
    data: 'actually',
    type: 'numeric',
    validator: false,
    colWidths: 60,
    readOnly: true,
    /* eslint no-param-reassign: ["error", { "props": false }] */
    renderer(instance, td, row, col, prop, value, cellProperties) {
      td.innerHTML = value;
      if (cellProperties.overdue) {
        td.style.color = '#ff9b9b';
      } else if (cellProperties.overdue === false) {
        td.style.color = '#4f93fc';
      }
      return td;
    },
  },
  {
    title: '<span title="タスクの実行に役立つ参照情報(メモ)を入力します。">備考</span>',
    data: 'memo',
    type: 'text',
  },
  {
    title: '<span title="タスクの実行後に所感を入力します。">感想</span>',
    data: 'impre',
    type: 'text',
  },
];

const setValidtionMessage = (hotInstance, row, prop, isValid) => {
  const commentsPlugin = hotInstance.getPlugin('comments');
  const col = hotInstance.propToCol(prop);
  if (isValid) {
    commentsPlugin.removeCommentAtCell(row, col);
  } else {
    let comment = '';
    if (prop === 'estimate') {
      comment = '半角数値を入力してください';
    } else if (prop === 'startTime' || prop === 'endTime') {
      comment = '半角数値,カンマ区切りで有効な時刻を入力してください';
    }
    commentsPlugin.setCommentAtCell(row, col, comment);
    commentsPlugin.showAtCell(row, col);
  }
};

const setStartOrEndTime = (hotInstance, row, prop) => {
  const cellData = hotInstance.getDataAtRowProp(row, prop);
  if (prop === 'startTime' && cellData === '') {
  // 編集を始めたセルが開始時刻かつ、セルが空の場合
  // 現在時刻を入力する
    hotInstance.setDataAtRowProp(row, prop, moment().format('HH:mm'));
  } else if (prop === 'endTime' && cellData === '') {
    // 編集を始めたセルが終了時刻かつ、セルが空の場合
    const startTimeVal = hotInstance.getDataAtRowProp(row, 'startTime');
    if (startTimeVal === '') {
      // 開始時刻が入力されていない場合開始時刻を入力させる
      alert('開始時刻を入力してください');
      hotInstance.selectCell(row, hotInstance.propToCol('startTime'));
    } else {
      // 現在時刻を入力する
      hotInstance.setDataAtRowProp(row, prop, moment().format('HH:mm'));
    }
  }
};

const calculateTask = (hotInstance, row, prop) => {
  const col = hotInstance.propToCol(prop);
  if (prop === 'startTime' || prop === 'endTime') {
    // 変更したセルが開始時刻 or 終了時刻の場合、実績を自動入力し、済をチェックする処理
    const startTimeVal = hotInstance.getDataAtRowProp(row, 'startTime');
    const endTimeVal = hotInstance.getDataAtRowProp(row, 'endTime');
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
  } else if (prop === 'estimate' || prop === 'actually') {
    // 変更したセルが見積 or 実績の場合、実績のメタ情報を変更する処理
    // 見積もりに対して実績がオーバーしていれば編集したセルにoverdueという属性をtrueにする
    // 見積もりに対して実績がむしろマイナスだった場合はoverdueをfalseにする
    const estimateVal = hotInstance.getDataAtRowProp(row, 'estimate');
    const actuallyVal = hotInstance.getDataAtRowProp(row, 'actually');
    if (estimateVal === '' || actuallyVal === '') return;
    if (!Number.isInteger(+estimateVal) && !Number.isInteger(+actuallyVal)) return;
    const overdueSign = Math.sign(actuallyVal - estimateVal);
    let overdue;
    if (overdueSign === 1) {
      overdue = true;
    } else if (overdueSign === -1) {
      overdue = false;
    }
    hotInstance.setCellMeta(row, hotInstance.propToCol('actually'), 'overdue', overdue);
    hotInstance.render();
  }
};

const manageNotification = (hotInstance, row, prop, newVal) => {
  // ブラウザ通知をサポートしていなければ処理を抜ける
  if (!('Notification' in window && Notification)) return;
  const col = hotInstance.propToCol(prop);
  if (prop === 'startTime') {
    const estimateVal = hotInstance.getDataAtRowProp(row, 'estimate');
    // 開始時刻,見積もり時刻が空か0
    // もしくは開始時刻がヴァリデーションエラーもしくは見積もり時間が不正な場合は処理を抜ける
    if (newVal === '' || estimateVal === '' || estimateVal === 0 ||
    !hotInstance.getCellMeta(row, col).valid || !Number.isInteger(+estimateVal)) {
      return;
    }
    const notifiTime = moment(newVal, 'HH:mm').add(estimateVal, 'minutes').format('HH:mm');
    const notifiRegistMsg = `見積時刻の設定されたタスクが開始されました。
終了予定時刻(${notifiTime})に通知を設定しますか？
(初回は通知の許可が求められます。)`;
    if (window.confirm(notifiRegistMsg)) {
      const taskTitle = hotInstance.getDataAtRowProp(row, 'title');
      // 権限を取得し通知を登録
      Notification
        .requestPermission()
        .then(() => {
          // 既に設定されているタイマーを削除
          hotInstance.removeCellMeta(row, col, 'notification');
          // タイマーを登録(セルにタイマーIDを設定)
          const notifiId = setTimeout(() => {
            hotInstance.removeCellMeta(row, col, 'notification');
            const title = taskTitle ? `${taskTitle}の終了時刻です。` : 'タスクの終了時刻です。';
            const notifi = new Notification(title, {
              body: 'クリックしてタスクに終了時刻を入力し完了させてください。',
              icon: `${window.location.href}favicon.ico`,
            });
            notifi.onclick = () => {
              notifi.close();
              window.focus();
              hotInstance.selectCell(row, hotInstance.propToCol('endTime'));
            };
            hotInstance.render();
          }, estimateVal * 60 * 1000);
          hotInstance.setCellMeta(row, col, 'notification', { id: notifiId, time: notifiTime });
        });
    }
  } else if (prop === 'endTime') {
    // startTimeのセルにタイマーIDがあれば確認をして削除
    const startTimeCol = hotInstance.propToCol('startTime');
    const notification = hotInstance.getCellMeta(row, startTimeCol).notification;
    if (notification && window.confirm('このタスクの終了予定時刻に設定されている通知がありますが、削除してもよろしいですか？')) {
      clearTimeout(notification.id);
      hotInstance.removeCellMeta(row, startTimeCol, 'notification');
    }
  }
};

export default {
  stretchH: 'all',
  comments: true,
  rowHeaders: true,
  autoInsertRow: false,
  manualRowMove: true,
  contextMenu: {
    items: {
      row_above: {
        name: '上に行を追加する',
        disabled() {
          return this.getSelected()[0] === 0;
        },
      },
      row_below: {
        name: '下に行を追加する',
      },
      hsep1: '---------',
      remove_row: {
        name: '行を削除する',
        disabled() {
          return this.getSelected()[0] === 0;
        },
      },
    },
  },
  colWidths: Math.round(960 / 9),
  columns,
  data,
  dataSchema,
  afterValidate(isValid, value, row, prop) {
    setValidtionMessage(this, row, prop, isValid);
  },
  afterBeginEditing(row, col) {
    setStartOrEndTime(this, row, this.colToProp(col));
  },
  afterChange(changes) {
    if (!changes) return;
    changes.forEach((change) => {
      const [row, prop, oldVal, newVal] = [change[0], change[1], change[2], change[3]];
      if (oldVal !== newVal) {
        calculateTask(this, row, prop);
        manageNotification(this, row, prop, newVal);
        setTimeout(() => this.render(), 0);
      }
    });
  },
};
