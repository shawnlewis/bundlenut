$(document).ready(function() {
    
    // parseUri 1.2.2
    // (c) Steven Levithan <stevenlevithan.com>
    // MIT License
    function parseUri (str) {
        var o   = parseUri.options,
            m   = o.parser[o.strictMode ? "strict" : "loose"].exec(str),
            uri = {},
            i   = 14;

        while (i--) uri[o.key[i]] = m[i] || "";

        uri[o.q.name] = {};
        uri[o.key[12]].replace(o.q.parser, function ($0, $1, $2) {
            if ($1) uri[o.q.name][$1] = $2;
        });

        return uri;
    };

    parseUri.options = {
        strictMode: false,
        key: ["source","protocol","authority","userInfo","user","password","host","port","relative","path","directory","file","query","anchor"],
        q:   {
            name:   "queryKey",
            parser: /(?:^|&)([^&=]*)=?([^&]*)/g
        },
        parser: {
            strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
            loose:  /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/
        }
    };
    
    // End parseUri

    // http://stackoverflow.com/questions/901115/get-query-string-values-in-javascript
    parseURIParams = function (q) {
        urlParams = {};
        var e,
            a = /\+/g,  // Regex for replacing addition symbol with a space
            r = /([^&=]+)=?([^&]*)/g,
            d = function (s) { return decodeURIComponent(s.replace(a, " ")); }

        while (e = r.exec(q))
           urlParams[d(e[1])] = d(e[2]);
        return urlParams;
    };

    window.toEmbedURL = function(url) {
        parsed = parseUri(url);
        params = parseURIParams(parsed.query);
        if (parsed.host == 'maps.google.com') {
            params.output = 'embed';
        } else if (parsed.host.search('youtube.com') != -1
                   && parsed.path.search('/embed') == -1) {
            vidID = params.v;
            delete params.v;
            parsed.path = '/embed/' + vidID;
        } else {
            return url;
        }
        
        // reconstruct

        // encodeURIComponent
        key_vals = []
        for (var key in params) {
            key_vals.push(key + '=' + encodeURIComponent(params[key]));
        }
        query = key_vals.join('&');
        url = parsed.protocol + '://' + parsed.host + parsed.path;
        if (query) {
            url += '?' + query;
        }
        return url;
    };
});
