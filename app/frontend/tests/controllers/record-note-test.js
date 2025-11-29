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

describe('RecordNoteController', 'controller:record-note', function() {
  it("should exist", function() {
    expect(this).not.toEqual(null);
    expect(this).not.toEqual(window);
  });
});
// import modal from '../utils/modal';
// 
// export default modal.ModalController.extend({
//   needs: 'user',
//   text_note: function() {
//     return this.get('note_type') == 'text';
//   }.property('note_type'),
//   video_note: function() {
//     return this.get('note_type') == 'video';
//   }.property('note_type'),
//   opening: function() {
//     var type = this.get('type');
//     this.set('model', this.get('controllers.user').get('model'));
//     this.set('note_type', type);
//     this.set('notify', true);
//   },
//   actions: {
//     saveNote: function() {
//       var log = this.store.createRecord('log', {
//         note: {
//           text: this.get('note')
//         },
//         notify: this.get('notify')
//       });
//       var _this = this;
//       log.save().then(function() {
//         modal.close(true);
//       });
//     }
//   }
// });