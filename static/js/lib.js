
  bn.lib = {
    jsonRPC: function(funcName, data, success) {
      var onSuccess;
      onSuccess = function(data) {
        return success(JSON.parse(data));
      };
      return $.ajax({
        url: '/api/rpc/' + funcName,
        type: 'post',
        contentType: 'application/json',
        data: JSON.stringify(data),
        success: onSuccess
      });
    },
    max: function(array) {
      return Math.max.apply(Math, array);
    }
  };
