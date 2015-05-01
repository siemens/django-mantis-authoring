define(['jquery', 'dust', 'mask', 'form2js'],function($, dust, mask, form2js){

    /*
     * Return a javascript object literal with our base config of the
     * app. The functionality of the tabs is encapsulated in separate
     * files/extensions (except for the STIX tab functionality which is found here)
     */
    return {
        init_threatactor_tab: function(){
            var instance = this,
                ta_container = $('#dda-threatactor-container'),
                ipsl = $('.ind_pool_sel_list', ta_container),
                ta_edit_form = $('#dda-threatactor-template_ThreatActor-edit'),
                ta_action_btn = $('#ta_action', ta_container);


            var list = $(ta_container).find('.ind_pool_sel_list').first();
            list.filterByText($(ta_container).find('.ind_pool_sel_listfilter').first(), '.sel_option');

            ipsl.off('click').on('click', '.sel_option', function(){
                var sel = $(this),
                    sel_id = sel.attr('data-id');
                var sel_selected = ipsl.find('.sel_option_selected');
                if(sel.is(sel_selected)) return;
                sel_selected.removeClass('sel_option_selected');

                sel.addClass('sel_option_selected');

                $.each(instance.authored_tas[sel_id].jsn, function(i,v){
                    var t_el = $('[name="'+i+'"]', ta_edit_form);
                    t_el.val(v);
                    t_el.attr('readonly', true);
                });

                ta_action_btn.text('Edit');
                ta_action_btn.attr('data-action', 'edit');

            });

            var force_take = false;
            ta_action_btn.off('click').on('click', function(e){
                var btn_action = ta_action_btn.attr('data-action'),
                    sel_selected = ipsl.find('.sel_option_selected'),
                    sel_id = sel_selected.attr('data-id');
                
                if(btn_action=='edit'){
                    // Fetch current report from backend.
                    $.get('load_threatactor', {name: instance.authored_tas[sel_id].jsn.uuid, force_take: force_take}, function(data){
                        if(data.status){
                            var dta = data.data;
                            var ad_json = $.parseJSON(dta.jsn);
                            dta['jsn'] = ad_json;
                            instance.authored_tas[ad_json.id] = dta;
                            $.each(ad_json, function(i,v){
                                var t_el = $('[name="'+i+'"]', ta_edit_form);
                                t_el.val(v);
                                t_el.attr('readonly', false);
                            });

                            // Set the button actions
                            var ta_action = 'release';
                            ta_action_btn.text('Save');
                            if(instance.authored_tas[ad_json.id].import_status != 0){
                                ta_action = 'import';
                                ta_action_btn.text('Import');
                            };
                            ta_action_btn.attr('data-action', ta_action);
                            log_message(data.msg, 'success', 5000);
                        }else{
                            var tl_c = $('<a></a>').addClass('force_take').text('Take Report');
                            var tl = data.msg.replace('{force_take}', tl_c.outerHtml());
                            log_message(tl, 'error', false, false, (tl == data.msg), function(mel){
                                $('.force_take', mel).off('click').on('click', function(){
                                    force_take = true;
                                    ta_action_btn.trigger('click');
                                    mel.remove();
                                });
                            });
                        }
                    });
                    force_take = false;
                }else{
                    var ta_json = form2js($('table', ta_edit_form).find('input, select, textarea').get(), undefined, false);
                    ta_json['uuid'] = instance.authored_tas[sel_id].jsn.uuid;
                    ta_json['id'] = instance.authored_tas[sel_id].jsn.id;
                    ta_json['ns'] = instance.authored_tas[sel_id].jsn.ns;

                    $.post('transform_threatactor',
                           {'jsn': JSON.stringify(ta_json), 'submit_name': ta_json['identity_name'], 'id': ta_json['uuid'], 'action': btn_action},
                           function(data){
                               if(data.status){
                                   log_message(data.msg, 'success', 5000);
                                   instance.refresh_threatactor_tab();
                               }else
                                   log_message(data.msg, 'error');
                           }, 'json');

                }
            });
            

            instance.refresh_threatactor_tab();
        },

        refresh_threatactor_tab: function(){
            var instance = this,
                ta_container = $('#dda-threatactor-container'),
                ta_list = $('#dda-threatactor-container-ta-list'),
                ta_sel_tmpl = dust.compile('<div class="sel_option clearfix {?selected}sel_option_selected{/selected}" data-id="{id}"> \
                                           <span style="font-size:90%;" class="pull-right">Source: {source}</span> \
                                           <h3 class="pull-left" style="text-align:left;">{name}</h3>\
                                           <span class="pull-left" style="margin-left:5px; font-size:90%;">{identity_name}</span> \
                                           <span class="pull-left" style="margin-left:5px; font-size:90%; font-style:italic;">{aliases}</span> \
                                           </div>', 'ta_sel_option');
            dust.loadSource(ta_sel_tmpl);

            var prev_selected = ta_list.find('.sel_option_selected').first().attr('data-id');
            ta_list.find('.sel_option').remove();

            $.each(instance.authored_tas, function(i,v){
                var disp_name = v.name;
                if(v.object_name != undefined) disp_name = v.object_name;
                dust.render('ta_sel_option', {
                    id: v.jsn.id,
                    name: disp_name,
                    identity_name: v.jsn.identity_name,
                    aliases: v.jsn.identity_aliases.replace('\n', ', '),
                    source: v.jsn.ns,
                    selected: v.jsn.id==prev_selected
                }, function(err, out){
                    out = $(out);
                    ta_list.append(out);
                });

            });

        }

    }
});
