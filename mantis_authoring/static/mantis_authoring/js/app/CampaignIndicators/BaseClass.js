define(['jquery', 'form2js', 'dust', 'mask'],function($, form2js, dust){

    /*
     * Return a javascript object literal with our base config of the
     * app. The functionality of the tabs is encapsulated in separate
     * files/extensions (except for the STIX tab functionality which is found here)
     */
    return {
        namespace_uri: false,
        package_indicators: $('#dda-package-indicators'),
        load_name: false,       // Holds the name of the currently loaded template-json
        load_uuid: false,       // Holds the uuid of the currently loaded template-json
        _last_save: false,      // Last saved json for change-detection

        /**
         * Init function. Intended to be called when this app thing is
         * instanciated. Makes sure that namespace is set before
         * continuing to load the application entirely.
         */
        init: function(callback){
            var instance = this;
            this.init_user_namespace(function(success){
                // Now init each tab
                instance.init_headline();
                instance.init_campaign_tab();
                instance.init_observable_pool_tab();
                instance.init_indicator_pool_tab();
                instance.init_test_mechanisms_tab();
                //object relations are initiated on first refresh of the tab because that is where we know the canvas size
                //instance.init_object_relations_tab(); // not required
                instance.refresh_stix_package_tab(); //Initial refresh for button handlers to be bound (in case this tab is the first visible tab)
                if(success)
                    callback(instance);
                else
                    callback(false);
            });


            /*
             * Response callback handler of file uploads (dropzones)
             */
            window._handle_file_upload_response = function(response){
                if(response.status==0){
                    log_message(response.msg, 'error');
                    return;
                }
                if(response.action=='ask'){
                    // Query user for action
                    var dlg = $('<div class="" title="Choose the file parsing mechanism">Please wait...</div>'),
                        ask_content_tmpl = dust.compile('<ol style="max-height: 500px;"> \
                                                        <p>{action_msg}</p> \
                                                        {#data} \
                                                        <li class="ui-widget-content" data-id="{$idx}"> \
                                                        <div class="dda-add-element"> \
                                                        <h3>{title}</h3> \
                                                        <p>{details}</p> \
                                                        </div> \
                                                        </li> \
                                                        {/data} \
                                                        </ol> \
                                                        <span style="margin-top:6px; display:none;" class="ui-icon ui-icon-clock pull-left"></span> \
                                                        <div class="pull-right"> \
                                                        <button class="ok">Ok</button> \
                                                        <button class="cancel">Cancel</button> \
                                                        </div> \
                                                        ', 'ask_file_type_content');

                    dlg.dialog({
                        width: 600, modal: true,
                        position: ['center', 'center']
                    });
                    dust.loadSource(ask_content_tmpl);
                    dust.render('ask_file_type_content', response, function(err, out){
                        out = $(out);
                        out.selectable();
                        dlg.html(out);
                        $('button', dlg).button();
                        $('button.ok', dlg).click(function(){
                            var sel = $('.ui-selected', dlg);
                            if(sel.length){
                                $('.ui-icon-clock', dlg).show();
                                var rd = response.data[sel.data('id')]
                                $.post(response.action_url, rd, function(response1){
                                    window._handle_file_upload_response(response1);
                                    dlg.dialog('destroy');
                                });

                            }
                        });
                        $('button.cancel', dlg).click(function(){
                            dlg.dialog('destroy');
                        });
                        dlg.dialog("option", "position", ['center', 'center'] );
                    });

                }else if(response.action=='create'){
                    // Create objects

                    // We keep track of things we do after creating.
                    // add_to_ind will add elements to indicators after creation
                    // ind_namespace_ids will keep track of the newly generated indicators with their ids. We need this so we can put observables to these indicators, and observables only have the namespace, not the id
                    var add_to_ind = {};
                    var ind_namespace_ids = {};

                    $.each(response.data, function(i,v){
                        if(v.object_class=='observable'){
                            // If there's a object_namespace passed, we create
                            // one for the observable. This is also an indicator
                            // that we want to group this one into an indicator
                            if(v.object_namespace != undefined){
                                v.object_id = "{" + v.object_namespace + '}Observable-' + guid_gen();
                                if(add_to_ind[v.object_namespace]==undefined)
                                    add_to_ind[v.object_namespace] = [];
                                add_to_ind[v.object_namespace].push(v.object_id);
                            };

                            // Create the element and set its properties
                            var el1 = instance.obs_pool_add_elem('dda-observable-template_' + v.object_type + '_' + v.object_subtype, v.object_id, false, false, true);
                            if(!el1) return true;
                            $.each(v.properties, function(i1,v1){
                                $('[name="'+i1+'"]', el1.element).val(v1);
                            });

                            // Only log a message if we dont group to an indicator
                            if(v.object_namespace == undefined)
                                log_message('Created '+ v.object_type +' ('+ v.object_subtype +') object: ' + el1.observable_id, 'success', 5000);

                        }else if(v.object_class=='testmechanism'){
                            // Create the element and set its properties
                            var el2 = instance.tes_pool_add_elem('dda-test-mechanism-template_' + v.object_type + '_' + v.object_subtype, v.object_id);
                            if(!el2) return true;
                            $.each(v.properties, function(i1,v1){
                                $('[name="'+i1+'"]', el2.element).val(v1);
                            });

                            instance.tes_preview_element(el2.object_id);
                            log_message('Created '+ v.object_subtype +' ('+ v.object_type +') object: ' + el2.object_id, 'success', 5000);

                        }else if(v.object_class=='indicator'){
                            // Create the element and set its properties
                            var guid = "{" + v.object_namespace + '}' + v.object_type + '-' + guid_gen();
                            instance.ind_pool_add_elem('dda-indicator-template_' + v.object_type, guid, true);
                            if(instance.indicator_registry[guid] == undefined) return true;
                            var el3 = instance.indicator_registry[guid];
                            $.each(v.properties, function(i1,v1){
                                $('[name="'+i1+'"]', el3.element).val(v1);
                            });

                            // keep track of the new ids
                            ind_namespace_ids[v.object_namespace] = guid;
                        }
                    });

                    // Process aftertasks
                    $.each(add_to_ind, function(i,v){
                        var indicator_id = ind_namespace_ids[i];
                        $.each(v, function(i1,v1){
                            if(!instance.is_observable_in_indicator(v1, indicator_id))
                                instance.indicator_registry[indicator_id].observables.push(v1);
                        });
                        log_message('Created indicator group '+ indicator_id +' and added '+ v.length  +' observables to it', 'success', 5000);
                    });

                    // Validate observables
                    instance.obs_elem_validate(); // this also triggers name generation

                    instance.refresh_observable_pool_tab();
                    instance.refresh_indicator_pool_tab();
                }
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
                        instance.refresh_observable_pool_tab();

                    }
                    if(ui.newTab.index()==1){
                        instance.refresh_indicator_pool_tab();
                    }
                    if(ui.newTab.index()==2){
                        instance.refresh_object_relations_tab();

                    }
                    if(ui.newTab.index()==3){

                        instance.refresh_test_mechanisms_pool_tab();
                    }
                    if(ui.newTab.index()==4){
                        instance.refresh_campaign_tab();
                    }

                    // Save the report if it changed
                    //if(instance.load_name && instance.load_uuid){
                    //    if(!deepCompare(instance.get_json(), instance._last_save)){
                    //        instance.transform_json('save', true, function(data, stix_base){
                    //            instance._last_save = stix_base;
                    //        });
                    //    }
                    //}
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
         * Initializes the users namespace and sets this.namespace_uri
         * @param {function} callback Callback function thats being called when namespace is set
         */
        init_user_namespace: function(callback){
            var instance = this;
            $.get('get_namespace', function(data){
                if(data.status){
                    instance.namespace_uri = data.data.default_ns_uri;
                    callback(true);
                }else{
                    log_message(data.msg, 'error');
                    callback(false);
                }
            }, 'json');
        },

        /**
         * Resets the GUI by removing all items manually
         */
        reset_gui: function(){
            var instance = this;

            $('#dda-container-tabs').tabs('option', 'active', 0);

            $('#dda-headline-container').find('input, select, textarea').val('');

            // Reset campaign info
            $('#dda-campaign-template_Campaign', '#dda-campaign-container')
                .find('input, select, textarea').not('[name^="I_"]').val('');
            $('#dda-threatactor-template_ThreatActor', '#dda-campaign-container')
                .find('input, select, textarea').not('[name^="I_"]').val('');

            // Reset observables
            $.each(instance.observable_registry, function(i,v){
                instance.obs_pool_remove_elem(v.observable_id);
            });

            // Reset test mechanisms
            $.each(instance.test_mechanisms_registry, function(i,v){
                instance.tes_pool_remove_elem(v.object_id);
            });

            // Reset indicators
            $.each(instance.indicator_registry, function(i,v){
                instance.ind_pool_remove_elem(v.object_id);
            });

        },


        /**
         * Initializes the STIX package tab
         */
        init_headline: function(){
            var instance = this;

            // Reset GUI because some browsers keep values in inputs on reload
            instance.reset_gui();

            // Treat the type selector
            var update_headline_h1 = function(){
                var title_el = $('#dda-headline-report-type-title'),
                    title = title_el.val(),
                    hl = $('#dda-headline-report-type > h1').first();
                if(title==''){
                    title = title_el.attr('placeholder');
                    if(title=='')
                        title='<empty>';
                    hl.css('color', 'gray');
                }else
                    hl.css('color', 'black');
                hl.text(title);
            };
            $('#dda-headline-report-type-selector').on('change', function(){
                if($(this).val() == 'stix'){
                    $('#dda-headline-report-type-title').inputmask('Regex', { clearMaskOnLostFocus: false, regex: '.*'}).css('width', '100%');
                    update_headline_h1();
                    // Hide the input field for the RT number
                    $('#dda-headline-report-type-rtnr').hide();
                }else if($(this).val() == 'investigation'){
                    $('#dda-headline-report-type-title').inputmask("INVES-9{+}", {clearMaskOnLostFocus: false, placeholder: ""}).css('width', '100%');
                    update_headline_h1();
                    // Hide the input field for the RT number
                    $('#dda-headline-report-type-rtnr').hide();
                }else if($(this).val() == 'incident_report'){
                    $('#dda-headline-report-type-title').inputmask("IR-9{+}", {clearMaskOnLostFocus: false, placeholder: ""}).css('width', '50%');
                    update_headline_h1();
                    // Show the input field for the RT number
                    $('#dda-headline-report-type-rtnr').show();
                }
                $('#dda-headline-report-type-title').on('change keyup', function(){
                    update_headline_h1();
                    // If the title starts with a 'IR-' or 'INVES-' we change the type accordingly.
                    if($('#dda-headline-report-type-title').val().toLowerCase().startsWith('ir-') && $('#dda-headline-report-type-selector').val() != 'incident_report'){
                        $('#dda-headline-report-type-selector').val('incident_report');
                        $('#dda-headline-report-type-selector').trigger('change');
                    }
                    if($('#dda-headline-report-type-title').val().toLowerCase().startsWith('inves-') && $('#dda-headline-report-type-selector').val() != 'investigation'){
                        $('#dda-headline-report-type-selector').val('investigation');
                        $('#dda-headline-report-type-selector').trigger('change');
                    }

                });
                $('#dda-headline-report-type-rtnr').inputmask("Sie\\men\\s-CERT\\#9{+}", {clearMaskOnLostFocus: false, placeholder: ""})

            }).trigger('change');


            // Show-stix button
            $('#dda-stix-debug_show_stix').button().click(function(){
                instance.transform_json('generate', false, function(data, stix_base){
                    var dlg = $('<div id="dda-show-stix-dlg" title="STIX Package Output' + data.malformed_xml_warning +'"><div id="dda-show-stix-edit"></div></div>');
                    dlg.dialog({
                        width: $(window).width()-30,
                        height: $(window).height()-30,
                        modal: true,
                        draggable: false,
                        resizable: false,
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
                    editor.moveCursorTo(1,1);
                    editor.selection.clearSelection();
                }, true);
                return false;
            });

            // Show JSON button
            $('#dda-stix-debug_show_json').button().click(function(){
                var result = JSON.stringify(instance.get_json(), null, "    ");
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
                editor.moveCursorTo(1,1);
                editor.selection.clearSelection();
            });

            // Load JSON button
            $('#dda-stix-debug_load_json').button().click(function(){
                var result = JSON.stringify(instance.get_json(), null, "    ");
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

        },

        /**
         * Checks whether an observable is in an indicator
         * @param {integer} ind_id Indicator id in which to check. All indicators if not provided
         */
        is_observable_in_indicator: function(obs_id, ind_id){
            var instance = this;
            ind_id = ind_id || false;

            if(ind_id){
                if($.inArray(obs_id, instance.indicator_registry[ind_id].observables)!==-1)
                    return true;
                return false;
            }

            var ret = false;
            $.each(instance.indicator_registry, function(i,v){
                if($.inArray(obs_id, v.observables)!==-1){
                    ret = true;
                    return false; //break from each
                }
            });
            return ret;
        },

        /**
         * Checks whether a test mechanism is in an indicator
         * @param {integer} ind_id Indicator id in which to check. All indicators if not provided
         */
        is_test_mechanism_in_indicator: function(tes_id, ind_id){
            var instance = this;
            ind_id = ind_id || false;

            if(ind_id){
                if($.inArray(tes_id, instance.indicator_registry[ind_id].test_mechanisms)!==-1)
                    return true;
                return false;
            }

            var ret = false;
            $.each(instance.indicator_registry, function(i,v){
                if($.inArray(tes_id, v.test_mechanisms)!==-1){
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
                pool_elem_tmpl = dust.compile('<div class="dda-add-element clearfix {?existing}dda-bg-green{/existing}" data-id="{id}" data-type="{type}""> \
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

                var title = $('#id_indicator_title', indicator_element.element).val();
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
                var _save_fcn = function(){
                    instance.transform_json('import', false, function(data, stix_base){
                        instance._last_save = stix_base;
                        //instance.reset_gui();
                    });
                };

                if(!instance.load_name || !instance.load_uuid){
                    //Ask user for meaningful name and generate uuid
                    var dlg = $('<div id="dda-save-json-dlg" title="Import into Mantis"><p>Please provide a meaningful name for your package:</p></div>');
                    var inp = $('<input id="dda-save-json-input" type="text"/>').val($('#dda-headline-report-type-title').val());
                    dlg.append(inp);

                    dlg.dialog({ modal: true });
                    var ok_btn = $('<button>Ok</button>').button().addClass('pull-right').click(function(){
                        var pkg_name = $.trim(dlg.find('input').first().val());
                        if(pkg_name != ''){
                            instance.load_name = pkg_name;
                            instance.load_uuid = guid_gen();
                            _save_fcn();
                            dlg.dialog('close');
                        }else
                            inp.focus();

                    });
                    dlg.append(ok_btn);

                }else
                    _save_fcn();

                return false;
            });


            // Save and release draft button
            $('#dda-stix-save-and-release').off('click').on('click', function(){
                var _save_fcn = function(){
                    instance.transform_json('release', false, function(data, stix_base){
                        instance._last_save = stix_base;
                        //instance.reset_gui();
                    });
                };

                if(!instance.load_name || !instance.load_uuid){
                    //Ask user for meaningful name and generate uuid
                    var dlg = $('<div id="dda-save-json-dlg" title="Save JSON"><p>Please provide a meaningful name for your package:</p></div>');
                    var inp = $('<input id="dda-save-json-input" type="text"/>').val($('#dda-headline-report-type-title').val());
                    dlg.append(inp);

                    dlg.dialog({ modal: true });
                    var ok_btn = $('<button>Ok</button>').button().addClass('pull-right').click(function(){
                        var pkg_name = $.trim(dlg.find('input').first().val());
                        if(pkg_name != ''){
                            instance.load_name = pkg_name;
                            instance.load_uuid = guid_gen();
                            _save_fcn();
                            dlg.dialog('close');
                        }else
                            inp.focus();

                    });
                    dlg.append(ok_btn);

                }else
                    _save_fcn();

                return false;
            });


            // Save draft button
            $('#dda-stix-save').off('click').on('click', function(){
                var stix_base = instance.get_json();
                var _save_fcn = function(){
                    instance.transform_json('save', false, function(data, stix_base){
                        instance._last_save = stix_base;
                    });
                };

                if(!instance.load_name || !instance.load_uuid){
                    //Ask user for meaningful name and generate uuid
                    var dlg = $('<div id="dda-save-json-dlg" title="Save JSON"><p>Please provide a meaningful name for your package:</p></div>');
                    var inp = $('<input id="dda-save-json-input" type="text"/>').val($('#dda-headline-report-type-title').val());
                    dlg.append(inp);

                    dlg.dialog({ modal: true });
                    var ok_btn = $('<button>Ok</button>').button().addClass('pull-right').click(function(){
                        var pkg_name = $.trim(dlg.find('input').first().val());
                        if(pkg_name != ''){
                            instance.load_name = pkg_name;
                            instance.load_uuid = guid_gen();
                            _save_fcn();
                            dlg.dialog('close');
                        }else
                            inp.focus();

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
                            var _t_sel = $('<option></option>').attr('value',v.id).text(v.name + ' ('+v.date+')');
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
         * Returns the ns part of a guid
         * @param {string} guid
         */
        get_ns_from_guid: function(guid){
            guid = guid || '';
            var s = guid.substring(guid.indexOf("{")+1, guid.indexOf("}"));
            if(s == ''){
                s = guid.substring(0, guid.indexOf(":"));
            };
            return s;
        },

        /**
         * Does some action with the current document
         * @param {string} action The action to take on the document. E.g. import, release, save
         * @param {boolean} silent be quiet about the result
         * @param {object} success_callback(saved_doc) Called on success from backend
         * @param {boolean} dummy generate dummy id in case not set (e.g. for gererate which creates a stix document without import);
         */
        transform_json: function(action, silent, success_callback, dummy){
            var instance = this;
            silent = typeof silent !== 'undefined' ? silent : false;
            dummy = typeof dummy !== 'undefined' ? dummy : false;

            var load_name = instance.load_name;
            var load_uuid = instance.load_uuid;

            if(dummy & !load_name) load_name = 'dummy';
            if(dummy & !load_uuid) load_uuid = guid_gen();

            if(!load_name || !load_uuid) return;

            var stix_base = instance.get_json();
            $.post('transform',
                   {'jsn': JSON.stringify(stix_base), 'submit_name': load_name, 'id': load_uuid, 'action': action},
                   function(data){
                       if(data.status){
                           // Set last-saved json so we have a copy of what's been saved to check against (to detect changes)
                           if(!silent) log_message(data.msg, 'success', 5000);
                           success_callback(data, stix_base);
                       }else
                           if(!silent) log_message(data.msg, 'error');
                   }, 'json');
        },



        /**
         * Returns the JSON representation of the current configuration
         * @returns {object} the JSON
         */
        get_json: function(){
            var instance = this;
            // Generate package id if not already existing
            if($('#dda-headline-report-meta-stix-package-id').val() == '')
                $('#dda-headline-report-meta-stix-package-id').val("{" + instance.namespace_uri + '}package-' + guid_gen());
            var stix_base = {
                'stix_header': form2js($('#dda-headline-container').find('input, select, textarea').get(), undefined, false),
                'campaign': {},
                'incidents': [],
                'indicators': [],
                'observables': [],
                'test_mechanisms': []
            }

            // Include the indicators
            $.each(instance.indicator_registry, function(i,v){
                var tmp = form2js($('.dda-indicator-template', v.element).find('input, select, textarea').not('[name^="I_"]').get(), undefined, false);
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
                var tmp = form2js($('.dda-test-mechanism-template', v.element).find('input, select, textarea').not('[name^="I_"]').get(), undefined, false);
                tmp.test_mechanism_id = v.object_id;
                stix_base.test_mechanisms.push(tmp);
            });

            // Include the campaign information
            stix_base.campaign = form2js(
                $('.dda-campaign-template', '#dda-campaign-container').find('input, select, textarea').not('[name^="I_"]').get(),
                undefined, false);
            stix_base.campaign.threatactor = form2js(
                $('.dda-threatactor-template', '#dda-campaign-container').find('input, select, textarea').not('[name^="I_"]').get(),
                undefined, false);

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

            instance.reset_gui();

            instance.load_name = load_name || false;
            instance.load_uuid = load_uuid || false;

            // Restore STIX header information
            $.each(jsn.stix_header, function(i,v){
                var t_el = $('[name="'+i+'"]', '#dda-headline-container');
                t_el.val(v);
            });
            $('#dda-headline-report-type-title').trigger('change');
            $('#dda-headline-report-type-selector').trigger('change');

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
                instance.obs_pool_add_elem(template, v.observable_id, false, false, true);
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
            // Update observable display names and validate objects
            instance.obs_elem_validate();

            // Restore the test mechanisms
            instance.test_mechanisms_registry = {};
            $.each(jsn.test_mechanisms, function(i,v){
                var template = 'dda-test-mechanism-template_' + v.object_type + '_' + v.object_subtype;
                instance.tes_pool_add_elem(template, v.test_mechanism_id);
                var el = instance.test_mechanisms_registry[v.test_mechanism_id];

                //restore info
                $.each(v, function(i1,v1){
                    $('[name="'+i1+'"]', el.element).val(v1);
                });
                instance.tes_preview_element(v.test_mechanism_id);
            });

            // Restore the campaign information
            if(jsn.campaign!=undefined){
                var itm = {};
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
