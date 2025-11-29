import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  waitsFor,
  runs,
  stub
} from 'frontend/tests/helpers/jasmine';
import { queryLog } from 'frontend/tests/helpers/ember_helper';

describe('ForgotPasswordController', 'controller:forgot-password', function() {
  it("should exist", function() {
    expect(this).not.toEqual(null);
    expect(this).not.toEqual(window);
  });
});
// import Ember from 'ember';
// import persistence from '../utils/persistence';
// import i18n from '../utils/i18n';
// 
// export default Ember.Controller.extend({
//   title: "Forgot Password",
//   actions: {
//     submitKey: function() {
//       var name = this.get('name');
//       var _this = this;
//       persistence.ajax('/api/v1/forgot_password', {
//         type: 'POST',
//         data: {key: name}
//       }).then(function(data) {
//         _this.set('response', data);
//       }, function(xhr, message) {
//         if(message && message.error == 'not online') {
//           _this.set('response', {message: i18n.t('not_online', "Email not sent, please check your internet connection.")});
//         } else if(xhr && xhr.responseJSON) {
//           _this.set('response', xhr.responseJSON);
//         } else {
//           _this.set('response', {message: i18n.t('email_not_sent', "Email not sent, there was an unexpected error.")});
//         }
//       });
//     }
//   }
// });