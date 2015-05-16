define(['jquery', 'dust'],function($, dust){

    /*
     * Defines the prototype enhancements of the base application
     * Indicators tab related/specific
     */
    return {
        //indicator_pool // Selector on tab
        ind_pool_list: $('#dda-indicator-pool-list'),           // The list of added elements on its own tab
        //ind_pool_elements // The elements to choose from (for adding)
        ind_pool_elements_templates: $('#dda-indicator-template-pool > div'), // The templates
        indicator_registry: {},                                 // Holds the indicators currently loaded

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
            var instance = this;
            $.each($('> div.dda-add-element', instance.ind_pool_list), function(){
                var ind_id = $(this).find('.dda-indicator-template').attr('id'),
                    ind_sel = $(this).find('.ind_pool_sel_list'),
                    ind_sel_opt_obs = $('.ind_pool_sel_opt_obs', ind_sel).first(),
                    ind_sel_opt_test = $('.ind_pool_sel_opt_test', ind_sel).first(),
                    ind_sel_opt_obs_result = $('.ind_pool_sel_result_obs', $(this)).first(),
                    ind_sel_opt_tes_result = $('.ind_pool_sel_result_tes', $(this)).first(),
                    ind_opt_tmpl = dust.compile('<div class="sel_option {?selected}sel_option_selected{/selected}" data-type="{type}"> \
                                                <span class="pull-right" style="font-size:90%;">Source: {source}</span> \
                                                <h3>{display_type}{title}</h3> \
                                                <span>{description}</span> \
                                                <textarea style="display:none;"></textarea>\
                                                </div>', 'ind_opt_tmpl');
                dust.loadSource(ind_opt_tmpl);

                //remove all elements
                ind_sel.find('.sel_option').remove();
                ind_sel_opt_obs_result.find('li').remove();
                ind_sel_opt_tes_result.find('li').remove();

                //insert observables
                $.each(instance.observable_registry, function(obs_id, obs_elem){
                    var tpl = {title: instance.get_obs_elem_desc_name(obs_elem),
                               display_type: obs_elem.type + ': ',
                               source: instance.get_ns_from_guid(obs_elem.observable_id),
                               description: obs_elem.element.find('[name="dda-observable-description"]').val(),
                               type: 'obs',
                               selected: instance.is_observable_in_indicator(obs_id, ind_id)
                              };
                    dust.render('ind_opt_tmpl', tpl, function(err, out){
                        out = $(out);
                        // include the values of the object so we can filter for all properties
                        var hid = $('textarea', out);
                        var rec_obj_val = function(k, v) {
                            if (v instanceof Object) {
                                $.each(v, function(k1, v1) {
                                    rec_obj_val(k1, v1)
                                });
                            }else{
                                hid.text(hid.text() + " " + v);
                            }
                        };
                        $.each(instance.obs_get_json(obs_id), function(k,v){ rec_obj_val(k,v);});
                        
                        out.click(function(){
                            $(this).toggleClass('sel_option_selected', 0, function(){
                                if($(this).is( '.sel_option_selected')){
                                    instance.indicator_registry[ind_id].observables.push(obs_id);
                                    instance.indicator_registry[ind_id].observables=uniqueArray(instance.indicator_registry[ind_id].observables);
                                    // Add the item to the result list
                                    ind_sel_opt_obs_result.append(
                                        $('<li></li>').attr('data-id', obs_id).text(obs_elem.type + ': ' + instance.get_obs_elem_desc_name(obs_elem))
                                    );
                                }else{
                                    instance.ind_remove_obs(ind_id, obs_id);
                                    // Remove from the result list
                                    $('[data-id="'+ obs_id +'"]', ind_sel_opt_obs_result).remove();
                                }
                            });
                        });
                        // On load/refresh add the already included observables to the result list
                        if(instance.is_observable_in_indicator(obs_id, ind_id)){
                            ind_sel_opt_obs_result.append(
                                $('<li></li>').attr('data-id', obs_id).text(obs_elem.type + ': ' + instance.get_obs_elem_desc_name(obs_elem))
                            );
                        }
                        out.appendTo(ind_sel_opt_obs);
                    });
                });


                //insert test mechanisms
                $.each(instance.test_mechanisms_registry, function(test_id, test_elem){
                    var tpl = {title: instance.get_tes_elem_desc_name(test_elem),
                               display_type: '',
                               source: instance.get_ns_from_guid(test_elem.object_id),
                               description: test_elem.description,
                               type: 'obs',
                               selected: instance.is_test_mechanism_in_indicator(test_id, ind_id)
                              };
                    dust.render('ind_opt_tmpl', tpl, function(err, out){
                        out = $(out);
                        out.click(function(){
                            $(this).toggleClass('sel_option_selected', 0, function(){
                                if($(this).is('.sel_option_selected')){
                                    instance.indicator_registry[ind_id].test_mechanisms.push(test_id);
                                    instance.indicator_registry[ind_id].test_mechanisms=uniqueArray(instance.indicator_registry[ind_id].test_mechanisms);
                                    // Add the item to the result list
                                    ind_sel_opt_tes_result.append(
                                        $('<li></li>').attr('data-id', test_id).text(instance.get_tes_elem_desc_name(test_elem))
                                    );
                                }else{
                                    instance.ind_remove_tes(ind_id, test_id);
                                    // Remove from the result list
                                    $('[data-id="'+ test_id +'"]', ind_sel_opt_tes_result).remove();
                                }
                            });
                        });
                        // On load/refresh add the already included observables to the result list
                        if(instance.is_test_mechanism_in_indicator(test_id, ind_id)){
                            ind_sel_opt_tes_result.append(
                                $('<li></li>').attr('data-id', test_id).text(instance.get_tes_elem_desc_name(test_elem))
                            );
                        }
                        out.appendTo(ind_sel_opt_test);
                    });
                });

                // Update the title of the indicator
                $(this).find('[name="indicator_title"]').trigger('change');
            });
        },


        /*
         * Adds an indicator to the indicator pool. Gets passed a
         * template id. If template id is not passed (which happens
         * when user drops on specific placeholder, the first template
         * in the template pool will be used)
         * @param {string} template_id
         * @param {string} guid_passed Optional guid which will be used instead of generating one
         */
        ind_pool_add_elem: function(template_id, guid_passed, no_refresh){
            var instance = this,
                auto_gen = false,
                template = false,
                indicator_container_tmpl = dust.compile('<div class="dda-add-element"> \
                                                        <div class="clearfix" style="margin-bottom:5px;"> \
                                                        <button class="dda-ind-remove pull-right"></button> \
                                                        <h3>{title}</h3> \
                                                        </div> \
                                                        <div class="clearfix ind_pool_toggle_container"> \
                                                        <div style="width:33%" class="pull-left"> \
                                                        {body|s} \
                                                        </div> \
                                                        <div style="width:33%" class="pull-left"> \
                                                        <div class="grp-row" style="padding-top:0px;"> \
                                                        <p>Select the indicators, IOCs, and Snort rules you wish to include in this indicator.</p> \
                                                        <div> \
                                                        <input type="text" class="ind_pool_sel_listfilter" placeholder="Filter List Below"> \
                                                        <div class="ind_pool_sel_list"> \
                                                        <div class="ind_pool_sel_opt_obs"> \
                                                        <span style="font-weight:bold;font-style:italic;" style="margin-bottom:3px;">Indicators</span> \
                                                        </div> \
                                                        <div class="ind_pool_sel_opt_test"> \
                                                        <span style="font-weight:bold;font-style:italic;" style="margin-bottom:3px;">IOCs/Snort Rules</span> \
                                                        </div> \
                                                        </div> \
                                                        </div> \
                                                        </div> \
                                                        </div> \
                                                        <div style="width:33%" class="pull-left"> \
                                                        <p>Summary of contents</p> \
                                                        <div class="ind_pool_sel_result"> \
                                                        <div class="dda-add-element clearfix"> \
                                                        <img src="/static/mantis_stix_importer/img/icons/indicator.svg" type="image/svg+xml" class="pull-left" style="width:30px; margin-right:5px"/> \
                                                        <h3></h3> \
                                                        <ul class="ind_pool_sel_result_obs"></ul> \
                                                        <ul class="ind_pool_sel_result_tes"></ul> \
                                                        </div> \
                                                        </div> \
                                                        </div> \
                                                        </div>\
                                                        </div>', 'indicator_container');


            no_refresh = no_refresh || false;
            
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
            var guid = guid_gen(),
                guid_indicator = "{" + instance.namespace_uri + '}' + template.find('#id_object_type').val() + '-' + guid;

            if(guid_passed){
                if(instance.indicator_registry[guid_passed] != undefined){
                    log_message('A indicator with this ID already exists.', 'error');
                    return false;
                }
                guid_indicator = guid_passed;
            }

            var tpl = {
                title: guid_indicator,
                body: template.clone().attr('id', guid_indicator).outerHtml()
            };
            dust.loadSource(indicator_container_tmpl);
            var ret = false;
            dust.render('indicator_container', tpl, function(err, out){
                out = $(out);

                // Bind the toggle
                var h3 = out.find('h3').first();
                h3.click(function(){
                    out.find('.ind_pool_toggle_container').first().toggle();
                });

                // Buttonize
                out.find('.dda-ind-remove').button({
                    icons:{
                        primary: 'ui-icon-trash'
                    },
                    text: false
                }).click(function(){
                    instance.ind_pool_remove_elem(guid_indicator);
                });

                // Title change
                var summary_h3 = $('.ind_pool_sel_result', out).find('h3').first();
                $(out).find('[name="indicator_title"]').first().on('change keyup', function(){
                    var ind_title = $(this).val();
                    if(ind_title!=''){
                        h3.text(ind_title);
                        summary_h3.text(ind_title);
                    }else{
                        h3.text(guid_indicator);
                        summary_h3.text(guid_indicator);
                    }
                });
                var list = $(out).find('.ind_pool_sel_list').first();

                // The filter input to reduce the indicators/test mechanisms
                list.filterByText($(out).find('.ind_pool_sel_listfilter').first(), '.sel_option');

                // Bind the change event when selecting elements in the list
                list.on('change', function(){
                    instance.ind_update_contained_elements(guid_indicator);
                });

                // Insert in DOM
                instance.ind_pool_list.prepend(out);

                // Register the object internally
                instance.indicator_registry[guid_indicator] = {
                    template: template_id,
                    object_id: guid_indicator,
                    element: out,
                    description: template.data('description'),
                    observables: [],
                    test_mechanisms: []
                };

                if(!auto_gen){
                    //instance.refresh_stix_package_tab();
                }else{
                    ret = guid_indicator;
                }

                if(!no_refresh)
                    instance.refresh_indicator_pool_tab();
            });
            return ret;

        },


        /**
         * Updates an indicator from the indicator registry with the observables
         * contained in it from the multi-select element
         * @param {string} guid The indicator id of the element to be updated
         */
        ind_update_contained_elements: function(guid){
            var instance = this,
                ind_elem = instance.indicator_registry[guid],
                ind_sel = $('.ind_pool_sel_list', ind_elem.element);
            ind_elem.observables = [];
            $.each($('option:selected', ind_sel), function(){
                if($(this).data('type')=='obs')
                    ind_elem.observables.push($(this).val());
                if($(this).data('type')=='test')
                    ind_elem.test_mechanisms.push($(this).val());
            });

        },


        /**
         * Removes and indicator from the pool
         * @param {string} guid The indicator id of the element to be removed
         */
        ind_pool_remove_elem: function(guid){
            var instance = this;

            if(instance.indicator_registry[guid].observables.length > 0){
                var dlg = $('<div id="dda-delete-indicator-dlg" title="Delete Indicator Group"><div>\
                            <span>Do you also want to remote the indicators contained in this group?</span><br><br>\
                            <button class="del_inc_ind pull-left" style="width:auto;">Also delete indicators</button><button class="del_wo_ind pull-right" style="width:auto;">Just remove the group</button>\
                            </div></div>');
                dlg.dialog({
                    width: '350px',
                    modal: true,
                    draggable: false,
                    resizable: false,
                    create: function(event, ui){
                        dlg.find('.del_inc_ind').first().button().click(function(){
                            var ind = instance.indicator_registry[guid];
                            $.each(ind.observables, function(i,v){
                                instance.obs_pool_remove_elem(v);
                            });
                            ind.element.remove();
                            delete instance.indicator_registry[guid];
                            instance.refresh_indicator_pool_tab();
                            dlg.dialog('close');
                        });
                        dlg.find('.del_wo_ind').first().button().click(function(){
                            instance.indicator_registry[guid].element.remove();
                            delete instance.indicator_registry[guid];
                            instance.refresh_indicator_pool_tab();
                            dlg.dialog('close');
                        });
                    }
                });
            }
        },


        /**
         * Removes an observable from an indicator
         * @param {string} ind_guid The indicator id
         * @param {string} obs_guid The observable id
         */
        ind_remove_obs: function(ind_guid, obs_guid){
            var instance = this,
                obs = this.indicator_registry[ind_guid].observables,
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
