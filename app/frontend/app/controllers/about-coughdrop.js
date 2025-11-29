import modal from '../utils/modal';

export default modal.ModalController.extend({
  actions: {
    close: function() {
      modal.close();
    }
  }
});
