bn.lib =
    jsonRPC: (funcName, data, success) ->
        onSuccess = (data) ->
            success JSON.parse(data)
        $.ajax
            url: '/api/rpc/' + funcName
            type: 'post'
            contentType: 'application/json'
            data: JSON.stringify(data)
            success: onSuccess

    max: (array) ->
        Math.max.apply(Math, array)

    AssertException: class AssertException
        constructor: (message) ->
            @message = message
        toString: ->
            'AssertException: ' + @message

    assert: (exp, message) ->
        if not exp
            throw new AssertException(message)
