define(['jquery', 'dust', 'mask', 'form2js'],function($, dust, mask, form2js){

    /*
     * Return a javascript object literal with our base config of the
     * app.
     */
    return {


        init_campaign_tab: function(){
            var instance = this,
                div_s1 = $('#dda-campaign-container-step1'),
                div_s2 = $('#dda-campaign-container-step2'),
                div_s3 = $('#dda-campaign-container-step3'),
                new_campaign_btn = $('#dda-campaign-container-step1_new');


            // Load the authored campaigns
            var sel = $('select', div_s1);
            $.get('load_campaign?list', function(data){
                if(data.status)
                    $.each(data.data, function(i,v){
                        var _t_sel = $('<option></option>').attr('value',v.id).text(v.name + ' ('+v.date+')');
                        sel.append(_t_sel);
                    });
            });
            sel.off('change').on('change', function(){
                var v = $(this).val();
                if(!v) return;
                instance.load_remote_save(v);
            });


            var ta_sel_tmpl = dust.compile('<div class="sel_option clearfix {?selected}sel_option_selected{/selected}" data-id="{id}"> \
                                           <span style="font-size:90%;" class="pull-right">Source: {source}</span> \
                                           <h3 style="text-align:left;">{name}</h3> \
                                           </div>', 'ta_sel_option');
            dust.loadSource(ta_sel_tmpl);

            // Init the json
            instance.campaign_json = form2js($('table', div_s2).find('input, select, textarea').get(), undefined, false);
            instance.campaign_json['uuid'] = guid_gen();
            instance.campaign_json['id'] = "{" + instance.namespace_uri + '}campaign-' + instance.campaign_json['uuid'];
            instance.campaign_json['ns'] = instance.namespace_uri;
            instance.campaign_json['referenced_ta'] = {};


            // New Campaign
            new_campaign_btn.off('click').on('click', function(){
                instance.reset_gui();
                div_s1.hide();
                div_s2.show();
                instance.refresh_campaign_tab();
            });

            // Next to edit the TAs
            var next_btn = div_s2.find('button').first();
            next_btn.off('click').on('click', function(){
                var ta_list_new = div_s3.find('.ta-list-new').first(),
                    ta_list_ref = div_s3.find('.ta-list-ref').first();


                $.extend(true, instance.campaign_json, form2js($('table', div_s2).find('input, select, textarea').get(), undefined, false));

                if($.trim(instance.campaign_json.name) == '') return false;

                div_s2.hide();
                div_s3.show();

                // Set the campaign name
                $('.campaign_title', div_s3).text(instance.campaign_json.name);

                var list = $(div_s3).find('.ind_pool_sel_list').first();
                list.filterByText($(div_s3).find('.ind_pool_sel_listfilter').first(), '.sel_option');



                $('#add_ta', div_s3).off('click').on('click', function(){
                    var ta_json = form2js($('table', div_s3).find('input, select, textarea').get(), undefined, false);

                    ta_json['uuid'] = guid_gen();
                    ta_json['id'] = "{" + instance.namespace_uri + '}threatactor-' + ta_json['uuid'];
                    ta_json['ns'] = instance.namespace_uri;

                    $.post('transform_threatactor',
                           {'jsn': JSON.stringify(ta_json), 'submit_name': ta_json['identity_name'], 'id': ta_json['uuid'], 'action': 'generate save'},
                           function(data){
                               if(data.status){
                                   log_message('ThreatActor saved', 'success', 5000);
                                   // Now load it again from the backend
                                   $.get('load_threatactor', {name : ta_json['uuid']}, function(data){
                                       if(data.status){
                                           var dta = data.data;
                                           var ad_json = $.parseJSON(dta.jsn);
                                           dta['jsn'] = ad_json;
                                           instance.authored_tas[ad_json.id] = dta;
                                           var disp_name = dta.name;
                                           if(dta.object_name != undefined) disp_name = dta.object_name;
                                           dust.render('ta_sel_option', {
                                               id: ad_json.id,
                                               name: disp_name,
                                               source: ad_json.ns,
                                               selected: true
                                           }, function(err, out){
                                               out = $(out);
                                               ta_list_new.append(out);
                                           });
                                           $('.ta-list-new-result', div_s3).append(
                                               $('<li></li>').text(disp_name).attr('data-id', ad_json.id)
                                           );
                                           instance.campaign_json.referenced_ta[ad_json.id] = true;
                                           $('#dda-threatactor-template_ThreatActor', div_s3).find('input, select, textarea').not('[name^="I_"]').not('[type="hidden"]').val('');
                                       }

                                   },'json');




                               }else
                                   log_message(data.msg, 'error');
                           }, 'json');


                });

                $('.ind_pool_sel_list', div_s3).off('click').on('click', '.sel_option', function(){
                    var is_checked = $(this).hasClass('sel_option_selected'),
                        tid = $(this).data('id');

                    if(is_checked){
                        $('.ind_pool_sel_result', div_s3).find('li[data-id="'+ tid +'"]').remove();
                        delete instance.campaign_json.referenced_ta[tid];
                        $(this).removeClass('sel_option_selected');
                    }else{
                        $(this).addClass('sel_option_selected');
                        if(instance.authored_tas[tid] != undefined){ // authored ta
                            instance.campaign_json.referenced_ta[tid] = true;
                            var disp_name = instance.authored_tas[tid].jsn.identity_name;
                            if(instance.authored_tas[tid].object_name != undefined) disp_name = instance.authored_tas[tid].object_name;
                            $('.ta-list-new-result', div_s3).append(
                                $('<li></li>').text(disp_name).attr('data-id', tid)
                            );
                        }else{ // referenced ta
                            instance.campaign_json.referenced_ta[tid] = true;
                            $('.ta-list-ref-result', div_s3).append(
                                $('<li></li>').text(instance.referenced_tas[tid].name).attr('data-id', tid)
                            );
                        };
                    };

                });



                // Submit button handler
                $('#submit-import-mantis', div_s3).off('click').on('click', function(){
                    if(!instance.load_name) instance.load_name = instance.campaign_json.name;
                    if(!instance.load_uuid) instance.load_uuid = instance.campaign_json.uuid;

                    instance.transform_json('import', false, function(data, stix_base){
                        instance.reset_gui();
                        div_s1.show();
                        div_s2.hide();
                        div_s3.hide();
                        instance.init_remote_tas();
                        instance.init_campaign_tab();
                        instance.init_threatactor_tab();
                        instance.refresh_campaign_tab();
                        instance.refresh_threatactor_tab();
                    });

                });


                // View STIX button handler
                $('#view-stix', div_s3).off('click').on('click', function(){
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

                });



                // Save button handler
                $('#save-noimport', div_s3).off('click').on('click', function(){

                    if(!instance.load_name) instance.load_name = instance.campaign_json.name;
                    if(!instance.load_uuid) instance.load_uuid = instance.campaign_json.uuid;

                    instance.transform_json('save', false, function(data, stix_base){
                        instance._last_save = stix_base;
                    });
                });

                // Save release button handler
                $('#save-release', div_s3).off('click').on('click', function(){

                    if(!instance.load_name) instance.load_name = instance.campaign_json.name;
                    if(!instance.load_uuid) instance.load_uuid = instance.campaign_json.uuid;

                    instance.transform_json('release', false, function(data, stix_base){
                        instance.reset_gui();
                        div_s1.show();
                        div_s2.hide();
                        div_s3.hide();
                        instance.init_remote_tas();
                        instance.init_campaign_tab();
                        instance.init_threatactor_tab();
                        instance.refresh_campaign_tab();
                        instance.refresh_threatactor_tab();
                    });
                });

                instance.refresh_campaign_tab();
            });
        },


        refresh_campaign_tab: function(){
            var instance = this;
            var div_s3 = $('#dda-campaign-container-step3');
            var ta_list = $('#dda-campaign-container-step3_ta-list');
            var ta_list_new = div_s3.find('.ta-list-new').first();
            var ta_list_ref = div_s3.find('.ta-list-ref').first();

            ta_list.find('.sel_option').remove();
            $('.ta-list-new-result', div_s3).find('li').remove();
            $('.ta-list-ref-result', div_s3).find('li').remove();

            // process the authored tas
            $.each(instance.authored_tas, function(i,v){
                var ad_json = v.jsn;
                var is_referenced = (instance.campaign_json.referenced_ta[ad_json.id] != undefined);
                var disp_name = v.name;
                if(v.object_name != undefined) disp_name = v.object_name;
                dust.render('ta_sel_option', {
                    id: ad_json.id,
                    name: disp_name,
                    source: ad_json.ns,
                    selected: is_referenced
                }, function(err, out){
                    out = $(out);
                    ta_list_new.append(out);
                });
                if(is_referenced){
                    $('.ta-list-new-result', div_s3).append(
                        $('<li></li>').text(disp_name).attr('data-id', ad_json.id)
                    );
                };
            });


            // process the referenced TAs
            $.each(instance.referenced_tas, function(i,v){
                var is_referenced = (instance.campaign_json.referenced_ta[v.id] != undefined);
                dust.render('ta_sel_option', {
                    id: v.id,
                    name: v.name,
                    source: v.ns,
                    selected: is_referenced
                }, function(err, out){
                    out = $(out);
                    ta_list_ref.append(out);
                });

                if(is_referenced){
                    $('.ta-list-ref-result', div_s3).append(
                        $('<li></li>').text(v.name).attr('data-id', v.id)
                    );
                }
            });

        },


        init_remote_tas: function(){
            var instance = this;

            instance.authored_tas = {};
            instance.referenced_tas = {};

            $.ajax({
                type: 'POST',
                url: 'load_threatactor?list',
                success: function(data){
                    if(data.status){
                        $.each(data.data, function(i,v){
                            var ad_json = $.parseJSON(v.jsn);
                            v['jsn'] = ad_json;
                            instance.authored_tas[ad_json.id] = v;
                        });

                        $.ajax({
                            type: 'POST',
                            url: 'get_ref_tas',
                            success: function(data){
                                if(data.status){
                                    $.each(data.data, function(i,v){
                                        if(instance.authored_tas[v.id] != undefined) return true;
                                        instance.referenced_tas[v.id] = v;
                                    });
                                };
                            }
                        });

                    }
                }
            });

        }


    }
});
