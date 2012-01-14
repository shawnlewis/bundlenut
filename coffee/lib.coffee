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
