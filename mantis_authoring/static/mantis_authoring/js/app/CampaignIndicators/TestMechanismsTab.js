define(['jquery', 'dropzone', 'dust'],function($, Dropzone){

    // Disable dropzone.js autodiscovery (however we're too late here, since the DOM is already loaded)
    Dropzone.autoDiscover = false;

    /* 
     * Defines the prototype enhancements of the base application
     * Test mechanimsms tab related/specific
     */
    return {
	test_mechanisms_pool: $('#dda-test-mechanisms-pool'), 		// Selector on tab
	tes_pool_list: $('#dda-test-mechanisms-pool-list'), 		// The list of added elements on its own tab
	//tes_pool_elements 						// The elements to choose from (for adding)
	tes_pool_elements_templates: $('#dda-test-mechanisms-template-pool > div'), // The templates
	test_mechanisms_registry: {},					// Holds the test mechanisms currently loaded

	/**
	 * Initializes the test mechanisms tab
	 */
	init_test_mechanisms_tab: function(){
	    var instance = this;

            // Init dropzone
	    var file_dropzone = new Dropzone('form#dda-test-mechanism-filedrop', {
                'previewTemplate': '<div></div>',
		'dictDefaultMessage': 'Drop files here to upload',
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
	 * Refreshes test mechanisms tab
	 */
	refresh_test_mechanisms_pool_tab: function(){
	},


	/**
	 * Adds a test mechanism element to the pool. Gets passed a
	 * template id If template id is not passed the first template
	 * in the template pool will be used
	 * @param {string} template_id
	 * @param {string} guid_passed Optional guid which will be used instead of generating one
	 */
	tes_pool_add_elem: function(template_id, guid_passed){
	    var instance = this,
	        auto_gen = false,
	        template = false,
	        test_mechanism_container_tmpl = dust.compile('<div class="dda-add-element"> \
		    <div class="clearfix" style="margin-bottom:5px;"> \
		    <button class="dda-tes-remove pull-right"></button> \
		    <h3>{title}</h3> \
		    </div> \
		    {body|s} \
                    <div class="dda-tes-preview"> \
                    <textarea readonly="true" style="background-color:white !important;color:gray;"></textarea> \
                    </div> \
		    </div>', 'test_mechanism_container');

	    if(!template_id){
		template = instance.tes_pool_elements_templates.first();
		template_id = template.attr('id');
		auto_gen = true;
	    }else{
		$.each(instance.tes_pool_elements_templates, function(i,v){
		    if($(v).attr('id')==template_id){
			template = $(v);
			return false;
		    }
		});
	    }

	    if(template===false){
		//TODO: template not found;
		template = $();
	    }

	    // Get a new ID or use supplied one
	    var guid = guid_gen(),
	        guid_test = "{" + instance.namespace_uri + '}' + template.find('#id_object_type').val() + '-' + guid;

	    if(guid_passed){
		if(instance.test_mechanisms_registry[guid_passed] != undefined){
		    log_message('A test mechanism with this ID already exists.', 'error');
		    return false;
		}
		guid_test = guid_passed;
	    }

	    var tpl = {
		title: guid_test,
		body: template.clone().attr('id', guid_test).outerHtml()
	    };
	    dust.loadSource(test_mechanism_container_tmpl);
	    var ret = false
	    dust.render('test_mechanism_container', tpl, function(err, out){
		out = $(out);

		// Bind the toggle
		out.find('h3').first().click(function(){
		    out.find('.dda-test-mechanism-template').first().toggle();
                    out.find('.dda-tes-preview').first().toggle();
		});

		// Buttonize
		out.find('.dda-tes-remove').button({
		    icons:{
			primary: 'ui-icon-trash'
		    },
		    text: false
		}).click(function(){
		    instance.tes_pool_remove_elem(guid_test);
		});

		// Insert in DOM
		instance.tes_pool_list.prepend(out);


		// Register the object internally
		instance.test_mechanisms_registry[guid_test] = {
		    template: template_id,
		    object_id: guid_test,
		    element: out,
		    description: template.data('description')
		};

		ret = instance.test_mechanisms_registry[guid_test];
		
	    });
	    return ret;

	},

        /**
         * Sets the preview of a test mechanism element 
         * @param {string} guid The id of the test mechanism
         */
        tes_preview_element: function(guid){
            var instance = this,
                el = instance.test_mechanisms_registry[guid].element,
                prev_ta = $('.dda-tes-preview', el).find('textarea').first();

            if($('#id_object_subtype', el).val() == 'SNORT'){
                prev_ta.val(
                    window.Base64.decode($('[name="snort_rules"]', el).val())
                );
            }
            if($('#id_object_subtype', el).val() == 'IOC'){
                prev_ta.val(
                    window.Base64.decode($('[name="ioc_xml"]', el).val())
                );
            }
        },


	/**
	 * Removes a test mechanism from the pool
	 * @param {string} guid The id of the test mechanism to be removed
	 */
	tes_pool_remove_elem: function(guid){
	    var instance = this;

	    //remove from indicators
	    $.each(instance.indicator_registry, function(i,v){
		var ni = [];
		$.each(v.test_mechanisms, function(i1,v1){
		    if(v1!=guid)
			ni.push(v1);
		});
		instance.indicator_registry[i].test_mechanisms = ni;
	    });

	    instance.test_mechanisms_registry[guid].element.remove();
	    delete instance.test_mechanisms_registry[guid];
	    instance.refresh_stix_package_tab();
	},


	/**
	 * Helper function which returns a display name for a specific test mechanism
	 * @param {object} v The test mechanism object from the test mechanism registry
	 * @param {number} trim The amount of characters to trim the resulting name to
	 */
	get_tes_elem_desc_name: function(v, trim){
	    var instance = this,
	        desc = '',
	        subtype = '';

	    trim=trim||60;

	    subtype = v.element.find('#id_object_subtype').val();
	    if(subtype == 'IOC'){
		desc = $(v.element).find('#id_ioc_title').val();
	    }else if(subtype == 'SNORT'){
		desc = $.trim($(v.element).find('#id_snort_title').val());
	    }

	    if(desc=='')
		desc = v.object_id;

	    if(desc.length>trim)
		desc = desc.substring(0,trim-3) + '...';

	    return desc
	}
	
    }
});
