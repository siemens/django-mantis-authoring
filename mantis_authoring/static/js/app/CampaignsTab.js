define(['jquery', 'datetimepicker'],function($){

    /* 
     * Defines the prototype enhancements of the base application
     * Campaigns tab related/specific
     */
    return {
	//campaign_pool // Selector on tab
	//cam_pool_list // The list of added elements on its own tab
	//cam_pool_elements // The elements to choose from (for adding)
	cam_pool_elements_templates: $('#dda-campaign-template-pool > div'), // The templates


	/**
	 * Initializes the campaign tab
	 */
	init_campaign_tab: function(){
	    var instance = this,
	    template = instance.cam_pool_elements_templates.first(),
	    ne = template.clone(),
	    from = ne.find('#id_activity_timestamp_from'),
	    to = ne.find('#id_activity_timestamp_to');

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
	    var ta_template = instance.tha_pool_elements_templates.first();
	    ne.after(ta_template.clone())
		.after('<br><h3>Threat Actor Information</h3>');
	},

	/**
	 * Refreshes the campaign info tab
	 */
	refresh_campaign_tab: function(){
	}
	
    }
});
