class Index extends Backbone.View
    initialize: ->
        @popular = new bn.models.GroupSet()
        @popular.url = '/api/popular_groups'
        @popular.fetch
            success: @render
    
    render: =>
        for [div, group] in _.zip($('#popular_bundles > div'), @popular.models)
            if div and group
                new GroupSummary
                    el: div
                    model: group

    events:
        'click button[name="go"]': 'submit'
        'keydown input[name="group_name"]': 'submit'

    submit: (e)->
        if e.type == 'keydown' and e.keyCode != 13
            return
        mpq.track('index-bundle-created')
        e.preventDefault()
        group = new bn.models.Group
            name: $('input[name="group_name"]').val()
        group.save(
            null,
            success: -> window.app.groupEdit(group)
        )

class GroupSummary extends Backbone.View
    initialize: ->
        @render()

    render: ->
        context = @model.toJSON()
        context.item_set = @model.itemSet.toJSON()
        $(@el).html(ich.tpl_groupsummary(context))

    events:
        'click': 'go'

    go: ->
        mpq.track('index-popular-bundle-clicked')
        window.app.groupView(@model)


class Router extends Backbone.Router
    routes:
        '': 'index'
        'my': 'myGroups'
        'e/:group_id/:edit_hash': 'groupEdit'
        'e/:group_id': 'groupEdit'
        'b/:group_id': 'groupView'

    index: ->
        window.app.index()

    myGroups: ->
        window.app.myGroups()

    groupEdit: (groupID, editHash) ->
        group = new bn.models.Group
            id: groupID
            editHash: editHash
        group.fetch
            success: ->
                window.app.groupEdit group

    groupView: (groupID) ->
        group = new bn.models.Group({'id': groupID})
        group.fetch
            success: -> window.app.groupView group


class OtherPage
    constructor: ->
        @used = -1
        @source = ''
        @frame = $('<iframe>').addClass('other_page')

    hide: ->
        @frame.hide()

    show: ->
        @frame.show()

    setSource: (source) ->
        @source = source
        @frame[0].src = 'about:blank'
        setTimeout(
            => @frame[0].src = source
        ,0)

    incUsed: ->
        @used += 1


class OtherPages
    constructor: (numPages) ->
        @time = 0
        @pages = (new OtherPage() for [0..numPages-1])
        @hide()
        for page in @pages
            $('body').append(page.frame)

    hide: ->
        for page in @pages
            page.hide()
    
    # returns an iframe containing the requested URL
    getPage: (url) ->
        page = @_findPage(url)
        if not page
            page = @_findLRU()
            page.setSource(url)
        page.used = @time
        @time += 1
        return page

    _findPage: (url) ->
        _.find(@pages, (page) ->
            page.source == url
        )

    _findLRU: ->
        min = _.min(page.used for page in @pages)
        _.find(@pages, (page) ->
            page.used == min
        )
        

class App extends Backbone.Router
    initialize: ->
        @homeEl = $('#home')
        @standardContentEl = $('#standard_content')
        @tocEl = $('#table_of_contents')
        @ourOtherPageEl = $('#our_other_page')
        @otherPages = new OtherPages(2)

    index: ->
        $('body').removeClass().addClass('index')
        @standardContentEl.hide()
        @showHome()
        window.router.navigate('')
        document.title = 'Bundlenut'
        if not @indexView
            @indexView = new Index(el: $('#index_content'))
        @view = @indexView

    myGroups: ->
        $('body').removeClass().addClass('mygroups')
        $('#index_content').hide()
        @standardContentEl.show()
        @showHome()
        window.router.navigate('my')
        document.title = 'Bundlenut - My bundles'
        @view = new bn.userView.UserView
            el: @standardContentEl.find('#standard_inner')

    groupEdit: (group) ->
        $('body').removeClass().addClass('groupedit')
        $('#index_content').hide()
        @standardContentEl.show()
        @showHome()
        url = 'e/' + group.id
        editHash = group.get('edit_hash')
        if editHash
            url += '/' + editHash
        window.router.navigate(url)
        document.title = 'Bundlenut - Edit: ' + group.get('name')
        @view = new bn.editor.GroupEdit
            el: @standardContentEl.find('#standard_inner')
            model: group

    groupView: (group) ->
        $('body').removeClass().addClass('groupview')
        @showOurOther()
        window.router.navigate('b/' + group.id)
        document.title = 'Bundlenut - Browse: ' + group.get('name')
        @view = new bn.bbrowser.GroupView
            el: @tocEl
            model: group
        
    showHome: ->
        if @view
            @view.delegateEvents({})
        $('html').removeClass('show_other')
        $('body').addClass('standard')
        @tocEl.addClass('hide')
        @ourOtherPageEl.addClass('hide')
        @otherPages.hide()
        @homeEl.removeClass('hide')

    showOurOther: ->
        if @view
            @view.delegateEvents({})
        $('html').addClass('show_other')
        @homeEl.addClass('hide')
        @otherPages.hide()
        @tocEl.removeClass('hide')
        @ourOtherPageEl.removeClass('hide')

    showOther: ->
        $('html').addClass('show_other')
        @homeEl.addClass('hide')
        @ourOtherPageEl.addClass('hide')
        @tocEl.removeClass('hide')

    frameGo: (url) ->
        @showOther()
        @otherPages.hide()
        page = @otherPages.getPage(url)
        page.show()

window.bn = {}

$( ->
    $('input[name=group_name]').hint()
    
    window.app = new App()
    window.router = new Router()
    Backbone.history.start({pushState: true})
)
