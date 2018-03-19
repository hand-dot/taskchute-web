import Raven from 'raven-js';
import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter, Route } from 'react-router-dom';
import 'babel-polyfill'; // TODO サポートブラウザを制限し削除したい。
import CssBaselines from 'material-ui/CssBaseline';
import { MuiThemeProvider } from 'material-ui/styles';
import 'font-awesome/css/font-awesome.min.css';
import ErrorBoundary from './containers/ErrorBoundary';
import App from './containers/App';
import WithTracker from './containers/WithTracker';
import registerServiceWorker from './registerServiceWorker';
import constants from './constants';
import theme from './assets/theme';


Raven.config(constants.SENTRY_URL, {
  release: constants.RELEASE,
  environment: process.env.NODE_ENV,
  shouldSendCallback: () => ['production', 'staging'].indexOf(process.env.NODE_ENV) !== -1,
}).install();

ReactDOM.render(
  <ErrorBoundary>
    <BrowserRouter>
      <MuiThemeProvider theme={theme}>
        <div style={{
          minHeight: '100vh',
          backgroundColor: constants.brandColor.base.BLUE,
          backgroundImage: `linear-gradient(${constants.brandColor.light.BLUE}, ${constants.brandColor.base.BLUE})`,
          backgroundAttachment: 'fixed',
        }}
        >
          <CssBaselines />
          <Route component={WithTracker(App, { /* additional attributes */ })} />
        </div>
      </MuiThemeProvider>
    </BrowserRouter>
  </ErrorBoundary>
  , document.getElementById('root'));
registerServiceWorker();
