define(['jquery', 'form2js', 'dust'],function($, form2js){

    /*
     * Return a javascript object literal with our base config of the
     * app. The functionality of the tabs is encapsulated in separate
     * files/extensions (except for the STIX tab functionality which is found here)
     */
    return {
        namespace_uri: false,
        action_registry: {}, // Holds the actions currently loaded
        investigation_observables: $('#dda-investigation-observables'),
        action_container: $('#dda-investigation-action-container'),
        action_add_btn: $('#dda-investigation-action-add'),
        action_name: $('#dda-investigation-action-name'),
        action_description: $('#dda-investigation-action-description'),
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


            // Add functionality to the 'Add Action' button
            instance.action_add_btn.click(function(){
                var a_name = instance.action_name.val(),
                    a_description = instance.action_description.val(),
                    a_guid = "{" + instance.namespace_uri + '}action-' + guid_gen();
                if($.trim(a_name)=='') return;
                // already in the registry?
                var a_regged = false
                $.each(instance.action_registry, function(i,v){
                    if(i==a_name){
                        a_regged = true;
                        return false;
                    }
                });
                if(!a_regged){
                    instance.action_registry[a_guid] = {'name': a_name, 'description': a_description, 'guid': a_guid};
                    instance.refresh_investigation_tab();
                };

                instance.action_name.val('');
                instance.action_description.val('');
            });




            // Add various buttons to the tab's content
            var get_jsn_btn = $('<button>Show JSON</button>').button().click(function(){
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
            $('#dda-investigation-meta').after(get_jsn_btn);

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
                        instance.refresh_investigation_tab();
                        dlg.dialog('close');
                    }
                }).css('margin-right', '15px');
                dlg.append(
                    btn
                );
            });
            $('#dda-investigation-meta').after(import_jsn_btn);
        },


        /**
         * Refreshes the Investigation tab
         */
        refresh_investigation_tab: function(){
            var instance = this,
                pool_elem_tmpl = dust.compile('<div class="dda-add-element clearfix" data-id="{id}" data-type="{type}"> \
                                              <h3>{title}</h3> \
                                              <p>{description}</p> \
                                              <div class="dda-observable-action_dropzone" data-id={id}> \
                                              <ul> \
                                              {#actions} \
                                              <li><i class="ui-icon ui-icon-close pull-left" data-id="{id}"></i><span>{name} {?desc}- {desc}{/desc}</span></li> \
                                              {/actions} \
                                              </ul> \
                                              </div> \
                                              </div>', 'pool_elem'),
                pool_action_tmpl = dust.compile('<div class="dda-add-element clearfix" data-id={id}> \
                                                <i class="ui-icon ui-icon-close pull-right"></i> \
                                                <h3>{name}</h3> \
                                                <p>{description}</p> \
                                                </div>', 'action_elem');
            dust.loadSource(pool_elem_tmpl);
            dust.loadSource(pool_action_tmpl);


            // Display the observables
            instance.investigation_observables.html('');
            $.each(instance.observable_registry, function(i,v){
                var elem_data = {
                    'id': i,
                    'type': 'observable',
                    'title': $('#id_I_object_display_name', $('#'+v.template)).val(),
                    'description': instance.get_obs_elem_desc_name(v, i),
                    'actions': []
                };
                if(v.actions!=undefined){
                    $.each(v.actions, function(i1,v1){
                        elem_data.actions.push({
                            'id': instance.action_registry[v1].guid,
                            'name': instance.action_registry[v1].name,
                            'desc': instance.action_registry[v1].description
                        });
                    });
                };
                dust.render('pool_elem', elem_data, function(err, out){
                    out = $(out);
                    $('.ui-icon-close', out).click(function(){
                        var aid = $(this).data('id');
                        var oid = $(this).parents('.dda-observable-action_dropzone').first().data('id');
                        var aidx = instance.observable_registry[oid].actions.indexOf(aid);
                        if (aidx > -1) {
                            instance.observable_registry[oid].actions.splice(aidx, 1);
                        }
                        $(this).parent('li').remove();
                        console.log(instance.observable_registry);
                    });
                    instance.investigation_observables.append(out);
                });
            });


            // Display the actions
            instance.action_container.html('');
            $.each(instance.action_registry, function(i,v){
                var elem_data = {
                    'name': v['name'],
                    'description': v['description'],
                    'id': v['guid']
                };
                dust.render('action_elem', elem_data, function(err, out){
                    out = $(out);
                    out.draggable({
                        "helper": "clone",
                        "zIndex": 300,
                        "refreshPositions": true,
                        "start": function(event, ui) {
                            $(".dda-observable-action_dropzone").addClass("dda-dropzone-highlight");
                        },
                        "stop": function(event, ui) {
                            $(".dda-observable-action_dropzone").removeClass("dda-dropzone-highlight");
                        }
                    });
                    $('.ui-icon-close', out).click(function(){
                        delete instance.action_registry[v['guid']];
                        $(this).parent('div').remove();
                    });
                    instance.action_container.append(out);
                });
            });


            // Register droppable event on the observables
            instance.investigation_observables.find('.dda-observable-action_dropzone').droppable({
                "tolerance": "touch",
                "drop": function( event, ui ) {
                    if(!ui.draggable.hasClass('dda-add-element'))
                        return;
                    var draggable = $(ui.draggable);
                    
                    var action_id = $(draggable).data('id');
                    var observable_id = $(this).data('id');

                    if(instance.observable_registry[observable_id].actions == undefined) instance.observable_registry[observable_id].actions=[];
                    if(instance.observable_registry[observable_id].actions.indexOf(action_id) == -1){
                        instance.observable_registry[observable_id].actions.push(action_id);
                    };
                    // if(!indicator_id){ //if we drop on a non-indicator, we generate one
                    //     indicator_id = instance.ind_pool_add_elem();
                    // }
                    // if(object_type=='observable'){
                    //     instance.indicator_registry[indicator_id].observables.push(object_id);
                    //     instance.indicator_registry[indicator_id].observables=uniqueArray(instance.indicator_registry[indicator_id].observables);
                    // }else if(object_type=='test_mechanism'){
                    //     instance.indicator_registry[indicator_id].test_mechanisms.push(object_id);
                    //     instance.indicator_registry[indicator_id].test_mechanisms=uniqueArray(instance.indicator_registry[indicator_id].test_mechanisms);
                    // }
                    instance.refresh_investigation_tab();
                },
                "over": function (event, ui ) {
                    if(ui.draggable.hasClass('dda-add-element'))
                        $(event.target).addClass("dda-dropzone-hover");
                },
                "out": function (event, ui) {
                    $(event.target).removeClass("dda-dropzone-hover");
                }
            });









            //              $.each(indicator_element.observables, function(i,v){
            //                  elem_data.observables.push({
            //                      'id': v,
            //                      'desc': instance.get_obs_elem_desc_name(instance.observable_registry[v], v)
            //                  });
            //              });
            //              $.each(indicator_element.test_mechanisms, function(i,v){
            //                  elem_data.test_mechanisms.push({
            //                      'id': v,
            //                      'desc': instance.get_tes_elem_desc_name(instance.test_mechanisms_registry[v])
            //                  });
            //              });

            //              dust.render('reg_ind_elem', elem_data, function(err, out){
            //                  out = $(out);
            //                  out.find('li > i.ui-icon-close').click(function(i,v){
            //                      var indicator_guid = $(this).parents('.dda-package-indicators_dropzone').first().data('id'),
            //                          el_id = $(this).data('id');
            //                      instance.ind_remove_tes(indicator_guid, el_id);
            //                      instance.ind_remove_obs(indicator_guid, el_id);
            //                      instance.refresh_stix_package_tab();
            //                  });
            //                  instance.package_indicators.prepend(out);
            //              });

            //              // Add the drop-here-for-new-indicator dropzone
            //              var div = $('<div class="dda-add-element clearfix"></div>');
            //              div.prepend(
            //                  $('<img></img>').attr('src', $('#' + indicator_element.template).find('#id_I_icon').val())
            //                      .attr('type', 'image/svg+xml')
            //                      .addClass('pull-left')
            //                      .css({'width': '30px', 'margin-right': '5px'})
            //              );

            //          });





            //          // Register the import-to-mantis button handler

            //         $('#dda-stix-import').off('click').on('click', function(){
            //             stix_base = instance.get_json();
            //             var _save_fcn = function(){
            //                 $.post('transform',
            //                     {'jsn':JSON.stringify(stix_base), 'submit_name' : instance.load_name, 'id': instance.load_uuid, 'action': 'import'},
            //                     function(data){
            //                         if(data.status){
            //                             // Set last-saved json so we have a copy of what's been saved to check against (to detect changes)
            //                             instance._last_save = stix_base;
            //                             log_message(data.msg, 'success', 5000);
            //                             instance.reset_gui();
            //                         }else{
            //                             log_message(data.msg, 'error');
            //                         }
            //                     }, 'json');
            //             };


            //             if(!instance.load_name || !instance.load_uuid){
            //                 //Ask user for meaningful name and generate uuid
            //                 var dlg = $('<div id="dda-save-json-dlg" title="Import into Mantis"><p>Please provide a meaningful name for your package:</p></div>');
            //                 var inp = $('<input id="dda-save-json-input" type="text"/>').val($('#dda-stix-meta > input[name="stix_header_title"]').first().val());
            //                 dlg.append(inp);

            //                 dlg.dialog({
            //                     modal: true
            //                 });
            //                 var ok_btn = $('<button>Ok</button>').button().addClass('pull-right').click(function(){
            //                     pkg_name = $.trim(dlg.find('input').first().val());
            //                     if(pkg_name != ''){
            //                         instance.load_name = pkg_name;
            //                         instance.load_uuid = guid_gen();
            //                         _save_fcn();
            //                         dlg.dialog('close');
            //                     }else{
            //                         inp.focus();
            //                     }

            //                 });
            //                 dlg.append(ok_btn);

            //             }else
            //                 _save_fcn();


            //             return false;
            //         });



            //         // Save and release draft button
            //         $('#dda-stix-save-and-release').off('click').on('click', function(){
            //             stix_base = instance.get_json();

            //             var _save_fcn = function(){
            //                 $.post('transform',
            //                     {'jsn':JSON.stringify(stix_base), 'submit_name' : instance.load_name, 'id': instance.load_uuid, 'action': 'release'},
            //                     function(data){
            //                         if(data.status){
            //                             // Set last-saved json so we have a copy of what's been saved to check against (to detect changes)
            //                             instance._last_save = stix_base;
            //                             log_message(data.msg, 'success', 5000);
            //                             instance.reset_gui();
            //                         }else{
            //                             log_message(data.msg, 'error');
            //                         }
            //                     }, 'json');
            //             };


            //             if(!instance.load_name || !instance.load_uuid){
            //                 //Ask user for meaningful name and generate uuid
            //                 var dlg = $('<div id="dda-save-json-dlg" title="Save JSON"><p>Please provide a meaningful name for your package:</p></div>');
            //                 var inp = $('<input id="dda-save-json-input" type="text"/>').val($('#dda-stix-meta > input[name="stix_header_title"]').first().val());
            //                 dlg.append(inp);

            //                 dlg.dialog({
            //                     modal: true
            //                 });
            //                 var ok_btn = $('<button>Ok</button>').button().addClass('pull-right').click(function(){
            //                     pkg_name = $.trim(dlg.find('input').first().val());
            //                     if(pkg_name != ''){
            //                         instance.load_name = pkg_name;
            //                         instance.load_uuid = guid_gen();
            //                         _save_fcn();
            //                         dlg.dialog('close');
            //                     }else{
            //                         inp.focus();
            //                     }

            //                 });
            //                 dlg.append(ok_btn);

            //             }else
            //                 _save_fcn();


            //             return false;
            //         });


            //         // Save draft button
            //             $('#dda-stix-save').off('click').on('click', function(){
            //              stix_base = instance.get_json();
            //              var _save_fcn = function(){
            //                  $.post('transform',
            //                         {'jsn':JSON.stringify(stix_base), 'submit_name' : instance.load_name, 'id': instance.load_uuid, 'action': 'save'},
            //                         function(data){
            //                             if(data.status){
            //                                 // Set last-saved json so we have a copy of what's been saved to check against (to detect changes)
            //                                 instance._last_save = stix_base;
            //                                 log_message(data.msg, 'success', 5000);
            //                             }else{
            //                                 log_message(data.msg, 'error');
            //                             }
            //                         }, 'json');
            //              };


            //              if(!instance.load_name || !instance.load_uuid){
            //                  //Ask user for meaningful name and generate uuid
            //                  var dlg = $('<div id="dda-save-json-dlg" title="Save JSON"><p>Please provide a meaningful name for your package:</p></div>');
            //                  var inp = $('<input id="dda-save-json-input" type="text"/>').val($('#dda-stix-meta > input[name="stix_header_title"]').first().val());
            //                  dlg.append(inp);

            //                  dlg.dialog({
            //                      modal: true
            //                  });
            //                  var ok_btn = $('<button>Ok</button>').button().addClass('pull-right').click(function(){
            //                      pkg_name = $.trim(dlg.find('input').first().val());
            //                      if(pkg_name != ''){
            //                          instance.load_name = pkg_name;
            //                          instance.load_uuid = guid_gen();
            //                          _save_fcn();
            //                          dlg.dialog('close');
            //                      }else{
            //                          inp.focus();
            //                      }

            //                  });
            //                  dlg.append(ok_btn);

            //              }else
            //                  _save_fcn();

            //              return false;
            //             });

            //          //Load draft button
            //          $('#dda-stix-load').off('click').on('click', function(){
            //              var dlg = $('<div id="dda-load-json-dlg" title="Load draft"><p>Please choose from your saved templates:</p></div>');
            //              var dlg1 = $('<div id="dda-load-json-confirm-dlg" title="Confirmation"><p>You have not yet saved the changes you made to the current draft. Do you really want to continue loading?</p></div>');

            //              var sel = $('<select></select>');
            //              $.get('load?list', function(data){
            //                  if(data.status)
            //                      $.each(data.data, function(i,v){
            //                          var _t_sel = $('<option></option>').attr('value',v.id).text(v.name + ' ('+v.date+')');
            //                          sel.append(_t_sel);
            //                      });
            //              });
            //              dlg.append(sel);

            //              dlg.dialog({
            //                  modal: true
            //              });

            //              var _load_saved_json = function(){
            //                  instance.reset_gui();
            //                  var load_id = $(sel).val();
            //                  instance.load_remote_save(load_id);
            //              }

            //              var ok_btn = $('<button>Ok</button>').button().addClass('pull-right').click(function(){
            //                  // Check for not-saved changes
            //                  if(instance._last_save===false)
            //                      instance._last_save = instance.get_json();

            //                  if(!deepCompare(instance.get_json(), instance._last_save)){ // Changes in document
            //                      var ok_btn1 = $('<button>Ok</button>').button().addClass('pull-right').click(function(){
            //                          _load_saved_json();
            //                          if(dlg) dlg.dialog('close');
            //                          if(dlg1) dlg1.dialog('close');
            //                      });
            //                      var cancel_btn1 = $('<button>Cancel</button>').button().addClass('pull-right').click(function(){
            //                          dlg.dialog('close');
            //                          dlg1.dialog('close');
            //                      });
            //                      dlg1.dialog({
            //                          modal: true
            //                      });
            //                      dlg1.append(cancel_btn1);
            //                      dlg1.append(ok_btn1);
            //                  }else{ // No changes, or already saved.
            //                      _load_saved_json();
            //                      if(dlg) dlg.dialog('close');
            //                  }

            //              });
            //              dlg.append(ok_btn);

            //          });
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
                'observables': [],
                'actions': []
            }

            // Include the observables
            $.each(instance.observable_registry, function(i,v){
                stix_base.observables.push(instance.obs_get_json(i));
            });

            // Include the actions
            $.each(instance.action_registry, function(i,v){
                stix_base.actions.push(v);
            });

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

            // Restore actions
            instance.action_registry = {};
            $.each(jsn.actions, function(i,v){
                instance.action_registry[v['guid']] = v;
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
