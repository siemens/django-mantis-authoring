define(['jquery', 'form2js', 'dust'],function($, form2js){

    /*
     * Return a javascript object literal with our base config of the
     * app. The functionality of the tabs is encapsulated in separate
     * files/extensions (except for the STIX tab functionality which is found here)
     */
    return {
        namespace_uri: false,
        investigation_observables: $('#dda-investigation-observables'),
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
                instance.init_investigation_tab();
                instance.init_observable_pool_tab();
                instance.refresh_investigation_tab(); //Initial refresh for button handlers to be bound (in case this tab is the first visible tab)
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
                    var dlg = $('<div class="dda-obs-find_similar-dlg" title="Choose the file parsing mechanism">Please wait...</div>'),
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
                    $.each(response.data, function(i,v){
                        if(v.object_class=='observable'){
                            var el = instance.obs_pool_add_elem('dda-observable-template_' + v.object_type + '_' + v.object_subtype, v.object_id);
                            if(!el) return true;
                            $.each(v.properties, function(i1,v1){
                                $('[name="'+i1+'"]', el.element).val(v1);
                            });
                            instance.obs_elem_validate(el.observable_id); // this also triggers name generation
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

                }
            };


            //Now create the jquery-ui tabbing
            $('#dda-container-tabs').tabs({
                active: 0,
                activate:function(event,ui){
                    if(ui.newTab.index()==0){
                        instance.refresh_investigation_tab();
                    }
                    if(ui.newTab.index()==1){
                        instance.refresh_observable_pool_tab();
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
            $('#dda-investigation-meta').find('input, select, textarea').val('');
            // Reset observables
            $.each(instance.observable_registry, function(i,v){
                instance.obs_pool_remove_elem(v.observable_id);
            });
        },


        /**
         * Initializes the Investigation tab
         */
        init_investigation_tab: function(){
            var instance = this;

            // Reset GUI because some browsers keep values in inputs on reload
            instance.reset_gui();

            // Show-stix button
            // $('#dda-stix-debug_show_stix').button().click(function(){
            //     instance.transform_json('generate', false, function(data, stix_base){
            //         var dlg = $('<div id="dda-show-stix-dlg" title="STIX Package Output' + data.malformed_xml_warning +'"><div id="dda-show-stix-edit"></div></div>');
            //         dlg.dialog({
            //             width: $(window).width()-30,
            //             height: $(window).height()-30,
            //             modal: true,
            //             draggable: false,
            //             resizable: false,
            //             create: function(event, ui){
            //                 $('body').css('overflow', 'hidden');
            //             },
            //             beforeClose: function( event, ui ) {
            //                 var editor = ace.edit('dda-show-stix-edit');
            //                 editor.destroy();
            //                 $('body').css('overflow', 'auto');
            //                 $('#dda-show-stix-edit').remove();
            //             },
            //             resizeStop: function( event, ui ) {
            //                 var editor = ace.edit('dda-show-stix-edit');
            //                 editor.resize();
            //             }
            //         });
            //         var editor = ace.edit('dda-show-stix-edit');
            //         editor.setReadOnly(true);
            //         editor.getSession().setMode("ace/mode/xml");
            //         editor.setValue(data.xml);
            //         editor.moveCursorTo(1,1);
            //         editor.selection.clearSelection();
            //     }, true);
            //     return false;
            // });

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
                        instance.refresh_investigation_tab();
                        dlg.dialog('close');
                    }
                }).css('margin-right', '15px');
                dlg.append(
                    btn
                );
            });

        },


        /**
         * Refreshes the Investigation tab
         */
        refresh_investigation_tab: function(){
            var instance = this,
                pool_elem_tmpl = dust.compile('<div class="dda-add-element clearfix" data-id="{id}" data-type="{type}"> \
                                              <h3>{title}</h3> \
                                              <p>{description}</p> \
                                              </div>', 'pool_elem');
            dust.loadSource(pool_elem_tmpl);

            // Display the observables
            instance.investigation_observables.html('');
            $.each(instance.observable_registry, function(i,v){
                var elem_data = {
                    'id': i,
                    'type': 'observable',
                    'title': $('#id_I_object_display_name', $('#'+v.template)).val(),
                    'description': instance.get_obs_elem_desc_name(v, i)
                };
                dust.render('pool_elem', elem_data, function(err, out){
                    out = $(out);
                    instance.investigation_observables.append(out);
                });
            });
        },


        /**
         * Returns the JSON representation of the current configuration
         * @returns {object} the JSON
         */
        get_json: function(){
            var instance = this;
            // Generate package id if not already existing
            if($('#dda-investigation-meta').find('input[name="stix_package_id"]').val()=='')
                $('#dda-investigation-meta').find('input[name="stix_package_id"]').val("{" + instance.namespace_uri + '}package-' + guid_gen());
            var stix_base = {
                'stix_header': form2js($('#dda-investigation-meta').find('input, select, textarea').get(), undefined, false),
                'observables': []
            }

            // Include the observables
            $.each(instance.observable_registry, function(i,v){
                stix_base.observables.push(instance.obs_get_json(i));
            });
            
            return stix_base;
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

            if(instance.load_name)
                $('#grp-content-title h1').text(instance.load_name);

            // Restore STIX header information
            $.each(jsn.stix_header, function(i,v){
                $('[name="'+i+'"]', '#dda-investigation-meta').val(v);
            });

            // Restore observables
            instance.observable_registry = {};
            $.each(jsn.observables, function(i,v){
                var template = 'dda-observable-template_' + v.observable_properties.object_type + '_' + v.observable_properties.object_subtype;
                instance.obs_pool_add_elem(template, v.observable_id);
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

                // Update observable display name
                instance.obs_update_name(v.observable_id);
            });

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
