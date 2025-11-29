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

describe('SpeakModePinController', 'controller:speak-mode-pin', function() {
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
//   compare_pin: function() {
//     var pin = this.get('pin');
//     if(pin == this.get('actual_pin')) {
//       modal.close();
//       app_state.toggle_speak_mode('off');
//       if(this.get('action') == 'edit') {
//         app_state.toggle_edit_mode();
//       }
//     } else if(pin && pin.length >= 4) {
//       // error message
//       this.set('invalid_pin', true);
//       this.set('pin', '');
//     }
//   }.observes('pin'),
//   actions: {
//     add_digit: function(digit) {
//       var pin = this.get('pin') || "";
//       pin = pin + digit.toString();
//       this.set('pin', pin);
//     },
//     reveal_pin: function() {
//       this.set('show_pin', true);
//     }
//   }
// });