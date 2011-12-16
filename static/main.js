(function() {
  var App, Group, GroupEdit, Index, Router;
  var __hasProp = Object.prototype.hasOwnProperty, __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

  Group = (function() {

    __extends(Group, Backbone.Model);

    function Group() {
      Group.__super__.constructor.apply(this, arguments);
    }

    Group.prototype.urlRoot = '/api/group';

    return Group;

  })();

  Index = (function() {

    __extends(Index, Backbone.View);

    function Index() {
      Index.__super__.constructor.apply(this, arguments);
    }

    Index.prototype.initialize = function() {
      return this.render();
    };

    Index.prototype.events = {
      'click #create': "submit"
    };

    Index.prototype.render = function() {
      return $(this.el).html(ich.tpl_index());
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
      GroupEdit.__super__.constructor.apply(this, arguments);
    }

    GroupEdit.prototype.initialize = function(options) {
      return this.render();
    };

    GroupEdit.prototype.render = function() {
      return $(this.el).html(ich.tpl_groupedit(this.model.toJSON()));
    };

    return GroupEdit;

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
      this.view = new Index({
        el: this.homeContentEl
      });
      return this.showHome();
    };

    App.prototype.groupEdit = function(group) {
      window.router.navigate('/group_edit/' + group.id + '/' + group.get('edit_hash'));
      this.view = new GroupEdit({
        el: this.homeContentEl,
        model: group
      });
      return this.showHome();
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
