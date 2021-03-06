import { firebase } from '@firebase/app';
import '@firebase/database';
import '@firebase/messaging';
import '@firebase/auth';
import '@firebase/storage';
import moment from 'moment';
import uuid from 'uuid';
import fastclone from 'fast-clone';
import { deepEqual } from 'fast-equals';
import UAParser from 'ua-parser-js';
import wkn from 'wkn';
import constants from '../constants';
import firebaseConf from '../configs/firebase';

const parser = new UAParser();
const browserName = parser.getBrowser().name;
const osName = parser.getOS().name;
const deviceType = parser.getDevice().type;

let database;
let auth;
let messaging;
let storage;
if (process.env.NODE_ENV !== 'test') {
  firebase.initializeApp(firebaseConf);
  database = firebase.database();
  auth = firebase.auth();
  if (constants.SUPPORTEDBROWSERS.indexOf(browserName) >= 0 && osName !== 'iOS') { // safari,iosではエラーになるため
    messaging = firebase.messaging();
  }
  storage = firebase.storage();
}

export default {
  /**
   * firebaseのdatabaseを返します。
   */
  getDatabase() {
    return database;
  },
  /**
   * firebaseのauthを返します。
   */
  getAuth() {
    return auth;
  },
  /**
   * firebaseのmessagingを返します。
   * iOS端末の場合はundefinedが返ってきます。
   */
  getMessaging() {
    return messaging;
  },
  /**
   * firebaseのstorageを返します。
   */
  getStorage() {
    return storage;
  },
  /**
   * constants.DATEFMT形式の文字列が今日か判断します。
   * @param  {String} constants.DATEFMT形式の文字列
   */
  isToday(date) {
    return moment(date, constants.DATEFMT).isSame(new Date(), 'day');
  },
  /**
   * HH:mm形式の文字列の2つの差分を分で求めます。
   * @param  {String} startTimeVal HH:mm形式の文字列
   * @param  {String} endTimeVal HH:mm形式の文字列
   */
  getTimeDiffMinute(startTimeVal = '00:00', endTimeVal = '00:00') {
    if (startTimeVal === '' || endTimeVal === '') return 0;
    const [startTimeHour, startTimeMinute] = startTimeVal.split(':');
    const [endTimeHour, endTimeMinute] = endTimeVal.split(':');
    if (Number.isInteger(+startTimeHour) && Number.isInteger(+startTimeMinute)
      && Number.isInteger(+endTimeHour) && Number.isInteger(+endTimeMinute)) {
      const end = `${endTimeHour}:${endTimeMinute}`;
      const start = `${startTimeHour}:${startTimeMinute}`;
      return moment(end, constants.TIMEFMT).diff(moment(start, constants.TIMEFMT), 'minutes');
    }
    return 0;
  },
  /**
   * HH:mm:ss形式の文字列の2つの差分を秒で求めます。
   * @param  {String} startTimeVal HH:mm:ss形式の文字列
   * @param  {String} endTimeVal HH:mm:ss形式の文字列
   */
  getTimeDiffSec(startTimeVal = '00:00:00', endTimeVal = '00:00:00') {
    if (startTimeVal === '' || endTimeVal === '') return 0;
    const [startTimeHour, startTimeMinute, startTimeSec] = startTimeVal.split(':');
    const [endTimeHour, endTimeMinute, endTimeSec] = endTimeVal.split(':');
    if (Number.isInteger(+startTimeHour)
     && Number.isInteger(+startTimeMinute) && Number.isInteger(+startTimeSec)
      && Number.isInteger(+endTimeHour)
      && Number.isInteger(+endTimeMinute) && Number.isInteger(+endTimeSec)) {
      const end = `${endTimeHour}:${endTimeMinute}:${endTimeSec}`;
      const start = `${startTimeHour}:${startTimeMinute}:${startTimeSec}`;
      return moment(end, 'HH:mm:ss').diff(moment(start, 'HH:mm:ss'), 'seconds');
    }
    return 0;
  },
  /**
   * ディープコピーを行います。
   * @param  {Object} obj オブジェクト
   */
  cloneDeep(obj) {
    return fastclone(obj);
  },
  /**
   * オブジェクトの比較を行います。
   * @param  {Object} a オブジェクト a
   * @param  {Object} b オブジェクト a
  */
  equal(a, b) {
    return deepEqual(a, b);
  },

  /**
   * Dateオブジェクトから何週目の何曜日という情報を持ったオブジェクトを返します。
   * @param  {Date} date
   */
  getDayAndCount(date) {
    return { day: date.getDay(), count: Math.floor((date.getDate() - 1) / 7) + 1 };
  },
  /**
   * 文字列からワーカーを実行し、promiseを返します。
   * @param  {String} script スクリプト
   * @param  {Array} data ワーカーに処理させるデータ
   */
  runWorker(func, arg) {
    return wkn(func, arg);
  },

  /**
   * 引き数のオブジェクトにIDが存在しない場合、設定します。
   * @param  {Object} obj オブジェクト
   */
  setIdIfNotExist(obj) {
    return obj.id ? obj : Object.assign(obj, { id: uuid() });
  },
  /**
   * サポートブラウザーならtrueを返します。
   */
  isSupportBrowser() {
    return constants.SUPPORTEDBROWSERS.indexOf(browserName) >= 0;
  },
  /**
   * モバイルならtrueを返します。
   */
  isMobile() {
    return deviceType === 'mobile';
  },
  /**
   * iOSならtrueを返します。
   */
  isiOS() {
    return osName === 'iOS';
  },
  /**
   * 引き数の値がemailとして正しいかチェックする
   * @param  {String} email
   */
  validateEmail(email) {
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
  },
  /**
   * リアルタイムデータベースのキーとして正しい値か検証します。
     * @param  {String} key
   */
  validateDatabaseKey(key) {
    // Paths must be non-empty strings and can't contain ".", "#", "$", "[", or "]"
    if (key.indexOf(' ') !== -1
      || key.indexOf('/') !== -1
      || key.indexOf('.') !== -1
      || key.indexOf('#') !== -1
      || key.indexOf('[') !== -1
      || key.indexOf(']') !== -1
    ) {
      return false;
    }
    return true;
  },
  /**
   * メールを送信します。
   * @param  {String} {to 宛先
   * @param  {String} from 送り元
   * @param  {String} subject 題名
   * @param  {String} body} 本文
   */
  sendEmail({
    to, from, subject, body,
  }) {
    return fetch(
      `https://us-central1-taskontable.cloudfunctions.net/sendgridEmail?sg_key=${constants.SENDGRID_API_KEY}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json; charset=utf-8' },
        mode: 'no-cors',
        body: JSON.stringify({
          to, from, subject, body,
        }),
      },
    );
  },
  /**
   * CloudMessagingを使って通知を送信します。
   * @param  {String} {title 題名
   * @param  {String} body 本文
   * @param  {String} url クリック後のURL
   * @param  {String} icon} アイコン
   * @param  {String} to} 送り相手のトークン
   */
  sendNotification({
    title, body, url, icon, to,
  }) {
    return fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: { 'content-type': 'application/json; charset=utf-8', Authorization: `key=${constants.FCM_KEY}` },
      body: JSON.stringify({
        data: {
          title, body, url, icon,
        },
        to,
      }),
    });
  },
  /**
   * URLSearchParamsから指定した値を取り出します。
   * @param  {String} variable
   */
  getQueryVariable(variable) {
    const query = window.location.search.substring(1);
    const vars = query.split('&');
    for (let i = 0; i < vars.length; i += 1) {
      const pair = vars[i].split('=');
      if (decodeURIComponent(pair[0]) === variable) {
        return decodeURIComponent(pair[1]);
      }
    }
    return '';
  },

  /**
   * 任意のテキストをクリップボードにコピーする
   * @param  {String} textVal
   */
  copyTextToClipboard(textVal) {
    const copyFrom = document.createElement('textarea');
    copyFrom.textContent = textVal;
    const bodyElm = document.getElementsByTagName('body')[0];
    bodyElm.appendChild(copyFrom);
    copyFrom.select();
    const retVal = document.execCommand('copy');
    bodyElm.removeChild(copyFrom);
    return retVal;
  },

  /**
   * 自然数かチェックします。
   * @param  {String} numVal
   */
  isNaturalNumber(numVal) {
    if (!numVal) return false;
    // チェック条件パターン
    const pattern = /^([1-9]\d*)$/;
    // 数値チェック
    return pattern.test(numVal.toString());
  },

  /**
   * URL用の文字列にフォーマットします。
   * @param  {String} str
   */
  formatURLString(str) {
    return encodeURI((str || '').toLowerCase());
  },
};
