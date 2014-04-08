$(function() {

    function getCookie(name){
	var cookieValue = null;
	if (document.cookie && document.cookie != '') {
            var cookies = document.cookie.split(';');
            for (var i = 0; i < cookies.length; i++) {
		var cookie = jQuery.trim(cookies[i]);
		// Does this cookie string begin with the name we want?
		if (cookie.substring(0, name.length + 1) == (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
		}
            }
	}
	return cookieValue;
    }

    function csrfSafeMethod(method){
	// these HTTP methods do not require CSRF protection
	return (/^(GET|HEAD|OPTIONS|TRACE)$/.test(method));
    }
    function sameOrigin(url){
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

    function deepCompare () {
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
    };
    function guid_gen(){
	return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
            s4() + '-' + s4() + s4() + s4();
    };
    function uniqueArray(array){
	return $.grep(array, function(el, index) {
            return index == $.inArray(el, array);
	});
    }

    function querystring(key) {
        var re=new RegExp('(?:\\?|&)'+key+'=(.*?)(?=&|$)','gi');
        var r=[], m;
        while ((m=re.exec(document.location.search)) != null) r.push(m[1]);
        return r;
    }


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



    /*
     * Logs a message, which is shown to the user and removed again after a specified timeout
     */
    function log_message(message, type, timeout){
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


    /*
     * The main builder object.
     */
    var builder = function(){
	var instance = this;

	this.pool_list = $('#dda-pool-list');
	this.pool_elements = $('#dda-pool-elements');
	this.pool_elements_templates = $('#dda-observable-template-pool > div');
	this.pool_indicator_templates = $('#dda-indicator-template-pool > div');
	this.pool_campaign_templates = $('#dda-campaign-template-pool > div');
	this.pool_threatactor_templates = $('#dda-threatactor-template-pool > div');
	this.observable_pool = $('#dda-observable-pool');
	this.indicator_list = $('#dda-indicator-list');
	this.package_indicators = $('#dda-package-indicators');

	this.load_name = false; // Holds the name of the currently loaded template-json
	this.load_uuid = false; // Holds the uuid of the currently loaded template-json
	this._last_save = false; // last saved json for change-detection

	this.observable_registry = {}; // Holds the observables currently loaded
	this.indicator_registry = {}; // Holds the indicators currently loaded

	/****************************************************************
	 Init each tab
	****************************************************************/

	// Stix package tab
	this.init_stix_package_tab = function(){
	    // Reset GUI because some browsers keep values in inputs on reload
	    this.reset_gui();

	    // Add various buttons to the tab's content; TODO: move to template?
	    var get_jsn_btn = $('<button>Show JSON</button>').button().click(function(){
		result = JSON.stringify(instance.get_json(), null, "    ");
		var dlg = $('<div id="dda-show-json-dlg" title="JSON"><div id="dda-show-json-edit"></div></div>');
		dlg.dialog({
		    width: 600, height: 750, modal: true,
		    beforeClose: function( event, ui ) {
			var editor = ace.edit('dda-show-json-edit');
			editor.destroy();
			$('#dda-show-json-edit').remove();
		    },
		    resizeStop: function( event, ui ) {
			var editor = ace.edit('dda-show-json-edit');
			editor.resize();
		    }
		});
		var editor = ace.edit('dda-show-json-edit');
		editor.setReadOnly(true);
		editor.getSession().setMode("ace/mode/javascript");
		editor.setValue(result);
	    });
	    //$('#dda-stix-generate').after(get_jsn_btn);

	    var import_jsn_btn = $('<button>Import JSON</button>').button().click(function(){
		result = JSON.stringify(instance.get_json(), null, "    ");
		var dlg = $('<div id="dda-import-json-dlg" title="JSON"><div id="dda-import-json-edit"></div></div>');
		dlg.dialog({
		    width: 600, height: 750, modal: true,
		    beforeClose: function( event, ui ) {
			var editor = ace.edit('dda-import-json-edit');
			editor.destroy();
			$('#dda-import-json-edit').remove();
		    },
		    resizeStop: function( event, ui ) {
			var editor = ace.edit('dda-import-json-edit');
			editor.resize();
		    }
		});
		var editor = ace.edit('dda-import-json-edit');
		editor.getSession().setMode("ace/mode/javascript");

		var btn = $('<button class="pull-right">Ok</button>').button().click(function(){
		    var ta_val = editor.getValue();
		    try {
			jsonlint.parse(ta_val);
			ta_val = $.parseJSON(ta_val);
		    }catch (err){
			alert(err);
			ta_val = '';
		    }
		    if(ta_val!=''){
			instance.load_from_json(ta_val);
			instance.refresh_stix_package_tab();
			dlg.dialog('close');
		    }
		}).css('margin-right', '15px');
		dlg.append(
		    btn
		);
	    });
	    //$('#dda-stix-generate').after(import_jsn_btn);

	};




	// Campaign tab
	this.init_campaign_tab = function(){
	    var template = instance.pool_campaign_templates.first();
	    var ne = template.clone();
	    var from = ne.find('#id_activity_timestamp_from');
	    var to = ne.find('#id_activity_timestamp_to');

	    from.datetimepicker({
		timeFormat: 'HH:mm z',
		onClose: function(dateText, inst) {
		    if (to.val() != '') {
			var testStartDate = from.datetimepicker('getDate');
			var testEndDate = to.datetimepicker('getDate');
			if (testStartDate > testEndDate)
			    to.datetimepicker('setDate', testStartDate);
		    }
		    else {
			to.val(dateText);
		    }
		},
		onSelect: function (selectedDateTime){
		    to.datetimepicker('option', 'minDate', from.datetimepicker('getDate') );
		}
	    });
	    to.datetimepicker({
		timeFormat: 'HH:mm z',
		onClose: function(dateText, inst) {
		    if (from.val() != '') {
			var testStartDate = from.datetimepicker('getDate');
			var testEndDate = to.datetimepicker('getDate');
			if (testStartDate > testEndDate)
			    from.datetimepicker('setDate', testEndDate);
		    }
		    else {
			from.val(dateText);
		    }
		},
		onSelect: function (selectedDateTime){
		    from.datetimepicker('option', 'maxDate', to.datetimepicker('getDate') );
		}
	    });
	    $('#dda-campaign-container').append(ne);


	    // We inject the threat actor information right after the
	    // campaign info, because currently, we only allow one
	    // campaign and one threat actor associated with it
	    var ta_template = instance.pool_threatactor_templates.first();
	    ne.after(ta_template.clone())
		.after('<br><h3>Threat Actor Information</h3>');

	};




	// Observable pool tab
	this.init_observable_pool_tab = function(){
	    $.each(instance.pool_elements_templates, function(i,v){
		var div = $('<div class="dda-add-element clearfix" ></div>');
		div.append(
		    $('<object></object>').attr('data', $(v).find('#id_I_icon').val())
			.attr('type', 'image/svg+xml')
			.addClass('pull-left')
			.css({'width': '30px', 'margin-right': '5px'})
		);
		div.append(
		    $('<button class="dda-obs-add pull-right"></button>').button({
			icons: {
			    primary: 'ui-icon-circle-plus'
			},
			text: false
		    }).click(function(){
			instance.obs_pool_add_elem($(v).attr('id'));
		    })
		);

		var title = $('#id_I_object_display_name',v).val();
		var description = '';

		div.append('<h3>'+title+'</h3>');
		div.append('<p>'+description+'</p>');

		instance.pool_elements.append(div);
	    });

	    instance._pc_el_shown=true;
	    $('#dda-template-head-toogle').click(function(){
		if(instance._pc_el_shown)
		    $('.dda-pool-element', '#dda-pool-list').parent().hide();
		else
		    $('.dda-pool-element', '#dda-pool-list').parent().show();
		instance._pc_el_shown = !instance._pc_el_shown;
	    });

	};




	// Indicator pool tab
	this.init_indicator_pool_tab = function(){
	    $('#dda-indicator-add-btn').button({
		icons:{
		    primary: 'ui-icon-circle-plus'
		}
	    }).click(function(){
		instance.ind_pool_add_elem();
	    });

	};



	// Object relations tab
	this.init_object_relations_tab = function(){
            var getData = function(){
		var data_set = [];
		$.each(instance.observable_registry, function(i,v){
                    data_set.push(v);
		});
		return data_set;
            };

            var getLinks = function() {
		var data_set = getData();
		return data_set.reduce( function( initial, element) {
                    return initial.concat(
			element.relations.map( function( relation) {
                            var src, tgt;
                            $.each(data_set, function(i,v){
				if(v.observable_id == relation.target)
                                    tgt=i;
				if(v.observable_id == element.observable_id)
                                    src = i;
                            });
                            return { source : src, target : tgt};
			})
                    );
		}, []);
            };

	    var getLabelAnchors = function(){
		var data_set = [];
		$.each(instance.observable_registry, function(i,v){
		    // Push twice for object pairs; Link will then be like 0,1 - 2,3 - 4,5
                    data_set.push({
			node: v,
			x: v.x,
			y: v.y,
			px: v.px,
			py: v.py
		    });
		    data_set.push({
			node : v,
			x: v.x,
			y: v.y,
			px: v.px,
			py: v.py
		    });
		});
		return data_set;
	    };

	    var getLabelAnchorLinks = function(){
		var node_set = [];
		var c = 0;
		$.each(instance.observable_registry, function(i,v){
		    node_set.push({
			source : c * 2,
			target : c * 2 + 1
		    });
		    c++;
		});
		return node_set;
	    };

	    var width = $('#relation-pane').width(),
	    height = $('#relation-pane').height(),
	    fill = d3.scale.category10();


	    var selected_node = null,
	    selected_link = null,
	    mousedown_link = null,
	    mousedown_node = null,
	    mouseup_node = null;

	    var outer = d3.select("#relation-pane")
		.append("svg:svg")
		.attr("width", width)
		.attr("height", height)
		.attr("pointer-events", "all");

	    var zoom = d3.behavior.zoom().on("zoom", rescale);

	    var vis = outer
		.append('svg:g')
		.call(zoom)
		.on("dblclick.zoom", null)
		.append('svg:g')
		.on("mousemove", mousemove)
		.on("mousedown", mousedown)
		.on("mouseup", mouseup);

	    vis.append('svg:rect')
		.attr('width', width)
		.attr('height', height)
		.attr('fill', 'white');

	    // build the arrow.
	    vis.append("svg:defs").selectAll("marker")
		.data(["end"])      // Different link/path types can be defined here
		.enter().append("svg:marker")    // This section adds in the arrows
		.attr("id", String)
		.attr("viewBox", "0 -5 10 10")
		.attr("refX", 16)
		.attr("refY", 0)
		.attr("markerWidth", 6)
		.attr("markerHeight", 6)
		.attr("orient", "auto")
		.append("svg:path")
		.attr("d", "M0,-5L10,0L0,5");


	    // init force layout for nodes
	    var force = d3.layout.force()
		.size([width, height])
		.nodes(getData()) // initialize with a single node
		.links(getLinks())
		.linkDistance(150).charge(-800)
		.on("tick", tick);

	    // force layout for labels
	    var force2 = d3.layout.force()
	    	.nodes(getLabelAnchors())
	    	.links(getLabelAnchorLinks())
	    	.gravity(0).linkDistance(0).linkStrength(0.7).charge(-100)
	    	.size([width, height]);


	    // line displayed when dragging new nodes
	    var drag_line = vis.append("line")
		.attr("class", "drag_line")
		.attr("x1", 0)
		.attr("y1", 0)
		.attr("x2", 0)
		.attr("y2", 0);

	    // get layout properties
	    var nodes = force.nodes();
	    var links = force.links();
	    var labelAnchors = force2.nodes();
	    var labelLinks = force2.links();

	    node = vis.selectAll('.node'),
	    link = vis.selectAll('.link');
	    labelAnchor = vis.selectAll('.labelAnchor');
	    labelLink = vis.selectAll('.labelLink');


	    // add keyboard callback
	    d3.select(window)
		.on("keydown", keydown);



	    function mousedown() {
		if (!mousedown_node && !mousedown_link) {
		    // allow panning if nothing is selected
		    vis.call(d3.behavior.zoom().on("zoom", rescale));
		    return;
		}

	    }

	    function mousemove() {
		if (!mousedown_node) return;

		coordinates = d3.mouse(this);
		var x = coordinates[0];
		var y = coordinates[1];
		// update drag line
		drag_line
		    .attr("x1", mousedown_node.x)
		    .attr("y1", mousedown_node.y)
		    .attr("x2", x)
		    .attr("y2", y);

	    }

	    function mouseup() {
		if (mousedown_node) {
		    // hide drag line
		    drag_line
			.attr("class", "drag_line_hidden")

		    if (!mouseup_node) {
			// no target node
		    }

		    instance._d3_redraw();
		}
		// clear mouse event vars
		resetMouseVars();
	    }

	    function resetMouseVars() {
		mousedown_node = null;
		mouseup_node = null;
		mousedown_link = null;
	    }


	    var updateLink = function() {
		this.attr("x1", function(d) {
		    return d.source.x;
		}).attr("y1", function(d) {
		    return d.source.y;
		}).attr("x2", function(d) {
		    return d.target.x;
		}).attr("y2", function(d) {
		    return d.target.y;
		});

	    }

	    var updateNode = function() {
		this.attr("transform", function(d) {
		    return "translate(" + d.x + "," + d.y + ")";
		});
	    }

	    function tick() {

		// Correct position of the nodes
		node.call(updateNode);
		labelAnchor.each(function(d,i){
		    if(i % 2 == 0) {
			d.x = d.node.x;
			d.y = d.node.y;
		    } else {
			var _b = this.childNodes[0];
			try{
			    var b = _b.getBBox();
			}catch(e){
			    return;
			}

			var diffX = d.x - d.node.x;
			var diffY = d.y - d.node.y;

			var dist = Math.sqrt(diffX * diffX + diffY * diffY);

			var shiftX = b.width * (diffX - dist) / (dist * 2);
			shiftX = Math.max(-b.width, Math.min(0, shiftX));
			var shiftY = 5;

			this.childNodes[0].setAttribute("transform", "translate(" + shiftX + "," + shiftY + ")");
		    }
		});
		labelAnchor.call(updateNode);

		// Correct position of links
		//link.call(updateLink);
		link.attr("d", function(d) {
		    var dx = d.target.x - d.source.x,
		    dy = d.target.y - d.source.y;
		    return "M" + d.source.x + "," + d.source.y + " " + d.target.x + "," + d.target.y;
		});
		labelLink.call(updateLink);
	    }

	    // rescale g
	    function rescale() {
		trans=d3.event.translate;
		scale=d3.event.scale;

		vis.attr("transform", "translate(" + trans + ") scale(" + scale + ")");
	    }

	    // redraw force layout
	    instance._d3_redraw = function(load){
		if(typeof(load)==='undefined') load = false;
		if(load){
		    force2.nodes(getLabelAnchors());
		    force2.links(getLabelAnchorLinks());
		    force.nodes(getData());
		    force.links(getLinks());
		    //reset zoom
		    zoom.scale(1);
		    zoom.translate([0,0])
		    vis.transition().duration(200).attr('transform', 'translate(' + zoom.translate() + ') scale(' + zoom.scale() + ')')
		}
		nodes = force.nodes();
		links = force.links();
		labelLinks = force2.links();
		labelAnchors = force2.nodes();



		// Create the links between the nodes
		link = link.data(links);
		link.enter().insert("path", ".node")
		    .attr("class", "link").attr('marker-end', 'url(#end)')
		    .on("mousedown",
			function(d) {
			    mousedown_link = d;
			    if (mousedown_link == selected_link) selected_link = null;
			    else selected_link = mousedown_link;
			    if(selected_link!==null){
				//select the relation type from the list
				$.each(selected_link.source.relations, function(i,v){
				    if(v.target==selected_link.target.observable_id){
					$('input[value="'+v.label+'"]').parent('.dda-add-element').click();
				    }
				});
			    }
			    selected_node = null;
			    instance._d3_redraw();
			})
		link.exit().remove();

		link.classed("link_selected", function(d) { return d === selected_link; });







		// Create the node labels
		labelAnchor = labelAnchor.data(labelAnchors);
		labelAnchor.enter().insert('g').attr('class', 'labelAnchor')
		    .append('text').style("fill", "#555").style("font-family", "Arial").style("font-size", 12);
		labelAnchor.exit().remove();

		//Update labels
		labelAnchor.select('text').each(function(d,i){
		    if(i % 2 !== 0){
			d3.select(this).select('tspan').remove();
			d3.select(this).append('tspan').attr({'x': 0, 'y': '0em'}).text(d.node.type);
			var _n = instance.get_obs_elem_desc_name(d.node, '', 13);
			if(_n!='')
			    d3.select(this).append('tspan').attr({'x': 0, 'y': '1.2em'}).text(_n);
		    }
		});

		//Link the node labels
		labelLink = labelLink.data(labelLinks);
		labelLink.exit().remove();





		// Create the data nodes
		node = node.data(nodes);
		node.enter()
		    .insert("g").attr("class", "node").append('circle').attr('r', 10).attr('style', function(d){return 'fill:'+fill(d.type)+';opacity:1;'})
		    .on("mousedown",
			function(d) {

			    // disable zoom
			    vis.call(d3.behavior.zoom().on("zoom", null));

			    mousedown_node = d;
			    if (mousedown_node == selected_node) selected_node = null;
			    else selected_node = mousedown_node;
			    selected_link = null;

			    // reposition drag line
			    drag_line
				.attr("class", "link")
				.attr("x1", mousedown_node.x)
				.attr("y1", mousedown_node.y)
				.attr("x2", mousedown_node.x)
				.attr("y2", mousedown_node.y);

			    instance._d3_redraw();
			})
		    .on("mousedrag",
			function(d) {
			    // instance._d3_redraw();
			})
		    .on("mouseup",
			function(d) {
			    if (mousedown_node) {
				mouseup_node = d;
				if (mouseup_node == mousedown_node) {
				    instance.obs_elem_restore_from_preview();

				    $('#dda-relation-object-details').append(
					mouseup_node.element.find('.dda-pool-element')
				    );
				    resetMouseVars();
				    return;
				}

				// add link
				var link = {source: mousedown_node, target: mouseup_node};

				//check if relation already exists
				var rel = instance.observable_registry[mousedown_node.observable_id].relations;
				rel_exists=false;
				$.each(rel, function(i,v){
				    if(v.target==mouseup_node.observable_id){
					rel_exists = true;
					return false;
				    }
				});

				if(!rel_exists){

				    instance.observable_registry[mousedown_node.observable_id].relations.push({
					label: $('input[name="dda-selected-relation"]:checked').val(),
					target: mouseup_node.observable_id
				    });
				}

				// select new link
				selected_link = link;
				selected_node = null;

				// enable zoom
				vis.call(d3.behavior.zoom().on("zoom", rescale));

				resetMouseVars();
				drag_line.attr("class", "drag_line_hidden");
				instance._d3_redraw(true);
				return;
			    }
			})
		    .transition()
		    .duration(500)
		    .ease("elastic");


		node.exit().transition()
		    .attr("r", 0)
		    .remove();

		node.classed("node_selected", function(d) { return d === selected_node; });






		if (d3.event) {
		    // prevent browser's default behavior
		    d3.event.stopPropagation();
		    d3.event.preventDefault();
		}

		force2.start();
		force.start();
	    }

	    function spliceLinksForNode(node) {
		toSplice = links.filter(
		    function(l) {
			return (l.source === node) || (l.target === node); });
		toSplice.map(
		    function(l) {
			links.splice(links.indexOf(l), 1); });
	    }

	    function keydown() {
		if (!selected_node && !selected_link) return;
		switch (d3.event.keyCode) {
		case 8: // backspace
		case 46: { // delete
		    if (selected_link) {
			// Remove the relation from the source object
			var src = selected_link.source.observable_id;
			var tgt = selected_link.target.observable_id;

			var source_relations = instance.observable_registry[src].relations
			var new_rel = [];
			$.each(source_relations, function(i,v){
			    if(v.target!=tgt)
				new_rel.push(v);
			});
			instance.observable_registry[src].relations = new_rel;

			links.splice(links.indexOf(selected_link), 1);
		    }
		    selected_link = null;
		    selected_node = null;
		    instance._d3_redraw();
		    break;
		}
		}
	    }


	    instance._d3_redraw();
	};





	/****************************************************************
	 Refresh functions for each tab
	***************************************************************/

	// Stix package tab
	this.refresh_stix_package_tab = function(){
	    // First clear all entries
	    instance.package_indicators.html('');


	    function isObservableInIndicator(id){
		var ret = false;
		$.each(instance.indicator_registry, function(i,v){
		    if($.inArray(id, v.observables)!==-1){
			ret = true;
			return false;
		    }
		});
		return ret;
	    }

	    //Init the observable pool
	    instance.observable_pool.html('');
	    $.each(instance.observable_registry, function(i,v){
		var div = $('<div class="dda-add-element clearfix" ></div>').data('id', i);
		if(isObservableInIndicator(v.observable_id))
		    div.append('<span class="pull-right">+</span>')
		div.append('<h3>'+$('#id_I_object_display_name', $('#'+v.template)).val()+'</h3>');
		desc = instance.get_obs_elem_desc_name(v, i);
		div.append('<p>'+desc+'</p>');

		div.draggable({
		    "helper": "clone",
		    "zIndex": 300,
		    "refreshPositions": true,
		    "start": function(event, ui) {
			$(".dda-package-indicators_dropzone").addClass("dda-dropzone-highlight");
		    },
		    "stop": function(event, ui) {
			$(".dda-package-indicators_dropzone").removeClass("dda-dropzone-highlight");
		    }
		});

		instance.observable_pool.prepend(div);
	    });


	    // Add a dropzone element for dropping observables on non-indicators
	    instance.package_indicators
		.append($('<div><p>Drop here to create new indicator</p></div>')
			.addClass('dda-package-indicators_dropzone dda-package_top_drop'));



	    // Iterate over the registred indicators
	    $.each(instance.indicator_registry, function(indicator_guid, indicator_element){
		var div = $('<div class="dda-add-element clearfix"></div>');
		div.append(
		    $('<object></object>').attr('data', $('#' + indicator_element.template).find('#id_I_icon').val())
			.attr('type', 'image/svg+xml')
			.addClass('pull-left')
			.css({'width': '30px', 'margin-right': '5px'})
		);

		// Put the indicator title, use the 'title' input, or if empty, the guid
		title = $('#id_indicator_title', indicator_element.element).val();
		if(title=='')
		    title = 'Indicator: ' + indicator_element.object_id
		div.append('<h3>'+title+'</h3>');

		// Add the indicator-guid to the dropzone so we know it when dropping onto
		var refs = $('<div></div>').addClass('dda-package-indicators_dropzone').data('id', indicator_guid);
		$.each(indicator_element.observables, function(i,v){
		    desc = instance.get_obs_elem_desc_name(instance.observable_registry[v], v);
		    refs.append($('<div></div>').html(desc));
		});
		div.append(refs);
		instance.package_indicators.append(div);
	    });

	    instance.package_indicators.find('.dda-package-indicators_dropzone').droppable({
                "tolerance": "touch",
                "drop": function( event, ui ) {
		    if(!ui.draggable.hasClass('dda-add-element'))
			return;
		    var draggable = $(ui.draggable);
		    var observable_id = $(draggable).data('id');
		    var indicator_id = $(this).data('id');
		    if(!indicator_id){ //if we drop on a non-indicator, we generate one
			indicator_id = instance.ind_pool_add_elem();
		    }
		    instance.indicator_registry[indicator_id].observables.push(observable_id);
		    instance.indicator_registry[indicator_id].observables = uniqueArray(instance.indicator_registry[indicator_id].observables);
		    instance.refresh_stix_package_tab();
		},
                "over": function (event, ui ) {
		    if(ui.draggable.hasClass('dda-add-element'))
			$(event.target).addClass("dda-dropzone-hover");
                },
                "out": function (event, ui) {
		    $(event.target).removeClass("dda-dropzone-hover");
                }
	    });


	    /*
	     * Register generate button handler
	     * and export data
	     */
	    $('#dda-stix-generate').off('click').on('click', function(){
		stix_base = instance.get_json();
		$('#dda-gen-output').slideUp('fast',function(){
		    var editor = ace.edit('dda-gen-output-content');
		    $.post('transform', {'jsn':JSON.stringify(stix_base), 'submit_name' : guid_gen(), 'action' : 'generate'}, function(data){
			if(data.status){
			    $('#dda-gen-output').slideDown('fast');
			    editor.setOptions({
				maxLines: Infinity
			    });
			    editor.setReadOnly(true);
			    editor.getSession().setMode("ace/mode/xml");
			    editor.setValue(data.xml);
			    log_message('Successfully generated', 'success');
			}else{
			    log_message(data.msg, 'error');
			}
		    }, 'json');
		});
		return false;
	    });

	    // Save draft button
            $('#dda-stix-save').off('click').on('click', function(){
		stix_base = instance.get_json();

		var _save_fcn = function(){
		    $('#dda-gen-output').slideUp('fast',function(){
			var editor = ace.edit('dda-gen-output-content');
			$.post('transform',
			       {'jsn':JSON.stringify(stix_base), 'submit_name' : instance.load_name, 'id': instance.load_uuid, 'action': 'save'},
			       function(data){
				   if(data.status){
				       // Set last-saved json so we have a copy of what's been saved to check against (to detect changes)
				       instance._last_save = stix_base;
				       log_message(data.msg, 'success');
				   }else{
				       log_message(data.msg, 'error');
				   }
			       }, 'json');
		    });
		};


		if(!instance.load_name || !instance.load_uuid){
		    //Ask user for meaningful name and generate uuid
		    var dlg = $('<div id="dda-save-json-dlg" title="Save JSON"><p>Please provide a meaningful name for your package:</p></div>');
		    var inp = $('<input id="dda-save-json-input" type="text"/>').val($('#dda-stix-meta > input[name="stix_header_title"]').first().val());
		    dlg.append(inp);

		    dlg.dialog({
		    	modal: true
		    });
		    var ok_btn = $('<button>Ok</button>').button().addClass('pull-right').click(function(){
			pkg_name = $.trim(dlg.find('input').first().val());
			if(pkg_name != ''){
			    instance.load_name = pkg_name;
			    instance.load_uuid = guid_gen();
			    _save_fcn();
			    dlg.dialog('close');
			}else{
			    inp.focus();
			}

		    });
		    dlg.append(ok_btn);

		}else
		    _save_fcn();

		return false;
            });

	    //Load draft button
	    $('#dda-stix-load').off('click').on('click', function(){
		var dlg = $('<div id="dda-load-json-dlg" title="Load draft"><p>Please choose from your saved templates:</p></div>');
		var dlg1 = $('<div id="dda-load-json-confirm-dlg" title="Confirmation"><p>You have not yet saved the changes you made to the current draft. Do you really want to continue loading?</p></div>');

		var sel = $('<select></select>');
		$.get('load?list', function(data){
		    if(data.status)
			$.each(data.data, function(i,v){
			    var _t_sel = $('<option></option>').attr('value',v.id).text(v.name);
			    sel.append(_t_sel);
			});
		});
		dlg.append(sel);

		dlg.dialog({
		    modal: true
		});

		var _load_saved_json = function(){
		    instance.reset_gui();
		    var load_id = $(sel).val();
		    instance.load_remote_save(load_id);
		}

		var ok_btn = $('<button>Ok</button>').button().addClass('pull-right').click(function(){
		    // Check for not-saved changes
		    if(instance._last_save===false)
			instance._last_save = instance.get_json();

		    if(!deepCompare(instance.get_json(), instance._last_save)){ // Changes in document
			var ok_btn1 = $('<button>Ok</button>').button().addClass('pull-right').click(function(){
			    _load_saved_json();
			    if(dlg) dlg.dialog('close');
			    if(dlg1) dlg1.dialog('close');
			});
			var cancel_btn1 = $('<button>Cancel</button>').button().addClass('pull-right').click(function(){
			    dlg.dialog('close');
			    dlg1.dialog('close');
			});
			dlg1.dialog({
			    modal: true
			});
			dlg1.append(cancel_btn1);
			dlg1.append(ok_btn1);
		    }else{ // No changes, or already saved.
			_load_saved_json();
			if(dlg) dlg.dialog('close');
		    }

		});
		dlg.append(ok_btn);

	    });

	}

	// Campaign info tab
	this.refresh_campaign_tab = function(){
	}

	// Observable pool tab
	this.refresh_observable_pool_tab = function(){
	    // Do housekeeping, restore elements from the preview in the relations
	    instance.obs_elem_restore_from_preview();
	}

	// Indicator pool tab
	this.refresh_indicator_pool_tab = function(){
	}

	// Object relations tab
	this.refresh_object_relations_tab = function(){
	    b._d3_redraw(true);
	}




	/****************************************************************
	 Functionality/Helper functions
	***************************************************************/

	/*
	 * Adds an element to the observable pool. Gets passed a template id
	 */
	this.obs_pool_add_elem = function(template_id, guid_passed){
	    var template = $('#' + template_id);

	    // Get a new id
	    guid = guid_gen();
	    guid_observable = 'siemens_cert:Observable-' + guid;
	    if(guid_passed)
		guid_observable = guid_passed;

	    // Create new container element
	    var div = $('<div class="dda-add-element clearfix" ></div>').data('id', guid_observable);

	    // Create element from template
	    var new_elem = template.clone().attr('id', guid_observable);
	    var _pc_el = $('<div></div>').append( //container for toggling
		$('<input type="text" name="dda-observable-title" placeholder="Observable Title"><textarea name="dda-observable-description" placeholder="Observable Description"></textarea>'),
		$('<div class="dda-pool-element">').append(new_elem)
	    );

	    div.append(
		$('<button class="dda-obs-remove pull-right"></button>').button({
		    icons:{
			primary: 'ui-icon-trash'
		    },
		    text: false
		}).click(function(){
		    instance.obs_pool_remove_elem(div.data('id'));
		})
	    ).append($('<h3>'+guid_observable +'</h3>').click(function(){
		_pc_el.toggle();
	    }));

	    var title = $('#id_I_object_display_name', template).val();
	    var description = '';

	    div.append('<p>'+title+'</p>');
	    div.append( _pc_el );
	    div.find('button').button();
	    instance.pool_list.prepend(div);


	    instance.observable_registry[guid_observable] = {
		observable_id: guid_observable,
		relations: [],
	    	template: template_id,
		element: div,
		description: description,
		type: template.find('#id_object_type').val()
	    };

	};

	/*
	 * Removes an element from the observable pool.
	 */
	this.obs_pool_remove_elem = function(guid){

	    //remove from indicators
	    $.each(instance.indicator_registry, function(i,v){
		var ni = [];
		$.each(v.observables, function(i1,v1){
		    if(v1!=guid)
			ni.push(v1);
		});
		instance.indicator_registry[i].observables = ni;
	    });

	    //remove relation information
	    $.each(instance.observable_registry, function(i,v){
		var ni = [];
		$.each(v.relations, function(i1,v1){
		    if(v1.target!=guid)
			ni.push(v1);
		});
		instance.observable_registry[i].relations = ni;

	    });

	    //remove element itself
	    instance.observable_registry[guid].element.remove();
	    delete instance.observable_registry[guid];
	};



	/*
	 * Helper function which returns a display name for a specific object
	 */
	this.get_obs_elem_desc_name = function(v, def, trim){
	    trim=trim||60;
	    desc = '';

	    // Try the observable title
	    desc = $.trim($('[name="dda-observable-title"]', v.element).val());
	    // No Observable title? Try field specific information
	    if(desc==''){
		if(v.type == 'File'){
		    desc = $(v.element).find('#id_file_name').val();
		}else if(v.type == 'EmailMessage'){
		    desc = $.trim($(v.element).find('#id_subject').val());
		    if(desc=='')
			desc = $.trim($(v.element).find('#id_from_').val());
		}else if(v.type == 'DNSRecord'){
		    desc = $.trim($(v.element).find('#id_domain_name').val());
		}else if(v.type == 'Address'){
		    desc = $.trim($(v.element).find('#id_ip_addr').val());
		}else if(v.type == 'Artifact'){
		    if($.trim($(v.element).find('#id_data').val())!='')
			desc = $.trim($(v.element).find('#id_data').val());
		}else if(v.type == 'C2Object'){
		    if($.trim($(v.element).find('#id_data').val())!='')
			desc = $.trim($(v.element).find('#id_data').val());
		}else if(v.type == 'HTTPSession'){
		    if($.trim($(v.element).find('#id_method').val())!='' && $.trim($(v.element).find('#id_host').val())!='')
			desc = $.trim($(v.element).find('#id_method').val()) + ' to ' + $.trim($(v.element).find('#id_host').val())
		    else if($.trim($(v.element).find('#id_uri').val())!='')
			desc = $.trim($(v.element).find('#id_uri').val());
		}else if(v.type == 'Port'){
		    desc = $.trim($(v.element).find('#id_port_value').val());
		    if($.trim($(v.element).find('#id_layer4_protocol').val())!='')
			desc = desc + ' (' + $.trim($(v.element).find('#id_layer4_protocol').val()) + ')';
		}else if(v.type == 'URI'){
		    desc = $.trim($(v.element).find('#id_value').val());
		}
	    }

	    if(desc=='')
		desc = def;

	    if(desc.length>trim)
		desc = desc.substring(0,trim-3) + '...';

	    return desc
	};




	/*
	 * Function that restores an element to the observable pool if
	 * there is one in the preview on the relation tab (element
	 * gets moved)
	 */
	this.obs_elem_restore_from_preview = function(){
	    var id = $('.dda-observable-template', '#dda-relation-object-details').first().attr('id');
	    if(id){
		$('> div', instance.observable_registry[id].element).first().append(
		    $('.dda-pool-element', '#dda-relation-object-details').remove()
		);
	    }
	};





	/*
	 * Adds an indicator to the indicator pool. Gets passed a
	 * template id If template id is not passed (which happens
	 * when user drops on specific placeholder, the first template
	 * in the template pool will be used)
	 */
	this.ind_pool_add_elem = function(template_id, guid_passed){
	    var auto_gen = false;
	    var template = false;

	    if(!template_id){ // When user clicked the button
		template = instance.pool_indicator_templates.first();
		template_id = template.attr('id');
		auto_gen = true;
	    }else{
		$.each(instance.pool_indicator_templates, function(i,v){
		    if($(v).attr('id')==template_id){
			template = v;
			return false;
		    }
		});
	    }
	    if(template===false){
		//TODO: template not found;
		template = $();
	    }

	    // Get a new ID or use supplied one
	    var guid = guid_gen();
	    var guid_indicator = 'siemens_cert:' + template.find('#id_object_type').val() + '-' + guid;

	    if(guid_passed)
		guid_indicator = guid_passed;


	    // Create element from template
	    var _pc_el = template.clone().attr('id', guid_indicator);


	    // Create container element
	    var div = $('<div class="dda-add-element"></div>');
	    div.append(
		$('<div class="clearfix" style="margin-bottom:5px;"></div>').append(
		    $('<button class="dda-ind-remove pull-right"></button>').button({
			icons:{
			    primary: 'ui-icon-trash'
			},
			text: false
		    }).click(function(){
			instance.ind_pool_remove_elem(guid_indicator);
		    }),
		    $('<h3>' + guid_indicator + '</h3>').click(function(){
			_pc_el.toggle();
		    })
		)
	    );

	    // Insert the element in the DOM
	    div.append(_pc_el);
	    instance.indicator_list.prepend(div);

	    // Register the object internally
	    instance.indicator_registry[guid_indicator] = {
		template: template_id,
		object_id: guid_indicator,
		element: div,
		description: template.data('description'),
		observables: []
	    };

	    if(!auto_gen){
		//instance.refresh_stix_package_tab();
	    }else{
		return guid_indicator;
	    }
	};
	this.ind_pool_remove_elem = function(guid){
	    instance.indicator_registry[guid].element.remove();
	    delete instance.indicator_registry[guid];
	    instance.refresh_stix_package_tab();
	};







	/*
	 * Returns the JSON representation of the current configuration
	 */
	this.get_json = function(){
	    //generated-time
	    var stix_base = {
		'stix_header': $('#dda-stix-meta').find('input, select, textarea').serializeObject(),
		'campaign': {},
		'incidents': [],
		'indicators': [],
		'observables': []
	    }

	    // Include the indicators
	    $.each(instance.indicator_registry, function(i,v){
		var tmp = $('.dda-indicator-template', v.element).find('input, select, textarea').not('[name^="I_"]').serializeObject();
		tmp.related_observables = v.observables;
		tmp.related_observables_condition = 'AND';
		tmp.indicator_id = v.object_id;
		stix_base.indicators.push(tmp);
	    });

	    // Include the observables
	    $.each(instance.observable_registry, function(i,v){
		var tmp = {
		    'observable_id': i,
		    'observable_title': $(v.element).find('[name="dda-observable-title"]').val(),
		    'observable_description': $(v.element).find('[name="dda-observable-description"]').val(),
		    'related_observables': {},
		    'observable_properties': $(v.element).find('.dda-pool-element').find('input, select, textarea').not('[name^="I_"]').serializeObject()
		}

		$.each(v.relations, function(i,v){
		    tmp.related_observables[v.target] = v.label;
		});
		stix_base.observables.push(tmp);
	    });

	    // Include the campaing information
	    stix_base.campaign = $('#dda-campaign-template_Campaign', '#dda-campaign-container')
		.find('input, select, textarea').not('[name^="I_"]').serializeObject();
	    stix_base.campaign.threatactor = $('#dda-threatactor-template_ThreatActor', '#dda-campaign-container')
		.find('input, select, textarea').not('[name^="I_"]').serializeObject();

	    return stix_base
	};


	/*
	 * Resets the GUI to a consistent state based on the JSON generated
	 */
	this.reset_gui = function(){
	    $('#dda-stix-meta').find('input, select, textarea').val('');

	    // Reset campaign info
	    $('#dda-campaign-template_Campaign', '#dda-campaign-container')
		.find('input, select, textarea').not('[name^="I_"]').val('');
	    $('#dda-threatactor-template_ThreatActor', '#dda-campaign-container')
		.find('input, select, textarea').not('[name^="I_"]').val('');

	    // Reset observables
	    $.each(instance.observable_registry, function(i,v){
		instance.obs_pool_remove_elem(v.observable_id);
	    });

	    // Reset indicators
	    $.each(instance.indicator_registry, function(i,v){
		instance.ind_pool_remove_elem(v.object_id);
	    });


	};


	/*
	 * Tries to initialize the GUI from a provided JSON
	 */
	this.load_from_json = function(jsn, load_name, load_uuid){
	    instance.load_name = load_name || false;
	    instance.load_uuid = load_uuid || false;

	    if(instance.load_name)
	     	$('#grp-content-title h1').text(instance.load_name);

	    // Restore STIX header information
	    $.each(jsn.stix_header, function(i,v){
		$('[name="'+i+'"]', '#dda-stix-meta').val(v);
	    });

	    // Restore indicators
	    instance.indicator_registry = {};
	    $.each(jsn.indicators, function(i,v){
		instance.ind_pool_add_elem(false, v.indicator_id);
		var el = instance.indicator_registry[v.indicator_id];
		$.each(v, function(i,v){
		    //try to set values
		    $('[name="'+i+'"]', el.element).val(v);
		});
		// Restore included observables
		el.observables = v.related_observables;
	    });

	    // Restore observables
	    instance.observable_registry = {};
	    $.each(jsn.observables, function(i,v){
		var template = 'dda-observable-template_' + v.observable_properties.object_type;
		//TODO: if template does not exitst. issue an error.
		instance.obs_pool_add_elem(template, v.observable_id);
		var el = instance.observable_registry[v.observable_id];

		//restore title and description
		el.element.find('[name="dda-observable-title"]').val(v.observable_title);
		el.element.find('[name="dda-observable-description"]').val(v.observable_title);

		$.each(v.observable_properties, function(i,v){
		    //try to set values
		    $('[name="'+i+'"]', el.element).val(v);
		});
		//restore related observables
		$.each(v.related_observables, function(i,v){
		    el.relations.push({label: v, target: i});
		});
	    });

	    // Restore the campaign information
	    if(jsn.campaign!=undefined){
		$.each(jsn.campaign, function(i,v){
		    $('#dda-campaign-template_Campaign', '#dda-campaign-container').find('[name="'+i+'"]').val(v);
		});

		// Restore the threat actor information
		$.each(jsn.campaign.threatactor, function(i,v){
		    $('#dda-threatactor-template_ThreatActor', '#dda-campaign-container').find('[name="'+i+'"]').val(v);
		});
	    }
	};


	/*
	 * Loads a remotely saved template
	 */
	this.load_remote_save = function(save_uuid){
	    $.get('load', {name : save_uuid}, function(data){
		if(data.status){
		    var jsn_template = $.parseJSON(data.data.jsn);
		    instance._last_save = jsn_template;
		    instance.load_from_json(jsn_template, data.data.name, data.data.id);
		    instance.refresh_stix_package_tab();
		    log_message(data.msg, 'success', 3000);
		}else{
		    log_message(data.msg, 'error');
		}

            },'json');
	};


	// Init me!
	this.init_stix_package_tab();
	this.init_campaign_tab();
	this.init_observable_pool_tab();
	this.init_indicator_pool_tab();
	this.init_object_relations_tab();

	this.refresh_stix_package_tab(); //Initial refresh for button handlers to be bound (in case this tab is the first visible tab)

	// Return myself for reference pleasure
	return instance;
    };
    var b = builder();



    $('#dda-container-tabs').tabs({
	active: 0,
	activate:function(event,ui){
	    if(ui.newTab.index()==0){
		b.refresh_stix_package_tab();
	    }
	    if(ui.newTab.index()==1){
		b.refresh_campaign_tab();
	    }
	    if(ui.newTab.index()==2){
		b.refresh_indicator_pool_tab();
	    }
	    if(ui.newTab.index()==3){
		b.refresh_observable_pool_tab();
	    }
	    if(ui.newTab.index()==4){
		b.refresh_object_relations_tab();
	    }
        }
    });

    $('button').button();

    $('#dda-relation-list > .dda-add-element').click(function(){
	$('#dda-relation-list').find('.dda-rel-selected').removeClass('dda-rel-selected').find('input:checked').prop('checked', false);
	$(this).addClass('dda-rel-selected').find('input:radio').prop('checked', true);

    });

    if(querystring('load')!=''){
	b.load_remote_save(querystring('load')[0]);
    }

});
