/*! 
 * viewort-units-buggyfill v0.2.2
 * @web: https://github.com/rodneyrehm/viewort-units-buggyfill/
 * @author: Rodney Rehm - http://rodneyrehm.de/en/
 */
(function (root, factory) {
  'use strict';
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define([], factory);
  } else if (typeof exports === 'object') {
    // Node. Does not work with strict CommonJS, but
    // only CommonJS-like enviroments that support module.exports,
    // like Node.
    module.exports = factory();
  } else {
    // Browser globals (root is window)
    root.viewportUnitsBuggyfill = factory();
  }
}(this, function () {
  'use strict';
  /*global document, window*/

  var viewportUnitExpression = /([0-9.-]+)(vh|vw|vmin|vmax)/g;
  var forEach = [].forEach;
  var join = [].join;
  var dimensions;
  var declarations;
  var styleNode;
  var applicable = true;

  function initialize(force) {
    if (!force && !/ip.+mobile.+safari/i.test(window.navigator.userAgent)) {
      // this buggyfill only applies to mobile safari
      applicable = false;
      return;
    }
    
    styleNode = document.createElement('style');
    styleNode.id = 'patched-viewport';
    document.head.appendChild(styleNode);

    window.addEventListener('orientationchange', updateStyles, true);
    refresh();
  }

  function updateStyles() {
    styleNode.innerText = getReplacedViewportUnits();
  }

  function refresh() {
    if(applicable) {
      findProperties();
      updateStyles();
    }
  }

  function findProperties() {
    declarations = [];
    forEach.call(document.styleSheets, function(sheet) {
      if (sheet.ownerNode.id !== 'patched-viewport' && sheet.cssRules) {
        forEach.call(sheet.cssRules, findDeclarations);
      }
    });
    return declarations;
  }

  function findDeclarations(rule) {
    if (rule.type === 7) {
      var value = rule.cssText;
      viewportUnitExpression.lastIndex = 0;
      if (viewportUnitExpression.test(value)) {
        declarations.push([rule, null, value]);
      }
      return;
    }

    if (!rule.style) {
      if (!rule.cssRules) {
        return;
      }

      forEach.call(rule.cssRules, function(_rule) {
        findDeclarations(_rule);
      });

      return;
    }

    forEach.call(rule.style, function(name) {
      var value = rule.style.getPropertyValue(name);
      viewportUnitExpression.lastIndex = 0;
      if (viewportUnitExpression.test(value)) {
        declarations.push([rule, name, value]);
      }
    });
  }

  function getReplacedViewportUnits() {
    dimensions = getViewport();

    var css = [];
    var buffer = [];
    var open;
    var close;

    declarations.forEach(function(item) {
      var _item = overwriteDeclaration.apply(null, item);
      var _open = _item.selector.length ? (_item.selector.join(' {\n') + ' {\n') : '';
      var _close = new Array(_item.selector.length + 1).join('\n}');

      if (!_open || _open !== open) {
        if (buffer.length) {
          css.push(open + buffer.join('\n') + close);
          buffer.length = 0;
        }

        if (_open) {
          open = _open;
          close = _close;
          buffer.push(_item.content);
        } else {
          css.push(_item.content);
          open = null;
          close = null;
        }

        return;
      }

      if (_open && !open) {
        open = _open;
        close = _close;
      }

      buffer.push(_item.content);
    });

    if (buffer.length) {
      css.push(open + buffer.join('\n') + close);
    }

    return css.join('\n\n');
  }

  function overwriteDeclaration(rule, name, value) {
    var _value = value.replace(viewportUnitExpression, replaceValues);
    var _selectors = [];
    if (name) {
      _selectors.push(rule.selectorText);
      _value = name + ': ' + _value + ';';
    }

    var _rule = rule.parentRule;
    while (_rule) {
      _selectors.unshift('@media ' + join.call(_rule.media, ', '));
      _rule = _rule.parentRule;
    }

    return {
      selector: _selectors,
      content: _value
    };
  }

  function replaceValues(match, number, unit) {
    var _base = dimensions[unit];
    var _number = parseFloat(number) / 100;
    return (_number * _base) + 'px';
  }

  function getViewport() {
    var vh = window.innerHeight;
    var vw = window.innerWidth;
    return {
      vh: vh,
      vw: vw,
      vmax: Math.max(vw, vh),
      vmin: Math.min(vw, vh)
    };
  }

  return {
    version: '0.2.2',
    findProperties: findProperties,
    getCss: getReplacedViewportUnits,
    init: initialize,
    refresh: refresh
  };
}));

