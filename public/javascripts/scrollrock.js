var ScrollRock = function() {
  this.currentPage = 1;
  this.observeScInterval = 500;
  this.timer = null;
  this.conn = null;
  this.isUpdate = false;
  this.lastScrollTop = $(document).scrollTop();
};
ScrollRock.prototype.init = function() {
  var t = this;
  this.startObserveScrollTop();
  this.adjustSectionHeight();
  $(window).resize(function() {
    t.adjustSectionHeight.apply(t);
  });
};
ScrollRock.prototype.stopObserveScrollTop = function() {
  if (this.timer !== null)
    clearTimeout(this.timer);
};
ScrollRock.prototype.startObserveScrollTop = function(force) {
  var t = this;
  force = force || false;
  if (this.timer === null || force)
    this.timer = setTimeout(function () {
      t.observeScrollTop.apply(t);
    }, this.observeScInterval);
};
ScrollRock.prototype.observeScrollTop = function(event) {
  var st = $(document).scrollTop();
  if (this.lastScrollTop !== st) {
    this.isUpdate = true;
  } else if (this.isUpdate) {
    this.isUpdate = false;
    this.updateCurrentPage();
  }
  this.lastScrollTop = st;
  this.startObserveScrollTop(true);
};
ScrollRock.prototype.gotoSection = function(page) {
  var sections = $('section')
    , obj
    , topp
    , t = this;

  if (page < 1) {
    page = 1;
  } else if (page > sections.length) {
    page = sections.length;
  }
  obj = sections.get(page - 1);

  if (obj !== null) {
    topp = $(obj).position().top;
    $('html,body').animate({ scrollTop: topp }, 'slow', null, function() {
        t.updateCurrentPage();
    });
  }
};
ScrollRock.prototype.next = function () {
  console.log("Count Down: " + (this.currentPage - 1));
  this.gotoSection(this.currentPage - 1);
};
ScrollRock.prototype.previous = function() {
  console.log("Count Up: " + (this.currentPage + 1));
  this.gotoSection(this.currentPage + 1);
};
ScrollRock.prototype.updateCurrentPage = function() {
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

  if (this.conn && this.conn.readyState === 1) {
    this.conn.send(JSON.stringify({'update': {'top': st, 'page': page}}));
  }

  this.currentPage = page;
};
ScrollRock.prototype.adjustSectionHeight = function() {
  var page = this.currentPage;
  $('section').css('height', $(window).innerHeight());
  this.gotoSection(page);
};
var scrollrock = new ScrollRock();

$(function() {
  var conn
    , WS = window['MozWebSocket'] ? MozWebSocket : WebSocket
    , token1 = null
    , token2 = null
    , controllerPanel = $('<div>');

  // init scrollrock screen
  scrollrock.init();

  //TODO: init controller panel

  // init WebSocket connection
  if (WS !== null) {
    conn = new WS('ws://' + document.location.host + "/", 'scrollrock');
    conn.onmessage = function(event) {
      var data = JSON.parse(event.data);

      if (data.operate === 'parent' && data.message === 'ok') {
        token1 = data.token1;
        token2 = data.token2;
      } else if (data.operate === 'goto' && data.params.page) {
        if (data.params.page === '+') {
          scrollrock.next();
        } else if (data.params.page === '-') {
          scrollrock.previous();
        } else {
          var page = parseInt(data.params.page);
          if (!isNaN(page) && page > 0) {
            scrollrock.gotoSection(page);
          }
        }
      }
    };
    conn.onopen = function(event) {
      conn.send(JSON.stringify({'parent': {}}));
    };

    scrollrock.conn = conn;
  }

  // key bind
  $(window).keypress(function(event) {
    switch(event.keyCode) {
      case 39: scrollrock.previous(); break;
      case 37: scrollrock.next(); break;
    }
  });
});
