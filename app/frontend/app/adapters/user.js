import ApplicationAdapter from './application';

export default ApplicationAdapter.extend({
  queryRecord(store, type, query) {
    if (query && query.id === 'self') {
      var data = {};
      Object.keys(query).forEach(function(key) {
        if (key !== 'id') {
          data[key] = query[key];
        }
      });

      var url = this.buildURL(type.modelName, 'self', null, 'findRecord');
      return this.ajax(url, 'GET', { data: data });
    }

    return this._super(...arguments);
  },

  findRecord(store, type, id, snapshot) {
    if (id === 'self') {
      // Route self lookups through queryRecord to avoid id-mismatch warnings.
      return this.queryRecord(store, type, { id: id });
    }

    return this._super(store, type, id, snapshot);
  }
});
