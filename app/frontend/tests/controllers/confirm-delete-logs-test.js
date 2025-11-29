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

describe('ConfirmDeleteLogsController', 'controller:confirm-delete-logs', function() {
  it("should exist", function() {
    expect(this).not.toEqual(null);
    expect(this).not.toEqual(window);
  });
});
// import modal from '../utils/modal';
// import i18n from '../utils/i18n';
// import persistence from '../utils/persistence';
// 
// export default modal.ModalController.extend({
//   needs: 'application',
//   opening: function() {
//     var user = this.get('user');
//     this.set('model', {});
//     this.set('user', user);
//   },
//   actions: {
//     delete_logs: function() {
//       if(this.get('user_name') != this.get('user.user_name')) {
//         this.set('error', i18n.t('wrong_user_name', "User name isn't correct"));
//       } else {
//         var _this = this;
//         persistence.ajax('/api/v1/users/' + this.get('user_name') + '/flush/logs', {
//           type: 'POST',
//           data: {
//             id: this.get('id'),
//             user_name: this.get('user_name')
//           }
//         }).then(function(res) {
//           modal.close();
//           modal.success(i18n.t('logs_to_be_deleted', "Your logs will be deleted within approximately the next 24 hours."));
//         }, function() {
//           _this.set('error', i18n.t('delete_failed', "Log delete failed unexpectedly"));
//         });
//       }
//     }
//   }
// });