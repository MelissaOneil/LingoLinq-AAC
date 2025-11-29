import modal from '../utils/modal';
import app_state from '../utils/app_state';

export default modal.ModalController.extend({
  opening: function() {
    if(app_state.get('currentUser.user_name') == 'edi') {
      this.set('show_reason');
    }
  },
  actions: {
    close: function() {
      modal.close(!this.get('model.cancel_on_close'));
    }
  }
});
