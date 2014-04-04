(function($) {

    var Alpaca = $.alpaca;

    Alpaca.Fields.MantisRefField = Alpaca.ControlField.extend(
	/**
	 * @lends Alpaca.Fields.TextField.prototype
	 */
	{
            /**
	     * @constructs
	     * @augments Alpaca.ControlField
	     *
	     * @class Basic control for general text.
	     *
	     * @param {Object} container Field container.
	     * @param {Any} data Field data.
	     * @param {Object} options Field options.
	     * @param {Object} schema Field schema.
	     * @param {Object|String} view Field view.
	     * @param {Alpaca.Connector} connector Field connector.
	     * @param {Function} errorCallback Error callback.
	     */
            constructor: function(container, data, options, schema, view, connector, errorCallback) {
		this.base(container, data, options, schema, view, connector, errorCallback);
            },

            /**
	     * @see Alpaca.Field#setup
	     */
            setup: function() {
		this.base();
		
		if (!this.options.size) {
                    this.options.size = 40;
		}

		// Default ref type
		this.ref_type = 'any'; 

		this.controlFieldTemplateDescriptor = this.view.getTemplateDescriptor("controlFieldRef");
            },

            /**
	     * @see Alpaca.Field#destroy
	     */
            destroy: function() {

		this.base();

            },

            /**
	     * @see Alpaca.ControlField#renderField
	     */
            renderField: function(onSuccess) {

		var _this = this;

		if (this.controlFieldTemplateDescriptor) {

		    if(!_this.ref_only){
			this.field = _this.view.tmpl(this.controlFieldTemplateDescriptor, {
			    "id": this.getId(),
			    "name": this.name,
			    "options": this.options
			});
			$('button', this.field).button().click(function(){
			    if($(this).hasClass('dda-toggle-active')){
				//toggle off
				$(this).removeClass('dda-toggle-active');
				_this.toggle_state();
			    }else{
				//toggle on
				$(this).addClass('dda-toggle-active');
				_this.toggle_state();
			    }
			}).hover(function(e){e.preventDefault();return false;});
			this.injectField(this.field);
		    }else{
			var _tmp = _this.create_ref_element(this.getId());
			var _tmp_a = _tmp.alpaca();
			this.field = $(_tmp_a.field[0]);
			_this._bind_ac(this.field, this.getId());
			this.injectField(this.field);
			//need to append after injection
			this.field.after('<div id="dda-input-ref-span_' + this.getId() + '"></div>');
		    }


		}

		if (onSuccess) {
                    onSuccess();
		}
            },
            
            /**
	     * @see Alpaca.ControlField#postRender
	     */
            postRender: function(callback) {

		var self = this;

		this.base(function() {

                    if (self.field)
                    {
			// mask it
			if ( self.field && self.field.mask && self.options.maskString) {
                            self.field.mask(self.options.maskString);
			}

			if (self.fieldContainer) {
                            self.fieldContainer.addClass('alpaca-controlfield-text');
			}
                    }

                    callback();
		});

            },

	    _bind_ac: function(el, id){
		var _this = this;

		var ac_trigger = function(event, ui){
		    if(ui.item){
			$('#dda-input-ref-span_'+id).html(ui.item.label);
		    }else{
			$('#dda-input-ref-span_'+id).html('');
			$(this).val('');
		    }
		    _this.renderValidationState(true);
		}
		
		/* bind the autocomplete to el */
		el.ddacomplete({
		    source: function( request, response ) {
			$.ajax({
			    url: "ref/",
			    dataType: "json",
			    data: {
				type: _this.ref_type,
				q: request.term
			    },
			    success: function( data ) {
				response( $.map( data.result, function( item ) {
				    return {
					id: item.id,
					label: item.name,
					value: item.id,
					category: item.cat
				    }
				}));
			    }
			});
		    },
		    autoFocus: true,
		    select: function(event, ui){
			ac_trigger.call(this, event, ui);
		    },
		    change: function(event, ui){
			ac_trigger.call(this, event, ui);
		    }
		});

	    },

	    create_ref_element: function(id){
		var _this = this;
		
		var ne = $('<div></div>').alpaca({
		    "schema": {},
		    "options": {
			"name": id + '_ref',
			"placeholder": "Object Reference"
		    }
		});

		return ne;
	    },

	    toggle_state: function(){
		var _this = this;
		id= _this.id;
		
		if(_this.state == undefined){ // Init that ref!
		    _tmp = _this.create_ref_element(id);
		    _tmp_a = _tmp.alpaca();
		    _this.state = {
			'field_elem' : $(_tmp_a.field[0]),
			'ref_visible': false
		    };
		    _this.field = _this.field[0] //need to fix because of the appended "ref" button. Otherwiese val() would fail...

		    $(_this.fieldContainer).append('<div id="dda-input-ref-span_'+id+'"></div>');
		}

		var field_elem_old = $(_this.field).detachAndReplaceWith(_this.state['field_elem']);
		_this.field = _this.state['field_elem'];
		_this.state['field_elem'] = field_elem_old;

		_this.state['ref_visible'] = !_this.state['ref_visible'];
		if(_this.state['ref_visible']){
		    _this._bind_ac(_this.field, id);
		    $('#dda-input-ref-span_'+id, _this.fieldContainer).show();
		}else{
		    //Hide the preview div
		    $('#dda-input-ref-span_'+id, _this.fieldContainer).hide();
		}

	    },	    

            /**
	     * @see Alpaca.Field#getValue
	     */
            getValue: function() {
		var value = null;
		if (this.field) {
                    value = this.field.val();
		} else {
                    value = this.base();
		}

		return value;
            },
            
            /**
	     * @see Alpaca.Field#setValue
	     */
            setValue: function(value) {

		if (this.field)
		{
                    if (Alpaca.isEmpty(value)) {
			this.field.val("");
                    } else {
			this.field.val(value);
                    }
		}

		// be sure to call into base method
		this.base(value);
            },
            
            /**
	     * @see Alpaca.ControlField#handleValidate
	     */
            handleValidate: function() {
		var baseStatus = this.base();
		
		var valInfo = this.validation;

		var status = this._validatePattern();
		valInfo["invalidPattern"] = {
                    "message": status ? "" : Alpaca.substituteTokens(this.view.getMessage("invalidPattern"), [this.schema.pattern]),
                    "status": status
		};
		
		status = this._validateMaxLength();
		valInfo["stringTooLong"] = {
                    "message": status ? "" : Alpaca.substituteTokens(this.view.getMessage("stringTooLong"), [this.schema.maxLength]),
                    "status": status
		};

		status = this._validateMinLength();
		valInfo["stringTooShort"] = {
                    "message": status ? "" : Alpaca.substituteTokens(this.view.getMessage("stringTooShort"), [this.schema.minLength]),
                    "status": status
		};

		return baseStatus && valInfo["invalidPattern"]["status"] && valInfo["stringTooLong"]["status"] && valInfo["stringTooShort"]["status"];
            },
            
            /**
	     * Validates against the schema pattern property.
	     *
	     * @returns {Boolean} True if it matches the pattern, false otherwise.
	     */
            _validatePattern: function() {
		if (this.schema.pattern) {
                    var val = this.getValue();
                    if (val === "" && this.options.allowOptionalEmpty && !this.schema.required) {
			return true;
                    }
                    if (Alpaca.isEmpty(val)) {
			val = "";
                    }
                    if (!val.match(this.schema.pattern)) {
			return false;
                    }
		}
		
		return true;
            },
            
            /**
	     * Validates against the schema minLength property.
	     *
	     * @returns {Boolean} True if its size is greater than minLength, false otherwise.
	     */
            _validateMinLength: function() {
		if (!Alpaca.isEmpty(this.schema.minLength)) {
		    var val = this.getValue();
                    if (val === "" && this.options.allowOptionalEmpty && !this.schema.required) {
			return true;
                    }
                    if (Alpaca.isEmpty(val)) {
			val = "";
                    }
                    if (val.length < this.schema.minLength) {
			return false;
                    }
		}
		return true;
	    },
            
            /**
	     * Validates against the schema maxLength property.
	     *
	     * @returns {Boolean} True if its size is less than maxLength , false otherwise.
	     */
            _validateMaxLength: function() {
		if (!Alpaca.isEmpty(this.schema.maxLength)) {
		    var val = this.getValue();
                    if (val === "" && this.options.allowOptionalEmpty && !this.schema.required) {
			return true;
                    }
                    if (Alpaca.isEmpty(val)) {
			val = "";
                    }
                    if (val.length > this.schema.maxLength) {
			return false;
                    }
		}
		return true;
            },
            
            /**
	     * @see Alpaca.Field#disable
	     */
            disable: function() {
		if (this.field)
		{
                    this.field.disabled = true;
		}
            },
            
            /**
	     * @see Alpaca.Field#enable
	     */
            enable: function() {
		if (this.field)
		{
                    this.field.disabled = false;
		}
            },
            
            /**
	     * @see Alpaca.Field#focus
	     */
            focus: function() {
		if (this.field)
		{
                    this.field.focus();
		}
            },//__BUILDER_HELPERS
            
            /**
	     * @private
	     * @see Alpaca.ControlField#getSchemaOfSchema
	     */
            getSchemaOfSchema: function() {
		return Alpaca.merge(this.base(), {
                    "properties": {
			"minLength": {
                            "title": "Minimal Length",
                            "description": "Minimal length of the property value.",
                            "type": "number"
			},
			"maxLength": {
                            "title": "Maximum Length",
                            "description": "Maximum length of the property value.",
                            "type": "number"
			},
			"pattern": {
                            "title": "Pattern",
                            "description": "Regular expression for the property value.",
                            "type": "string"
			}
                    }
		});
            },

            /**
	     * @private
	     * @see Alpaca.ControlField#getOptionsForSchema
	     */
            getOptionsForSchema: function() {
		return Alpaca.merge(this.base(), {
                    "fields": {
			"default": {
                            "helper": "Field default value",
                            "type": "text"
			},
			"minLength": {
                            "type": "integer"
			},
			"maxLength": {
                            "type": "integer"
			},
			"pattern": {
                            "type": "text"
			}
                    }
		});
            },

            /**
	     * @private
	     * @see Alpaca.ControlField#getSchemaOfOptions
	     */
            getSchemaOfOptions: function() {
		return Alpaca.merge(this.base(), {
                    "properties": {
			"size": {
                            "title": "Field Size",
                            "description": "Field size.",
                            "type": "number",
			    "default":40
			},
			"maskString": {
                            "title": "Mask Expression",
                            "description": "Expression for the field mask. Field masking will be enabled if not empty.",
                            "type": "string"
			},
			"placeholder": {
                            "title": "Field Placeholder",
                            "description": "Field placeholder.",
                            "type": "string"
			},
			"allowOptionalEmpty": {
                            "title": "Allow Optional Empty",
                            "description": "Allows this non-required field to validate when the value is empty"
			}
                    }
		});
            },

            /**
	     * @private
	     * @see Alpaca.ControlField#getOptionsForOptions
	     */
            getOptionsForOptions: function() {
		return Alpaca.merge(this.base(), {
                    "fields": {
			"size": {
                            "type": "integer"
			},
			"maskString": {
                            "helper": "a - an alpha character;9 - a numeric character;* - an alphanumeric character",
                            "type": "text"
			},
			"allowOptionalEmpty": {
                            "type": "checkbox"
			}
                    }
		});
            },

            /**
	     * @see Alpaca.Field#getTitle
	     */
            getTitle: function() {
		return "Single-Line Text";
            },
            
            /**
	     * @see Alpaca.Field#getDescription
	     */
            getDescription: function() {
		return "Text field for single-line text.";
            },
            
            /**
	     * @see Alpaca.Field#getType
	     */
            getType: function() {
		return "string";
            },

            /**
	     * @see Alpaca.Field#getFieldType
	     */
            getFieldType: function() {
		return "text";
            }//__END_OF_BUILDER_HELPERS
            
	});

    Alpaca.registerTemplate("controlFieldRef", '<input type="text" id="${id}" {{if options.placeholder}} placeholder="${options.placeholder}"{{/if}} {{if options.size}} size="${options.size}" {{/if}} {{if options.readonly}} readonly="readonly" {{/if}} {{if name}} name="${name}" {{/if}} {{each(i,v) options.data}} data-${i}="${v}" {{/each}} /><span class="dda-field-toggle-container"><button id="dda-ref-tgl-${id}" class="dda-ref-toggle">Ref.</button></span>');

    Alpaca.registerMessages({
        "invalidPattern": "This field should have pattern {0}",
        "stringTooShort": "This field should contain at least {0} numbers or characters",
        "stringTooLong": "This field should contain at most {0} numbers or characters"
    });


})(jQuery);
