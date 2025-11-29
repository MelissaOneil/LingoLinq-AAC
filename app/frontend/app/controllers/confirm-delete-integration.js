import modal from '../utils/modal';

export default modal.ModalController.extend({
  actions: {
    delete_integration: function() {
      var _this = this;
      var integration = this.get('model.integration');
      integration.deleteRecord();
      _this.set('model.deleting', true);
      integration.save().then(function(res) {
        modal.close({deleted: true});
      }, function() {
        _this.set('model.deleting', false);
        _this.set('model.error', true);
      });
    }
  }
});
