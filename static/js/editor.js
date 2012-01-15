(function() {
  var EditableField, GroupEdit, ItemEdit;
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; }, __hasProp = Object.prototype.hasOwnProperty, __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

  GroupEdit = (function() {

    __extends(GroupEdit, Backbone.View);

    function GroupEdit() {
      this.itemRemoved = __bind(this.itemRemoved, this);
      this.itemAdded = __bind(this.itemAdded, this);
      this.changeName = __bind(this.changeName, this);
      this.sortUpdate = __bind(this.sortUpdate, this);
      this.render = __bind(this.render, this);
      GroupEdit.__super__.constructor.apply(this, arguments);
    }

    GroupEdit.prototype.initialize = function(options) {
      var _this = this;
      bn.lib.jsonRPC('group_edit_check', {
        'edit_hash': this.model.get('edit_hash'),
        'id': this.model.id
      }, function(data) {
        if (data) {
          return _this.render();
        } else {
          return _this.renderDenied();
        }
      });
      this.model.itemSet.bind('reset', this.render);
      this.model.itemSet.bind('add', this.itemAdded);
      return this.model.itemSet.bind('remove', this.itemRemoved);
    };

    GroupEdit.prototype.render = function() {
      var context;
      var _this = this;
      context = this.model.toJSON();
      context.view_link = '/b/' + this.model.id;
      $(this.el).html(ich.tpl_groupedit(context));
      this.nameField = new EditableField({
        el: this.$('.group_name'),
        val: this.model.get('name'),
        blankText: 'Group Name'
      });
      this.nameField.bind('change', this.changeName);
      this.tbody = this.$('#items');
      this.model.itemSet.each(function(item) {
        return _this.addItemView(item);
      });
      return this.tbody.sortable({
        update: this.sortUpdate,
        helper: function(e, ui) {
          var child, _i, _len, _ref;
          _ref = ui.children();
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            child = _ref[_i];
            $(child).width($(child).width());
          }
          return ui;
        }
      });
    };

    GroupEdit.prototype.renderDenied = function() {
      return $(this.el).html(ich.tpl_groupeditDenied());
    };

    GroupEdit.prototype.events = {
      'sortupdate #items tbody': 'sortUpdate'
    };

    GroupEdit.prototype.sortUpdate = function() {
      var i;
      this.model.setOrdering((function() {
        var _i, _len, _ref, _results;
        _ref = this.$('#items tr');
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          i = _ref[_i];
          _results.push($(i).attr('data-id'));
        }
        return _results;
      }).call(this));
      return this.setLast();
    };

    GroupEdit.prototype.changeName = function(newName) {
      this.model.set({
        'name': newName
      });
      return this.model.save();
    };

    GroupEdit.prototype.itemAdded = function(item, itemSet) {
      bn.lib.assert(item.id === itemSet.at(itemSet.length - 1).id);
      return this.addItemView(item);
    };

    GroupEdit.prototype.itemRemoved = function(item, itemSet) {
      return item.view.remove();
    };

    GroupEdit.prototype.addItemView = function(item) {
      var el, itemView;
      itemView = new ItemEdit({
        model: item
      });
      item.view = itemView;
      el = $(itemView.el);
      el.attr('data-id', item.id);
      if (this.tbody) {
        this.tbody.append(el);
        return this.setLast();
      }
    };

    GroupEdit.prototype.setLast = function() {
      this.tbody.find('tr').removeClass('last');
      return this.tbody.find('tr:last').addClass('last');
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
        val: this.model.get('title'),
        blankText: 'Title'
      });
      this.titleField.bind('change', this.changeTitle);
      this.urlField = new EditableField({
        el: this.$('.url'),
        val: this.model.get('url'),
        blankText: 'Link'
      });
      this.urlField.bind('change', this.changeURL);
      this.commentField = new EditableField({
        el: this.$('.comment'),
        editType: 'textarea',
        val: this.model.get('comment'),
        blankText: 'Comment'
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
      this.editType = options.editType;
      this.val = options.val;
      this.blankText = options.blankText;
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
        val = this.options.blankText;
        $(this.el).addClass('blank');
      }
      $(this.el).append('<div class="view">' + val + '</div>');
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
      var el;
      if (!this.inViewMode) return;
      this.inViewMode = false;
      $(this.el).empty();
      if (this.editType && this.editType === 'textarea') {
        el = $('<textarea />');
        if (this.val) el.html(this.val);
      } else {
        el = $('<input />');
        if (this.val) el.val(this.val);
      }
      el.addClass('edit');
      $(this.el).append(el);
      el.focus().select();
      return this.delegateEvents({
        'blur .edit': 'toViewMode',
        'keydown .edit': 'toViewMode'
      });
    };

    return EditableField;

  })();

  bn.editor = {
    GroupEdit: GroupEdit
  };

}).call(this);
