class GroupView extends Backbone.View
    initialize: (options) ->
        @curItemNum = -1
        @state = 'full'
        @render()
        $(window).resize =>
            doingFix = false
            if not doingFix
                doingFix = true
                setTimeout(
                    =>
                        @sizeFix()
                        doingFix = false
                    ,200)

        # cache a few pages
        for i in [0..1]
            app.otherPages.getPage(@model.itemSet.at(i).getURL())

    sizeFix: =>
        pane_middle = @$('.pane_middle')
        if pane_middle.data().jsp
            pane_middle.data().jsp.destroy()
            hadScrollBar = true

        # fix heights and widths so animations aren't jumpy
        items = $('#items > div')
        items.css('width', '')
        items.css('height', '')
        width = bn.lib.max($(i).width() for i in items)
        items.css('width', width + 'px')
        for i in items
            $(i).css('height', $(i).height() + 'px')

        # place pane
        tab = @$('.tab')
        @$('.pane').css('left', $(window).width() + tab.offset().left + 55)

        if hadScrollBar
            @$('.pane_middle').jScrollPane()

    render: ->
        context = @model.toJSON()
        html = ich.tpl_groupview(context)
        @itemViews = []
        i = 0
        @model.itemSet.each (item) =>
            if not item.isBlank()
                itemView = new ItemView
                    model: item
                    groupView: @
                    num: i
                @itemViews.push(itemView)
                if i < @curItemNum
                    $(html).find('#beforeCurrent').append(itemView.el)
                else if i == @curItemNum
                    $(html).find('#current').replaceWith(
                        $(itemView.el).addClass('selected'))
                else
                    $(html).find('#afterCurrent').append(itemView.el)
                i += 1
        $(@el).html(html)

        if @curItemNum > 0
            @$('#left_arrow').addClass('arrow_on')
        if @curItemNum != -1 and @curItemNum < @itemViews.length - 1
            @$('#right_arrow').addClass('arrow_on')

        @sizeFix()

        if @state == 'single'
            $('.wrapper').hide()

        @$('.tab #logo').click ->
            mpq.track('view-logo-click')

        $(html).find('.pane_middle').jScrollPane()
        @_scroll()

    events:
        'click .closed .tab #logo': 'full'
        'click .single .tab #logo': 'full'
        'click .full .tab #logo': 'closed'

        'mouseenter .closed .tab': 'single'

        'mouseleave .single .tab': 'closedIfLeft'
        'mouseleave .single .pane_top': 'closedIfLeft'
        'mouseleave .single .pane_middle': 'closedIfLeft'
        'mouseleave .single .pane_bottom': 'closedIfLeft'

        'click .tab #left_arrow.arrow_on' : 'prevItem'
        'click .tab #right_arrow.arrow_on': 'nextItem'

    setState: (state) ->
        @state = state
        $(@el).removeClass('closed single full')
        $(@el).addClass(state)

    single: ->
        if not @curItemView() or @state == 'single'
            return

        @$('.pane_middle').data().jsp.destroy()

        if @state == 'closed'
            @$('#groupview_content').css('top', '-100%')
            @$('.wrapper').hide()
            @$('#groupview_content').css('top', -@_paneHeight())
            @$('#groupview_content').animate({top: 0},
                duration: 200
                complete: =>
                    @$('.pane_middle').jScrollPane()
            )
        else if @state == 'full'
            @$('.wrapper').slideUp
                complete: =>
                    @$('.pane_middle').jScrollPane()
        @setState('single')

    closed: =>
        if @state == 'closed'
            return
        el = @$('#groupview_content')
        el.animate({top: -@_paneHeight() + 'px'},
            complete: =>
                # move to -100% so it stays of screen if the user resizes
                el.css('top', '-100%')
                @setState('closed')
        )

    full: ->
        onComplete = =>
            @$('.pane_middle').jScrollPane()
            @_scroll()
                
        @$('.pane_middle').data().jsp.destroy()
        if @state == 'closed'
            @$('#groupview_content').css('top', '-100%')
            @$('.wrapper').show()
            @$('#groupview_content').css('top', -@_paneHeight())
            @$('#groupview_content').animate({top: 0}, onComplete)
        else
            $('.wrapper').slideDown()
            $('.wrapper').promise().done(onComplete)
        @setState('full')

    closedIfLeft: (e) ->
        toEl = $(e.relatedTarget)
        if toEl.hasClass('other_page')
            @closed()

    _paneHeight: ->
        _.reduce(
            @$('.pane'),
            (x, y) -> x + $(y).height(),
            0)
        
    curItemView: ->
        if @curItemNum == -1 then null else @itemViews[@curItemNum]

    selectItem: (num) ->
        if not @curItemNum
            @initClickOther()
        @curItemNum = num
        @render()

        # cache the next page
        nextNum = @curItemNum + 1
        if nextNum != @model.itemSet.length
            app.otherPages.getPage(@model.itemSet.at(nextNum).getURL())

    nextItem: ->
        mpq.track('view-next-item')
        @itemViews[@curItemNum+1].go()

    prevItem: ->
        mpq.track('view-prev-item')
        @itemViews[@curItemNum-1].go()

    initClickOther: ->
        # detect iframe clicks. Thanks stackoverflow.
        overOther = false
        $('iframe').hover(
            => overOther = true,
            => overOther = false)
        $(window).blur(=> if overOther then @closed())

    _scroll: ->
        if @state == 'full' and @curItemView()
            jsp = @$('.pane_middle').data('jsp')
            jsp.scrollTo(0, $(@curItemView().el).position().top)
        

class ItemView extends Backbone.View
    tagName: 'div'
    className: 'item_view'

    initialize: (options) ->
        @num = options.num
        @groupView = options.groupView
        @render()

    render: ->
        context = @model.toJSON()
        context.url = @model.getURL()
        context.newWindow = @usesNewWindow()
        $(@el).html(ich.tpl_itemview(context))

    events:
        'click .full_url': 'clickURL'
        'click .title': 'clickLink'
            
    clickURL: (e) ->
        @$('.full_url input').focus().select()

    clickLink: (e) ->
        mpq.track('view-click-link')
        e.preventDefault()
        @go()
        if not @usesNewWindow()
            @groupView.closed()

    go: ->
        url = @model.getURL()
        if @usesNewWindow()
            window.app.showOurOther()
            window.open(url, '')
        else
            window.app.frameGo(url)
        # must come after frameGo so that OtherPages cache is preserved.
        @groupView.selectItem(@num)

    usesNewWindow: ->
        url = @model.get('url')
        if url and (url.search('youtube.com') != -1 or url.search('maps.google.com')) != -1
            return true
        return false

bn.bbrowser =
    GroupView: GroupView
