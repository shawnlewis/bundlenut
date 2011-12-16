(function() {
  var Group, GroupEdit, Index;
  var __hasProp = Object.prototype.hasOwnProperty, __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

  Group = (function() {

    __extends(Group, Backbone.Model);

    function Group() {
      Group.__super__.constructor.apply(this, arguments);
    }

    Group.prototype.urlRoot = '/group';

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
      group.save();
      return window.view = new GroupEdit({
        el: this.el,
        model: group
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

  $(document).ready(function() {
    return window.view = new Index({
      el: $('#main')
    });
  });

}).call(this);
