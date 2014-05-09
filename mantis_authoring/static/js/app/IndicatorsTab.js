define(['jquery'],function($){

    /* 
     * Defines the prototype enhancements of the base application
     * Indicators tab related/specific
     */
    return {
	//indicator_pool // Selector on tab
	ind_pool_list: $('#dda-indicator-pool-list'), 		// The list of added elements on its own tab
	//ind_pool_elements // The elements to choose from (for adding)
	ind_pool_elements_templates: $('#dda-indicator-template-pool > div'), // The templates
	indicator_registry: {}, 				// Holds the indicators currently loaded

	/**
	 * Initializes the indicator pool tab
	 */
	init_indicator_pool_tab: function(){
	    var instance = this;
	    $('#dda-indicator-add-btn').button({
		icons:{
		    primary: 'ui-icon-circle-plus'
		}
	    }).click(function(){
		instance.ind_pool_add_elem();
	    });
	},

	/**
	 * Refreshes indicator pool tab
	 */
	refresh_indicator_pool_tab: function(){
	},


	/*
	 * Adds an indicator to the indicator pool. Gets passed a
	 * template id If template id is not passed (which happens
	 * when user drops on specific placeholder, the first template
	 * in the template pool will be used)
	 * @param {string} template_id 
	 * @param {string} guid_passed Optional guid which will be used instead of generating one
	 */
	ind_pool_add_elem: function(template_id, guid_passed){
	    var instance = this,
	        auto_gen = false,
	        template = false;

	    if(!template_id){ // When user clicked the button
		template = instance.ind_pool_elements_templates.first();
		template_id = template.attr('id');
		auto_gen = true;
	    }else{
		$.each(instance.ind_pool_elements_templates, function(i,v){
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
	    var guid = guid_gen();
	    var guid_indicator = instance.namespace_slug + ':' + template.find('#id_object_type').val() + '-' + guid;

	    if(guid_passed){
		if(instance.indicator_registry[guid_passed] != undefined){
		    log_message('A indicator with this ID already exists.', 'error');
		    return false;
		}
		guid_indicator = guid_passed;
	    }


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
	    instance.ind_pool_list.prepend(div);

	    // Register the object internally
	    instance.indicator_registry[guid_indicator] = {
		template: template_id,
		object_id: guid_indicator,
		element: div,
		description: template.data('description'),
		observables: [],
		test_mechanisms: []
	    };

	    if(!auto_gen){
		//instance.refresh_stix_package_tab();
	    }else{
		return guid_indicator;
	    }
	},


	/**
	 * Removes and indicator from the pool
	 * @param {string} guid The indicator id of the element to be removed
	 */
	ind_pool_remove_elem: function(guid){
	    var instance = this;

	    instance.indicator_registry[guid].element.remove();
	    delete instance.indicator_registry[guid];
	    instance.refresh_stix_package_tab();
	},


	/**
	 * Removes an observable from an indicator
	 * @param {string} ind_guid The indicator id
	 * @param {string} obs_guid The observable id
	 */
	ind_remove_obs: function(ind_guid, obs_guid){
	    var instance = this,
	        obs = this.indicator_registry[ind_guid].observables
	        obs_new = [];

	    $.each(obs, function(i,v){
		if(v!=obs_guid) obs_new.push(v);
	    });
	    this.indicator_registry[ind_guid].observables = obs_new;
	},


	/**
	 * Removes a test-mechanism from an indicator
	 * @param {string} ind_guid The indicator id
	 * @param {string} tes_guid The test mechanism id
	 */
	ind_remove_tes: function(ind_guid, tes_guid){
	    var instance = this,
	        tes = this.indicator_registry[ind_guid].test_mechanisms,
	        tes_new = [];

	    $.each(tes, function(i,v){
		if(v!=tes_guid) tes_new.push(v);
	    });
	    this.indicator_registry[ind_guid].test_mechanisms = tes_new;
	}

    }
});
