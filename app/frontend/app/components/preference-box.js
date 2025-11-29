import Component from '@ember/component';

export default Component.extend({
  actions: {
    toggle: function() {
      this.set('open', !this.get('open'));
    }
  }
});