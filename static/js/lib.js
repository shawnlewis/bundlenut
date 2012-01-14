(function() {
  var AssertException;

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
    },
    AssertException: AssertException = (function() {

      function AssertException(message) {
        this.message = message;
      }

      AssertException.prototype.toString = function() {
        return 'AssertException: ' + this.message;
      };

      return AssertException;

    })(),
    assert: function(exp, message) {
      if (!exp) throw new AssertException(message);
    }
  };

}).call(this);
