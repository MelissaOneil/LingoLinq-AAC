'use strict';
const replace = require('broccoli-replace');

module.exports = {
    name: 'temporary-ember-fix',
    postprocessTree(type, tree) {
        if (type !== 'all') {
            return tree;
        }

        return replace(tree, {
            files: ['**/vendor*.js'],
            patterns: [{
                match: /const\s/g,
                replacement: 'var '
            }]
        });
    },

    isDevelopingAddon() {
        return true;
    }
};