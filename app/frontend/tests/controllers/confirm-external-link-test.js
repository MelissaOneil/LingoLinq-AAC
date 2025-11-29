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

describe('ConfirmExternalLinkController', 'controller:confirm-external-link', function() {
  it("should exist", function() {
    expect(this).not.toEqual(null);
    expect(this).not.toEqual(window);
  });
});
// import modal from '../utils/modal';
// 
// export default modal.ModalController.extend({
//   needs: 'application',
//   actions: {
//     open_link: function() {
//       modal.close();
//       window.open(this.get('url'), '_blank');
//     }
//   }
// });