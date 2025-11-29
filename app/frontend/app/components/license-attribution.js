import Component from '@ember/component';
import { computed } from '@ember/object';

export default Component.extend({
  tagName: 'span',
  protected_license: computed('license.protected', function() {
    return this.get('license.protected');
  }),
  private_license: computed('license.type', function() {
    return this.get('license.type') == 'private';
  })
});
