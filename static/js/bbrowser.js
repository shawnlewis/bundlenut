(function() {
  var GroupView, ItemView,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = Object.prototype.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

  GroupView = (function(_super) {

    __extends(GroupView, _super);

    function GroupView() {
      this.closed = __bind(this.closed, this);
      this.sizeFix = __bind(this.sizeFix, this);
      GroupView.__super__.constructor.apply(this, arguments);
    }

    GroupView.prototype.initialize = function(options) {
      var i, _results,
        _this = this;
      this.curItemNum = -1;
      this.state = 'full';
      this.render();
      $(window).resize(function() {
        var doingFix;
        doingFix = false;
        if (!doingFix) {
          doingFix = true;
          return setTimeout(function() {
            _this.sizeFix();
            return doingFix = false;
          }, 200);
        }
      });
      _results = [];
      for (i = 0; i <= 1; i++) {
        _results.push(app.otherPages.getPage(this.model.itemSet.at(i).getURL()));
      }
      return _results;
    };

    GroupView.prototype.sizeFix = function() {
      var hadScrollBar, i, items, pane_middle, tab, width, _i, _len;
      pane_middle = this.$('.pane_middle');
      if (pane_middle.data().jsp) {
        pane_middle.data().jsp.destroy();
        hadScrollBar = true;
      }
      items = $('#items > div');
      items.css('width', '');
      items.css('height', '');
      width = bn.lib.max((function() {
        var _i, _len, _results;
        _results = [];
        for (_i = 0, _len = items.length; _i < _len; _i++) {
          i = items[_i];
          _results.push($(i).width());
        }
        return _results;
      })());
      items.css('width', width + 'px');
      for (_i = 0, _len = items.length; _i < _len; _i++) {
        i = items[_i];
        $(i).css('height', $(i).height() + 'px');
      }
      tab = this.$('.tab');
      this.$('.pane').css('left', $(window).width() + tab.offset().left + 55);
      if (hadScrollBar) return this.$('.pane_middle').jScrollPane();
    };

    GroupView.prototype.render = function() {
      var context, html, i,
        _this = this;
      context = this.model.toJSON();
      html = ich.tpl_groupview(context);
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
      this.sizeFix();
      if (this.state === 'single') $('.wrapper').hide();
      this.$('.tab #logo').click(function() {
        return mpq.track('view-logo-click');
      });
      $(html).find('.pane_middle').jScrollPane();
      return this._scroll();
    };

    GroupView.prototype.events = {
      'click .closed .tab #logo': 'full',
      'click .single .tab #logo': 'full',
      'click .full .tab #logo': 'closed',
      'mouseenter .closed .tab': 'single',
      'mouseleave .single .tab': 'closedIfLeft',
      'mouseleave .single .pane_top': 'closedIfLeft',
      'mouseleave .single .pane_middle': 'closedIfLeft',
      'mouseleave .single .pane_bottom': 'closedIfLeft',
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
      this.$('.pane_middle').data().jsp.destroy();
      if (this.state === 'closed') {
        this.$('#groupview_content').css('top', '-100%');
        this.$('.wrapper').hide();
        this.$('#groupview_content').css('top', -this._paneHeight());
        this.$('#groupview_content').animate({
          top: 0
        }, {
          duration: 200,
          complete: function() {
            return _this.$('.pane_middle').jScrollPane();
          }
        });
      } else if (this.state === 'full') {
        this.$('.wrapper').slideUp({
          complete: function() {
            return _this.$('.pane_middle').jScrollPane();
          }
        });
      }
      return this.setState('single');
    };

    GroupView.prototype.closed = function() {
      var el,
        _this = this;
      if (this.state === 'closed') return;
      el = this.$('#groupview_content');
      return el.animate({
        top: -this._paneHeight() + 'px'
      }, {
        complete: function() {
          el.css('top', '-100%');
          return _this.setState('closed');
        }
      });
    };

    GroupView.prototype.full = function() {
      var onComplete,
        _this = this;
      onComplete = function() {
        _this.$('.pane_middle').jScrollPane();
        return _this._scroll();
      };
      this.$('.pane_middle').data().jsp.destroy();
      if (this.state === 'closed') {
        this.$('#groupview_content').css('top', '-100%');
        this.$('.wrapper').show();
        this.$('#groupview_content').css('top', -this._paneHeight());
        this.$('#groupview_content').animate({
          top: 0
        }, onComplete);
      } else {
        $('.wrapper').slideDown();
        $('.wrapper').promise().done(onComplete);
      }
      return this.setState('full');
    };

    GroupView.prototype.closedIfLeft = function(e) {
      var toEl;
      toEl = $(e.relatedTarget);
      if (toEl.hasClass('other_page')) return this.closed();
    };

    GroupView.prototype._paneHeight = function() {
      return _.reduce(this.$('.pane'), function(x, y) {
        return x + $(y).height();
      }, 0);
    };

    GroupView.prototype.curItemView = function() {
      if (this.curItemNum === -1) {
        return null;
      } else {
        return this.itemViews[this.curItemNum];
      }
    };

    GroupView.prototype.selectItem = function(num) {
      var nextNum;
      if (!this.curItemNum) this.initClickOther();
      this.curItemNum = num;
      this.render();
      nextNum = this.curItemNum + 1;
      if (nextNum !== this.model.itemSet.length) {
        return app.otherPages.getPage(this.model.itemSet.at(nextNum).getURL());
      }
    };

    GroupView.prototype.nextItem = function() {
      mpq.track('view-next-item');
      return this.itemViews[this.curItemNum + 1].go();
    };

    GroupView.prototype.prevItem = function() {
      mpq.track('view-prev-item');
      return this.itemViews[this.curItemNum - 1].go();
    };

    GroupView.prototype.initClickOther = function() {
      var overOther,
        _this = this;
      overOther = false;
      $('iframe').hover(function() {
        return overOther = true;
      }, function() {
        return overOther = false;
      });
      return $(window).blur(function() {
        if (overOther) return _this.closed();
      });
    };

    GroupView.prototype._scroll = function() {
      var jsp;
      if (this.state === 'full' && this.curItemView()) {
        jsp = this.$('.pane_middle').data('jsp');
        return jsp.scrollTo(0, $(this.curItemView().el).position().top);
      }
    };

    return GroupView;

  })(Backbone.View);

  ItemView = (function(_super) {

    __extends(ItemView, _super);

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
      var context;
      context = this.model.toJSON();
      context.url = this.model.getURL();
      context.newWindow = this.usesNewWindow();
      return $(this.el).html(ich.tpl_itemview(context));
    };

    ItemView.prototype.events = {
      'click .full_url': 'clickURL',
      'click .title': 'clickLink'
    };

    ItemView.prototype.clickURL = function(e) {
      return this.$('.full_url input').focus().select();
    };

    ItemView.prototype.clickLink = function(e) {
      mpq.track('view-click-link');
      e.preventDefault();
      this.go();
      if (!this.usesNewWindow()) return this.groupView.closed();
    };

    ItemView.prototype.go = function() {
      var url;
      url = this.model.getURL();
      if (this.usesNewWindow()) {
        window.app.showOurOther();
        window.open(url, '');
      } else {
        window.app.frameGo(url);
      }
      return this.groupView.selectItem(this.num);
    };

    ItemView.prototype.usesNewWindow = function() {
      var url;
      url = this.model.get('url');
      if (url && (url.search('youtube.com') !== -1 || url.search('maps.google.com')) !== -1) {
        return true;
      }
      return false;
    };

    return ItemView;

  })(Backbone.View);

  bn.bbrowser = {
    GroupView: GroupView
  };

}).call(this);
