define(['jquery', 'form2js', 'dust', 'mask'],function($, form2js, dust){

    /*
     * Return a javascript object literal with our base config of the
     * app. The functionality of the tabs is encapsulated in separate
     * files/extensions (except for the STIX tab functionality which is found here)
     */
    return {
        namespace_uri: false,

        /**
         * Init function. Intended to be called when this app thing is
         * instanciated. Makes sure that namespace is set before
         * continuing to load the application entirely.
         */
        init: function(callback){
            var instance = this;
            this.init_user_namespace(function(success){
                instance.reset_gui();

                if(success){
                    callback(instance);

                    // Now init each tab
                    instance.init_remote_tas();
                    instance.init_campaign_tab();
                    instance.init_threatactor_tab();

                    //Now create the jquery-ui tabbing
                    $('#dda-container-tabs').tabs({
                        active: 0,
                        activate:function(event,ui){

                            if(ui.newTab.index()==0){
                                instance.refresh_campaign_tab();
                            }
                            if(ui.newTab.index()==1){
                                instance.refresh_threatactor_tab();
                            }
                        }
                    });

                    // Fix up the button look and feel
                    $('button').button();


                    // Load a template if required
                    if(querystring('load')!=''){
                        instance.load_remote_save(querystring('load')[0]);
                    }
                    
                }else{
                    callback(false);
                }
            });



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
            var instance = this,
                div_s1 = $('#dda-campaign-container-step1'),
                div_s2 = $('#dda-campaign-container-step2'),
                div_s3 = $('#dda-campaign-container-step3'),
                ta_container = $('#dda-threatactor-container');

            $(div_s1).find('option[value]').remove();
            $(div_s2).find('input, select, textarea').not('[name^="I_"]').not('[type="hidden"]').val('');
            $(div_s3).find('input, select, textarea').not('[name^="I_"]').not('[type="hidden"]').val('');
            $(ta_container).find('input, select, textarea').not('[name^="I_"]').not('[type="hidden"]').val('').attr('readonly', false);
            $(ta_container).find('.sel_option_selected').removeClass('sel_option_selected');
            self._last_save = false;
        },




        /**
         * Loads a remotely saved template
         * @param {string} saved_uuid The UUID of the saved template
         */
        load_remote_save: function(save_uuid, force_take){
            var instance = this;
            if(force_take == undefined) force_take = false;
            $.get('load_campaign', {name : save_uuid, force_take: force_take}, function(data){
                if(data.status){
                    var jsn_template = $.parseJSON(data.data.jsn);
                    instance._last_save = jsn_template;
                    instance.load_from_json(jsn_template, data.data.name, data.data.id);
                    log_message(data.msg, 'success', 5000);
                }else{
                    var tl_c = $('<a></a>').addClass('force_take').text('Take Report');
                    var tl = data.msg.replace('{force_take}', tl_c.outerHtml());
                    log_message(tl, 'error', false, false, (tl == data.msg), function(mel){
                        $('.force_take', mel).off('click').on('click', function(){
                            instance.load_remote_save(save_uuid, true);
                            mel.remove();
                        });
                    });
                }

            },'json');
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
            $.post('transform_campaign',
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
            return instance.campaign_json;
        },


        /**
         * Tries to initialize the GUI from a provided JSON
         * @param {object} jsn The JSON structure to read from
         * @param {string} load_name The title to be set for the configuration (usually the saved name)
         * @param {string} load_uuid The uuid to be set for the configuration (usually from a saved state)
         */
        load_from_json: function(jsn, load_name, load_uuid){
            var instance = this,
                div_s1 = $('#dda-campaign-container-step1'),
                div_s2 = $('#dda-campaign-container-step2'),
                div_s3 = $('#dda-campaign-container-step3');

            instance.reset_gui();
            instance.load_name = load_name || false;
            instance.load_uuid = load_uuid || false;

            instance.campaign_json = jsn;

            // Restore the campaign info
            $.each(jsn, function(i,v){
                var t_el = $('[name="'+i+'"]', div_s2);
                t_el.val(v);
            });

            div_s1.hide();
            div_s2.show();
        }



    }
});
