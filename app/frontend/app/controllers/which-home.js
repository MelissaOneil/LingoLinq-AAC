import modal from '../utils/modal';
import app_state from '../utils/app_state';

export default modal.ModalController.extend({
  actions: {
    toggleSpeakMode: function(decision) {
      app_state.toggle_speak_mode(decision);
    }
  }  
});
