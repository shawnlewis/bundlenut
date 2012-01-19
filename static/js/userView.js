(function() {
  var UserView;
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
      return this.groups.fetch({
        success: this.render
      });
    };

    UserView.prototype.render = function() {
      $(this.el).html(ich.tpl_usergroups({
        groups: this.groups.toJSON()
      }));
      return $('input[name=group_name]').hint();
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

  bn.userView = {
    UserView: UserView
  };

}).call(this);
