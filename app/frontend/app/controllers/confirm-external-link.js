import modal from '../utils/modal';
import capabilities from '../utils/capabilities';
import { computed } from '@ember/object';

export default modal.ModalController.extend({
  non_https: computed('model.url', function() {
    return (this.get('model.url') || '').match(/^http:/);
  }),
  actions: {
    open_link: function() {
      modal.close({open: true});
    }
  }
});
