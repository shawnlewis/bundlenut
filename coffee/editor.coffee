class GroupEdit extends Backbone.View
    initialize: (options) ->
        bn.lib.jsonRPC(
            'group_edit_check',
            {'edit_hash': @model.get('edit_hash'),
            'id': @model.id},
            (data) =>
                if data
                    @render()
                else
                    @renderDenied()
        )
        bn.setLoginNexts(null, null)
        @model.itemSet.bind('reset', @render)
        @model.itemSet.bind('add', @itemAdded)
        @model.itemSet.bind('remove', @itemRemoved)

    render: =>
        context = this.model.toJSON()
        context.view_link = '/b/' + this.model.id
        context.user_name = bn.initData.userName
        $(@el).html ich.tpl_groupedit(context)

        if @model.get('anonymous')
            bn.setLoginNexts(null, null)
        else
            bn.setLoginNexts(null, '/')

        i = 1
        for numCell in $('.step_dir .number')
            $(numCell).append($('<div/>').html('#' + i))
            i++
                
        @nameField = new EditableField
            el: @$('.group_name')
            val: @model.get('name')
            blankText: 'Group Name'
        @nameField.bind('change', @changeName)

        @tbody = @$('#items')
        @model.itemSet.each (item) =>
            @addItemView(item)

        @tbody.sortable
            update: @sortUpdate
            helper: (e, ui) ->
                # fix width of helper, which is the object that follows the
                # mouse pointer when dragged.
                for child in ui.children()
                    $(child).width($(child).width())
                return ui

    renderDenied: ->
        $(@el).html ich.tpl_groupeditDenied()

    events:
        'sortupdate #items tbody': 'sortUpdate'
        'keydown': 'doTab'
        'click .add_to_account': 'addToAccount'

    sortUpdate: =>
        @model.setOrdering($(i).attr('data-id') for i in @$('#items tr'))
        @setLast()

    addToAccount: ->
        bn.lib.jsonRPC(
            'add_to_account',
            {'edit_hash': @model.get('edit_hash'),
            'id': @model.id},
            (data) =>
                if data
                    # hacky, we don't replace @model so we still have
                    # editHash even though the rpc just removed it.
                    window.router.navigate('e/' + @model.id)
                        
        )
         
    # tabs through the EditableFields within the #items table. Relies on
    # some of the behavior of EditableField.
    doTab: (e) ->
        if e.keyCode != 9  # tab
            return
        editables = @$('#items .editable')
        focusedIndex = editables.index($('.focused'))
        if focusedIndex != -1
            e.preventDefault()
            $(editables[focusedIndex]).data('view').viewMode()
            nextIndex = focusedIndex + 1
            if nextIndex == editables.length
                nextIndex = 0
            $(editables[nextIndex]).data('view').editMode()

    changeName: (newName) =>
        @model.set('name': newName)
        @model.save()

    itemAdded: (item, itemSet) =>
        bn.lib.assert(item.id == itemSet.at(itemSet.length-1).id)
        @addItemView(item)

    itemRemoved: (item, itemSet) =>
        item.view.remove()

    addItemView: (item) ->
        itemView = new ItemEdit(model: item)
        item.view = itemView
        el = $(itemView.el)
        el.attr('data-id', item.id)
        if @tbody
            @tbody.append(el)
            @setLast()

    setLast: ->
        # last row is styled differently
        @tbody.find('tr').removeClass('last')
        @tbody.find('tr:last').addClass('last')


class ItemEdit extends Backbone.View
    tagName: 'tr'

    initialize: ->
        @render()

    render: ->
        $(@el).html ich.tpl_itemedit(@model.toJSON())
        @titleField = new EditableField
            el: @$('.title')
            val: @model.get('title')
            blankText: 'Title'
        @titleField.bind('change', @changeTitle)
        @urlField = new EditableField
            el: @$('.url')
            val: @model.get('url')
            blankText: 'Link'
        @urlField.bind('change', @changeURL)
        @commentField = new EditableField
            el: @$('.comment')
            editType: 'textarea'
            val: @model.get('comment')
            blankText: 'Comment'
        @commentField.bind('change', @changeComment)

    events:
        'click .delete': 'delete'

    delete: ->
        @model.destroy()

    changeTitle: (newTitle) =>
        @model.set('title': newTitle)
        @model.save()

    changeURL: (newURL) =>
        @model.set('url': newURL)
        @model.save()

    changeComment: (newComment) =>
        @model.set('comment': newComment)
        @model.save()
        

class EditableField extends Backbone.View
    className: 'editable'

    initialize: (options) ->
        $(@el).addClass(@className)
        $(@el).data('view', @)
        @editType = options.editType
        @val = options.val
        @blankText = options.blankText
        @inViewMode = false
        @viewMode()

    viewMode: ->
        if @inViewMode
            return
        $(@el).removeClass('focused')
        @inViewMode = true

        $(@el).empty()
        $(@el).removeClass('blank')
        val = @val
        if not @val
            val = @options.blankText
            $(@el).addClass('blank')

        $(@el).append('<div class="view">' + val + '</div>')
        @delegateEvents
            'click .view': 'editMode'

    toViewMode: (e) ->
        if e.type == 'keydown' and e.keyCode != 13
            return
        @val = @$('.edit').val()
        @trigger('change', @val)
        @viewMode()

    editMode: ->
        if not @inViewMode
            return
        @inViewMode = false
        $(@el).addClass('focused')
        $(@el).empty()
        if @editType and @editType == 'textarea'
            el = $('<textarea />')
            if @val
                el.html(@val)
        else
            el = $('<input />')
            if @val
                el.val(@val)
        el.addClass('edit')
        $(@el).append(el)
        el.focus().select()
        @delegateEvents
            'blur .edit': 'toViewMode'
            'keydown .edit': 'toViewMode'

bn.editor =
    GroupEdit: GroupEdit
