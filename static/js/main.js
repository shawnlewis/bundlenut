(function() {
  var App, GroupSummary, Index, InitialData, OtherPage, OtherPages, Router;
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
      'my': 'myGroups',
      'e/:group_id/:edit_hash': 'groupEdit',
      'e/:group_id': 'groupEdit',
      'b/:group_id': 'groupView'
    };

    Router.prototype.index = function() {
      return window.app.index();
    };

    Router.prototype.myGroups = function() {
      return window.app.myGroups();
    };

    Router.prototype.groupEdit = function(groupID, editHash) {
      var group;
      group = new bn.models.Group({
        id: groupID,
        editHash: editHash
      });
      return group.fetch({
        success: function() {
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

  OtherPage = (function() {

    function OtherPage() {
      this.used = -1;
      this.source = '';
      this.frame = $('<iframe>').addClass('other_page');
    }

    OtherPage.prototype.hide = function() {
      return this.frame.hide();
    };

    OtherPage.prototype.show = function() {
      return this.frame.show();
    };

    OtherPage.prototype.setSource = function(source) {
      var _this = this;
      this.source = source;
      this.frame[0].src = 'about:blank';
      return setTimeout(function() {
        return _this.frame[0].src = source;
      }, 0);
    };

    OtherPage.prototype.incUsed = function() {
      return this.used += 1;
    };

    return OtherPage;

  })();

  OtherPages = (function() {

    function OtherPages(numPages) {
      var page, _i, _len, _ref;
      this.time = 0;
      this.pages = (function() {
        var _i, _ref, _results;
        _results = [];
        for (_i = 0, _ref = numPages - 1; 0 <= _ref ? _i <= _ref : _i >= _ref; 0 <= _ref ? _i++ : _i--) {
          _results.push(new OtherPage());
        }
        return _results;
      })();
      this.hide();
      _ref = this.pages;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        page = _ref[_i];
        $('body').append(page.frame);
      }
    }

    OtherPages.prototype.hide = function() {
      var page, _i, _len, _ref, _results;
      _ref = this.pages;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        page = _ref[_i];
        _results.push(page.hide());
      }
      return _results;
    };

    OtherPages.prototype.getPage = function(url) {
      var page;
      page = this._findPage(url);
      if (!page) {
        page = this._findLRU();
        page.setSource(url);
      }
      page.used = this.time;
      this.time += 1;
      return page;
    };

    OtherPages.prototype._findPage = function(url) {
      return _.find(this.pages, function(page) {
        return page.source === url;
      });
    };

    OtherPages.prototype._findLRU = function() {
      var min, page;
      min = _.min((function() {
        var _i, _len, _ref, _results;
        _ref = this.pages;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          page = _ref[_i];
          _results.push(page.used);
        }
        return _results;
      }).call(this));
      return _.find(this.pages, function(page) {
        return page.used === min;
      });
    };

    return OtherPages;

  })();

  App = (function() {

    __extends(App, Backbone.Router);

    function App() {
      App.__super__.constructor.apply(this, arguments);
    }

    App.prototype.initialize = function() {
      this.homeEl = $('#home');
      this.standardContentEl = $('#standard_content');
      this.tocEl = $('#table_of_contents');
      this.ourOtherPageEl = $('#our_other_page');
      return this.otherPages = new OtherPages(2);
    };

    App.prototype.index = function() {
      $('body').removeClass().addClass('index');
      this.standardContentEl.hide();
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

    App.prototype.myGroups = function() {
      $('body').removeClass().addClass('mygroups');
      $('#index_content').hide();
      this.standardContentEl.show();
      this.showHome();
      window.router.navigate('my');
      document.title = 'Bundlenut - My bundles';
      return this.view = new bn.userView.UserView({
        el: this.standardContentEl.find('#standard_inner')
      });
    };

    App.prototype.groupEdit = function(group) {
      var editHash, url;
      $('body').removeClass().addClass('groupedit');
      $('#index_content').hide();
      this.standardContentEl.show();
      this.showHome();
      url = 'e/' + group.id;
      editHash = group.get('edit_hash');
      if (editHash) url += '/' + editHash;
      window.router.navigate(url);
      document.title = 'Bundlenut - Edit: ' + group.get('name');
      return this.view = new bn.editor.GroupEdit({
        el: this.standardContentEl.find('#standard_inner'),
        model: group
      });
    };

    App.prototype.groupView = function(group) {
      $('body').removeClass().addClass('groupview');
      this.showOurOther();
      window.router.navigate('b/' + group.id);
      document.title = 'Bundlenut - Browse: ' + group.get('name');
      return this.view = new bn.bbrowser.GroupView({
        el: this.tocEl,
        model: group
      });
    };

    App.prototype.showHome = function() {
      if (this.view) this.view.delegateEvents({});
      $('html').removeClass('show_other');
      $('body').addClass('standard');
      this.tocEl.addClass('hide');
      this.ourOtherPageEl.addClass('hide');
      this.otherPages.hide();
      return this.homeEl.removeClass('hide');
    };

    App.prototype.showOurOther = function() {
      if (this.view) this.view.delegateEvents({});
      $('html').addClass('show_other');
      this.homeEl.addClass('hide');
      this.otherPages.hide();
      this.tocEl.removeClass('hide');
      return this.ourOtherPageEl.removeClass('hide');
    };

    App.prototype.showOther = function() {
      $('html').addClass('show_other');
      this.homeEl.addClass('hide');
      this.ourOtherPageEl.addClass('hide');
      return this.tocEl.removeClass('hide');
    };

    App.prototype.frameGo = function(url) {
      var page;
      this.showOther();
      this.otherPages.hide();
      page = this.otherPages.getPage(url);
      return page.show();
    };

    return App;

  })();

  InitialData = (function() {

    function InitialData(dataEl) {
      this._loginUrl = dataEl.attr('data-login_url');
      this.userName = dataEl.attr('data-user_name');
    }

    InitialData.prototype.loginUrl = function(next) {
      if (next[0] = '/') next = next.substr(1);
      return this._loginUrl.replace('__NEXT__', next);
    };

    return InitialData;

  })();

  window.bn = {};

  $(function() {
    $('input[name=group_name]').hint();
    window.bn.initData = new InitialData($('#data'));
    window.app = new App();
    window.router = new Router();
    return Backbone.history.start({
      pushState: true
    });
  });

}).call(this);
