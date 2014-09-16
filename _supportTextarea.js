/** @module dbidiui/_supportTextarea */
define([
	"dcl/dcl",
	"decor/Stateful",
	"decor/sniff", 
	"./range",
], function(dcl,Stateful,has,rangeapi){
	/**
	 * This class provides some advanced BiDi support for BiDi Textarea widget 
	 * {@link module:deliteful/Textarea/bidi/Textarea widget}.
	 *
	 * It adds several bidi-specific commands ('set text direction to left-to-right', 
	 * 'set text direction to right-to-left', 'change text direction to opposite').
	 *
	 * @class module:dbidiui/SupportTextarea
	 * @augments module:dbidiui/Textarea
	 */
	
	var _supportTextarea = dcl(Stateful,{		

		// blockMode: [const] String
		//		This property decides the behavior of Enter key, actually released by EnterKeyHandling 
		//		plugin. Possible values are 'P' and 'DIV'. Used when EnterKeyHandling isn't included 
		//		into the list of the base plugins, loaded with the current Editor, as well as in case,  
		//		if blockNodeForEnter property of EnterKeyHandling plugin isn't set to 'P' or 'DIV'.
		//		The default value is "DIV".
		blockMode: "DIV",

		// bogusHtmlContent: [private] String
		//		HTML to stick into a new empty block	
		bogusHtmlContent: ' ',

		_lineTextArray: ["DIV","P","LI","H1","H2","H3","H4","H5","H6","ADDRESS","PRE","DT","DE","TD"],
		_lineStyledTextArray: ["H1","H2","H3","H4","H5","H6","ADDRESS","PRE","P"],
		_tableContainers: ["TABLE","THEAD","TBODY","TR"],
		_blockContainers: ["TABLE","OL","UL","BLOCKQUOTE"],
		
		updateState: function(){
			// summary:
			//		Override _Plugin.updateState(). Determines direction of the text in the 
			//		start point of the current selection. Changes state of the buttons
			//		correspondingly.
			if(!this.editor || !this.editor.isLoaded || this.shortcutonly){
				return;
			}
			if(this.disabled){
				return;
			}
			var sel = rangeapi.getSelection(this.editor.window);
			if(!sel || sel.rangeCount === 0){
				return;
			}	
			var range = sel.getRangeAt(0), node;
			if(range.startContainer === this.editor.editNode && !range.startContainer.hasChildNodes()){
				node = range.startContainer;
			}else{
				var startNode = range.startContainer,
					startOffset = range.startOffset;
				if(this._isBlockElement(startNode)){
					while(startNode.hasChildNodes()){
						if(startOffset == startNode.childNodes.length){
							startOffset--;
						}
						startNode = startNode.childNodes[startOffset];
						startOffset = 0;
					}
				}
				node = this._getBlockAncestor(startNode);
			}
		},
		
		setEditor: function(/*dijit.Editor*/ editor){
			this.editor = editor;
		},

				
		_changeState: function(cmd,arg){
			// summary:
			//		Determines and refines current selection and calls method 
			//		_changeStateOfBlocks(), where given action is actually done
			// description:
			//		The main goal of this method is correctly identify the block elements,
			//		that are at the beginning and end of the current selection. 
			// return: nodesInfo
			//		Object containing
			//			nodes:  array of all block nodes, which should be handled by this command
			//			groups: array containing groups of nodes. Nodes from each group should be handled by separate 
			//					execution of current command
			//			cells:	array of cells, contents of which should be handled by current command
			if(!this.editor.window){
				return;
			}
			
			var sel = rangeapi.getSelection(this.editor.window);
			if(!sel || sel.rangeCount === 0){
				return;
			}
			var range = sel.getRangeAt(0), tempRange = range.cloneRange(),
				startNode, endNode, startOffset, endOffset;
			startNode = range.startContainer;
			startOffset = range.startOffset;
			endNode = range.endContainer;
			endOffset = range.endOffset;
			var isCollapsed = startNode === endNode && startOffset == endOffset;
			if(this._isBlockElement(startNode) || this._hasTagFrom(startNode,this._tableContainers)){
				while(startNode.hasChildNodes()){
					if(startOffset == startNode.childNodes.length){
						startOffset--;
					}	
					startNode = startNode.childNodes[startOffset];
					startOffset = 0;
				}
			}
			tempRange.setStart(startNode, startOffset);
			startNode = this._getClosestBlock(startNode,"start",tempRange);
			var supList = rangeapi.getBlockAncestor(startNode, /li/i, this.editor.editNode).blockNode;
			if(supList && supList !== startNode){
				startNode = supList;
			}
			endNode = tempRange.endContainer;
			endOffset = tempRange.endOffset;
			if(this._isBlockElement(endNode) || this._hasTagFrom(endNode,this._tableContainers)){
				while(endNode.hasChildNodes()){
					if(endOffset == endNode.childNodes.length){
						endOffset--;
					}
					endNode = endNode.childNodes[endOffset];
					if(endNode.hasChildNodes()){
						endOffset = endNode.childNodes.length;
					}else if(endNode.nodeType == 3 && endNode.nodeValue){
						endOffset = endNode.nodeValue.length;
					}else{
						endOffset = 0;
					}
				}
			}
			tempRange.setEnd(endNode, endOffset);
			endNode = this._getClosestBlock(endNode,"end",tempRange);
			supList = rangeapi.getBlockAncestor(endNode, /li/i, this.editor.editNode).blockNode;
			if(supList && supList !== endNode){
				endNode = supList;
			}
			sel = rangeapi.getSelection(this.editor.window, true);
			sel.removeAllRanges();
			sel.addRange(tempRange);
			var commonAncestor = rangeapi.getCommonAncestor(startNode, endNode);
			var nodesInfo = this._changeStateOfBlocks(startNode, endNode, commonAncestor, cmd, arg, tempRange);
			if(isCollapsed){
				endNode = tempRange.startContainer;
				endOffset = tempRange.startOffset;
				tempRange.setEnd(endNode, endOffset);
				sel = rangeapi.getSelection(this.editor.window, true);
				sel.removeAllRanges();
				sel.addRange(tempRange);				
			}
			return nodesInfo;
		},

		_isBlockElement: function(node){
			if(!node || node.nodeType != 1){
				return false;
			}
			var display = node.ownerDocument.defaultView.getComputedStyle(node, null).display;
			return (display == 'block');// || display == "list-item" || display == "table-cell");
		},
		
		_isInlineOrTextElement: function(node){
			return !this._isBlockElement(node) && (node.nodeType == 1 || node.nodeType == 3 || node.nodeType == 8);
		},
		
		_isElement: function(node){
			return node && (node.nodeType == 1 || node.nodeType == 3);
		},
		
		_isBlockWithText: function(node){
			return node !== this.editor.editNode && this._hasTagFrom(node,this._lineTextArray);
		},
		
		_getBlockAncestor: function(node){
			while(node.parentNode && !this._isBlockElement(node)){
				node = node.parentNode;
			}
			return node;
		},
		
		_getClosestBlock: function(node, point, tempRange){
			// summary:
			//		Searches for a closest block element containing the text which 
			//		is at a given point of current selection. Refines current
			//		selection, if text element from start or end point was merged 
			//		with its neighbors.
			if(this._isBlockElement(node)){
				return node;
			}
			var parent = node.parentNode,
				firstSibling, lastSibling,
				createOwnBlock = false,
				multiText = false;
				removeOffset = false;
			while(true){
				var sibling = node;
				createOwnBlock = false;
				while(true){
					if(this._isInlineOrTextElement(sibling)){
						firstSibling = sibling;
						if(!lastSibling){
							lastSibling = sibling;
						}
					}
					sibling = sibling.previousSibling;
					if(!sibling){
						break;
					}else if(this._isBlockElement(sibling) || this._hasTagFrom(sibling,this._blockContainers) || this._hasTag(sibling,"BR")){
						createOwnBlock = true;
						break;
					}else if(sibling.nodeType == 3 && sibling.nextSibling.nodeType == 3){
						// Merge neighboring text elements
						sibling.nextSibling.nodeValue = sibling.nodeValue + sibling.nextSibling.nodeValue;
						multiText = true;
						if(point == "start" && sibling === tempRange.startContainer){
							tempRange.setStart(sibling.nextSibling, 0);
						}else if(point == "end" && (sibling === tempRange.endContainer || sibling.nextSibling === tempRange.endContainer)){
							tempRange.setEnd(sibling.nextSibling, sibling.nextSibling.nodeValue.length);
						}
						sibling = sibling.nextSibling;
						sibling.parentNode.removeChild(sibling.previousSibling);
						if(!sibling.previousSibling){
							break;
						}
					}
				}
				sibling = node;
				while(true){
					if(this._isInlineOrTextElement(sibling)){
						if(!firstSibling){
							firstSibling = sibling;
						}
						lastSibling = sibling;
					}	
					sibling = sibling.nextSibling;
					if(!sibling){
						break;				
					}else if(this._isBlockElement(sibling) || this._hasTagFrom(sibling,this._blockContainers)){
						createOwnBlock = true;
						break;
					}else if(this._hasTag(sibling,"BR") && sibling.nextSibling && !(this._isBlockElement(sibling.nextSibling) || 
							this._hasTagFrom(sibling.nextSibling,this._blockContainers))){
						lastSibling = sibling;
						createOwnBlock = true;
						break;						
					}else if(sibling.nodeType == 3 && sibling.previousSibling.nodeType == 3){
						// Merge neighboring text elements
						sibling.previousSibling.nodeValue += sibling.nodeValue;
						multiText = true;
						if(point == "start" && sibling === tempRange.startContainer){
							tempRange.setStart(sibling.previousSibling, 0);
						}else if(point == "end" && (sibling === tempRange.endContainer || sibling.previousSibling === tempRange.endContainer)){
							tempRange.setEnd(sibling.previousSibling, sibling.previousSibling.nodeValue.length);
						}					
						sibling = sibling.previousSibling;
						sibling.parentNode.removeChild(sibling.nextSibling);
						if(!sibling.nextSibling){
							break;
						}
					}
				}
				// If text in the start or end point of the current selection doesn't placed in some block element 
				// or if it has block siblings, new block, containing this text element (and its inline siblings) is created.
				if(createOwnBlock || (this._isBlockElement(parent) && 
						!this._isBlockWithText(parent) && firstSibling)){
					var origStartOffset = tempRange? tempRange.startOffset : 0,
						origEndOffset = tempRange? tempRange.endOffset : 0,
						origStartContainer = tempRange? tempRange.startContainer : null,
						origEndContainer = tempRange? tempRange.endContainer : null,
						divs = this._repackInlineElements(firstSibling, lastSibling, parent),
						div = divs[point == "start"? 0 : divs.length-1];
						if(tempRange && div && firstSibling === origStartContainer && this._hasTag(firstSibling,"BR")){
							origStartContainer = div;
							origStartOffset = 0;
							if(lastSibling === firstSibling){
								origEndContainer = origStartContainer;
								origEndOffset = 0;
							}
						}
					if(tempRange){
						tempRange.setStart(origStartContainer, origStartOffset);
						tempRange.setEnd(origEndContainer, origEndOffset);
					}
					return div;
				}
				if(this._isBlockElement(parent)){
					return parent;
				}
				node = parent;
				removeOffset = true;
				parent = parent.parentNode;
				firstSibling = lastSibling = null;
			}
		},
		
		_changeStateOfBlocks: function(startNode, endNode, commonAncestor, cmd, arg, tempRange){
			// summary:
			//		Collects all block elements, containing text, which are inside of current selection,
			//		and performs for each of them given action.
			//		Possible commands and corresponding actions:
			//			- "ltr":					change direction to left-to-right
			//			- "rtl":					change direction to right-to-left
			//			- "mirror":					change direction to opposite
			//			- "explicitdir":			explicit direction setting
			//			- "left":					change alignment to left
			//			- "right":					change alignment to right
			//			- "center":					change alignment to center

			var nodes = [];
			// Refine selection, needed for 'explicitdir' command (full selection)
			if(startNode === this.editor.editNode){
				if(!startNode.hasChildNodes()){
					return;
				}
				if(this._isInlineOrTextElement(startNode.firstChild)){
					this._rebuildBlock(startNode);
				}
				startNode = this._getClosestBlock(startNode.firstChild, "start", null);
			}
			if(endNode === this.editor.editNode){
				if(!endNode.hasChildNodes()){
					return;
				}
				if(this._isInlineOrTextElement(endNode.lastChild)){
					this._rebuildBlock(endNode);
				}
				endNode = this._getClosestBlock(endNode.lastChild, "end", null);			
			}
			
			// Collect all selected block elements, which contain or can contain text.
			// Walk through DOM tree between start and end points of current selection.
			var origStartOffset = tempRange? tempRange.startOffset : 0,
				origEndOffset = tempRange? tempRange.endOffset : 0,
				origStartContainer = tempRange? tempRange.startContainer : null,
				origEndContainer = tempRange? tempRange.endContainer : null;		
			var info = this._collectNodes(startNode, endNode, commonAncestor, tempRange, nodes, 
					origStartContainer, origStartOffset, origEndContainer, origEndOffset, cmd);
			var nodesInfo = {nodes: nodes, groups: info.groups, cells: info.cells};
			cmd = cmd.toString();
			// Execution of specific action for each element from collection
			switch(cmd){
				//change direction
				case "mirror":
				case "ltr":
				case "rtl":
				//change alignment
				case "left":
				case "right":
				case "center":
				//explicit direction setting
				case "explicitdir":
					this._execDirAndAlignment(nodesInfo, cmd, arg);
					break;
				default: throw new Error("Command " + cmd + " isn't handled");
			}
			// Refine selection after changes
			if(tempRange){		
				tempRange.setStart(origStartContainer, origStartOffset);
				tempRange.setEnd(origEndContainer, origEndOffset);				
				sel = rangeapi.getSelection(this.editor.window, true);
				sel.removeAllRanges();
				sel.addRange(tempRange);
			}
			return nodesInfo;
		},


		_collectNodes: function(startNode, endNode, commonAncestor, tempRange, nodes, origStartContainer, origStartOffset, origEndContainer, origEndOffset, cmd){
			// summary:
			//		Collect all selected block elements, which contain or can contain text.
			//		Walk through DOM tree between start and end points of current selection.
			var node = startNode, sibling, child, parent = node.parentNode, divs = [],
				firstSibling, lastSibling, groups = [], group = [], cells = [], curTD = this.editor.editNode;
			// DL need to change the next stmt	
			var saveNodesAndGroups = function(x){
				nodes.push(x);
				group.push(x);
			};
			this._rebuildBlock(parent);
			while(true){
				if(this._hasTagFrom(node,this._tableContainers)){
					if(node.firstChild){
						parent = node;
						node = node.firstChild;
						continue;						
					}
				}else if(this._isBlockElement(node)){				
					var supLI = rangeapi.getBlockAncestor(node, /li/i, this.editor.editNode).blockNode;
					if(supLI && supLI !== node){
						node = supLI;
						parent = node.parentNode;
						continue;
					}
					if(!this._hasTag(node,"LI")){		
						if(node.firstChild){
							this._rebuildBlock(node);
							if(this._isBlockElement(node.firstChild) || this._hasTagFrom(node.firstChild,this._tableContainers)){
								parent = node;
								node = node.firstChild;
								continue;
							}
						}
					}
					if(this._hasTagFrom(node,this._lineTextArray)){
						saveNodesAndGroups(node);
					}
				}else if(this._isInlineOrTextElement(node) && !this._hasTagFrom(node.parentNode,this._tableContainers)){
					firstSibling = node;
					while(node){
						var nextSibling = node.nextSibling;
						if(this._isInlineOrTextElement(node)){
							lastSibling = node;						
							if(this._hasTag(node,"BR")){
								if(!(this._isBlockElement(parent) && node === parent.lastChild)){
									divs = this._repackInlineElements(firstSibling, lastSibling, parent);
									node = divs[divs.length-1];
									for(var nd = 0; nd < divs.length; nd++){
										saveNodesAndGroups(divs[nd]);
									}
									firstSibling = lastSibling = null;
									if(nextSibling && this._isInlineOrTextElement(nextSibling)){
										firstSibling = nextSibling;
									}
								}
							}
						}else if(this._isBlockElement(node)){
							break;
						}	
						node = nextSibling;
					}
					if(!firstSibling){
						continue;
					}
					divs = this._repackInlineElements(firstSibling, lastSibling, parent);
					node = divs[divs.length-1];
					for(var ind = 0; ind < divs.length; ind++){
						saveNodesAndGroups(divs[ind]);
					}
				}
				
				if(node === endNode){
					break;
				}
				if(node.nextSibling){
					node = node.nextSibling;
				}else if(parent !== commonAncestor){
					while(!parent.nextSibling){
						node = parent;
						parent = node.parentNode;
						if(parent === commonAncestor){
							break;
						}
					}
					if(parent !== commonAncestor && parent.nextSibling){
						node = parent.nextSibling;
						parent = parent.parentNode;
					}else{
						break;
					}
				}else{ 
					break;
				}
			}
			if(group.length){
				if(has("webkit") || curTD){
					groups.push(group);
				}else{
					groups.unshift(group);
				}
			}
			return {groups: groups, cells: cells};
		},


		_execDirAndAlignment: function(nodesInfo, cmd,arg){
			// summary:
			//		Change direction and/or alignment of each node from the given array.
			switch(cmd){
			//change direction
			case "mirror":
			case "ltr":
			case "rtl":
				nodesInfo.nodes.forEach(function(x){
					var style = x.ownerDocument.defaultView.getComputedStyle(x, null),
						curDir = style.direction,
						oppositeDir = curDir == "ltr"? "rtl" : "ltr",
						realDir = (cmd != "mirror"? cmd : oppositeDir),
						curAlign = style.textAlign,
						marginLeft = isNaN(parseInt(style.marginLeft, 10))? 0 : parseInt(style.marginLeft, 10),
						marginRight = isNaN(parseInt(style.marginRight, 10))? 0 : parseInt(style.marginRight, 10);
					x.removeAttribute("dir");
					x.removeAttribute("align");
					x.style.direction = realDir;
					x.style.textAlign = "";
					if(this._hasTag(x,"CENTER")){
						return;
					}
					if(curAlign.indexOf("center") >= 0){
						x.style.textAlign = "center";
					}
				},this);
				break;
			//change alignment
			case "left":
			case "right":
			case "center":
				nodesInfo.nodes.forEach(function(x){
					if(this._hasTag(x,"CENTER")){
						return;
					}
					x.removeAttribute("align");
					x.style.textAlign = cmd;
				},this);
				break;
			//explicit direction setting
			case "explicitdir":
				nodesInfo.nodes.forEach(function(x){
					var style = x.ownerDocument.defaultView.getComputedStyle(x, null),
						curDir = style.direction;						
					x.removeAttribute("dir");
					x.style.direction = curDir;
				},this);
				break;
			}		
		},
		
		_rebuildBlock: function(block){
			// summary:
			//		Finds a sequences of inline elements that are placed 
			//		within a top-level block element or have block siblings.
			//		Calls _repackInlneElements(), which moves this sequences 
			//		into newly created block.
			var node = block.firstChild, firstSibling, lastSibling;
			var hasOwnBlock = false;  
			while(node){
				if(this._isInlineOrTextElement(node) && !this._hasTagFrom(node,this._tableContainers)){
					hasOwnBlock = !this._hasTagFrom(block,this._lineTextArray);
					if(!firstSibling){
						firstSibling = node;
					}
					lastSibling = node;
				}else if(this._isBlockElement(node) || this._hasTagFrom(node,this._tableContainers)){
					if(firstSibling){
						this._repackInlineElements(firstSibling, lastSibling, block);
						firstSibling = null;
					}
					hasOwnBlock = true;
				}
				node = node.nextSibling;
			}
			if(hasOwnBlock && firstSibling){
				this._repackInlineElements(firstSibling, lastSibling, block);
			}
		},
		
		_repackInlineElements: function(firstSibling, lastSibling, parent){
			// summary:
			//		Moves sequences of inline elements into 
			//		newly created blocks
			// description:
			//		This method handles sequences of inline elements, which are recognized by the user as 
			//		separate line(s) of the text, but are not placed into their own block element. Text direction
			//		or alignment can't be set for such lines.
			//		Possibles cases: 
			//			a) sequence directly belongs to editor's editNode;
			//			b) sequence has block-level siblings;
			//			c) sequence has BR in the start or in the middle of it.
			//		For all these cases we create new block and move elements from the sequence into it.
			//		We try to preserve explicitly defined styles, which have effect on this line. In case of
			//		sequences, which directly belong to editNode, it is only direction of the text.
			var divs = [], div = parent.ownerDocument.createElement(this.blockMode), newDiv;
			var cssTxt = firstSibling.previousSibling && firstSibling.previousSibling.nodeType == 1? firstSibling.previousSibling.style.cssText : parent.style.cssText;
			var isEditNode = parent === this.editor.editNode;
			divs.push(div);
			firstSibling = parent.replaceChild(div,firstSibling);
			this.domInsertAfter(firstSibling, div);
			if(isEditNode){
				div.style.direction = this.editor.editNode.style.direction;
			}else{
				div.style.cssText = cssTxt;	
			}
			for(var sibling = firstSibling; sibling;){
				var tSibling = sibling.nextSibling;
				if(this._isInlineOrTextElement(sibling)){
					if(this._hasTag(sibling,"BR") && sibling !== lastSibling){
						newDiv = parent.ownerDocument.createElement(this.blockMode);
						divs.push(newDiv);
						sibling = parent.replaceChild(newDiv,sibling);
						//domConstruct.place(sibling,newDiv,"after");
						this.domInsertAfter(sibling, newDiv);
						if(isEditNode){						
							newDiv.style.direction = this.editor.editNode.style.direction;
						}else{
							newDiv.style.cssText = cssTxt;	
						}
					}
					if((this._hasTag(sibling,"BR") || sibling.nodeType == 8) && !div.hasChildNodes())
						div.innerHTML = this.bogusHtmlContent;
					if(this._hasTag(sibling,"BR") && has("ie")){
						sibling.parentNode.removeChild(sibling);
					}else if(sibling.nodeType != 8){
						div.appendChild(sibling);
					}else{
						sibling.parentNode.removeChild(sibling);
					}
					if(sibling.nodeType == 3 && sibling.previousSibling && sibling.previousSibling.nodeType == 3){
						sibling.previousSibling.nodeValue += sibling.nodeValue;
						sibling.parentNode.removeChild(sibling);
					}
					if(newDiv){
						div = newDiv;
						newDiv = null;
					}
				}
				if(sibling === lastSibling){
					break;
				}
				sibling = tSibling;
			}
			return divs;						
		},

		_preFilterNewLines: function(html){
			var result = html.split(/(<\/?pre.*>)/i), inPre = false;
			for(var i = 0; i < result.length; i++){
				if(result[i].search(/<\/?pre/i) < 0 && !inPre){
					result[i] = result[i].replace(/\n/g,"").replace(/\t+/g,"\xA0").replace(/^\s+/,"\xA0").replace(/\xA0\xA0+$/,"");
				}else if(result[i].search(/<\/?pre/i) >= 0){
					inPre = !inPre;
				}
			}
			return result.join("");
		},
		
		_refineAlignment: function(dir, align){
			// summary:
			//		Refine the value, which should be used as textAlign style.
			// description:
			//		This method allows to keep textAlign styles only for cases,
			//		when it is defined explicitly.
			if(align.indexOf("left") >= 0 && dir == "rtl"){
				align = "left";
			}else if(align.indexOf("right") >= 0 && dir == "ltr"){
				align = "right";
			}else if(align.indexOf("center") >= 0){
				align = "center";
			}else{ 
				align = "";
			}
			return align;
		},
		
		_tag: function(node){
			return node && node.tagName && node.tagName.toUpperCase();
		},
		
		_hasTag: function(node,tag){
			return (node && tag && node.tagName && node.tagName.toUpperCase() === tag.toUpperCase());
		},

		_hasTagFrom: function(node,arr){
			return node && arr && node.tagName && arr.indexOf(node.tagName.toUpperCase()) >= 0;
		},
					
		toDom :  function (frag, doc){
			// summary:
			//		instantiates an HTML fragment returning the corresponding DOM.
			// frag: String
			//		the HTML fragment
			// doc: DocumentNode?
			//		optional document to use when creating DOM nodes, defaults to
			//		dojo/_base/window.doc if not specified.
			// returns:
			//		Document fragment, unless it's a single node in which case it returns the node itself

			// support stuff 
			var tagWrap = {
				option: ["select"],
				tbody: ["table"],
				thead: ["table"],
				tfoot: ["table"],
				tr: ["table", "tbody"],
				td: ["table", "tbody", "tr"],
				th: ["table", "thead", "tr"],
				legend: ["fieldset"],
				caption: ["table"],
				colgroup: ["table"],
				col: ["table", "colgroup"],
				li: ["ul"]
			},
			reTag = /<\s*([\w\:]+)/,
			masterNode = {}, masterNum = 0,
			masterName = "__" +  "BiDiTextareaToDomId";
			
			doc = doc || win.doc;
			var masterId = doc[masterName];
			if(!masterId){
				doc[masterName] = masterId = ++masterNum + "";
				masterNode[masterId] = doc.createElement("div");
			}

			// make sure the frag is a string.
			frag += "";

			// find the starting tag, and get node wrapper
			var match = frag.match(reTag),
				tag = match ? match[1].toLowerCase() : "",
				master = masterNode[masterId],
				wrap, i, fc, df;
			if(match && tagWrap[tag]){
				wrap = tagWrap[tag];
				master.innerHTML = wrap.pre + frag + wrap.post;
				for(i = wrap.length; i; --i){
					master = master.firstChild;
				}
			}else{
				master.innerHTML = frag;
			}

			// one node shortcut => return the node itself
			if(master.childNodes.length == 1){
				return master.removeChild(master.firstChild); // DOMNode
			}

			// return multiple nodes as a document fragment
			df = doc.createDocumentFragment();
			while((fc = master.firstChild)){ // intentional assignment
				df.appendChild(fc);
			}
			return df; // DocumentFragment
		},
		
		domInsertFirst : function(node, refNode) {
			if (refNode.firstChild) {
				refNode.insertBefore(node, refNode.firstChild);
			} else {
				refNode.appendChild(node);
			}
			return refNode;
		},
		
		domInsertAfter : function(node, refNode) {
			var parent = refNode.parentNode;
			if (parent.lastChild == refNode){
				parent.appendChild(node);
			} else {
				parent.insertBefore(node, refNode.nextSibling);
			}
		},
		
	});
	return _supportTextarea;
});