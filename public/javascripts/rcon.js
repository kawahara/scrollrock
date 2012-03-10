$(function() {
  var WS = window['MozWebSocket'] ? MozWebSocket : WebSocket
    , conn
    , isConnected = false;

  $("#controller").hide();

  $("#setting-form").submit(function(event) {
    var token = $(event.target).children("input[name=key]").val();
    connect(token);

    return false;
  });

  $("#next").click(function(event) {
    if (!isConnected) {
      return false;
    }

    conn.send(JSON.stringify({'goto': {'page': '+'}}));
    return false;
  });


  $("#prev").click(function(event) {
    if (!isConnected) {
      return false;
    }

    conn.send(JSON.stringify({'goto': {'page': '-'}}));
    return false;
  });


  var connect = function(key) {
    if (WS !== null) {
      conn = new WS('ws://' + document.location.host + "/", 'scrollrock');
      conn.onmessage = function(event) {
        var data = JSON.parse(event.data);
        console.debug(data);

        if (!data) return false;

        if (data.operate === 'rcontroll' && data.message === 'fail') {
          conn.close();

          return false;
        }

        if (data.operate === 'rcontroll' && data.message === 'ok') {
          $("#setting-form").hide();
          $("#controller").show();
          isConnected = true;
        } else if (data.operate === 'update' && data.params) {
          if (data.params.page) {
            $("#page-info").text(data.params.page);
          }
        }
      };
      conn.onopen = function(event) {
        conn.send(JSON.stringify({'rcontroll': {token: key}}));
      };
    }
  };

});
