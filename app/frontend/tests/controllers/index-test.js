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

describe('IndexController', 'controller:index', function() {
  it("should exist", function() {
    expect(this).not.toEqual(null);
    expect(this).not.toEqual(window);
  });
});
// import Ember from 'ember';
// import persistence from '../utils/persistence';
// import capabilities from '../utils/capabilities';
// import app_state from '../utils/app_state';
// import modal from '../utils/modal';
// 
// export default Ember.ArrayController.extend({
//   needs: 'application',
//   sync_able: function() {
//     return this.get('extras.ready');
//   }.property('extras.ready'),
//   needs_sync: function() {
//     var now = (new Date()).getTime() / 1000;
//     return (now - persistence.get('last_sync_at')) > (7 * 24 * 60 * 60);
//   }.property('persistence.last_sync_at'),
//   triedToSave: false,
//   badEmail: function() {
//     var email = this.get('user.email');
//     return (this.get('triedToSave') && !email);
//   }.property('user.email', 'triedToSave'),
//   shortPassword: function() {
//     var password = this.get('user.password') || '';
//     return this.get('triedToSave') && password.length < 6;
//   }.property('user.password', 'triedToSave'),
//   noName: function() {
//     var name = this.get('user.name');
//     var user_name = this.get('user.user_name');
//     return this.get('triedToSave') && !name && !user_name;
//   }.property('user.name', 'user.user_name', 'triedToSave'),
//   blank_slate: function() {
//     var progress = this.get('app_state.currentUser.preferences.progress');
//     if(progress && progress.setup_done) {
//       return null;
//     } else {
//       return progress;
//     }
//   }.property('app_state.currentUser.preferences.progress'),
//   checkForBlankSlate: function() {
//     var _this = this;
//     if(Ember.testing) { return; }
//     persistence.find_recent('board').then(function(boards) {  
//       _this.set('recentOfflineBoards', boards);
//       if(_this.get('homeBoards') == [] && _this.get('popularBoards') == []) {
//         _this.set('showOffline', true);
//       } else if(!_this.get('persistence.online')) {
//         _this.set('showOffline', true);
//       } else {
//         _this.set('showOffline', false);
//       }
//     }, function() {
//       _this.set('showOffline', false);
//     });
//   }.observes('persistence.online'),
//   device: function() {
//     var res = {
//       added_somewhere: !!this.get('app_state.currentUser.preferences.progress.app_added'),
//       standalone: capabilities.browserless,
//       android: capabilities.system == "Android",
//       ios: capabilities.system == "iOS"
//     };
//     
//     res.needs_install_reminder = !res.added_somewhere || ((res.android || res.ios) && !res.standalone);
//     if(res.standalone && (res.android || res.ios)) {
//       res.needs_install_reminder = false;
//     }
//     return res;
//   }.property(),
//   actions: {
//     sync: function() {
//       if(!persistence.get('syncing')) {
//         persistence.sync('self');
//       }
//     },
//     intro_video: function() {
//       alert("not implemented yet...");
//       var user = app_state.get('currentUser');
//       user.set('preferences.progress.intro_watched', true);
//       user.save();
//     },
//     app_install: function() {
//       modal.open('add-app');
//     },
//     setup_done: function() {
//       var user = app_state.get('currentUser');
//       user.set('preferences.progress.setup_done', true);
//       user.save();
//     },
//     load_reports: function() {
//       var user = app_state.get('currentUser');
//       this.transitionToRoute('user.stats', user.get('user_name'));
//     }
//   }
// });
// 
