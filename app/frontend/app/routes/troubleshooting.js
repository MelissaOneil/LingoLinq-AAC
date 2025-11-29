import Route from '@ember/routing/route';

export default Route.extend({
  setupController: function(controller) {
    controller.set('results', null);
    controller.set('load_stamp', (new Date()).getTime());
    controller.set('errors', null);
  }
});
