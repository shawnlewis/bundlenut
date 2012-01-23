(function() {
  var UserGroupView, UserView;
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; }, __hasProp = Object.prototype.hasOwnProperty, __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

  UserView = (function() {

    __extends(UserView, Backbone.View);

    function UserView() {
      this.render = __bind(this.render, this);
      UserView.__super__.constructor.apply(this, arguments);
    }

    UserView.prototype.initialize = function(options) {
      this.groups = new bn.models.GroupSet();
      this.groups.url = '/api/my_groups';
      $(this.el).html(ich.tpl_usergroups());
      $('input[name=group_name]').hint();
      bn.setLoginNexts(null, '/');
      this.groups.fetch({
        success: this.render
      });
      return this.groups.bind('remove', this.render);
    };

    UserView.prototype.render = function() {
      var groups;
      groups = this.$('.groups').empty();
      return this.groups.each(function(group) {
        group.url = '/api/group/' + group.id;
        return groups.append((new UserGroupView({
          model: group
        })).el);
      });
    };

    UserView.prototype.events = {
      'click button[name="go"]': 'submit',
      'keydown input[name="group_name"]': 'submit'
    };

    UserView.prototype.submit = function(e) {
      var group;
      if (e.type === 'keydown' && e.keyCode !== 13) return;
      mpq.track('index-bundle-created');
      e.preventDefault();
      group = new bn.models.Group({
        name: this.$('input[name="group_name"]').val()
      });
      return group.save(null, {
        success: function() {
          return window.app.groupEdit(group);
        }
      });
    };

    return UserView;

  })();

  UserGroupView = (function() {

    __extends(UserGroupView, Backbone.View);

    function UserGroupView() {
      UserGroupView.__super__.constructor.apply(this, arguments);
    }

    UserGroupView.prototype.className = 'group_summary';

    UserGroupView.prototype.initialize = function(bla) {
      return this.render();
    };

    UserGroupView.prototype.render = function() {
      var context;
      context = this.model.toJSON();
      context.item_set = this.model.itemSet.toJSON();
      return $(this.el).html(ich.tpl_usergroup(context));
    };

    UserGroupView.prototype.events = {
      'click .delete': 'delete'
    };

    UserGroupView.prototype["delete"] = function() {
      if (confirm('Are you sure you want to delete ' + this.model.get('name'))) {
        return this.model.destroy();
      }
    };

    return UserGroupView;

  })();

  bn.userView = {
    UserView: UserView
  };

}).call(this);
