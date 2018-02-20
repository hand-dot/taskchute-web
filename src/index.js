import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter } from 'react-router-dom';
import 'babel-polyfill';
import Reboot from 'material-ui/Reboot';
import { MuiThemeProvider } from 'material-ui/styles';
import 'font-awesome/css/font-awesome.min.css';
import App from './containers/App';
import registerServiceWorker from './registerServiceWorker';
import constants from './constants';
import theme from './assets/theme';

ReactDOM.render(
  <BrowserRouter>
    <MuiThemeProvider theme={theme}>
      <div style={{
        height: '100vh',
        backgroundColor: constants.brandColor.base.BLUE,
        backgroundImage: `linear-gradient(${constants.brandColor.light.BLUE}, ${constants.brandColor.base.BLUE})`,
        backgroundAttachment: 'fixed',
      }}
      >
        <Reboot />
        <App />
      </div>
    </MuiThemeProvider>
  </BrowserRouter>, document.getElementById('root'));
registerServiceWorker();
