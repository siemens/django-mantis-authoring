(function($) {



    /**
     * Custom autocomplete widget
     */
    $.widget( "custom.ddacomplete", $.ui.autocomplete, {
	_renderMenu: function( ul, items ) {
	    var that = this,
	    currentCategory = "";
	    $.each( items, function( index, item ) {
		if ( item.category != currentCategory ) {
		    ul.append( "<li class='dda-autocomplete-cat'>" + item.category + "</li>" );
		    currentCategory = item.category;
		}
		that._renderItemData( ul, item );
	    });
	},
	_renderItem: function( ul, item ) {
	    return $( "<li>" )
		.append( "<a>" + item.id + '<br><span class="dda-autocomplete-desc">' + item.label + '</span></a>')
		.appendTo( ul );
	}
    });





})(jQuery);

