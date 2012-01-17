(function() {
  var Group, GroupSet, Item, ItemSet, getUrl, methodMap;
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; }, __hasProp = Object.prototype.hasOwnProperty, __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

  methodMap = {
    'create': 'POST',
    'update': 'PUT',
    'delete': 'DELETE',
    'read': 'GET'
  };

  getUrl = function(object) {
    if (!(object && object.url)) return null;
    if (_.isFunction(object.url)) {
      return object.url();
    } else {
      return object.url;
    }
  };

  Backbone.sync = function(method, model, options) {
    var params, type;
    type = methodMap[method];
    params = _.extend({
      type: type,
      dataType: 'json'
    }, options);
    if (!params.url) params.url = getUrl(model) || urlError();
    if (!params.data && model && (method === 'create' || method === 'update')) {
      params.contentType = 'application/json';
      params.data = JSON.stringify(model.toJSON());
    }
    if (params.type !== 'GET') params.processData = false;
    if (params.type === 'PUT' || params.type === 'DELETE') {
      if (model instanceof Item) {
        params.url += '/' + model.collection.group.get('edit_hash');
      } else if (model instanceof Group) {
        params.url += '/' + model.get('edit_hash');
      }
    }
    return $.ajax(params);
  };

  Group = (function() {

    __extends(Group, Backbone.Model);

    function Group() {
      this.clean = __bind(this.clean, this);
      this.fixOrdering = __bind(this.fixOrdering, this);
      this.parseItemSet = __bind(this.parseItemSet, this);
      Group.__super__.constructor.apply(this, arguments);
    }

    Group.prototype.urlRoot = '/api/group';

    Group.prototype.initialize = function(options) {
      if (options.editHash) {
        this.set({
          'edit_hash': options.editHash
        });
      }
      this.parseItemSet();
      return this.bind('change', this.parseItemSet);
    };

    Group.prototype.parseItemSet = function() {
      var id, item, items, ordered, _i, _j, _k, _len, _len2, _len3, _ref, _ref2, _ref3;
      if (!this.get('item_set')) return;
      items = {};
      _ref = this.get('item_set');
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        item = _ref[_i];
        items[item.id] = item;
      }
      ordered = [];
      _ref2 = this.get('ordering');
      for (_j = 0, _len2 = _ref2.length; _j < _len2; _j++) {
        id = _ref2[_j];
        ordered.push(items[id]);
        delete items[id];
      }
      _ref3 = _.values(items);
      for (_k = 0, _len3 = _ref3.length; _k < _len3; _k++) {
        item = _ref3[_k];
        ordered.push(item);
      }
      if (!this.itemSet) {
        this.itemSet = new ItemSet(ordered);
        this.itemSet.group = this;
        this.itemSet.bind('add', this.fixOrdering);
        this.itemSet.bind('remove', this.fixOrdering);
        this.itemSet.bind('change', this.clean);
        this.itemSet.bind('remove', this.clean);
      } else {
        this.itemSet.reset(ordered);
      }
      this.unset('item_set', {
        silent: true
      });
      return this.clean();
    };

    Group.prototype.fixOrdering = function() {
      var item;
      this.set({
        ordering: (function() {
          var _i, _len, _ref, _results;
          _ref = this.itemSet.models;
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            item = _ref[_i];
            _results.push(item.id);
          }
          return _results;
        }).call(this)
      }, {
        silent: true
      });
      return this.save(null, {
        silent: true
      });
    };

    Group.prototype.setOrdering = function(ordering) {
      var i;
      this.set({
        ordering: (function() {
          var _i, _len, _results;
          _results = [];
          for (_i = 0, _len = ordering.length; _i < _len; _i++) {
            i = ordering[_i];
            _results.push(parseInt(i));
          }
          return _results;
        })()
      }, {
        silent: true
      });
      return this.save(null);
    };

    Group.prototype.clean = function() {
      var lastIndex;
      lastIndex = this.itemSet.models.length - 1;
      if (lastIndex === -1 || !this.itemSet.models[lastIndex].isBlank()) {
        return this._createItem();
      }
    };

    Group.prototype._createItem = function(success) {
      return this.itemSet.create({
        group: this.get('key'),
        edit_hash: this.get('edit_hash')
      }, {
        success: success
      });
    };

    return Group;

  })();

  GroupSet = (function() {

    __extends(GroupSet, Backbone.Collection);

    function GroupSet() {
      GroupSet.__super__.constructor.apply(this, arguments);
    }

    GroupSet.prototype.model = Group;

    return GroupSet;

  })();

  Item = (function() {

    __extends(Item, Backbone.Model);

    function Item() {
      Item.__super__.constructor.apply(this, arguments);
    }

    Item.prototype.defaults = {
      title: '',
      url: '',
      comment: ''
    };

    Item.prototype.isBlank = function() {
      if (!this.get('title') && !this.get('url') && !this.get('comment')) {
        return true;
      }
      return false;
    };

    Item.prototype.getURL = function() {
      var url;
      url = this.get('url');
      if (url && url.search('//') === -1) url = 'http://' + url;
      return url;
    };

    return Item;

  })();

  ItemSet = (function() {

    __extends(ItemSet, Backbone.Collection);

    function ItemSet() {
      ItemSet.__super__.constructor.apply(this, arguments);
    }

    ItemSet.prototype.model = Item;

    ItemSet.prototype.url = '/api/item';

    return ItemSet;

  })();

  bn.models = {
    GroupSet: GroupSet,
    Group: Group
  };

}).call(this);
