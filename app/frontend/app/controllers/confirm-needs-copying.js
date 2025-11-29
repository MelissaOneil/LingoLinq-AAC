import modal from '../utils/modal';
import app_state from '../utils/app_state';

export default modal.ModalController.extend({
  opening: function() {
    this.set('model', this.get('model.board'));
  },
  actions: {
    confirm: function() {
      modal.close('confirm');
    }
  }
});
