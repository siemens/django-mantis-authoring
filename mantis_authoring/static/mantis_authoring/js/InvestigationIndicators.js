(function ($) {
    'use strict';

    // Show overlay while loading
    var overlay = $('<div id="dda-main-loading">Please wait...</div>').appendTo('#grp-content-container');

    require.config({
        baseUrl: data_main,
        shim: {
            d3: {
                exports: 'd3'
            }
        },
        paths: {
            "datetimepicker": "../../jquery-ui.timepicker",
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
             'ThreatActorsTab',
            ],
            function(BaseClass, ObservablesTab, ThreatActorsTab){

                // Extend our builder prototype base class with the loaded parts
                var builderPrototype = $.extend(BaseClass,
                                                ObservablesTab,
                                                ThreatActorsTab
                                               );


                // Factory function to create a new builder object
                function createBuilder(overrides) {
                    overrides = overrides || {};
                    var instance = Object.create(builderPrototype);
                    return $.extend(instance, overrides);
                }

                // Our builder instance
                var builder = createBuilder();
                builder.init(function(instance){
                    if(instance){ //success
                        $('#dda-main-container').show();
                    }
                    overlay.remove();

                });
            });

}(django.jQuery)); // Reuse django injected jQuery library
