define(['jquery', 'd3'],function($, d3){

    /* 
     * Defines the prototype enhancements of the base application
     * Object relations tab related/specific
     */
    return {


	/**
	 * Initializes the Object relations tab
	 */
	init_object_relations_tab: function(){
	    var instance = this;

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

	    var width = $('#relation-pane').width();
	    var height = $('#relation-pane').height();
	    var fill = d3.scale.category10();

	    var selected_node = null;
	    var selected_link = null;
	    var mousedown_link = null;
	    var mousedown_node = null;
	    var mouseup_node = null;

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

	    var node = vis.selectAll('.node');
	    var link = vis.selectAll('.link');
	    var labelAnchor = vis.selectAll('.labelAnchor');
	    var labelLink = vis.selectAll('.labelLink');

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
		link = link.data(links, function(d){
		    return links.indexOf(d);
		});
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
			});
		link.exit().remove();
		link.classed("link_selected", function(d) { return d === selected_link; });



		// Create the node labels
		labelAnchor = labelAnchor.data(labelAnchors, function(d){
		    return labelAnchors.indexOf(d);
		});
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
		node = node.data(nodes, function(d){
		    return nodes.indexOf(d);
		});
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
				    // Restore old element in preview
				    instance.obs_elem_restore_from_preview();

				    // Set new element to preview
				    instance.obs_elem_set_to_preview(mouseup_node.observable_id);

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

	    // Fix the 'select-previous-selected-radio browser behavior'
	    $('#dda-relation-list > .dda-add-element').click(function(){
		$('#dda-relation-list').find('.dda-rel-selected').removeClass('dda-rel-selected').find('input:checked').prop('checked', false);
		$(this).addClass('dda-rel-selected').find('input:radio').prop('checked', true);
	    });

	    instance._d3_redraw();
	},

	/**
	 * Refreshes the object relations tab
	 */
	refresh_object_relations_tab: function(){
	    var instance = this;
	    if(instance._relations_initiated==undefined){
		instance.init_object_relations_tab();
		instance._relations_initiated = true;
	    }
	    instance._d3_redraw(true);
	}



    }
});
