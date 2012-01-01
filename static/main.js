(function() {
  var App, EditableField, Group, GroupEdit, GroupView, Index, Item, ItemEdit, ItemSet, ItemView, Router, getUrl, jsonRPC, methodMap;
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; }, __hasProp = Object.prototype.hasOwnProperty, __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

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
      this.fixOrdering = __bind(this.fixOrdering, this);
      Group.__super__.constructor.apply(this, arguments);
    }

    Group.prototype.urlRoot = '/api/group';

    Group.prototype.parse = function(data) {
      var id, item, items, ordered, _i, _j, _k, _len, _len2, _len3, _ref, _ref2, _ref3;
      var _this = this;
      items = {};
      _ref = data.item_set;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        item = _ref[_i];
        items[item.id] = item;
      }
      ordered = [];
      _ref2 = data.ordering;
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
      this.itemSet = new ItemSet(ordered);
      delete data.item_set;
      this.itemSet.group = this;
      this.itemSet.bind('change', function() {
        return _this.change();
      });
      this.itemSet.bind('add', function() {
        return _this.change;
      });
      this.itemSet.bind('add', this.fixOrdering);
      this.itemSet.bind('remove', function() {
        return _this.change();
      });
      this.itemSet.bind('remove', this.fixOrdering);
      return Group.__super__.parse.call(this, data);
    };

    Group.prototype.createItem = function(success) {
      return this.itemSet.create({
        group: this.get('key'),
        edit_hash: this.get('edit_hash')
      }, {
        success: success
      });
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
        }).call(this),
        silent: true
      });
      return this.save();
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
      return this.save();
    };

    Group.prototype.clean = function(success) {
      var lastIndex;
      lastIndex = this.itemSet.models.length - 1;
      if (lastIndex === -1 || !this.itemSet.models[lastIndex].isBlank()) {
        return this.createItem(success);
      } else {
        return success();
      }
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
      url: '',
      comment: ''
    };

    Item.prototype.isBlank = function() {
      if (!this.get('title') && !this.get('url')) return true;
      return false;
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
      this.sortUpdate = __bind(this.sortUpdate, this);
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
      var _this = this;
      return this.model.clean(function() {
        var context, tbody;
        context = _this.model.toJSON();
        context.view_link = '/group_view/' + _this.model.id;
        $(_this.el).html(ich.tpl_groupedit(context));
        tbody = _this.$('#items');
        _this.model.itemSet.each(function(item) {
          var el;
          el = $(new ItemEdit({
            model: item
          }).el);
          el.attr('data-id', item.id);
          return tbody.append(el);
        });
        tbody.find('td:last').find('.delete').hide();
        return tbody.sortable({
          update: _this.sortUpdate
        });
      });
    };

    GroupEdit.prototype.renderDenied = function() {
      return $(this.el).html(ich.tpl_groupeditDenied());
    };

    GroupEdit.prototype.events = {
      'sortupdate #items tbody': 'sortUpdate'
    };

    GroupEdit.prototype.addItem = function() {
      return this.model.createItem();
    };

    GroupEdit.prototype.sortUpdate = function() {
      var i;
      return this.model.setOrdering((function() {
        var _i, _len, _ref, _results;
        _ref = this.$('#items tr');
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          i = _ref[_i];
          _results.push($(i).attr('data-id'));
        }
        return _results;
      }).call(this));
    };

    return GroupEdit;

  })();

  ItemEdit = (function() {

    __extends(ItemEdit, Backbone.View);

    function ItemEdit() {
      this.changeComment = __bind(this.changeComment, this);
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
      this.urlField.bind('change', this.changeURL);
      this.commentField = new EditableField({
        el: this.$('.comment'),
        val: this.model.get('comment')
      });
      return this.commentField.bind('change', this.changeComment);
    };

    ItemEdit.prototype.events = {
      'click .delete': 'delete'
    };

    ItemEdit.prototype["delete"] = function() {
      return this.model.destroy();
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

    ItemEdit.prototype.changeComment = function(newComment) {
      this.model.set({
        'comment': newComment
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
      var val;
      if (this.inViewMode) return;
      this.inViewMode = true;
      $(this.el).empty();
      $(this.el).removeClass('blank');
      val = this.val;
      if (!this.val) {
        val = 'blank';
        $(this.el).addClass('blank');
      }
      $(this.el).append('<span class="view">' + val + '</span>');
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
      $(this.el).empty();
      if (this.val) {
        $(this.el).append('<input class="edit" value="' + this.val + '" />');
      } else {
        $(this.el).append('<input class="edit" />');
      }
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
      this.curItemNum = -1;
      this.state = 'full';
      return this.render();
    };

    GroupView.prototype.render = function() {
      var context, html, i, tab;
      var _this = this;
      context = this.model.toJSON();
      html = ich.tpl_groupview(context);
      if (this.state === 'closed' || this.state === 'single') {
        $(html).find('.wrapper').hide();
      }
      this.itemViews = [];
      i = 0;
      this.model.itemSet.each(function(item) {
        var itemView;
        if (!item.isBlank()) {
          itemView = new ItemView({
            model: item,
            groupView: _this,
            num: i
          });
          _this.itemViews.push(itemView);
          if (i < _this.curItemNum) {
            $(html).find('#beforeCurrent').append(itemView.el);
          } else if (i === _this.curItemNum) {
            $(html).find('#current').replaceWith($(itemView.el).addClass('selected'));
          } else {
            $(html).find('#afterCurrent').append(itemView.el);
          }
          return i += 1;
        }
      });
      $(this.el).html(html);
      if (this.curItemNum > 0) this.$('#left_arrow').addClass('arrow_on');
      if (this.curItemNum !== -1 && this.curItemNum < this.itemViews.length - 1) {
        this.$('#right_arrow').addClass('arrow_on');
      }
      tab = this.$('.tab');
      return this.$('.groupview').css('left', tab.offset().left + 55);
    };

    GroupView.prototype.events = {
      'click .closed .tab #logo': 'full',
      'click .single .tab #logo': 'full',
      'click .full .tab #logo': 'closed',
      'mouseenter .closed .tab': 'single',
      'mouseleave .single .tab': 'closed',
      'click .tab #left_arrow.arrow_on': 'prevItem',
      'click .tab #right_arrow.arrow_on': 'nextItem'
    };

    GroupView.prototype.setState = function(state) {
      this.state = state;
      $(this.el).removeClass('closed single full');
      return $(this.el).addClass(state);
    };

    GroupView.prototype.single = function() {
      var _this = this;
      if (!this.curItemView() || this.state === 'single') return;
      this.delegateEvents(null);
      if (this.state === 'closed') {
        this.$('.groupview').animate({
          top: 0
        }, {
          complete: function() {
            return _this.delegateEvents(_this.events);
          }
        });
      } else if (this.state === 'full') {
        this.$('.wrapper').slideUp({
          complete: function() {
            return _this.delegateEvents(_this.events);
          }
        });
      }
      return this.setState('single');
    };

    GroupView.prototype.closed = function() {
      var el;
      var _this = this;
      el = this.$('.groupview');
      this.delegateEvents(null);
      $('.group_name').hide();
      return el.animate({
        top: -el.height() + 'px'
      }, {
        complete: function() {
          _this.setState('closed');
          el.find('.wrapper').hide();
          el.css('top', -el.height() + 'px');
          return _this.delegateEvents(_this.events);
        }
      });
    };

    GroupView.prototype.full = function() {
      var width, wrappers;
      var _this = this;
      this.delegateEvents(null);
      if (this.state === 'closed') {
        this.$('.groupview').animate({
          top: 0
        }, {
          complete: function() {
            return _this.delegateEvents(_this.events);
          }
        });
      }
      this.setState('full');
      $('.group_name').show();
      wrappers = $('.wrapper');
      wrappers.show();
      width = Math.max($(wrappers[0]).width(), $(wrappers[1]).width());
      if (this.curItemView()) {
        width = Math.max($(this.curItemView().el).width(), width);
      }
      wrappers.hide();
      $('.item_view').css('width', width + 'px');
      return $('.wrapper').slideDown();
    };

    GroupView.prototype.curItemView = function() {
      if (this.curItemNum === -1) {
        return null;
      } else {
        return this.itemViews[this.curItemNum];
      }
    };

    GroupView.prototype.selectItem = function(num) {
      this.curItemNum = num;
      return this.render();
    };

    GroupView.prototype.nextItem = function() {
      return this.itemViews[this.curItemNum + 1].go();
    };

    GroupView.prototype.prevItem = function() {
      return this.itemViews[this.curItemNum - 1].go();
    };

    return GroupView;

  })();

  ItemView = (function() {

    __extends(ItemView, Backbone.View);

    function ItemView() {
      ItemView.__super__.constructor.apply(this, arguments);
    }

    ItemView.prototype.tagName = 'div';

    ItemView.prototype.className = 'item_view';

    ItemView.prototype.initialize = function(options) {
      this.num = options.num;
      this.groupView = options.groupView;
      return this.render();
    };

    ItemView.prototype.render = function() {
      return $(this.el).html(ich.tpl_itemview(this.model.toJSON()));
    };

    ItemView.prototype.events = {
      'click a': 'clickLink',
      'click .comment': 'clickLink'
    };

    ItemView.prototype.clickLink = function(e) {
      e.preventDefault();
      this.go();
      return this.groupView.closed();
    };

    ItemView.prototype.go = function() {
      window.app.frameGo(this.model.get('url'));
      return this.groupView.selectItem(this.num);
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
          group.set({
            edit_hash: editHash
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
