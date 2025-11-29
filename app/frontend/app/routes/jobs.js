import Route from '@ember/routing/route';
import app_state from '../utils/app_state';

export default Route.extend({
  setupController: function(controller, model) {
    if(!app_state.get('domain_settings.full_domain')) {
      app_state.return_to_index();
      return;
    }
  },
  activate: function() {
    this._super();
    window.scrollTo(0, 0);
  }
});
