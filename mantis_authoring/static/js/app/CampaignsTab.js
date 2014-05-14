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
	    template = instance.cam_pool_elements_templates.filter('#dda-campaign-template_Campaign'),
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
	    var ta_template = instance.tha_pool_elements_templates.filter('#dda-threatactor-template_ThreatActor');
	    ne.after(ta_template.clone())
		.after('<br><h3>Threat Actor Information</h3>');

	    // Bind ref completer
	    instance.cam_bind_reference_completer();
	},

	/**
	 * Refreshes the campaign info tab
	 */
	refresh_campaign_tab: function(){
	},


	/**
	 * Replaces the threatactor with a reference to one
	 * @param {object} item The autocomplete ui.item
	 */
	cam_replace_threat_actor: function(item){
	    var instance = this;
	    	template = instance.tha_pool_elements_templates.filter('#dda-threatactor-template_ThreatActorReference'),
	        ref = template.clone();

	    ref.find('#id_object_id').val(item.value);
	    ref.find('#id_label').val(item.label);
	    ref.prepend(
		$('<span></span>').text(item.label + ' ('+ item.value +')')
	    );

	    $('.dda-threatactor-template', '#dda-campaign-container').first().replaceWith(ref);
	},


	/**
	 * Replaces the campaign with a reference to one
	 * @param {object} item The autocomplete ui.item
	 */
	cam_replace_campaign: function(item){
	    var instance = this;
	    	template = instance.cam_pool_elements_templates.filter('#dda-campaign-template_CampaignReference'),
	        ref = template.clone();

	    ref.find('#id_object_id').val(item.value);
	    ref.find('#id_label').val(item.label);
	    ref.prepend(
		$('<span></span>').text(item.label + ' ('+ item.value +')')
	    );

	    $('.dda-campaign-template', '#dda-campaign-container').first().replaceWith(ref);
	},

	
	/**
	 * Bind the campaing/threat actor autocompleter to the elements
	 */
	cam_bind_reference_completer: function(){
	    var instance = this,
	        cam_input = $('#dda-campaign-template_Campaign #id_name', '#dda-campaign-container'),
	        threat_input = $('#dda-threatactor-template_ThreatActor #id_identity_name', '#dda-campaign-container');


	    $.each([cam_input, threat_input], function(){
		var el = $(this);
		el.ddacomplete({
                    source: function( request, response ) {
			$.ajax({
                            url: "ref",
			    type: "POST",
                            dataType: "json",
                            data: {
				q: request.term,
				el: el.closest('table').find('input, select, textarea').not('[name^="I_"]').serializeObject()
                            },
                            success: function( data ) {
				response( $.map( data.data, function( item ) {
                                    return {
					id: item.id,
					label: item.name,
					value: item.id,
					category: item.cat,
					threatactor: item.threatactor
                                    }
				}));
                            }
			}, 'json');
                    },
                    autoFocus: true,
                    select: function(event, ui){
			if(event.keyCode === $.ui.keyCode.TAB) return false; // Prevent tab selection

			if( $(this).is(cam_input) ){
			    instance.cam_replace_campaign(ui.item);
			    instance.cam_replace_threat_actor(ui.item.threatactor);
			}else{
			    instance.cam_replace_threat_actor(ui.item);
			}
                    }
		});
	    });

	}
	
    }
});
