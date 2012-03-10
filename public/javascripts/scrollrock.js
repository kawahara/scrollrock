var conn;
var currentPage;
var next;
var previous;
var gotoSection;
$(function() {
  var WS = window['MozWebSocket'] ? MozWebSocket : WebSocket
    , lastScrollTop = $(document).scrollTop()
    , isUpdate = false
    , token1 = null
    , token2 = null;

  if (WS !== null) {
    conn = new WS('ws://' + document.location.host + "/", 'scrollrock');
    conn.onmessage = function(event) {
      var data = JSON.parse(event.data);

      if (data.operate === 'parent' && data.message === 'ok') {
        token1 = data.token1;
        token2 = data.token2;
      } else if (data.operate === 'goto' && data.params.page) {
        if (data.params.page === '+') {
          next();
        } else if (data.params.page === '-') {
          previous();
        } else {
          var page = parseInt(data.params.page);
          if (!isNaN(page) && page > 0) {
            gotoSection(page);
          }
        }
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
    var obj = $('section').get(sectionNumber - 1),
        t;
    if (obj !== null) {
      t = $(obj).position().top;
      $('html,body').animate({ scrollTop: t }, 'slow', null, function() {
      });
    }
  };

  next = function(event) {
    var st = $(document).scrollTop(), t;
    $('section').each(function () {
      t = $(this).position().top;
      if (st < t) {
        $('html,body').animate({ scrollTop: t }, 'slow', null, function() {
        });
        return false;
      }
    });
  };

  previous = function(event) {
    var st = $(document).scrollTop(), t;
    $($('section').get().reverse()).each(function() {
      t = $(this).position().top;
      if (st > t) {
        $('html,body').animate({ scrollTop: t }, 'slow', null, function() {
        });
        return false;
      }
    });
  };

  var updateCurrentPage = function() {
    var st = $(document).scrollTop()
      , page = 0
      , t;
    $('section').each(function () {
      t = $(this).position().top;
      if (st < t) {
        return false;
      }
      page+=1;
    });

    if (conn.readyState === 1) {
      conn.send(JSON.stringify({'update': {'top': st, 'page': page}}));
    }

    currentPage = page;
  };

  $(window).resize(ajust);
  $(window).keypress(function(event) {
    switch(event.keyCode) {
      case 37: previous(); break;
      case 39: next(); break;
    }
  });
  var observeScrollTop = function() {
    var st = $(document).scrollTop();
    if (lastScrollTop !== st) {
      isUpdate = true;
    } else if (isUpdate) {
      isUpdate = false;
      updateCurrentPage();
    }
    lastScrollTop = st;
    setTimeout(observeScrollTop, 300);
  };
  setTimeout(observeScrollTop, 300);
  ajust();
});
