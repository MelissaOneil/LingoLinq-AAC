import DS from "ember-data";
import persistence from '../utils/persistence';

var res = DS.RESTAdapter.extend({
  namespace: 'api/v1'
}, persistence.DSExtend);

export default res;
