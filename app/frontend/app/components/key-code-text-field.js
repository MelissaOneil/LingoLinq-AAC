import Component from '@ember/component';
import $ from 'jquery';
import { observer } from '@ember/object';

export default Component.extend({
  tagName: 'input',
  type: 'text',
  attributeBindings: ['placeholder'],
  didInsertElement: function() {
    this.update_placeholder();
  },
  update_placeholder: observer('value', function() {
    if($(this.element)) {
      if(this.get('value')) {
        $(this.element).attr('placeholder', '##');
        $(this.element).attr('value', this.get('value'));
      } else {
        $(this.element).attr('placeholder', '');
      }
    }
  }),
  keyDown: function(event) {
    if(this.get('value') == '9' && event.keyCode == 9) {
      // double-tab to escape text entry lockage
      return;
    } else if(this.get('value') == 'Escape' && event.code == 'Escape') {
      return;
    }
    $(this.element).val(event.code || event.keyCode);
    event.preventDefault();
    this.set('value', event.code || event.keyCode);
  }
});
