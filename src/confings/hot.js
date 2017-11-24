import moment from 'moment';

const columns = [
  {
    title: '済',
    data: 'done',
    type: 'checkbox',
    colWidths: 30,
    readOnly: true,
    className: 'htCenter htMiddle',
  },
  {
    title: 'カテゴリ',
    data: 'category',
    type: 'text',
    colWidths: 100,
  },
  {
    title: 'タイトル',
    data: 'title',
    type: 'text',
  },
  {
    title: '見積(分)',
    data: 'estimate',
    type: 'numeric',
    colWidths: 60,
  },
  {
    title: '開始時刻',
    data: 'startTime',
    type: 'time',
    colWidths: 60,
    timeFormat: 'HH:mm',
    correctFormat: true,
  },
  {
    title: '終了時刻',
    data: 'endTime',
    type: 'time',
    colWidths: 60,
    timeFormat: 'HH:mm',
    correctFormat: true,
  },
  {
    title: '実績(分)',
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
    title: '備考',
    type: 'text',
  },
  {
    title: '感想',
    type: 'text',
  },
];

export default {
  stretchH: 'all',
  comments: true,
  rowHeaders: true,
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
  colWidths: Math.round(window.innerWidth / 9),
  columns,
  cell: [
    {
      row: 0,
      col: columns.findIndex(col => col.data === 'done'),
      comment: { value: '終了時刻を記入後、自動入力されます。' },
    },
    {
      row: 0,
      col: columns.findIndex(col => col.data === 'actually'),
      comment: { value: '終了時刻を記入後、自動入力されます。' },
    },
  ],
  afterValidate(isValid, value, row, prop) {
    const commentsPlugin = this.getPlugin('comments');
    const col = this.propToCol(prop);
    if (isValid) {
      commentsPlugin.removeCommentAtCell(row, col);
    } else {
      let comment = '';
      if (prop === 'estimate') {
        comment = '半角数値で入力してください';
      } else if (prop === 'startTime' || prop === 'endTime') {
        comment = '半角数値,カンマ区切りで有効な時刻を入力してください';
      }
      commentsPlugin.setCommentAtCell(row, col, comment);
      commentsPlugin.showAtCell(row, col);
    }
  },
  afterBeginEditing(row, col) {
    const prop = this.colToProp(col);
    const data = this.getDataAtCell(row, col);
    if (prop === 'endTime' &&
      (data === null || data === '')) {
      // 編集を始めたセルが終了時刻かつ、セルが空の場合
      const startTimeVal = this.getDataAtRowProp(row, 'startTime');
      if (startTimeVal === null || startTimeVal === '') {
        // 開始時刻が入力されていない場合開始時間を入力させる
        alert('開始時刻を入力してください');
        this.selectCell(row, this.propToCol('startTime'));
      } else {
        // 現在時刻を入力する
        this.setDataAtCell(row, col, moment().format('HH:mm'));
      }
    }
  },
  afterChange(changes) {
    if (!changes) return;
    changes.forEach((change) => {
      const [row, prop, newVal] = [change[0], change[1], change[3]];
      const col = this.propToCol(prop);
      if (prop === 'startTime' || prop === 'endTime') {
        // 変更したセルが開始時刻 or 終了時刻の場合、実績を自動入力し、済をチェックする処理
        const startTimeVal = this.getDataAtRowProp(row, 'startTime');
        const endTimeVal = this.getDataAtRowProp(row, 'endTime');
        if (startTimeVal === null || endTimeVal === null || startTimeVal === '' || endTimeVal === '') {
          // 入力値が空の場合、実績を空にし、済のチェックをはずす
          this.setDataAtRowProp(row, 'done', false);
          this.setDataAtRowProp(row, 'actually', '');
        } else if (startTimeVal.indexOf(':') !== -1 && endTimeVal.indexOf(':') !== -1) {
          // 実績を入力し、済をチェックする処理の開始
          const [startTimeHour, startTimeMinute] = startTimeVal.split(':');
          const [endTimeHour, endTimeMinute] = endTimeVal.split(':');
          // 入力値のチェック
          if (!Number.isInteger(+startTimeHour) && !Number.isInteger(+startTimeMinute) &&
          !Number.isInteger(+endTimeHour) && !Number.isInteger(+endTimeMinute)) return;
          // 開始時刻、終了時刻が有効な値の場合
          const startTime = moment().hour(startTimeHour).minute(startTimeMinute);
          const endTime = moment().hour(endTimeHour).minute(endTimeMinute);
          const diff = endTime.diff(startTime, 'minutes');
          const commentsPlugin = this.getPlugin('comments');
          if (!isNaN(diff) && Math.sign(diff) !== -1) {
            // 実績を入力し、済をチェックする
            this.setDataAtRowProp(row, 'actually', diff);
            this.setDataAtRowProp(row, 'done', true);
            // ヴァリデーションエラーを消す処理
            const targetCellMeta = this.getCellMeta(row, this.propToCol(prop === 'startTime' ? 'endTime' : 'startTime'));
            if (!targetCellMeta.valid) {
              targetCellMeta.valid = true;
              commentsPlugin.removeCommentAtCell(targetCellMeta.row, targetCellMeta.col);
            }
          } else {
            // 開始時刻と終了時刻の関係がおかしい
            // 実績、済をクリアする
            this.setDataAtRowProp(row, 'actually', '');
            this.setDataAtRowProp(row, 'done', false);
            // ヴァリデーションエラーを追加する処理
            const cellMeta = this.getCellMeta(row, col);
            if (cellMeta.valid) {
              cellMeta.valid = false;
              commentsPlugin.setCommentAtCell(row, col, '開始時刻に対して終了時刻が不正です。');
              commentsPlugin.showAtCell(row, col);
            }
          }
        }
      } else if (prop === 'estimate' || prop === 'actually') {
        // 変更したセルが見積 or 実績の場合、実績のメタ情報を変更する処理
        // 見積もりに対して実績がオーバーしていれば編集したセルにoverdueという属性をtrueにする
        // 見積もりに対して実績がむしろマイナスだった場合はoverdueをfalseにする
        const estimateVal = this.getDataAtRowProp(row, 'estimate');
        const actuallyVal = this.getDataAtRowProp(row, 'actually');
        if (estimateVal === null || estimateVal === '' || actuallyVal === null || actuallyVal === '') return;
        if (!Number.isInteger(+estimateVal) && !Number.isInteger(+actuallyVal)) return;
        const overdue = Math.sign(actuallyVal - estimateVal);
        const cellMeta = this.getCellMeta(row, this.propToCol('actually'));
        if (overdue === 1) {
          cellMeta.overdue = true;
        } else if (overdue === -1) {
          cellMeta.overdue = false;
        } else {
          cellMeta.overdue = undefined;
        }
        this.render();
      }
    });
  },
};
