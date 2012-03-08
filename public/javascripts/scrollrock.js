var conn;
var currentPage;
var next;
var previous;
var gotoSection;
$(function() {
  var WS = window['MozWebSocket'] ? MozWebSocket : WebSocket;
  if (WS != null) {
    conn = new WS('ws://' + document.location.host + "/", 'scrollrock');
    conn.onmessage = function(event) {
      if (event.data == 'next') {
        next();
      } else if (event.data == 'previous') {
        previous();
      }
    };
    conn.onopen = function(event) {
      conn.send(JSON.stringify({'parent': {}}));
    };
  }

  var ajust = function(event) {
    $('section').css('height', $(window).innerHeight());
  };

  gotoSection = function(sectionNumber) {
    var obj = $('section').get(sectionNumber - 1);
    if (obj !== null) {
      var t = $(obj).position().top;
      $('html,body').animate({ scrollTop: t }, 'slow');
    }
    updateCurrentPage();
  };

  next = function(event) {
    var st = $(document).scrollTop();
    $('section').each(function () {
      var t = $(this).position().top;
      if (st < t) {
        $('html,body').animate({ scrollTop: t }, 'slow');
        return false;
      }
    });
    updateCurrentPage();
  };

  previous = function(event) {
    var st = $(document).scrollTop();
    $($('section').get().reverse()).each(function() {
      var t = $(this).position().top;
      if (st > t) {
        $('html,body').animate({ scrollTop: t }, 'slow');
        return false;
      }
    });
    updateCurrentPage();
  };

  var updateCurrentPage = function(event) {
    var st = $(document).scrollTop();
    var page = 0;
    $('section').each(function () {
      var t = $(this).position().top;
      if (st < t) {
        return false;
      }
      page++;
    });

    if (conn.readyState === 1) {
        conn.send(JSON.stringify({'update': {'top': 0, 'page': page}}));
    }

    currentPage = page;
  };

  $(window).resize(ajust);
  $(window).scroll(updateCurrentPage);
  $(window).keypress(function(event) {
    switch(event.keyCode) {
      case 37: previous(); break;
      case 39: next(); break;
    }
  });
  ajust();
});
