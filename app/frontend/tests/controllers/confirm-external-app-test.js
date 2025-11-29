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

describe('ConfirmExternalAppController', 'controller:confirm-external-app', function() {
  it("should exist", function() {
    expect(this).not.toEqual(null);
    expect(this).not.toEqual(window);
  });
});
// import modal from '../utils/modal';
// import capabilities from '../utils/capabilities';
// 
// export default modal.ModalController.extend({
//   needs: 'application',
//   app: function() {
//     var apps = this.get('apps') || {};
//     if(capabilities.system == 'iOS' && apps.ios && apps.ios.launch_url) {
//       return apps.ios.name || apps.ios.launch_url;
//     } else if(capabilities.system == 'Android' && apps.android && apps.android.launch_url) {
//       return apps.android.name || apps.android.launch_url;
//     } else if(apps.web && apps.web.launch_url) {
//       return apps.web.launch_url;
//     } else {
//       return "Unknown resource";
//     }
//   }.property('apps'),
//   actions: {
//     open_link: function() {
//       modal.close();
//       var apps = this.get('apps') || {};
//       if(capabilities.system == 'iOS' && apps.ios && apps.ios.launch_url) {
//         window.open(apps.ios.launch_url, '_blank');
//       } else if(capabilities.system == 'Android' && apps.android && apps.android.launch_url) {
//         window.open(apps.android.launch_url, '_blank');
//       } else if(apps.web && apps.web.launch_url) {
//         window.open(apps.web.launch_url, '_blank');
//       } else {
//         // TODO: handle this edge case smartly I guess
//       }
//     }
//   }
// });