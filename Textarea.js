/** @module dbidiui/Textarea */
define(["dcl/dcl",
	"decor/sniff",	
	"./_supportTextarea", 
	"./range",
	"jquery/src/core",
	"jquery/src/attributes/classes",	
	], function (dcl, has, _supportTextarea, rangeapi, $ ) {

	var supportTextarea = new _supportTextarea();
	
	return dcl(null, {
	/**
	 * Support for BiDi Textarea widget {@link module:deliteful/Textarea widget}.
	 * This class should not be used directly.
	 *
	 * Textarea widget loads this module when user sets "has: {'bidi': true }" in require.config.
	 * The textarea is replaced with a rich text editor in order to allow for setting the direction of each 	
	 * paragraph. The value is updated in the textarea.
	 *
	 * @class module:dbidiui/Textarea
	 * @augments module:deliteful/Textarea
	 */
	 
		/**
         * The text direction for original textarea.
		 * This class is used for textDir with value of "auto".
         * @member {string}
         * @default ""
         */
		textDir: "",
		/**
         * The textarea width.
         * @member {string}
         * @default "100%"
         */
		width: "100%",
		/**
         * The textarea original displayed value.
         * @member {string}
         * @default ""
         */
		displayedValue: "",
		/**
         * The textarea placeHolder, if no displayedValue.
         * @member {string}
         * @default ""
         */
		placeHolder: "",
		/**
         * The minimum height of iframe.
         * @member {string}
         * @default "39"
         */
		minHeightValue: "39",
//		readOnly: false, 
//		cols: "",
//		required: false,
//		maxlength: "",


		/**
		 * @method
		 * 
		 * Replaces textarea with rich text area to allow for setting direction of each
		 * paragraph, if textDir is "auto" and not disabled. 
		 * Moves textarea off screen (need it to save value).
		 * 
		 * @private
		 */
		startup: function(){	
			//_this = this;
			if (this.textDir == "auto" && this.disabled == false) {
				// Get style attributes and replace in iframe.src below.
				var foundStyle = false;
				this.savedStyle = "";
				for (var i=0; i<this.attributes.length && !foundStyle; i++) {
					if (this.attributes[i].nodeName == "style") {
						foundStyle = true;
						this.savedStyle = this.attributes[i].value;
					}
				}
				this.open();				
				$(this.iframe.parentNode).addClass("dijitEditorIFrameContainer");			
				this.iframe.parentNode.setAttribute("style", this.savedStyle);
				this.iframe.parentNode.style.width = this.width;
				
				$(this.iframe).addClass("dijitEditorIFrame");
				this.iframe.setAttribute("allowTransparency", true);
				supportTextarea.setEditor(this);							
			}
		},
	
		/**
		 * @method
		 * 
		 * Transforms textarea to rich text editing node.
		 * An iframe is created to replace the textarea.
		 *
		 * @private
		 */
		open: function(){
			var dn = this;
			// Compute initial value of the editor
			var html;
			
			if(this.textContent.constructor === String && this.textContent.length>0){
				// Allow setting the editor content programmatically instead of
				// relying on the initial content being contained within the target
				// domNode.
				html = this.textContent;
				dn.innerHTML = "";
			}
			if (this.displayedValue) 
				html = this.displayedValue;
			if (!html && this.placeHolder)
				html = this.placeHolder;
			if(dn.nodeName && dn.nodeName.toLowerCase() == "textarea"){
				// if we were created from a textarea, then we need to create a
				// new editing harness node.
				var ta = (this.textarea = dn);
				this.name = ta.name;

				dn = this.ownerDocument.createElement("div");
				dn.setAttribute('widgetId', this.id);
				ta.removeAttribute('widgetId');
				dn.cssText = this.style; 
				dn.className += " " + ta.className;
				ta.parentNode.insertBefore(dn, ta);
				
				var tmpFunc = function(){
					//some browsers refuse to submit display=none textarea, so
					//move the textarea off screen instead
					ta.style["display"] = "block";
					ta.style["position"] = "absolute";
					ta.style["top"] = "-1000px";
			
					if(has("ie")){ //nasty IE bug: abnormal formatting if overflow is not hidden
						var s = ta.style;
						this.__overflow = s.overflow;
						s.overflow = "hidden";
					}
				};
				if(has("ie")){
					this.defer(tmpFunc, 10);
				}else{
					tmpFunc();
				}				
			}
			
			if (html)
				this.textContent = html;

			// Construct the editor div structure.
			this.header = dn.ownerDocument.createElement("div");
			dn.appendChild(this.header);
			this.editingArea = dn.ownerDocument.createElement("div");
			dn.appendChild(this.editingArea);
			this.footer = dn.ownerDocument.createElement("div");
			dn.appendChild(this.footer);

			if(!this.name){
				this.name = this.id + "_AUTOGEN";
			}

			this.isClosed = false;

			var ifr = (this.editorObject = this.iframe = this.ownerDocument.createElement('iframe'));
			
			ifr.id = this.id + "_iframe";
			ifr.style.border = "none";
			ifr.style.width = "100%";
			var minHeight = this.minHeightValue+"px";
			if(this.height){
				ifr.style.height = this.height;
			}

			ifr.frameBorder = 0;

			var _this = this;

			ifr._loadFunc = function(w){
				// This method is called when the editor is first loaded and also if the Editor's
				// dom node is repositioned. Unfortunately repositioning the Editor tends to
				// clear the iframe's contents, so we can't just no-op in that case.

				_this.window = w;
				_this.document = w.document;

				// Do final setup and set contents of editor.
				_this._onLoad(_this.textContent);
			};
			
			ifr._onkeyupFunc = function(event){
				_this._onKeyUp(event);
			};
			
			ifr._onblurFunc = function(){
				_this._onBlur();
			};
			
			ifr._onfocusFunc = function(){
				_this._onFocus();
			};
			
			
			var labels = ta.ownerDocument.querySelectorAll('label');

			// Attach iframe to document, and set the initial (blank) content.
			var src = this._getIframeDocTxt(labels, this.savedStyle).replace(/\\/g, "\\\\").replace(/'/g, "\\'"),s;

			// IE10 and earlier will throw an "Access is denied" error when attempting to access the parent frame if
			// document.domain has been set, unless the child frame also has the same document.domain set. The child frame
			// can only set document.domain while the document is being constructed using open/write/close; attempting to
			// set it later results in a different "This method can't be used in this context" error. See #17529
			if (has("ie") < 11) {
				s = 'javascript:document.open();try{parent.window;}catch(e){document.domain="' + document.domain + '";}' +
					'document.write(\'' + src + '\');document.close()';
			}
			else {
				s = "javascript: '" + src + "'";
			}

			if(has("ie") == 9){
				// On IE9, attach to document before setting the content, to avoid problem w/iframe running in
				// wrong security context, see #16633.
				this.editingArea.appendChild(ifr);
				ifr.src = s;
			}else{
				// For other browsers, set src first, especially for IE6/7 where attaching first gives a warning on
				// https:// about "this page contains secure and insecure items, do you want to view both?"
				ifr.setAttribute('src', s);
				this.editingArea.appendChild(ifr);
			}
			$(this).addClass(this.baseClass);
		},
		

		/**
		 * @method
		 * 
		 * Returns string, the values in the rich text editing area (to put in the textarea).
		 * Firefox builds the paragraphs inside the iframe differently than the other browsers, so an
		 * extra function is required (ffGetValueFunc).
		 * Called from onBlur and on submit.
		 *
		 * @returns {string}
		 * @private
		 */
		_getValueForTA: function() {
			/**
			* Returns string, the value of a paragraph in rich text.
			* (Function used only for FF.)
			*
			* @returns {string}
			*/
			var ffGetValueFunc =  function(children, value){
				if (!children.length) {
					if (children.children && children.children.length > 0) {
						value += ffGetValueFunc(children.children, value);
					} else {
						value += children.innerHTML+"\n";
					}
				} else if (children.length == 1) {
					value += ffGetValueFunc(children[0].children, value);
				} else { 
					var chLen = children[1].children.length;
					if (chLen == 0) {
						// Original text: get innerHTML of each children[i].innerHTML
						for (var i=0; i<children.length; i++) {
							value = ffGetValueFunc(children[i], value);
						}
					} else {
						value += children[0].innerHTML;					
						if  (chLen > 1) {
							value = ffGetValueFunc(children[1].children, value);
						} else if  (chLen == 1) {
							value += children[1].innerHTML;
							value = value.replace(/<br>/g, "\n");
						} 
					}
				}
				return value;
			};

			
			var value = "";
			if (!has("ff")) {
				for (var i=0; i<this.focusNode.children.length; i++) {								
					value += this.focusNode.children[i].innerHTML;
					if (value.indexOf("<br>") == -1) {
						// If default value, then newline needs to be added for each div.
						value += "\n";
					} else {
						value = value.replace(/<br>/g, "\n");
					}
				}
			} else {	
				if (this.focusNode.children.length > 0) {
					value = ffGetValueFunc(this.focusNode.children, "");
				}
			}
			return value;
		},
		
		/**
		 * @method
		 * 
		 * Returns the generated boilerplate text of the document inside the iframe
		 *   (ie, `<html><head>...</head><body/></html>`).
		 * 
		 * savedStyle: String
		 *		Editor contents should be set to this value
		 *
		 * @returns {string}
		 * @private
		 */
		_getIframeDocTxt: function(/*Array*/ labels, /*String*/ savedStyle){
			var _cs = this.textarea.ownerDocument.defaultView.getComputedStyle(this.textarea, null);
			
			// The contents inside of <body>.  The real contents are set later via a call to setValue().
			// In auto-expand mode, need a wrapper div for AlwaysShowToolbar plugin to correctly
			// expand/contract the editor as the content changes.
			var textDirStr = "";
			
			var html = "<div id='dijitEditorBody' contenteditable='true' tabindex='0' dir='auto'";
			for (var i=0; i<this.attributes.length; i++) {
				if (this.attributes[i].nodeName != "style") {
					html += " "+this.attributes[i].nodeName +"='"+ this.attributes[i].value+"'";
				}
			}
			html += "></div>";
			var font = [ _cs.fontWeight, _cs.fontSize, _cs.fontFamily ].join(" ");

			// line height is tricky - applying a units value will mess things up.
			// if we can't get a non-units value, bail out.
			var lineHeight = _cs.lineHeight;
			if(lineHeight.indexOf("px") >= 0){
				lineHeight = parseFloat(lineHeight) / parseFloat(_cs.fontSize);
			}else if(lineHeight.indexOf("em") >= 0){
				lineHeight = parseFloat(lineHeight);
			}else{
				// If we can't get a non-units value, just default
				// it to the CSS spec default of 'normal'.  Seems to
				// work better, esp on IE, than '1.0'
				lineHeight = "normal";
			}
			var userStyle = _cs;
			// need to find any associated label element, aria-label, or aria-labelledby and update iframe document title
			var title = "";
			for (var i=0; i<labels.length; i++) {
				if (labels[i].htmlFor == this.id) {
					title = labels[i].innerHTML;
					i = labels.length; //quit loop
				}
			}
			if (title.length==0) {
				for (var i=0; i<this.attributes.length; i++) {
					if (this.attributes[i].nodeName == "aria-label") {
						title = this.attributes[i].value;
						i = this.attributes.length; //quit loop
					} else if (this.attributes[i].nodeName == "aria-labelledby") {
						title = this.attributes[i].value;
						i = this.attributes.length; //quit loop
					}
				}			
			}
			
			// Now that we have the title, also set it as the title attribute on the iframe
			this.iframe.setAttribute("title", title);

			return [
				"<!DOCTYPE html>",
				this.isLeftToRight() ? "<html lang='" + this.lang + "'>\n<head>\n" : "<html dir='rtl' lang='" + this.lang + "'>\n<head>\n",
				title ? "<title>" + title + "</title>" : "",
				"<meta http-equiv='Content-Type' content='text/html'>\n",
				"<style>\n",
				"\tbody,html {\n",
				"\t\tbackground:transparent;\n",
				"\t\tpadding: 1px 0 0 0;\n",
				"\t\tmargin: -1px 0 0 0;\n", // remove extraneous vertical scrollbar on safari and firefox
				"\t}\n",
				"\tbody,html,#dijitEditorBody { outline: none; "+savedStyle+"}",
				
				this.height ? "\tbody,#dijitEditorBody { height: 100%; width: 100%; overflow: auto; }\n" :
					"\tbody,#dijitEditorBody { min-height: " + this.minHeightValue + "px; width: 100%; overflow-x: auto; overflow-y: hidden; }\n",

				// TODO: left positioning will cause contents to disappear out of view
				//	   if it gets too wide for the visible area
				"\tbody{\n",
				"\t\ttop:0px;\n",
				"\t\tleft:0px;\n",
				"\t\tright:0px;\n",
				"\t\tfont:", font, ";\n",
				((this.height || has("opera")) ? "" : "\t\tposition: fixed;\n"),
				"\t\tline-height:", lineHeight, ";\n",
				"\t}\n",
				"\tp{ margin: 1em 0; }\n",

				"\tli > ul:-moz-first-node, li > ol:-moz-first-node{ padding-top: 1.2em; }\n",
				// Can't set min-height in IE9, it puts layout on li, which puts move/resize handles.
				(!has("ie") ? "\tli{ min-height:1.2em; }\n" : ""),
				"</style>\n",
				this._applyEditingAreaStyleSheets(), "\n",
				"</head>\n<body role='main' ",

				// Onload handler fills in real editor content.
				// On IE9, sometimes onload is called twice, and the first time frameElement is null (test_FullScreen.html)
				"onload='frameElement && frameElement._loadFunc(window,document)' ",
				"onkeyup='frameElement && frameElement._onkeyupFunc(event)' ",
				"onblur='frameElement && frameElement._onblurFunc()' ",				
				"onfocus='frameElement && frameElement._onfocusFunc()' ",				
				"style='" + userStyle + "'>", html, "</body>\n</html>"
			].join(""); // String
		},
		
		/**
		 * @method
		 * 
		 * Returns the text to get specified css files.
		 *
		 * @returns {string}
		 * @private
		 */
		_applyEditingAreaStyleSheets: function(){		
			var text = '',
			styleSheets = this.ownerDocument.styleSheets;
			for (var i=0; i<styleSheets.length; i++) {
				var href = styleSheets[i].href;
				if (href) { //<link>
					text += '<link rel="stylesheet" type="text/css" href="' + href + '"/>';
					continue;
				}
				for (var j=0; j<styleSheets[i].cssRules.length; j++) {					
					href = styleSheets[i].cssRules[j].href;
					if (href) { // @import
						text += '<link rel="stylesheet" type="text/css" href="' + href + '"/>';
					} else { //inline
						var cssText = '';
						for (var k=0; k<styleSheets[i].cssRules.length; k++) {
							cssText += styleSheets[i].cssRules[k].cssText;							
						}
						if (cssText.length > 0) {
							text += '<style type="text/css">'+cssText+'</style>';
						}
						j = styleSheets[i].cssRules.length; //break out of for loop
					}
				}
			}
			return text;
		},

		/**
		 * @method
		 * 
		 * Resizes the iframe vertically (called after value change)
		 *
		 * @private
		 */
		resize: function(){		
			// Get total height and change iframe height to this.
			var totalHeight = 0;
			if (this.focusNode.children.length > 0) {
				for (var i=0; i < this.focusNode.children.length; i++) {
					totalHeight += this.focusNode.children[i].scrollHeight;
				}
			}
			totalHeight = totalHeight < this.minHeightValue ?  this.minHeightValue : totalHeight; // minimum height
			if (this.iframe) 
				this.iframe.style.height = totalHeight+"px";
		},
		
		/***************** 
		 * Event handlers
		 *****************/

		/**
		 * @method
		 * 
		 * Called after the iframe finishes loading.
		 *
		 * html: String
		 *		Editor contents should be set to this value
		 *
		 * @protected
		 */
		_onLoad: function(/*String*/ html){
			// there's a wrapper div around the content, see _getIframeDocTxt().
			this.editNode = this.document.body.firstChild;
			var _this = this;
			this.iframe.onfocus = this.document.onfocus = function(){
				_this.editNode.focus();
			};

			this.focusNode = this.editNode; // for InlineEditBox
			if (html) {
				// For each newline - create div with direction
				var divNode = this.editNode;
				var divContents = html.split('\n');
				var newNode;
				// First div is placed as "first"; others are "after"
				if (this.getTextDir(divContents[0]) == "ltr") { 
					newNode = supportTextarea.toDom("<div style='direction:ltr'>"+divContents[0]+"</div>", divNode.ownerDocument);
				} else {
					newNode = supportTextarea.toDom("<div style='direction:rtl'>"+divContents[0]+"</div>", divNode.ownerDocument);
				}
				divNode = supportTextarea.domInsertFirst(newNode, divNode);
				
				for (var i=1; i<divContents.length; i++) {
					if (this.getTextDir(divContents[i]) == "ltr") { 
						var newNode = supportTextarea.toDom("<div style='direction:ltr'>"+divContents[i]+"</div>", divNode.ownerDocument);
					} else {
						var newNode = supportTextarea.toDom("<div style='direction:rtr'>"+divContents[i]+"</div>", divNode.ownerDocument);
					}
					divNode = supportTextarea.domInsertAfter(newNode, divNode);
				}
			}
			this.resize();
		},

		/**
		 * @method
		 * 
		 * Called after each key press. 
		 * Gets the current selection, gets its text direction, and changes paragraph direction accordingly.
		 *
		 * e: Event
		 *		Used to get keyCode. In FF, ignore Enter key.
		 *
		 * @protected
		 */
		_onKeyUp: function(/*Event?*/ e){
			var sel = rangeapi.getSelection(this.window);
			if (!sel || sel.rangeCount == 0){
				return;
			}
			if (!has("ff") || e.keyCode != 13) {
				supportTextarea.editor = this;
				if (this.getTextDir(sel.focusNode.nodeValue) == "ltr") { 
					supportTextarea._changeState("ltr");
				} else {
					supportTextarea._changeState("rtl");
				}
			}	
			this.resize();
		 },			
		
		/**
		 * @method
		 * 
		 * Called when exiting rich text element. 
		 * Gets the value of rich text node and puts it in textarea.
		 *
		 * @protected
		 */
		_onBlur : function(){
			$(this.iframe.parentNode).removeClass("d-textareaFocus");
			this.textarea.value = this._getValueForTA(this.textarea);
		},
		
		/**
		 * @method
		 * 
		 * Called when entering rich text element. 
		 * Adds style class.
		 *
		 * @protected
		 */
		_onFocus : function(){
			$(this.iframe.parentNode).addClass("d-textareaFocus");			
		},
		
	});
});
