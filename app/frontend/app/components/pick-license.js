import Component from '@ember/component';
import app_state from '../utils/app_state';
import { computed } from '@ember/object';

export default Component.extend({
  tagName: 'span',
  licenseOptions: computed(function() {
    return app_state.get('licenseOptions');
  }),
  private_license: computed('license.type', function() {
    return this.get('license.type') == 'private';
  })
});
