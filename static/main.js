(function() {
  var App, EditableField, Group, GroupEdit, GroupView, Index, Item, ItemEdit, ItemSet, ItemView, Router, jsonRPC;
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
      'click #create': 'submit',
      'keydown #group_name': 'submit'
    };

    Index.prototype.submit = function(e) {
      var group;
      if (e.type === 'keydown' && e.keyCode !== 13) return;
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
      var context;
      context = this.model.toJSON();
      context.view_link = '/group_view/' + this.model.id;
      $(this.el).html(ich.tpl_groupedit(context));
      return this.model.itemSet.each(function(item) {
        return this.$('#items').append(new ItemEdit({
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

  ItemEdit = (function() {

    __extends(ItemEdit, Backbone.View);

    function ItemEdit() {
      this.changeURL = __bind(this.changeURL, this);
      this.changeTitle = __bind(this.changeTitle, this);
      ItemEdit.__super__.constructor.apply(this, arguments);
    }

    ItemEdit.prototype.tagName = 'tr';

    ItemEdit.prototype.initialize = function() {
      return this.render();
    };

    ItemEdit.prototype.render = function() {
      $(this.el).html(ich.tpl_itemedit(this.model.toJSON()));
      this.titleField = new EditableField({
        el: this.$('.title'),
        val: this.model.get('title')
      });
      this.titleField.bind('change', this.changeTitle);
      this.urlField = new EditableField({
        el: this.$('.url'),
        val: this.model.get('url')
      });
      return this.urlField.bind('change', this.changeURL);
    };

    ItemEdit.prototype.events = {
      'click .delete': 'delete'
    };

    ItemEdit.prototype["delete"] = function() {
      return this.model.destroy({
        data: JSON.stringify(this.model.toJSON())
      });
    };

    ItemEdit.prototype.changeTitle = function(newTitle) {
      this.model.set({
        'title': newTitle
      });
      return this.model.save();
    };

    ItemEdit.prototype.changeURL = function(newURL) {
      this.model.set({
        'url': newURL
      });
      return this.model.save();
    };

    return ItemEdit;

  })();

  EditableField = (function() {

    __extends(EditableField, Backbone.View);

    function EditableField() {
      EditableField.__super__.constructor.apply(this, arguments);
    }

    EditableField.prototype.initialize = function(options) {
      this.val = options.val;
      this.inViewMode = false;
      return this.viewMode();
    };

    EditableField.prototype.viewMode = function() {
      if (this.inViewMode) return;
      this.inViewMode = true;
      $(this.el).empty();
      $(this.el).append('<span class="view">' + this.val + '</span>');
      return this.delegateEvents({
        'click .view': 'editMode'
      });
    };

    EditableField.prototype.toViewMode = function(e) {
      if (e.type === 'keydown' && e.keyCode !== 13) return;
      this.val = this.$('.edit').val();
      this.trigger('change', this.val);
      return this.viewMode();
    };

    EditableField.prototype.editMode = function() {
      if (!this.inViewMode) return;
      this.inViewMode = false;
      $(this.el).empty().append('<input class="edit" value="' + this.val + '" />');
      this.$('input').focus().select();
      return this.delegateEvents({
        'blur .edit': 'toViewMode',
        'keydown .edit': 'toViewMode'
      });
    };

    return EditableField;

  })();

  GroupView = (function() {

    __extends(GroupView, Backbone.View);

    function GroupView() {
      GroupView.__super__.constructor.apply(this, arguments);
    }

    GroupView.prototype.initialize = function(options) {
      this.render();
      return this.open();
    };

    GroupView.prototype.render = function() {
      var _this = this;
      $(this.el).html(ich.tpl_groupview(this.model.toJSON()));
      return this.model.itemSet.each(function(item) {
        var itemView;
        itemView = new ItemView({
          model: item,
          groupView: _this
        });
        return _this.$('#items').append(itemView.el);
      });
    };

    GroupView.prototype.events = {
      'click .closed': 'open'
    };

    GroupView.prototype.close = function() {
      $(this.el).removeClass('open');
      return $(this.el).addClass('closed');
    };

    GroupView.prototype.open = function() {
      $(this.el).addClass('open');
      return $(this.el).removeClass('closed');
    };

    return GroupView;

  })();

  ItemView = (function() {

    __extends(ItemView, Backbone.View);

    function ItemView() {
      ItemView.__super__.constructor.apply(this, arguments);
    }

    ItemView.prototype.tagName = 'tr';

    ItemView.prototype.initialize = function(options) {
      this.groupView = options.groupView;
      return this.render();
    };

    ItemView.prototype.render = function() {
      return $(this.el).html(ich.tpl_itemview(this.model.toJSON()));
    };

    ItemView.prototype.events = {
      'click .link': 'clickLink'
    };

    ItemView.prototype.clickLink = function() {
      window.app.frameGo(this.model.get('url'));
      return this.groupView.close();
    };

    return ItemView;

  })();

  Router = (function() {

    __extends(Router, Backbone.Router);

    function Router() {
      Router.__super__.constructor.apply(this, arguments);
    }

    Router.prototype.routes = {
      '': 'index',
      'group_edit/:group_id/:edit_hash': 'groupEdit',
      'group_view/:group_id': 'groupView'
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

    Router.prototype.groupView = function(groupID) {
      var group;
      group = new Group({
        'id': groupID
      });
      return group.fetch({
        success: function() {
          return window.app.groupView(group);
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
      console.log('here');
      this.showHome();
      window.router.navigate('');
      return this.view = new Index({
        el: this.homeContentEl
      });
    };

    App.prototype.groupEdit = function(group) {
      this.showHome();
      window.router.navigate('group_edit/' + group.id + '/' + group.get('edit_hash'));
      return this.view = new GroupEdit({
        el: this.homeContentEl,
        model: group
      });
    };

    App.prototype.groupView = function(group) {
      this.showOther();
      this.view = new GroupView({
        el: this.tocEl,
        model: group
      });
      return this.frameGo('/static/empty.html');
    };

    App.prototype.showHome = function() {
      $('html').removeClass('show_other');
      $('body').removeClass('show_other');
      this.homeEl.removeClass('hide');
      this.tocEl.addClass('hide');
      return this.otherPageEl.addClass('hide');
    };

    App.prototype.showOther = function() {
      $('html').addClass('show_other');
      $('body').addClass('show_other');
      this.homeEl.addClass('hide');
      this.tocEl.removeClass('hide');
      return this.otherPageEl.removeClass('hide');
    };

    App.prototype.frameGo = function(url) {
      return this.otherPageEl[0].src = url;
    };

    return App;

  })();

  $(function() {
    window.app = new App();
    window.router = new Router();
    return Backbone.history.start({
      pushState: true
    });
  });

}).call(this);
