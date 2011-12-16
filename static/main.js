(function() {
  var App, Group, GroupEdit, Index, Item, ItemSet, Router, jsonRPC;
  var __hasProp = Object.prototype.hasOwnProperty, __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; }, __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  jsonRPC = function(funcName, data, success) {
    var onSuccess;
    onSuccess = function(data) {
      return success(JSON.parse(data));
    };
    return $.ajax({
      url: '/api/rpc/' + funcName,
      type: 'post',
      contentType: 'application/json',
      data: JSON.stringify(data),
      success: onSuccess
    });
  };

  Group = (function() {

    __extends(Group, Backbone.Model);

    function Group() {
      Group.__super__.constructor.apply(this, arguments);
    }

    Group.prototype.urlRoot = '/api/group';

    Group.prototype.parse = function(data) {
      var _this = this;
      this.itemSet = new ItemSet(data.item_set);
      this.itemSet.each(function(item) {
        return item.set({
          'group': data['key']
        });
      });
      delete data.item_set;
      this.itemSet.bind('change', function() {
        return _this.change();
      });
      this.itemSet.bind('add', function() {
        return _this.change();
      });
      this.itemSet.bind('remove', function() {
        return _this.change();
      });
      return Group.__super__.parse.call(this, data);
    };

    Group.prototype.setEditHash = function(editHash) {
      var _this = this;
      this.set({
        edit_hash: editHash
      });
      return this.itemSet.each(function(item) {
        return item.set({
          'edit_hash': editHash
        });
      });
    };

    return Group;

  })();

  Item = (function() {

    __extends(Item, Backbone.Model);

    function Item() {
      Item.__super__.constructor.apply(this, arguments);
    }

    Item.prototype.defaults = {
      title: '',
      url: ''
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

  Index = (function() {

    __extends(Index, Backbone.View);

    function Index() {
      Index.__super__.constructor.apply(this, arguments);
    }

    Index.prototype.initialize = function() {
      return this.render();
    };

    Index.prototype.render = function() {
      return $(this.el).html(ich.tpl_index());
    };

    Index.prototype.events = {
      'click #create': 'submit'
    };

    Index.prototype.submit = function() {
      var group;
      group = new Group({
        name: $('#group_name').val()
      });
      return group.save(null, {
        success: function() {
          return window.app.groupEdit(group);
        }
      });
    };

    return Index;

  })();

  GroupEdit = (function() {

    __extends(GroupEdit, Backbone.View);

    function GroupEdit() {
      this.render = __bind(this.render, this);
      GroupEdit.__super__.constructor.apply(this, arguments);
    }

    GroupEdit.prototype.initialize = function(options) {
      var _this = this;
      jsonRPC('group_edit_check', {
        'edit_hash': this.model.get('edit_hash'),
        'id': this.model.id
      }, function(data) {
        if (data) {
          return _this.render();
        } else {
          return _this.renderDenied();
        }
      });
      return this.model.bind('change', this.render);
    };

    GroupEdit.prototype.render = function() {
      $(this.el).html(ich.tpl_groupedit(this.model.toJSON()));
      return this.model.itemSet.each(function(item) {
        return this.$('#items').append(new Item({
          model: item
        }).el);
      });
    };

    GroupEdit.prototype.renderDenied = function() {
      return $(this.el).html(ich.tpl_groupeditDenied());
    };

    GroupEdit.prototype.events = {
      'click #add_item': 'addItem'
    };

    GroupEdit.prototype.addItem = function() {
      return this.model.itemSet.create({
        group: this.model.get('key'),
        edit_hash: this.model.get('edit_hash')
      });
    };

    return GroupEdit;

  })();

  Item = (function() {

    __extends(Item, Backbone.View);

    function Item() {
      Item.__super__.constructor.apply(this, arguments);
    }

    Item.prototype.tagName = 'li';

    Item.prototype.initialize = function() {
      return this.render();
    };

    Item.prototype.render = function() {
      return $(this.el).html(ich.tpl_itemview(this.model.toJSON()));
    };

    Item.prototype.events = {
      'click .delete': 'delete'
    };

    Item.prototype["delete"] = function() {
      return this.model.destroy({
        data: JSON.stringify(this.model.toJSON())
      });
    };

    return Item;

  })();

  Router = (function() {

    __extends(Router, Backbone.Router);

    function Router() {
      Router.__super__.constructor.apply(this, arguments);
    }

    Router.prototype.routes = {
      '': 'index',
      'group_edit/:group_id/:edit_hash': 'groupEdit'
    };

    Router.prototype.index = function() {
      return window.app.index();
    };

    Router.prototype.groupEdit = function(groupID, editHash) {
      var group;
      group = new Group({
        'id': groupID
      });
      return group.fetch({
        success: function() {
          group.setEditHash(editHash);
          group.set({
            'edit_hash': editHash
          });
          return window.app.groupEdit(group);
        }
      });
    };

    return Router;

  })();

  App = (function() {

    __extends(App, Backbone.Router);

    function App() {
      App.__super__.constructor.apply(this, arguments);
    }

    App.prototype.initialize = function() {
      this.homeEl = $('#home');
      this.homeContentEl = $('#content');
      this.tocEl = $('#table_of_contents');
      return this.otherPageEl = $('#other_page');
    };

    App.prototype.index = function() {
      this.showHome();
      window.router.navigate('/');
      return this.view = new Index({
        el: this.homeContentEl
      });
    };

    App.prototype.groupEdit = function(group) {
      this.showHome();
      window.router.navigate('/group_edit/' + group.id + '/' + group.get('edit_hash'));
      return this.view = new GroupEdit({
        el: this.homeContentEl,
        model: group
      });
    };

    App.prototype.showHome = function() {
      this.homeEl.removeClass('hide');
      this.tocEl.addClass('hide');
      return this.otherPageEl.addClass('hide');
    };

    App.prototype.showOther = function() {
      this.homeEl.addClass('hide');
      this.tocEl.removeClass('hide');
      return this.otherPageEl.removeClass('hide');
    };

    return App;

  })();

  $(document).ready(function() {
    window.app = new App();
    window.router = new Router();
    return Backbone.history.start({
      pushState: true
    });
  });

}).call(this);
