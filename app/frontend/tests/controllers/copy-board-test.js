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

describe('CopyBoardController', 'controller:copy-board', function() {
  it("should exist", function() {
    expect(this).not.toEqual(null);
    expect(this).not.toEqual(window);
  });
});
// import modal from '../utils/modal';
// 
// export default modal.ModalController.extend({
//   opening: function() {
//     var settings = modal.settings_for['copy-board'];
//     this.set('model', {});
//     this.set('board_key', settings.board_key);
//   }
// });