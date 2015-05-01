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
            paths: {
                "mask": "../../jquery.inputmask.bundle.min",
                "dust": "../../dust-full.min",
                "form2js": "../../form2js"
            }
        });
        define('jquery', [], function() { return $; });
        define.amd.dust = true;
        
        require(['BaseClass',
                 'CampaignTab',
                 'ThreatActorTab'],
                function(BaseClass, CampaignTab, ThreatActorTab){

                    // Extend our builder prototype base class with the loaded parts
                    var builderPrototype = $.extend(BaseClass,
                                                    CampaignTab,
                                                    ThreatActorTab
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
