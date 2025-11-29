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

describe('DownloadBoardController', 'controller:download-board', function() {
  it("should exist", function() {
    expect(this).not.toEqual(null);
    expect(this).not.toEqual(window);
  });
});
// import modal from '../utils/modal';
// import persistence from '../utils/persistence';
// import i18n from '../utils/i18n';
// import progress_tracker from '../utils/progress_tracker';
// 
// export default modal.ModalController.extend({
//   pdf_download: function() {
//     return this.get('type') == 'pdf';
//   }.property('type'),
//   obf_download: function() {
//     return this.get('type') == 'obf';
//   }.property('type'),
//   opening: function() {
//     if(persistence.get('online')) {
//       this.send('startDownload');
//     }
//   },
//   actions: {
//     startDownload: function(decision) {
//       if(decision || !this.get('has_links')) {
//         var type = this.get('type');
//         if(decision == 'all' && type == 'obf') { type = 'obz'; }
//         var download = persistence.ajax('/api/v1/boards/' + this.get('id') + '/download?type=' + type + '&include=' + decision, {type: 'POST'});
//         var _this = this;
//         this.set('progress', {
//           status: 'pending'
//         });
//         download.then(function(data) {
//           var track_id = progress_tracker.track(data.progress, function(progress) {
//             _this.set('progress', progress);
//           });
//           _this.set('track_id', track_id);
//         }, function() {
//           _this.set('progress', {
//             status: 'errored',
//             result: i18n.t("Download failed unexpectedly", 'board_download_failed')
//           });
//         });
//       }
//     },
//     close: function() {
//       progress_tracker.untrack(this.get('track_id'));
//       modal.close();
//     }
//   },
//   pending: function() {
//     return this.get('progress.status') == 'pending';
//   }.property('progress.status'),
//   started: function() {
//     return this.get('progress.status') == 'started';
//   }.property('progress.status'),
//   finished: function() {
//     return this.get('progress.status') == 'finished';
//   }.property('progress.status'),
//   errored: function() {
//     return this.get('progress.status') == 'errored';
//   }.property('progress.status'),
//   status_message: function() {
//     return progress_tracker.status_text(this.get('progress.status'), this.get('porgress.sub_status'));
//   }.property('progress.status', 'progress.sub_status'),
//   num_percent: function() {
//     return Math.round(100 * (this.get('progress.percent') || 0));
//   }.property('progress.percent'),
//   num_style: function() {
//     return "width: " + this.get('num_percent') + "%;";
//   }.property('num_percent'),
//   download_type: function() {
//     return this.get('type') != 'pdf';
//   }.property('type')
// });