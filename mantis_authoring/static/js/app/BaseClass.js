define(['jquery'],function($){

    /* 
     * Return a javascript object literal with our base config of the
     * app. The functionality of the tabs is encapsulated in separate
     * files/extensions (except for the STIX tab functionality which is found here)
     */
    return {
	namespace_slug: false,
	package_indicators: $('#dda-package-indicators'),
	load_name: false, 	// Holds the name of the currently loaded template-json
	load_uuid: false, 	// Holds the uuid of the currently loaded template-json
	_last_save: false, 	// Last saved json for change-detection

	/**
	 * Init function. Intended to be called when this app thing is
	 * instanciated. Makes sure that namespace is set before
	 * continuing to load the application entirely.
	 */
	init: function(callback){
	    var instance = this;
	    this.init_user_namespace(function(){
		// Now init each tab 
		instance.init_stix_package_tab();
		instance.init_campaign_tab();
		instance.init_observable_pool_tab();
		instance.init_indicator_pool_tab();
		instance.init_test_mechanisms_tab();
		//object relations are initiated on first refresh of the tab because that is where we know the canvas size 
		//instance.init_object_relations_tab(); // not required
		instance.refresh_stix_package_tab(); //Initial refresh for button handlers to be bound (in case this tab is the first visible tab)
		callback(instance);
	    });

	    /*
	     * Response callback handler of file uploads (dropzones)
	     */
            window._handle_file_upload_response = function(response){
		if(response.status==0){
                    log_message(response.msg, 'error');
                    return;
		}

		// Create objects
		$.each(response.data, function(i,v){
                    if(v.object_class=='observable'){
			var el = instance.obs_pool_add_elem('dda-observable-template_' + v.object_type + '_' + v.object_subtype, v.object_id);
			if(!el) return true;
			$.each(v.properties, function(i1,v1){
                            $('[name="'+i1+'"]', el.element).val(v1);
			});
			log_message('Created '+ v.object_type +' ('+ v.object_subtype +') object: ' + el.observable_id, 'success', 5000);
                    }else if(v.object_class=='testmechanism'){
			var el = instance.tes_pool_add_elem('dda-test-mechanism-template_' + v.object_type + '_' + v.object_subtype, v.object_id);

			if(!el) return true;
			$.each(v.properties, function(i1,v1){
                            $('[name="'+i1+'"]', el.element).val(v1);
			});
			log_message('Created '+ v.object_subtype +' ('+ v.object_type +') object: ' + el.object_id, 'success', 5000);
		    }
		    //TODO: treat other types
		});
            };

	    //Now create the jquery-ui tabbing
	    $('#dda-container-tabs').tabs({
		active: 0,
		activate:function(event,ui){
		    if(ui.newTab.index()!=5){	    
			// Do housekeeping, restore elements from the preview in the relations
			instance.obs_elem_restore_from_preview();
		    }

		    if(ui.newTab.index()==0){
			instance.refresh_stix_package_tab();
		    }
		    if(ui.newTab.index()==1){
			instance.refresh_campaign_tab();
		    }
		    if(ui.newTab.index()==2){
			instance.refresh_indicator_pool_tab();
		    }
		    if(ui.newTab.index()==3){
			instance.refresh_test_mechanisms_pool_tab();
		    }
		    if(ui.newTab.index()==4){
			instance.refresh_observable_pool_tab();
		    }
		    if(ui.newTab.index()==5){
			instance.refresh_object_relations_tab();
		    }
		}
	    });

	    // Fix up the button look and feel
	    $('button').button();

	    // Load a template if required
	    if(querystring('load')!=''){
		instance.load_remote_save(querystring('load')[0]);
	    }

	},

	/**
	 * Initializes the users namespace and sets this.namespace_slug
	 * @param {function} callback Callback function thats being called when namespace is set
	 */
	init_user_namespace: function(callback){
	    var instance = this;
	    $.get('get_namespace', function(data){
		if(data.status){
		    instance.namespace_slug = data.data.default_ns_slug;
		    callback();
		}else{
		    log_message(data.msg, 'error');
		}
	    }, 'json');
	},

	/**
	 * Resets the GUI by removing all items manually
	 */
	reset_gui: function(){
	    var instance = this;
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

	    // Reset test mechanisms
	    $.each(instance.test_mechanisms_registry, function(i,v){
		instance.tes_pool_remove_elem(v.object_id);
	    });
	},


	/**
	 * Initializes the STIX package tab
	 */
	init_stix_package_tab: function(){
	    var instance = this;

	    // Reset GUI because some browsers keep values in inputs on reload
	    instance.reset_gui();

	    // Add the show-stix button
	    var show_stix_btn = $('<button>Show STIX</button>').button().click(function(){
		stix_base = instance.get_json();
		$.post('transform', {'jsn':JSON.stringify(stix_base), 'submit_name' : guid_gen(), 'action' : 'generate'}, function(data){
		    if(data.status){
			var dlg = $('<div id="dda-show-stix-dlg" title="STIX Package Output"><div id="dda-show-stix-edit"></div></div>');
			dlg.dialog({
			    width       : $(window).width()-30,
			    height      : $(window).height()-30,
			    modal: true,
			    draggable   : false,
			    resizable   : false,
			    create: function(event, ui){
				$('body').css('overflow', 'hidden');
			    },
			    beforeClose: function( event, ui ) {
				var editor = ace.edit('dda-show-stix-edit');
				editor.destroy();
				$('body').css('overflow', 'auto');
				$('#dda-show-stix-edit').remove();
			    },
			    resizeStop: function( event, ui ) {
				var editor = ace.edit('dda-show-stix-edit');
				editor.resize();
			    }
			});
			var editor = ace.edit('dda-show-stix-edit');
			editor.setReadOnly(true);
			editor.getSession().setMode("ace/mode/xml");
			editor.setValue(data.xml);
		    }else{
			log_message(data.msg, 'error');
		    }
		}, 'json');

		return false;
	    });
	    $('#dda-stix-meta').after(show_stix_btn);

	    // Add various buttons to the tab's content
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
	    $('#dda-stix-meta').after(get_jsn_btn);

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
	    //$('#dda-stix-meta').after(import_jsn_btn);
	},

	/**
	 *
	 */
	is_observable_in_indicator: function(id){
	    var instance = this,
	        ret = false;

	    $.each(instance.indicator_registry, function(i,v){
		if($.inArray(id, v.observables)!==-1){
		    ret = true;
		    return false; //break from each
		}
	    });
	    return ret;
	},
	is_test_mechanism_in_indicator: function(id){
	    var instance = this,
	        ret = false;

	    $.each(instance.indicator_registry, function(i,v){
		if($.inArray(id, v.test_mechanisms)!==-1){
		    ret = true;
		    return false; //break from each
		}
	    });
	    return ret;
	},

	/**
	 * Refreshes the STIX package tab
	 */
	refresh_stix_package_tab: function(){
	    var instance = this,
	        pool_elem_tmpl = dust.compile('<div class="dda-add-element clearfix" data-id="{id}" data-type="{type}""> \
		    {?existing} \
		    <span class="pull-right">+</span> \
		    {/existing} \
		    <h3>{title}</h3> \
		    <p>{description}</p> \
		    </div>', 'pool_elem'),
	        reg_ind_elem_tmpl = dust.compile('<div class="dda-add-element clearfix"> \
<img src="{img_src}" type="image/svg+xml" class="pull-left" style="width:30px; margin-right:5px;"></img> \
<h3>{title}</h3> \
<div class="dda-package-indicators_dropzone" data-id="{indicator_guid}"> \
<ul> \
{#observables} \
<li><i class="ui-icon ui-icon-close" data-id="{id}"></i><span>{desc}</span></li> \
{/observables} \
</ul> \
<ul> \
{#test_mechanisms} \
<li><i class="ui-icon ui-icon-close" data-id="{id}"></i><span>{desc}</span></li> \
{/test_mechanisms} \
</ul> \
</div> \
</div>', 'reg_ind_elem');
	    dust.loadSource(pool_elem_tmpl);
	    dust.loadSource(reg_ind_elem_tmpl);



	    // First clear all entries
	    instance.package_indicators.html('');

	    //Init the observable pool
	    instance.observable_pool.html('');

	    $.each(instance.observable_registry, function(i,v){
		var elem_data = {
		    'id': i,
		    'type': 'observable',
		    'title': $('#id_I_object_display_name', $('#'+v.template)).val(),
		    'description': instance.get_obs_elem_desc_name(v, i),
		    'existing': instance.is_observable_in_indicator(v.observable_id)
		};
		dust.render('pool_elem', elem_data, function(err, out){
		    out = $(out);
		    out.draggable({
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
		    instance.observable_pool.append(out);
		});
	    });


	    //Init the test mechanisms pool
	    instance.test_mechanisms_pool.html('');
	    $.each(instance.test_mechanisms_registry, function(i,v){
		var elem_data = {
		    'id': i,
		    'type': 'test_mechanism',
		    'title': instance.get_tes_elem_desc_name(v),
		    'description': '',
		    'existing': instance.is_test_mechanism_in_indicator(v.object_id)
		};
		dust.render('pool_elem', elem_data, function(err, out){
		    out = $(out);
		    out.draggable({
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
		    instance.test_mechanisms_pool.append(out);
		});
	    });


	    // Add a dropzone element for dropping observables on non-indicators
	    instance.package_indicators
		.append($('<div><p>Drop here to create new indicator</p></div>')
			.addClass('dda-package-indicators_dropzone dda-package_top_drop'));



	    // Iterate over the registred indicators
	    $.each(instance.indicator_registry, function(indicator_guid, indicator_element){

		title = $('#id_indicator_title', indicator_element.element).val();
		if(title=='')
		    title = 'Indicator: ' + indicator_element.object_id

		var elem_data = {
		    'img_src': $('#' + indicator_element.template).find('#id_I_icon').val(),
		    'title': title,
		    'indicator_guid': indicator_guid,
		    'observables': [],
		    'test_mechanisms': []
		};

		$.each(indicator_element.observables, function(i,v){
		    elem_data.observables.push({
			'id': v,
			'desc': instance.get_obs_elem_desc_name(instance.observable_registry[v], v)
		    });
		});
		$.each(indicator_element.test_mechanisms, function(i,v){
		    elem_data.test_mechanisms.push({
			'id': v,
			'desc': instance.get_tes_elem_desc_name(instance.test_mechanisms_registry[v])
		    });
		});

		dust.render('reg_ind_elem', elem_data, function(err, out){
		    out = $(out);
		    out.find('li > i.ui-icon-close').click(function(i,v){
			var indicator_guid = $(this).parents('.dda-package-indicators_dropzone').first().data('id'),
			    el_id = $(this).data('id');
			instance.ind_remove_tes(indicator_guid, el_id);
			instance.ind_remove_obs(indicator_guid, el_id);
			instance.refresh_stix_package_tab();
		    });
		    instance.package_indicators.prepend(out);
		});

		// Add the drop-here-for-new-indicator dropzone
		var div = $('<div class="dda-add-element clearfix"></div>');
		div.prepend(
		    $('<img></img>').attr('src', $('#' + indicator_element.template).find('#id_I_icon').val())
			.attr('type', 'image/svg+xml')
			.addClass('pull-left')
			.css({'width': '30px', 'margin-right': '5px'})
		);

	    });

	    instance.package_indicators.find('.dda-package-indicators_dropzone').droppable({
                "tolerance": "touch",
                "drop": function( event, ui ) {
		    if(!ui.draggable.hasClass('dda-add-element'))
			return;
		    var draggable = $(ui.draggable);
		    var object_id = $(draggable).data('id');
		    var object_type = $(draggable).data('type');
		    var indicator_id = $(this).data('id');
		    if(!indicator_id){ //if we drop on a non-indicator, we generate one
			indicator_id = instance.ind_pool_add_elem();
		    }
		    if(object_type=='observable'){
			instance.indicator_registry[indicator_id].observables.push(object_id);
			instance.indicator_registry[indicator_id].observables=uniqueArray(instance.indicator_registry[indicator_id].observables);
		    }else if(object_type=='test_mechanism'){
			instance.indicator_registry[indicator_id].test_mechanisms.push(object_id);
			instance.indicator_registry[indicator_id].test_mechanisms=uniqueArray(instance.indicator_registry[indicator_id].test_mechanisms);
		    }
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



	    // Register the import-to-mantis button handler

        $('#dda-stix-import').off('click').on('click', function(){
            stix_base = instance.get_json();
            var _save_fcn = function(){
                $.post('transform',
                    {'jsn':JSON.stringify(stix_base), 'submit_name' : instance.load_name, 'id': instance.load_uuid, 'action': 'import'},
                    function(data){
                        if(data.status){
                            // Set last-saved json so we have a copy of what's been saved to check against (to detect changes)
                            instance._last_save = stix_base;
                            log_message(data.msg, 'success', 5000);
                            instance.reset_gui();
                        }else{
                            log_message(data.msg, 'error');
                        }
                    }, 'json');
            };


            if(!instance.load_name || !instance.load_uuid){
                //Ask user for meaningful name and generate uuid
                var dlg = $('<div id="dda-save-json-dlg" title="Import into Mantis"><p>Please provide a meaningful name for your package:</p></div>');
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



        // Save and release draft button
        $('#dda-stix-save-and-release').off('click').on('click', function(){
            stix_base = instance.get_json();

            var _save_fcn = function(){
                $.post('transform',
                    {'jsn':JSON.stringify(stix_base), 'submit_name' : instance.load_name, 'id': instance.load_uuid, 'action': 'release'},
                    function(data){
                        if(data.status){
                            // Set last-saved json so we have a copy of what's been saved to check against (to detect changes)
                            instance._last_save = stix_base;
                            log_message(data.msg, 'success', 5000);
                            instance.reset_gui();
                        }else{
                            log_message(data.msg, 'error');
                        }
                    }, 'json');
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


        // Save draft button
            $('#dda-stix-save').off('click').on('click', function(){
		stix_base = instance.get_json();
		var _save_fcn = function(){
		    $.post('transform',
			   {'jsn':JSON.stringify(stix_base), 'submit_name' : instance.load_name, 'id': instance.load_uuid, 'action': 'save'},
			   function(data){
			       if(data.status){
				   // Set last-saved json so we have a copy of what's been saved to check against (to detect changes)
				   instance._last_save = stix_base;
				   log_message(data.msg, 'success', 5000);
			       }else{
				   log_message(data.msg, 'error');
			       }
			   }, 'json');
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
	},


	/**
	 * Returns the JSON representation of the current configuration
	 * @returns {object} the JSON
	 */
	get_json: function(){
	    var instance = this;

	    // Generate package id if not already existing
	    if($('#dda-stix-meta').find('input[name="stix_package_id"]').val()=='')
		$('#dda-stix-meta').find('input[name="stix_package_id"]').val(instance.namespace_slug + ':package-' + guid_gen());
	    var stix_base = {
		'stix_header': $('#dda-stix-meta').find('input, select, textarea').serializeObject(),
		'campaign': {},
		'incidents': [],
		'indicators': [],
		'observables': [],
		'test_mechanisms': []
	    }

	    // Include the indicators
	    $.each(instance.indicator_registry, function(i,v){
		var tmp = $('.dda-indicator-template', v.element).find('input, select, textarea').not('[name^="I_"]').serializeObject();
		tmp.related_observables = v.observables;
		tmp.related_observables_condition = 'AND';
		tmp.indicator_id = v.object_id;
		tmp.related_test_mechanisms = v.test_mechanisms;
		stix_base.indicators.push(tmp);
	    });

	    // Include the observables
	    $.each(instance.observable_registry, function(i,v){
		stix_base.observables.push(instance.obs_get_json(i));
	    });

	    // Include the test mechanisms
	    $.each(instance.test_mechanisms_registry, function(i,v){
		var tmp = $('.dda-test-mechanism-template', v.element).find('input, select, textarea').not('[name^="I_"]').serializeObject();
		tmp.test_mechanism_id = v.object_id;
		stix_base.test_mechanisms.push(tmp);
	    });

	    // Include the campaing information
	    stix_base.campaign = $('.dda-campaign-template', '#dda-campaign-container')
		.find('input, select, textarea').not('[name^="I_"]').serializeObject();
	    stix_base.campaign.threatactor = $('.dda-threatactor-template', '#dda-campaign-container')
		.find('input, select, textarea').not('[name^="I_"]').serializeObject();

	    return stix_base
	},


	/**
	 * Tries to initialize the GUI from a provided JSON
	 * @param {object} jsn The JSON structure to read from
	 * @param {string} load_name The title to be set for the configuration (usually the saved name)
	 * @param {string} load_uuid The uuid to be set for the configuration (usually from a saved state)
	 */
	load_from_json: function(jsn, load_name, load_uuid){
	    var instance = this;

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
		$.each(v, function(i1,v1){
		    $('[name="'+i1+'"]', el.element).val(v1);
		});
		// Restore included observables and test_mechanisms
		el.observables = v.related_observables;
		el.test_mechanisms = v.related_test_mechanisms;
	    });

	    // Restore observables
	    instance.observable_registry = {};
	    $.each(jsn.observables, function(i,v){
		var template = 'dda-observable-template_' + v.observable_properties.object_type + '_' + v.observable_properties.object_subtype;
		instance.obs_pool_add_elem(template, v.observable_id);
		instance.obs_update_name(v.observable_id);
		var el = instance.observable_registry[v.observable_id];

		//restore title and description
		el.element.find('[name="dda-observable-title"]').val(v.observable_title);
		el.element.find('[name="dda-observable-description"]').val(v.observable_description);

		$.each(v.observable_properties, function(i,v){
		    //try to set values
		    $('[name="'+i+'"]', el.element).val(v);
		});
		//restore related observables
		$.each(v.related_observables, function(i,v){
		    el.relations.push({label: v, target: i});
		});
	    });

	    // Restore the test mechanisms
	    instance.test_mechanisms_registry = {};
	    $.each(jsn.test_mechanisms, function(i,v){
		var template = 'dda-test-mechanism-template_' + v.object_type + '_' + v.object_subtype;
		//TODO: if template does not exitst. issue an error.
		instance.tes_pool_add_elem(template, v.test_mechanism_id);
		var el = instance.test_mechanisms_registry[v.test_mechanism_id];

		//restore info
		$.each(v, function(i1,v1){
		    $('[name="'+i1+'"]', el.element).val(v1);
		});
	    });

	    // Restore the campaign information
	    if(jsn.campaign!=undefined){
		if(jsn.campaign.object_type=='CampaignReference'){
		    itm = {
			id: jsn.campaign.object_id,
			value: jsn.campaign.object_id,
			label: jsn.campaign.label
		    };
		    instance.cam_replace_campaign(itm);
		}else{
		    $.each(jsn.campaign, function(i,v){
			$('#dda-campaign-template_Campaign', '#dda-campaign-container').find('[name="'+i+'"]').val(v);
		    });
		}

		// Restore the threat actor information
		if(jsn.campaign.threatactor.object_type=='ThreatActorReference'){
		    itm = {
			id: jsn.campaign.threatactor.object_id,
			value: jsn.campaign.threatactor.object_id,
			label: jsn.campaign.threatactor.label
		    };
		    instance.cam_replace_threat_actor(itm);
		}else{
		    $.each(jsn.campaign.threatactor, function(i,v){
			$('#dda-threatactor-template_ThreatActor', '#dda-campaign-container').find('[name="'+i+'"]').val(v);
		    });
		}
	    }
	},


	/**
	 * Loads a remotely saved template
	 * @param {string} saved_uuid The UUID of the saved template
	 */
	load_remote_save: function(save_uuid){ 
	    var instance = this;

	    $.get('load', {name : save_uuid}, function(data){
		if(data.status){
		    var jsn_template = $.parseJSON(data.data.jsn);
		    instance._last_save = jsn_template;
		    instance.load_from_json(jsn_template, data.data.name, data.data.id);
		    instance.refresh_stix_package_tab();
		    log_message(data.msg, 'success', 5000);
		}else{
		    log_message(data.msg, 'error');
		}

            },'json');
	}


    }
});
