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

describe('ConfirmEditBoardController', 'controller:confirm-edit-board', function() {
  it("should exist", function() {
    expect(this).not.toEqual(null);
    expect(this).not.toEqual(window);
  });
});
// import modal from '../utils/modal';
// import app_state from '../utils/app_state';
// 
// export default modal.ModalController.extend({
//   needs: 'application',
//   opening: function() {
//     this.set('model', this.get('board'));
//   },
//   actions: {
//     tweakBoard: function() {
//       modal.close();
//       this.get('controllers.application').send('tweakBoard');
//     },
//     editBoard: function() {
//       modal.close();
//       app_state.toggle_edit_mode(true);
//     }
//   }
// });
