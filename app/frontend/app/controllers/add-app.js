import modal from '../utils/modal';
import { computed } from '@ember/object';

export default modal.ModalController.extend({
  device: computed(function() {
    return {
      standalone: navigator.standalone,
      android: (navigator.userAgent.match(/android/i) && navigator.userAgent.match(/chrome/i)),
      ios: (navigator.userAgent.match(/mobile/i) && navigator.userAgent.match(/safari/i))
    };
  }),
  actions: {
    close: function() {
      modal.close();
    }
  }
});