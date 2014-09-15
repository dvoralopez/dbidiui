/** @module dbidiui/range */
define([], function(){
	/**
	 * Range api used in support for Bidi Textarea widget.
	 *
	 * @class module:dbidiui/range
	 * @augments module:dbidiui/Textarea
	 */

	var rangeapi = {

		getSelection: function(/*Window*/ window, /*Boolean?*/ ignoreUpdate){
			if(window.getSelection){
				return window.getSelection();
			}else{//IE
				var s = new ie.selection(window);
				if(!ignoreUpdate){
					s._getCurrentSelection();
				}
				return s;
			}
		},
		
		BlockTagNames: /^(?:P|DIV|H1|H2|H3|H4|H5|H6|ADDRESS|PRE|OL|UL|LI|DT|DE)$/,

		getBlockAncestor: function(/*DomNode*/ node, /*RegEx?*/ regex, /*DomNode?*/ root){
			root = root || node.ownerDocument.body;
			regex = regex || rangeapi.BlockTagNames;
			var block = null, blockContainer;
			while(node && node !== root){
				var name = node.nodeName.toUpperCase();
				if(!block && regex.test(name)){
					block = node;
				}
				if(!blockContainer && (/^(?:BODY|TD|TH|CAPTION)$/).test(name)){
					blockContainer = node;
				}

				node = node.parentNode;
			}
			return {blockNode:block, blockContainer:blockContainer || node.ownerDocument.body};
		},
		
		getCommonAncestor: function(n1, n2, root){
			root = root || n1.ownerDocument.body;
			var getAncestors = function(n){
				var as = [];
				while(n){
					as.unshift(n);
					if(n !== root){
						n = n.parentNode;
					}else{
						break;
					}
				}
				return as;
			};
			var n1as = getAncestors(n1);
			var n2as = getAncestors(n2);

			var m = Math.min(n1as.length, n2as.length);
			var com = n1as[0]; //at least, one element should be in the array: the root (BODY by default)
			for(var i = 1; i < m; i++){
				if(n1as[i] === n2as[i]){
					com = n1as[i]
				}else{
					break;
				}
			}
			return com;
		},
	};

	return rangeapi;
});
