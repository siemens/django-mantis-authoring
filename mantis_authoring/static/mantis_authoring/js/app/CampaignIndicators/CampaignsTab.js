define(['jquery'],function($){

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
            var instance = this;

            instance.cam_bind_reference_completer();
        },

        /**
         * Refreshes the campaign info tab
         */
        refresh_campaign_tab: function(){
        },




        /**
         * Replaces the campaign with a reference to one
         * @param {object} item The autocomplete ui.item
         */
        cam_replace_campaign: function(item){
            var instance = this,
                template = instance.cam_pool_elements_templates.filter('#dda-campaign-template_CampaignReference'),
                ref = template.clone();


            ref.find('#id_object_id').val(item.value);
            ref.find('#id_label').val(item.label);

            var cdc = $('<div>').addClass('dda-campaign-template dda-add-element clearfix');
            cdc.append($('<img src="/static/mantis_stix_importer/img/icons/campaign.svg" type="image/svg+xml" class="pull-left" style="width:30px; margin-right:5px"/>'));
            cdc.append($('<span></span>').text(' ('+ item.value +')').prepend($('<strong>').text(item.label)));
            cdc.append($('<i class="ui-icon ui-icon-close pull-right"></i>').click(function(e){
                $('.dda-campaign-template', '#dda-campaign-container').first().replaceWith(instance._old_campaign_element);
                instance.cam_bind_reference_completer();
            }) );
            cdc.prepend(ref);
            instance._old_campaign_element = $('.dda-campaign-template', '#dda-campaign-container').first().replaceWith(cdc);
        },


        /**
         * Bind the campaign/threat actor autocompleter to the elements
         */
        cam_bind_reference_completer: function(){
            var instance = this,
                cam_input = $('#dda-campaign-input', '#dda-campaign-container'),
                cam_input_selected_id = $('#dda-campaign-selected_id', '#dda-campaign-container');

            cam_input.ddacomplete({
                source: function(request, response){
                    $.ajax({
                        url: "ref",
                        type: "POST",
                        dataType: "json",
                        data: {
                            q: request.term,
                            el: $.param({
                                name: request.term,
                                object_type: 'Campaign'
                            })
                        },
                        success: function(data){
                            response( $.map( data.data, function( item ) {
                                return {
                                    id: item.id,
                                    uuid: item.uuid,
                                    ns: item.ns,
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
                    instance.cam_set_campaign(ui.item.uuid, ui.item.ns);
                    event.preventDefault();
                }
            });

        },

        cam_set_campaign: function(campaign_id, namespace){
            var instance = this,
                cam_input = $('#dda-campaign-input', '#dda-campaign-container'),
                cam_input_selected_id = $('#dda-campaign-selected_id', '#dda-campaign-container'),
                cam_prev = $('#dda-campaign-prev', '#dda-campaign-container'),
                cam_delete = $('#dda-campaign-prev-remove', '#dda-campaign-container'),
                cam_title = $('#dda-campaign-prev-title', '#dda-campaign-container'),
                cam_title_sub = $('#dda-campaign-prev-title_sub', '#dda-campaign-container');

            cam_input_selected_id.val('{'+namespace +'}' + campaign_id);
            cam_input.val('{'+namespace +'}' + campaign_id);
            cam_input.attr('readonly', true);

            // Get object name from backend
            $.ajax({
                url: "ref",
                type: "POST",
                dataType: "json",
                data: {
                    q: campaign_id,
                    el: $.param({
                        name: campaign_id,
                        object_type: 'Campaign'
                    })
                },
                success: function(data){
                    if(data.status){
                        var cd = data.data[0];
                        cam_title.text(cd.name);
                        cam_title_sub.text(cd.id);
                        cam_prev.show();
                    }
                }
            }, 'json');

            cam_delete.off('click').on('click', function(){
                cam_prev.hide()
                cam_input_selected_id.val('');
                cam_input.attr('readonly', false).val('');
            });

        }

    }
});
