(function() {
  var App, GroupSummary, Index, Router;
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; }, __hasProp = Object.prototype.hasOwnProperty, __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

  Index = (function() {

    __extends(Index, Backbone.View);

    function Index() {
      this.render = __bind(this.render, this);
      Index.__super__.constructor.apply(this, arguments);
    }

    Index.prototype.initialize = function() {
      this.popular = new bn.models.GroupSet();
      this.popular.url = '/api/popular_groups';
      return this.popular.fetch({
        success: this.render
      });
    };

    Index.prototype.render = function() {
      var div, group, _i, _len, _ref, _ref2, _results;
      _ref = _.zip($('#popular_bundles > div'), this.popular.models);
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        _ref2 = _ref[_i], div = _ref2[0], group = _ref2[1];
        if (div && group) {
          _results.push(new GroupSummary({
            el: div,
            model: group
          }));
        } else {
          _results.push(void 0);
        }
      }
      return _results;
    };

    Index.prototype.events = {
      'click button[name="go"]': 'submit',
      'keydown input[name="group_name"]': 'submit'
    };

    Index.prototype.submit = function(e) {
      var group;
      if (e.type === 'keydown' && e.keyCode !== 13) return;
      mpq.track('index-bundle-created');
      e.preventDefault();
      group = new bn.models.Group({
        name: $('input[name="group_name"]').val()
      });
      return group.save(null, {
        success: function() {
          return window.app.groupEdit(group);
        }
      });
    };

    return Index;

  })();

  GroupSummary = (function() {

    __extends(GroupSummary, Backbone.View);

    function GroupSummary() {
      GroupSummary.__super__.constructor.apply(this, arguments);
    }

    GroupSummary.prototype.initialize = function() {
      return this.render();
    };

    GroupSummary.prototype.render = function() {
      var context;
      context = this.model.toJSON();
      context.item_set = this.model.itemSet.toJSON();
      return $(this.el).html(ich.tpl_groupsummary(context));
    };

    GroupSummary.prototype.events = {
      'click': 'go'
    };

    GroupSummary.prototype.go = function() {
      mpq.track('index-popular-bundle-clicked');
      return window.app.groupView(this.model);
    };

    return GroupSummary;

  })();

  Router = (function() {

    __extends(Router, Backbone.Router);

    function Router() {
      Router.__super__.constructor.apply(this, arguments);
    }

    Router.prototype.routes = {
      '': 'index',
      'e/:group_id/:edit_hash': 'groupEdit',
      'b/:group_id': 'groupView'
    };

    Router.prototype.index = function() {
      return window.app.index();
    };

    Router.prototype.groupEdit = function(groupID, editHash) {
      var group;
      group = new bn.models.Group({
        'id': groupID
      });
      return group.fetch({
        success: function() {
          group.set({
            edit_hash: editHash
          });
          return window.app.groupEdit(group);
        }
      });
    };

    Router.prototype.groupView = function(groupID) {
      var group;
      group = new bn.models.Group({
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
      this.otherPageEl = $('#other_page');
      return this.otherPageEl.load(function() {
        return $('#loading').addClass('hide');
      });
    };

    App.prototype.index = function() {
      $('body').removeClass().addClass('index');
      $('#content').hide();
      this.showHome();
      window.router.navigate('');
      document.title = 'Bundlenut';
      if (!this.indexView) {
        this.indexView = new Index({
          el: $('#index_content')
        });
      }
      return this.view = this.indexView;
    };

    App.prototype.groupEdit = function(group) {
      $('body').removeClass().addClass('groupedit');
      $('#content').show();
      this.showHome();
      window.router.navigate('e/' + group.id + '/' + group.get('edit_hash'));
      document.title = 'Bundlenut - Edit: ' + group.get('name');
      return this.view = new bn.editor.GroupEdit({
        el: this.homeContentEl,
        model: group
      });
    };

    App.prototype.groupView = function(group) {
      $('body').removeClass().addClass('groupview');
      this.showOther();
      this.frameGo('/static/empty.html');
      window.router.navigate('b/' + group.id);
      document.title = 'Bundlenut - Browse: ' + group.get('name');
      return this.view = new bn.bbrowser.GroupView({
        el: this.tocEl,
        model: group
      });
    };

    App.prototype.showHome = function() {
      $('html').removeClass('show_other');
      this.homeEl.removeClass('hide');
      this.tocEl.addClass('hide');
      return this.otherPageEl.addClass('hide');
    };

    App.prototype.showOther = function() {
      $('html').addClass('show_other');
      this.homeEl.addClass('hide');
      this.tocEl.removeClass('hide');
      return this.otherPageEl.removeClass('hide');
    };

    App.prototype.frameGo = function(url) {
      $('#loading').removeClass('hide');
      return this.otherPageEl[0].src = url;
    };

    return App;

  })();

  window.bn = {};

  $(function() {
    $('#create_group_name').hint();
    window.app = new App();
    window.router = new Router();
    return Backbone.history.start({
      pushState: true
    });
  });

}).call(this);
