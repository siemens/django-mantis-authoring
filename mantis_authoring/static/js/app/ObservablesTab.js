define(['jquery', 'dropzone', 'dust'],function($, Dropzone){

    // Disable dropzone.js autodiscovery (however we're too late here, since the DOM is already loaded)
    Dropzone.autoDiscover = false;


    /* 
     * Defines the prototype enhancements of the base application
     * Observable tab related/specific
     */
    return {
	observable_pool: $('#dda-observable-pool'), 		// Selector box on STIX tab
	obs_pool_list: $('#dda-observable-pool-list'), 		// The list of added elements on its own tab
	obs_pool_elements: $('#dda-observable-pool-elements'), 	// The elements to choose from (for adding)
	obs_pool_elements_templates: $('#dda-observable-template-pool > div'), // The templates
	observable_registry: {}, 				// Holds the observables currently loaded


	/**
	 * Initializes the observable pool tab
	 */
	init_observable_pool_tab: function(){
	    var instance = this,
	    observable_template_tmpl = dust.compile('<div class="dda-add-element clearfix" > \
		    <button class="dda-obs-add pull-left" style="margin-right:5px;"></button> \
		    <img class="pull-right" src="{icon}" style="width:30px"></img> \
		    <h3>{title}</h3> \
		    <p>{description}</p> \
		    </div>', 'observable_template_add');
	    dust.loadSource(observable_template_tmpl);

	    $.each(instance.obs_pool_elements_templates, function(i,v){
		// Skip the reference object
		if($(v).attr('id')=='dda-observable-template_referenceobject_Default') return true;

		var tpl = {
		    icon: $(v).find('#id_I_icon').val(),
		    title: $('#id_I_object_display_name',v).val(),
		    description: ''
		};
		dust.render('observable_template_add', tpl, function(err, out){
		    out = $(out);
		    //Buttonize
		    out.find('.dda-obs-add').button({
			icons: {
			    primary: 'ui-icon-circle-plus'
			},
			text: false
		    }).click(function(){
			instance.obs_pool_add_elem($(v).attr('id'));
		    });
		    instance.obs_pool_elements.append(out);
		});

	    });

	    instance._pc_el_shown=true;
	    $('#dda-template-head-toogle').click(function(){
		if(instance._pc_el_shown)
		    $('.dda-pool-element', '#dda-observable-pool-list').parent().hide();
		else
		    $('.dda-pool-element', '#dda-observable-pool-list').parent().show();
		instance._pc_el_shown = !instance._pc_el_shown;
	    });

            // Init dropzone
	    var file_dropzone = new Dropzone('form#dda-observable-filedrop', {
                'previewTemplate': '<div></div>',
		'dictDefaultMessage': 'Drop files here to analyze',
                //'forceFallback': true,
                'success': function(f, response){
                    window._handle_file_upload_response(response);
                    this.removeAllFiles();
                },
                'error': function(f, errorMessage){
		    log_message(errorMessage, 'error');
		}
            });
	},


	/**
	 * Refreshes observable pool tab
	 */
	refresh_observable_pool_tab: function(){
	    var instance = this;

	    // Minimize all items that are already placed in an indicator
	    $.each($('#dda-observable-pool-list > .dda-add-element'),  function(i,v){
		var obs_id = $(this).data('id');
		if(instance.is_observable_in_indicator(obs_id)){
		    $('div:first', v).hide();
		}
	    });
	},


	/**
	 * Binds the autocompleter to an object.
	 * @param {string} obs_id The observable id of the element to bind the completer to
	 */
	obs_bind_reference_completer: function(obs_id){
	    var instance = this,
	        obs = instance.observable_registry[obs_id];

	    $.each($('.dda-pool-element', obs.element).find('input:visible'), function(i,v){
		$(this).ddacomplete({
                    source: function( request, response ) {
			$.ajax({
                            url: "ref",
			    type: "POST",
                            dataType: "json",
                            data: {
				q: request.term,
				el: obs.element.find('input, select, textarea').not('[name^="I_"]').serializeObject()
                            },
                            success: function( data ) {
				response( $.map( data.data, function( item ) {
                                    return {
					id: item.id,
					label: item.name,
					value: item.id,
					category: item.cat
                                    }
				}));
                            }
			}, 'json');
                    },
                    autoFocus: true,
                    select: function(event, ui){
			if(event.keyCode === $.ui.keyCode.TAB) return false; // Prevent tab selection
			instance.obs_pool_add_ref(ui.item.id, obs.observable_id);
                    }
		});
	    });
	},


	/**
	 * Removes the autocompleter from an element 
	 * @param {string} obs_id The observable id of the element to remove the completer from
	 */
	obs_remove_reference_completer: function(obs_id){
	    var instance = this,
	        obs = instance.observable_registry[obs_id];

	    $.each($('.dda-pool-element', obs.element).find('input'), function(i,v){
		try{
		    $(this).ddacomplete('destroy');
		}catch(e){}
	    });
	},


	/**
	 * Adds a reference element to the observable pool. 
	 * @param {string} guid_passed The guid of the reference element to be created
	 * @param {string} replacement Optional ID (guid) of the element to be replace
	 */
	obs_pool_add_ref: function(guid_passed, replacement){
	    var instance = this,
	        template_id = 'dda-observable-template_referenceobject_Default';

	    instance.obs_pool_add_elem(template_id, guid_passed, true, true);
	    instance.obs_pool_remove_elem(replacement, guid_passed);
	},


	/**
	 * Adds an element to the observable pool.
	 * @param {string} template_id The template from which to craft the element
	 * @param {string} guid_passed An optional guid which will be used instead of generating one
	 * @param {boolean} no_dom_insert Tells the function to not insert the created element into the DOM
	 * @param {boolean} no_meta Tells the function to not insert Title/Description Fields (used for reference type)
	 */
	obs_pool_add_elem: function(template_id, guid_passed, no_dom_insert, no_meta){
	    var instance = this,
	        template = $('#' + template_id),
	        observable_container_tmpl = dust.compile('<div class="dda-add-element clearfix" data-id="{id}"> \
                    <button class="dda-obs-find_similar pull-right"></button> \
		    <button class="dda-obs-remove pull-right"></button> \
                    <span class="pull-right dda-obs-error"></span> \
		    <h3>{title}</h3> \
		    <p class="obs_object_name">{obs_name}</p> \
		    <div> \
		    {?meta} \
		    <input type="text" name="dda-observable-title" placeholder="Observable Title"> \
		    <textarea name="dda-observable-description" placeholder="Observable Description"></textarea> \
		    {/meta} \
		    <div class="dda-pool-element"> \
		    {body|s} \
		    </div> \
		    </div> \
		    </div>', 'observable_container');

	    // Get a new id
	    var guid = guid_gen(),
	        guid_observable = "{" + instance.namespace_uri + '}Observable-' + guid;

	    if(guid_passed){
		if(instance.observable_registry[guid_passed] != undefined){
		    log_message('A observable with this ID already exists.', 'error');
		    return false;
		}
		guid_observable = guid_passed;
	    }


	    var tpl = {
		id: guid_observable,
		title: $('#id_I_object_display_name', template).val(),
		obs_name: template.find('#id_object_type').val(),
		meta: !no_meta,
		body: template.clone().attr('id', guid_observable).html()
	    };
	    dust.loadSource(observable_container_tmpl);
	    var ret = false;
	    dust.render('observable_container', tpl, function(err, out){
		out = $(out);

		// Bind the toggle
		out.find('h3').first().click(function(){
		    out.find('div').first().toggle();
		});

		// Buttonize
		out.find('.dda-obs-remove').button({
		    icons:{
			primary: 'ui-icon-trash'
		    },
		    text: false
		}).click(function(){
		    instance.obs_pool_remove_elem(guid_observable);
		});
		out.find('.dda-obs-find_similar').button({
		    icons:{
			primary: 'ui-icon-search'
		    },
		    text: false
		}).click(function(){
		    instance.obs_find_similar(guid_observable);
		});
		
		// Insert in DOM
		if(!no_dom_insert)
		    instance.obs_pool_list.prepend(out);

		// Register the element
		instance.observable_registry[guid_observable] = {
		    observable_id: guid_observable,
		    relations: [],
	    	    template: template_id,
		    element: out,
		    type: template.find('#id_object_type').val()
		};

		//instance.obs_bind_reference_completer(guid_observable);

		// Bind validator
		instance.obs_on_blur(out, instance.obs_elem_validate);

		ret = instance.observable_registry[guid_observable];
	    });
	    return ret;
	},


	/** 
	 * Removes an element from the observable pool.
	 * @param {string} guid The ID (guid) of the element to be removed
	 * @param {id} replacement The optional ID (guid) of the element which should replace the element to be removed
	 */
	obs_pool_remove_elem: function(guid, replacement){
	    var instance = this;

	    // Remove/replace in indicators
	    $.each(instance.indicator_registry, function(i,v){
		var ni = [];
		$.each(v.observables, function(i1,v1){
		    if(v1!=guid){
			    ni.push(v1);
		    }else{
			if(replacement)
			    ni.push(replacement);
		    }
		});
		instance.indicator_registry[i].observables = ni;
	    });

	    // Remove/replace relation information
	    $.each(instance.observable_registry, function(i,v){
		var ni = [];
		$.each(v.relations, function(i1,v1){
		    if(v1.target!=guid){
			ni.push(v1);
		    }else{
			if(replacement){
			    v1.target = replacement;
			    ni.push(v1);
			}
		    }
		});
		instance.observable_registry[i].relations = ni;
	    });

	    // Remove element itself
	    if(replacement){
		instance.observable_registry[guid].element.replaceWith(
		    instance.observable_registry[replacement].element
		);
		instance.observable_registry[replacement].relations = instance.observable_registry[guid].relations
	    }else
		instance.observable_registry[guid].element.remove();
	    delete instance.observable_registry[guid];

	},

	/**
	 * Updates the name of an observable
	 * @param {string} id The observable id
	 */
	obs_update_name: function(id){
	    var instance = this,
	        obs = instance.observable_registry[id];
	    
	    obs.element.find('.obs_object_name').first().text(
		instance.get_obs_elem_desc_name(obs, id, 60, true)
	    );
	},


	/**
	 * Pops up a dialog and requests similar objects like the passed one from the backend.
	 * @param {string} id The observable id
	 */
	obs_find_similar: function(id){
	    var instance = this,
	        obs = instance.observable_registry[id],
	        obs_jsn = instance.obs_get_json(id);


	    var dlg = $('<div id="dda-obs-find_similar-dlg" title="Similar Objects">Please wait...</div>'),
	        dlg_content_tmpl = dust.compile('<ol style="max-height: 500px;"> \
		     {#items} \
		     <li class="ui-widget-content"> \
		     <div class="dda-add-element"> \
                     <a href="{url}" target="_blank"> \
		      <h3>{title}</h3> \
		      <p>{details}</p> \
                     </a> \
		     </div> \
		     </li> \
		     {/items} \
		    </ol>', 'find_similar_content');
	    
	    dlg.dialog({
		width: 600, modal: true,
		position: ['center', 'center']
	    });

	    $.post('similar_object', obs_jsn, function(data){
		if(data.status){
		    if(data.data){
			dust.loadSource(dlg_content_tmpl);
			dust.render('find_similar_content', data.data, function(err, out){
			    out = $(out);
			    dlg.html(out);
			    dlg.dialog("option", "position", ['center', 'center'] );
			});
		    }
		}else{
		    dlg.html( log_message(data.msg, 'error', 0, true) );
		}
	    }, 'json');
	},


	/**
	 * Generates the JSON template for a single observable
	 * @param {string} id The observable id
	 */
	obs_get_json: function(id){
	    var instance = this,
	        obs = instance.observable_registry[id];

	    if(obs==undefined) return {}; // Happens when loosing focus to click 'delete'. Return {} and ignore validation.

	    var tmp = {
		'observable_id': id,
		'observable_title': $(obs.element).find('[name="dda-observable-title"]').val(),
		'observable_description': $(obs.element).find('[name="dda-observable-description"]').val(),
		'related_observables': {},
		'observable_properties': $(obs.element).find('.dda-pool-element').find('input, select, textarea').not('[name^="I_"]').serializeObject()
	    }

	    $.each(obs.relations, function(i,v){
		tmp.related_observables[v.target] = v.label;
	    });

	    return tmp;
	},

	
	/**
	 * Helper function which returns a display name for a specific observable
	 * @param {object} v The observable object from the observable registry
	 * @param {string} def The default string to fall back to
	 * @param {number} trim The amount of characters to trim the resulting name to
	 */
	get_obs_elem_desc_name: function(v, def, trim, force_update){
	    var instance = this,
                desc = '';
	        trim=trim||60;


	    // Fetch name from backend.
	    if(v._object_name == undefined || force_update){
		var jqxhr = $.ajax({
		    url: 'get_object_name', 
		    data: instance.obs_get_json(v.observable_id), 
		    dataType: 'json',
		    timeout: 500,
		    type: 'POST',
		    async: false
		});

		var data = $.parseJSON(jqxhr.responseText);
		if(data.status){
		    v._object_name = data.data;
		    return data.data;
		}
	    }else
		return v._object_name;

	    //On timeout we try to just guess a descriptive name, or return default.

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

	    if(desc=='') desc = def;
	    if(desc.length>trim)
		desc = desc.substring(0,trim-3) + '...';

	    return desc
	},


	/**
	 * Function that restores an element to the observable pool if
	 * there is one in the preview on the relation tab (element
	 * gets moved)
	 */
	obs_elem_restore_from_preview: function(){
	    var instance = this,
	        //id = $('.dda-observable-template', '#dda-relation-object-details').first().attr('id');
	        id = $('#dda-relation-object-details').data('observable_id');

	    if(!id) return;

	    if(instance.observable_registry[id] == undefined){
		$('.dda-pool-element', '#dda-relation-object-details').remove();
		return;
	    }
	    
	    $('> div', instance.observable_registry[id].element).first().append(
		$('.dda-pool-element', '#dda-relation-object-details').remove()
	    );
	    //instance.obs_bind_reference_completer(id);
	},


	/**
	 * Function that sets the properties of an observables to the preview section on the relations tab
	 * @param {string} id The observable id of the object to preview
	 */
	obs_elem_set_to_preview: function(id){
	    var instance = this;

	    //instance.obs_remove_reference_completer(id);

	    $('#dda-relation-object-details').append(
		instance.observable_registry[id].element.find('.dda-pool-element')
	    );
	    $('#dda-relation-object-details').data('observable_id', id);
	},

	/**
	 * Function that validates an observable element. Passes the
	 * fields to the backend for validation and in turn receives a
	 * list of errors for the elements
	 * @param {string} id The observable id of the object to validate
	 */
	obs_elem_validate: function(id){
	    var instance = this,
	        obs = instance.observable_registry[id],
	        obs_jsn = instance.obs_get_json(id);

            // Check if we already validated this element (we use a string representation of the json)
            if(obs.__check_change != undefined){
		if(obs.__check_change == JSON.stringify(obs_jsn))
                    return;
            }
            obs.__check_change = JSON.stringify(obs_jsn);


	    $.post('validate_object', obs_jsn, function(data){
		if(data.status){
		    // Remove all previous validation results
		    obs.element.find('.grp-errors').removeClass('grp-errors');
		    obs.element.find('.errorlist').remove();

		    if(data.data){
			$.each(data.data, function(i,v){
			    var el = $('[name='+i+']', obs.element);
			    el.closest('tr').addClass('grp-errors');
			    el.parent().append(
				$('<ul class="errorlist"></ul>').append(
				    $('<li></li>').text(v)
				)
			    );
			});

			if(data.data['__all__'] != undefined){
                            $('.dda-obs-error', obs.element).text(data.data['__all__']);
			}else{
                            if(Object.size(data.data) >= 1)
				$('.dda-obs-error', obs.element).text(Object.size(data.data) + ' Error(s)');
			}

		    }else{
			$('.dda-obs-error', obs.element).text('');
		    }

		    // Update the observable name
		    instance.obs_update_name(obs.observable_id);
		}else{
		    //log_message(data.msg, 'error');
		}
	    }, 'json');
	},

	/**
	 * Function that decides whether to fire off the callback function on 'blur' event
	 * Trick is to identify if focus is lost on all inputs in the el element
	 * @param {object} el jQuery object of the element
	 * @param {function} callback
	 */
	obs_on_blur: function(el, callback){
	    var instance = this,
	        inp = el.find('*'),
	        id = $(el).data('id');

	    el.focusout(function(e){
		setTimeout(function(){ //Wait a bit to see where the focus goes
		    var f = $(':focus');
		    if(!f.is(inp)){
			instance.obs_elem_validate(id);
		    }
		}, 50);
	    });
	}

    }
});
