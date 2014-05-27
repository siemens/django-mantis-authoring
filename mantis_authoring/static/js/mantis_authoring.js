/****************************************************************
Polyfills and global helper funtions
****************************************************************/
(function ($) {
    window.getCookie = function(name){
	var cookieValue = null;
	if (document.cookie && document.cookie != '') {
            var cookies = document.cookie.split(';');
            for (var i = 0; i < cookies.length; i++) {
		var cookie = $.trim(cookies[i]);
		// Does this cookie string begin with the name we want?
		if (cookie.substring(0, name.length + 1) == (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
		}
            }
	}
	return cookieValue;
    }

    window.csrfSafeMethod = function(method){
	// these HTTP methods do not require CSRF protection
	return (/^(GET|HEAD|OPTIONS|TRACE)$/.test(method));
    }

    window.sameOrigin = function(url){
	// test that a given url is a same-origin URL
	// url could be relative or scheme relative or absolute
	var host = document.location.host; // host + port
	var protocol = document.location.protocol;
	var sr_origin = '//' + host;
	var origin = protocol + sr_origin;
	// Allow absolute or scheme relative URLs to same origin
	return (url == origin || url.slice(0, origin.length + 1) == origin + '/') ||
            (url == sr_origin || url.slice(0, sr_origin.length + 1) == sr_origin + '/') ||
            // or any other URL that isn't scheme relative or absolute i.e relative.
            !(/^(\/\/|http:|https:).*/.test(url));
    }

    window.deepCompare = function () {
	var leftChain, rightChain;

	function compare2Objects (x, y) {
	    var p;

	    // remember that NaN === NaN returns false
	    // and isNaN(undefined) returns true
	    if (isNaN(x) && isNaN(y) && typeof x === 'number' && typeof y === 'number') {
		return true;
	    }

	    // Compare primitives and functions.
	    // Check if both arguments link to the same object.
	    // Especially useful on step when comparing prototypes
	    if (x === y) {
		return true;
	    }

	    // Works in case when functions are created in constructor.
	    // Comparing dates is a common scenario. Another built-ins?
	    // We can even handle functions passed across iframes
	    if ((typeof x === 'function' && typeof y === 'function') ||
		(x instanceof Date && y instanceof Date) ||
		(x instanceof RegExp && y instanceof RegExp) ||
		(x instanceof String && y instanceof String) ||
		(x instanceof Number && y instanceof Number)) {
		return x.toString() === y.toString();
	    }

	    // At last checking prototypes as good a we can
	    if (!(x instanceof Object && y instanceof Object)) {
		return false;
	    }

	    if (x.isPrototypeOf(y) || y.isPrototypeOf(x)) {
		return false;
	    }

	    if (x.constructor !== y.constructor) {
		return false;
	    }

	    if (x.prototype !== y.prototype) {
		return false;
	    }

	    // check for infinitive linking loops
	    if (leftChain.indexOf(x) > -1 || rightChain.indexOf(y) > -1) {
		return false;
	    }

	    // Quick checking of one object beeing a subset of another.
	    // todo: cache the structure of arguments[0] for performance
	    for (p in y) {
		if (y.hasOwnProperty(p) !== x.hasOwnProperty(p)) {
		    return false;
		}
		else if (typeof y[p] !== typeof x[p]) {
		    return false;
		}
	    }

	    for (p in x) {
		if (y.hasOwnProperty(p) !== x.hasOwnProperty(p)) {
		    return false;
		}
		else if (typeof y[p] !== typeof x[p]) {
		    return false;
		}

		switch (typeof (x[p])) {
		case 'object':
		case 'function':

                    leftChain.push(x);
                    rightChain.push(y);

                    if (!compare2Objects (x[p], y[p])) {
			return false;
                    }

                    leftChain.pop();
                    rightChain.pop();
                    break;

		default:
                    if (x[p] !== y[p]) {
			return false;
                    }
                    break;
		}
	    }

	    return true;
	}

	if (arguments.length < 1) {
	    return true; //Die silently? Don't know how to handle such case, please help...
	    // throw "Need two or more arguments to compare";
	}

	for (var i = 1, l = arguments.length; i < l; i++) {

	    leftChain = []; //todo: this can be cached
	    rightChain = [];

	    if (!compare2Objects(arguments[0], arguments[i])) {
		return false;
	    }
	}
	return true;
    }

    function s4(){
	return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    }
    window.guid_gen = function(){
	return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
            s4() + '-' + s4() + s4() + s4();
    }

    window.uniqueArray = function(array){
	return $.grep(array, function(el, index) {
            return index == $.inArray(el, array);
	});
    }

    window.querystring = function(key) {
	var re=new RegExp('(?:\\?|&)'+key+'=(.*?)(?=&|$)','gi');
	var r=[], m;
	while ((m=re.exec(document.location.search)) != null) r.push(m[1]);
	return r;
    }



    /**
     * Logs a message, which is shown to the user and removed again after a specified timeout
     * @param {string} message
     * @param {string} type
     * @param {number} timeout Time after which the message should disappear
     */
    window.log_message = function(message, type, timeout){
	type = type || 'info';
	var message_row = $('<li class="dda-grp-message grp-'+type+'"></li>').text(message);
	message_row.append(
	    $('<span class="ui-icon ui-icon-close pull-right"></span>').click(function(){
		$(this).parent().remove();
	    })
	);
	var message_container = $('#dda-messages > .grp-messagelist').first();

	if(type=="info")
	    message_row.prepend('<span class="ui-icon ui-icon-info"></span>');
	else if(type=="success")
	    message_row.prepend('<span class="ui-icon ui-icon-check"></span>');
	else if(type=="error")
	    message_row.prepend('<span class="ui-icon ui-icon-alert"></span>');

	var msg = message_row.appendTo(message_container);
	if(timeout!=undefined && timeout!=NaN && timeout > 0)
	    msg.delay(timeout).queue(function() {
		$(this).remove();
	    });
    };
}(django.jQuery)); // Reuse django injected jQuery library


/* Prevent dropping files on browser window */
window.addEventListener("dragover",function(e){
    e = e || event;
    e.preventDefault();
},false);
window.addEventListener("drop",function(e){
    e = e || event;
    e.preventDefault();
},false);

/* Object.create polyfill */
if (typeof Object.create !== 'function') {
    Object.create = function (o) {
        function F() {}
        F.prototype = o;
        return new F();
    };
}




/****************************************************************
Main startup functionality below
****************************************************************/
(function ($) {
    'use strict';


    /* jQuery configuration and helper plugins */
    $.ajaxSetup({
	beforeSend: function(xhr, settings) {
            if (!csrfSafeMethod(settings.type) && sameOrigin(settings.url)) {
		// Send the token to same-origin, relative URLs only.
		// Send the token only if the method warrants CSRF protection
		// Using the CSRFToken value acquired earlier
		xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
            }
	}
    });

    // Custom autocomplete widget 
    $.widget( "custom.ddacomplete", $.ui.autocomplete, {
        _renderMenu: function( ul, items ) {
            var that = this,
            currentCategory = "";
            $.each( items, function( index, item ) {
                if ( item.category != currentCategory ) {
                    ul.append( "<li class='dda-autocomplete-cat'>" + item.category + "</li>" );
                    currentCategory = item.category;
                }
                that._renderItemData( ul, item );
            });
        },
        _renderItem: function( ul, item ) {
            return $( "<li>" )
                .append( "<a>" + item.id + '<br><span class="dda-autocomplete-desc">' + item.label + '</span></a>')
                .appendTo( ul );
        }
    });

    // jQuery object serialization plugin
    $.fn.serializeObject = function(){
	var o = {};
	var a = this.serializeArray();
	$.each(a, function() {
	    if (o[this.name]) {
		if (!o[this.name].push) {
		    o[this.name] = [o[this.name]];
		}
		o[this.name].push(this.value || '');
	    } else {
		o[this.name] = this.value || '';
	    }
	});
	return o;
    };
    $.fn.outerHtml = function() {
	return $($('<div></div>').html(this.clone())).html();
    }



    /* 
     * Now require our main app components and build the thing! 
     */
    require.config({
	shim: {
            d3: {
		exports: 'd3'
            }
	},
	paths: {
            "datetimepicker": "../jquery-ui.timepicker",
	    "dropzone": "../dropzone",
	    "d3": "../d3.min",
	    //"ace": "../ace" // ACE included via <script> tag, since ACE via require.js has a bug
	    "dust": "../dust-full.min",
	}
    });
    define('jquery', [], function() { return $; });
    require(['BaseClass', 
	     'ObservablesTab', 
	     'TestMechanismsTab', 
	     'IndicatorsTab', 
	     'CampaignsTab', 
	     'ThreatActorsTab',
	     'ObjectRelationsTab'], 
	    function(BaseClass, ObservablesTab, TestMechanismsTab, IndicatorsTab, CampaignsTab, ThreatActorsTab, ObjectRelationsTab){

		// Extend our builder prototype base class with the loaded parts
		var builderPrototype = $.extend(BaseClass, 
						ObservablesTab,
						TestMechanismsTab,
						IndicatorsTab,
						CampaignsTab,
						ThreatActorsTab,
						ObjectRelationsTab
					       );

		

		
		// Factory function to create a new builder object
		function createBuilder(overrides) {
		    overrides = overrides || {};
		    var instance = Object.create(builderPrototype);
		    return $.extend(instance, overrides);
		}

		// Our builder instance
		var builder = createBuilder();
		builder.init();
	    });

}(django.jQuery)); // Reuse django injected jQuery library
