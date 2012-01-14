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
        @model.bind('change', @render)

    render: =>
        @model.clean =>
            context = this.model.toJSON()
            context.view_link = '/b/' + this.model.id
            $(@el).html ich.tpl_groupedit(context)

            @nameField = new EditableField
                el: @$('.group_name')
                val: @model.get('name')
                blankText: 'Group Name'
            @nameField.bind('change', @changeName)

            tbody = @$('#items')
            @model.itemSet.each (item) ->
                el = $(new ItemEdit(model: item).el)
                el.attr('data-id', item.id)
                tbody.append(el)

            # last row is styled differently
            tbody.find('tr:last').addClass('last')

            tbody.sortable
                update: @sortUpdate
                helper: (e, ui) ->
                    for child in ui.children()
                        $(child).width($(child).width())
                    return ui

    renderDenied: ->
        $(@el).html ich.tpl_groupeditDenied()

    events:
        'sortupdate #items tbody': 'sortUpdate'

    addItem: ->
        @model.createItem()

    sortUpdate: =>
        @model.setOrdering($(i).attr('data-id') for i in @$('#items tr'))

    changeName: (newName) =>
        @model.set('name': newName)
        @model.save()


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
    initialize: (options) ->
        @editType = options.editType
        @val = options.val
        @blankText = options.blankText
        @inViewMode = false
        @viewMode()

    viewMode: ->
        if @inViewMode
            return
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
