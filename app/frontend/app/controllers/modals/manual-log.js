import modal from '../../utils/modal';

export default modal.ModalController.extend({
  opening: function() {
    this.set('words', null);
    this.set('date', window.moment().toISOString().substring(0, 10));
    this.set('time', '');
  },
  actions: {
    submit: function() {
      var text = this.get('words');
      var date = window.moment(this.get('date') + ' ' + this.get('time'))._d;
      modal.close({
        words: text,
        date: date
      });
    }
  }
});
