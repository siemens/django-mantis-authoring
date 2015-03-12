(function ($) {
    'use strict';
    $(function() {
        // Show overlay while loading
        var content_main = $('#grp-container'),
            content_container = $('#grp-content', content_main),
            overlay = $('<div id="dda-main-loading">Please wait...</div>');

        content_container.hide();
        overlay.appendTo(content_main);

        require.config({
            baseUrl: data_main,
            shim: {
                d3: {
                    exports: 'd3'
                }
            },
            paths: {
                "datetimepicker": "../../jquery-ui.timepicker",
                "mask": "../../jquery.inputmask.bundle.min",
                "dropzone": "../../dropzone",
                "d3": "../../d3.min",
                //"ace": "../../ace" // ACE included via <script> tag, since ACE via require.js has a bug
                "dust": "../../dust-full.min",
                "form2js": "../../form2js"
            }
        });
        define('jquery', [], function() { return $; });
        require(['BaseClass',
                 'ObservablesTab',
                 'TestMechanismsTab',
                 'IndicatorsTab',
                 'CampaignsTab',
                 'ThreatActorsTab',
                 'ObjectRelationsTab'],
                function(BaseClass, ObservablesTab, TestMechanismsTab, IndicatorsTab, CampaignsTab, ThreatActorsTab, ObjectRelationsTab){

                    // Extend our builder prototype base class with the loaded parts
                    var builderPrototype = $.extend(BaseClass,
                                                    ObservablesTab,
                                                    TestMechanismsTab,
                                                    IndicatorsTab,
                                                    CampaignsTab,
                                                    ThreatActorsTab,
                                                    ObjectRelationsTab
                                                   );




                    // Factory function to create a new builder object
                    function createBuilder(overrides) {
                        overrides = overrides || {};
                        var instance = Object.create(builderPrototype);
                        return new $.extend(true, instance, overrides);
                    }

                    // Our builder instance
                    var builder = createBuilder();

                    builder.init(function(instance){
                        if(instance){ //success
                            $('#dda-headline-container').show();
                            $('#dda-main-container').show();
                        }
                        overlay.remove();
                        content_container.show();

                        // Periodically ping the backend to keep the session alive
                        function ping(){
                            setTimeout(function(){
                                $.get('ping', function(data){
                                    if(data.status){
                                        ping();
                                    };
                                });
                            }, 60 * 1000);
                        }
                        ping();

                    });
                });

    });
}(django.jQuery)); // Reuse django injected jQuery library