/*! Smooth Scroll - v1.4.7 - 2012-10-29
* Copyright (c) 2012 Karl Swedberg; Licensed MIT, GPL */

(function($) {

var version = '1.4.7',
    defaults = {
      exclude: [],
      excludeWithin:[],
      offset: 0,
      direction: 'top', // one of 'top' or 'left'
      scrollElement: null, // jQuery set of elements you wish to scroll (for $.smoothScroll).
                          //  if null (default), $('html, body').firstScrollable() is used.
      scrollTarget: null, // only use if you want to override default behavior
      beforeScroll: function() {},  // fn(opts) function to be called before scrolling occurs. "this" is the element(s) being scrolled
      afterScroll: function() {},   // fn(opts) function to be called after scrolling occurs. "this" is the triggering element
      easing: 'swing',
      speed: 400,
      autoCoefficent: 2 // coefficient for "auto" speed
    },

    getScrollable = function(opts) {
      var scrollable = [],
          scrolled = false,
          dir = opts.dir && opts.dir == 'left' ? 'scrollLeft' : 'scrollTop';

      this.each(function() {

        if (this == document || this == window) { return; }
        var el = $(this);
        if ( el[dir]() > 0 ) {
          scrollable.push(this);
        } else {
          // if scroll(Top|Left) === 0, nudge the element 1px and see if it moves
          el[dir](1);
          scrolled = el[dir]() > 0;
          if ( scrolled ) {
            scrollable.push(this);
          }
          // then put it back, of course
          el[dir](0);
        }
      });

      // If no scrollable elements, fall back to <body>,
      // if it's in the jQuery collection
      // (doing this because Safari sets scrollTop async,
      // so can't set it to 1 and immediately get the value.)
      if (!scrollable.length) {
        this.each(function(index) {
          if (this.nodeName === 'BODY') {
            scrollable = [this];
          }
        });
      }

      // Use the first scrollable element if we're calling firstScrollable()
      if ( opts.el === 'first' && scrollable.length > 1 ) {
        scrollable = [ scrollable[0] ];
      }

      return scrollable;
    },
    isTouch = 'ontouchend' in document;

$.fn.extend({
  scrollable: function(dir) {
    var scrl = getScrollable.call(this, {dir: dir});
    return this.pushStack(scrl);
  },
  firstScrollable: function(dir) {
    var scrl = getScrollable.call(this, {el: 'first', dir: dir});
    return this.pushStack(scrl);
  },

  smoothScroll: function(options) {
    options = options || {};
    var opts = $.extend({}, $.fn.smoothScroll.defaults, options),
        locationPath = $.smoothScroll.filterPath(location.pathname);

    this
    .unbind('click.smoothscroll')
    .bind('click.smoothscroll', function(event) {
      var link = this,
          $link = $(this),
          exclude = opts.exclude,
          excludeWithin = opts.excludeWithin,
          elCounter = 0, ewlCounter = 0,
          include = true,
          clickOpts = {},
          hostMatch = ((location.hostname === link.hostname) || !link.hostname),
          pathMatch = opts.scrollTarget || ( $.smoothScroll.filterPath(link.pathname) || locationPath ) === locationPath,
          thisHash = escapeSelector(link.hash);

      if ( !opts.scrollTarget && (!hostMatch || !pathMatch || !thisHash) ) {
        include = false;
      } else {
        while (include && elCounter < exclude.length) {
          if ($link.is(escapeSelector(exclude[elCounter++]))) {
            include = false;
          }
        }
        while ( include && ewlCounter < excludeWithin.length ) {
          if ($link.closest(excludeWithin[ewlCounter++]).length) {
            include = false;
          }
        }
      }

      if ( include ) {
        event.preventDefault();

        $.extend( clickOpts, opts, {
          scrollTarget: opts.scrollTarget || thisHash,
          link: link
        });

        $.smoothScroll( clickOpts );
      }
    });

    return this;
  }
});

$.smoothScroll = function(options, px) {
  var opts, $scroller, scrollTargetOffset, speed,
      scrollerOffset = 0,
      offPos = 'offset',
      scrollDir = 'scrollTop',
      aniProps = {},
      aniOpts = {},
      scrollprops = [];


  if (typeof options === 'number') {
    opts = $.fn.smoothScroll.defaults;
    scrollTargetOffset = options;
  } else {
    opts = $.extend({}, $.fn.smoothScroll.defaults, options || {});
    if (opts.scrollElement) {
      offPos = 'position';
      if (opts.scrollElement.css('position') == 'static') {
        opts.scrollElement.css('position', 'relative');
      }
    }
  }

  opts = $.extend({link: null}, opts);
  scrollDir = opts.direction == 'left' ? 'scrollLeft' : scrollDir;

  if ( opts.scrollElement ) {
    $scroller = opts.scrollElement;
    scrollerOffset = $scroller[scrollDir]();
  } else {
    $scroller = $('html, body').firstScrollable();
  }

  // beforeScroll callback function must fire before calculating offset
  opts.beforeScroll.call($scroller, opts);

  scrollTargetOffset = (typeof options === 'number') ? options :
                        px ||
                        ( $(opts.scrollTarget)[offPos]() &&
                        $(opts.scrollTarget)[offPos]()[opts.direction] ) ||
                        0;

  aniProps[scrollDir] = scrollTargetOffset + scrollerOffset + opts.offset;
  speed = opts.speed;

  // automatically calculate the speed of the scroll based on distance / coefficient
  if (speed === 'auto') {

    // if aniProps[scrollDir] == 0 then we'll use scrollTop() value instead
    speed = aniProps[scrollDir] || $scroller.scrollTop();

    // divide the speed by the coefficient
    speed = speed / opts.autoCoefficent;
  }

  aniOpts = {
    duration: speed,
    easing: opts.easing,
    complete: function() {
      opts.afterScroll.call(opts.link, opts);
    }
  };

  if (opts.step) {
    aniOpts.step = opts.step;
  }

  if ($scroller.length) {
    $scroller.stop().animate(aniProps, aniOpts);
  } else {
    opts.afterScroll.call(opts.link, opts);
  }
};

$.smoothScroll.version = version;
$.smoothScroll.filterPath = function(string) {
  return string
    .replace(/^\//,'')
    .replace(/(index|default).[a-zA-Z]{3,4}$/,'')
    .replace(/\/$/,'');
};

// default options
$.fn.smoothScroll.defaults = defaults;

function escapeSelector (str) {
  return str.replace(/(:|\.)/g,'\\$1');
}

})(jQuery);


/*
CSS Browser Selector v0.3.5 (Feb 05, 2010)
Rafael Lima (http://rafael.adm.br)
http://rafael.adm.br/css_browser_selector
License: http://creativecommons.org/licenses/by/2.5/
Contributors: http://rafael.adm.br/css_browser_selector#contributors
*/

function css_browser_selector(u){var ua = u.toLowerCase(),is=function(t){return ua.indexOf(t)>-1;},g='gecko',w='webkit',s='safari',o='opera',h=document.documentElement,b=[(!(/opera|webtv/i.test(ua))&&/msie\s(\d)/.test(ua))?('ie ie'+RegExp.$1):is('firefox/2')?g+' ff2':is('firefox/3.5')?g+' ff3 ff3_5':is('firefox/3')?g+' ff3':is('gecko/')?g:is('opera')?o+(/version\/(\d+)/.test(ua)?' '+o+RegExp.$1:(/opera(\s|\/)(\d+)/.test(ua)?' '+o+RegExp.$2:'')):is('konqueror')?'konqueror':is('chrome')?w+' chrome':is('iron')?w+' iron':is('applewebkit/')?w+' '+s+(/version\/(\d+)/.test(ua)?' '+s+RegExp.$1:''):is('mozilla/')?g:'',is('j2me')?'mobile':is('iphone')?'iphone':is('ipod')?'ipod':is('mac')?'mac':is('darwin')?'mac':is('webtv')?'webtv':is('win')?'win':is('freebsd')?'freebsd':(is('x11')||is('linux'))?'linux':'','js']; c = b.join(' '); h.className += ' '+c; return c;}; css_browser_selector(navigator.userAgent);

// html.no-js -> html.js
var elem = document.documentElement;
elem.className = elem.className.replace(/\bno-js\b/,'js');

// usage: log('inside coolFunc',this,arguments);
// http://paulirish.com/2009/log-a-lightweight-wrapper-for-consolelog/
window.log = function(){
  log.history = log.history || [];   // store logs to an array for reference
  log.history.push(arguments);
  if(this.console){
    console.log( Array.prototype.slice.call(arguments) );
  }
};


$(document).ready(function() { // jQuery

viewportUnitsBuggyfill.init();

// detect iphone/ipad
if(navigator.userAgent.match(/iPhone/i)) { $("html").addClass("iphone").addClass("mobile").addClass("ios").addClass("phone"); }
if(navigator.userAgent.match(/Android/i)) { $("html").addClass("android").addClass("mobile").addClass("phone"); }
if(navigator.userAgent.match(/Nokia/i)) { $("html").addClass("nokia").addClass("mobile").addClass("phone"); }
if(navigator.userAgent.match(/iPad/i)) { $("html").addClass("ipad").addClass("ios").addClass("mobile"); }

if (navigator.userAgent.match(/OS 5(_\d)+ like Mac OS X/i)) {
  $('html').addClass('ios5');
}

if($('html.phone').length) {
	$("meta[name=viewport]").attr("content", "width=580");
}

// detect iphone/ipad
if(navigator.userAgent.match(/iPhone/i)) { 
	$("html").addClass("mobile").addClass("iphone"); 
	//$("meta[name=viewport]").attr("content", "width=480");
}
if(navigator.userAgent.match(/Android/i)) { 
	$("html").addClass("android").addClass("mobile"); 
	//$("meta[name=viewport]").attr("content", "width=480");
}
if(navigator.userAgent.match(/iPad/i)) { 
	$("html").addClass("ipad"); 
}
if($(window).width() <= 767) {
	$('html').addClass('mobile');	
}
if($("html.ipad").length) {
window.onorientationchange = detectIPadOrientation; 

	function detectIPadOrientation() {
	
		var landscape = false;
		
		if ( orientation == 0 ) {
		 //alert ('Portrait Mode, Home Button bottom');
		}
		else if ( orientation == 90 ) {
		 //alert ('Landscape Mode, Home Button right');
		 landscape = true;
		}
		else if ( orientation == -90 ) {
		 //alert ('Landscape Mode, Home Button left');
		 landscape = true;
		}
		else if ( orientation == 180 ) {
		 //alert ('Portrait Mode, Home Button top');
		}
		if(landscape) {			
			//$("meta[name=viewport]").attr("content", "width=1156");
		} else {
			//$("meta[name=viewport]").attr("content", "width=650");
		}
	}
	detectIPadOrientation();
}


// Smooth scrolling for internal links
$("a.anchor[href*='#']").click(function(event) {
	
	event.preventDefault();
	
	var $this = $(this),
	target = this.hash,
	$target = $(target);
  //	var off = $("#header").outerHeight()+40;		
	var off = 0;
	
	$.smoothScroll({
  	scrollElement: null,
  	scrollTarget: $(target),
  	offset: -off,
  	easing: 'swing',
  	speed: 400,
  	afterScroll: function() {
    }
  });

	if(window.history && window.history.replaceState) {
		var dat = { foo: "bar" }
		history.replaceState(dat, "hmm", $(this).attr("href"));
	}
});


// $('#header h1').load("/images/deck2.svg");

if (!$("html.inlinesvg").length || $('html.ios5').length) {
  $("h1").first().html('<img src="/images/deck-logo.png" class="svg-fallback">');
}

$('#map').css({ height: $(window).height() +'px' });

$(window).resize(function() {
  
  // force repaint for vm/vh sizes (Chrome bug)
  causeRepaintsOn = $("body, .title");
  causeRepaintsOn.css("z-index", 1);
  
  // resize map to fill screen
  $('#map').css({ height: $(window).height() +'px' });
});

$('.social a').each(function() {

	var link = $(this).html();
	var h = $(this).height()/2;
	
	if(!$('html.touch').length) {
  	$(this).empty().append('<span class="out-state">'+ link + '</span>').append('<span class="in-state">'+ link + '</span>').addClass('letterbox');
  } else {
    $(this).empty().append('<span class="out-state">'+ link + '</span>');
  }
});

// form validation
var $f = $("#enquiry");

// clear input labels on focus
$f.find('input[type=text], input[type=email], textarea').bind("focus", function() {
	$(this).prev("label").css("opacity", 0);
});
$f.find('input[type=text], input[type=email], textarea').bind("focusout, blur", function() {
	if($(this).val() == "")	$(this).prev("label").css("opacity", 100);
});
// clear labels on page load (if back button used from error page, for example)
$f.find('input[type=text], input[type=email], textarea').each(function() {
	if($(this).val() != "")	$(this).prev("label").css("opacity", 0);
});

$f.find('.error, .success').hide();

$f.submit(function(){  

    var error = false;
    
    $("input.required, textarea.required").each(function() {
    	if($(this).val() == "") error = true;
    });

    if(error) {
    
    	$(".error").fadeIn(); 
    	return false;
    	
    } else {
		  
		  var data = $(this).serialize(),
		  url = $(this).attr('action');
		  
      $.post(url, data, function() {
        $f.find(".error").hide();
        $f.addClass('disabled').find('input, textarea').attr('disabled', 'disabled');
        $f.find(".success").fadeIn();
      });
      
      return false;
		     
    }
});

}); // end jQuery