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

describe('DeviceSettingsController', 'controller:device-settings', function() {
  it("should exist", function() {
    expect(this).not.toEqual(null);
    expect(this).not.toEqual(window);
  });
});
// import modal from '../utils/modal';
// 
// export default modal.ModalController.extend({
//   actions: {
//     remove_device: function(id) {
//       var user = this.get('model');
//       user.remove_device(id);
//     },
//     rename_device: function(id) {
//       var list = [];
//       this.get('devices').forEach(function(d) {
//         d.renaming = false;
//         if(d.new_name) {
//           d.name = d.new_name;
//         }
//         if(d.id == id) {
//           d.renaming = true;
//           d.new_name = d.name;
//         }
//         list.push(d);
//       });
//       this.set('devices', list);
//     },
//     update_device: function() {
//       var device = (this.get('devices') || []).findBy('renaming', true);
//       if(device) {
//         var user = this.get('model');
//         user.rename_device(device.id, device.new_name);
//         this.send('rename_device', null);
//       }
//     }
//   }
// });
