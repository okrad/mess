var util = require('util');
var parser = require("./mess").parser;

var ast = [],

	isObject = function(obj) {
		return Object.prototype.toString.call(obj) == '[object Object]';
	},

	perc2float = function(perc, val) {
		return (val / 100) * perc;
	},

	fnDefs = {
		rgba: function() {
			return new Color('rgba', Array.prototype.slice.call(arguments));
		}
	},

	Color = function(format, data) {
		this.init(format, data);
	},

	Selector = function(selector) {
		this.init(selector);
	},

	CssProperty = function(prop) {
		this.init(prop);
	},

	CssExpression = function(expr) {
		this.init(expr);
	},

	ScopeHandler = function() {

		var scopedVars = [],
			level = -1;

		return {

			pushScope: function() {
				scopedVars.push({});
				level = scopedVars.length - 1;
			},

			popScope: function() {
				scopedVars.pop();
				level = scopedVars.length - 1;
			},

			addVar: function(varName, varDef) {
				scopedVars[level][varName] = this.reduceVars(varDef);
				if(scopedVars[level][varName].type == 'string') {
					scopedVars[level][varName].addQuotes = false;
				}
			},

			getVar: function(varName, lvl) {

				var varDef = null;

				lvl = lvl === undefined ? level : lvl;

				if(lvl >= 0) {

					if(scopedVars[lvl][varName]) {
						varDef = scopedVars[lvl][varName];
					}
					else {
						varDef = this.getVar(varName, lvl - 1);
					}
				}

				return varDef;
			},

			getScopedVars: function() {
				return scopedVars;
			},

			reduceVars: function(expr) {

				switch(expr.type) {

					case 'term_sequence':
					case 'term_list':
						expr.val.forEach(function(e) {
							if(e.type == 'var_reference')
		 						e = this.evalVar(e.val);
						}, this);
						break;

					case 'function':
		/*
						v = this.evalFnCall(expr);
						if(v instanceof Color)
							out.push(v.toCss());
						else
							out.push(v);
		*/
						break;

					case 'math_expr':
						if(	expr.operand1.type == 'var_reference')
							expr.operand1 = this.evalVar(expr.operand1.val);
						if(	expr.operand2.type == 'var_reference')
							expr.operand2 = this.evalVar(expr.operand2.val);
						break;

					case 'var_reference':
						expr = this.evalVar(expr.val);
						break;
				}

				return expr;
			},

			evalVar: function(varName) {

				var ret = this.getVar(varName);

				if(ret === null)
					console.log('Undefined variable ' + varName);

				return ret;
			},
		};

	}();

Color.prototype = {
	init: function(format, data) {

		this.format = format;

		if(format == 'hex') {

			if(data[0] == '#')
				data = data.substr(1);

			if(data.length == 3)
				data = data[0] + data[0] + data[1] + data[1] + data[2] + data[2];

			this.red = parseInt(data.substr(0, 2), 16);
			this.green = parseInt(data.substr(2, 2), 16);
			this.blue = parseInt(data.substr(4, 2), 16);
			this.alpha = 1;

		}
		else if(format == 'rgb') {
			this.red = data[0];
			this.green = data[1];
			this.blue = data[2];
			this.alpha = 1;
		}
		else if(format == 'rgba') {
			this.red = data[0];
			this.green = data[1];
			this.blue = data[2];
			this.alpha = data[3];
		}
	},

	sum: function(val) {
		var fmt = this.format,
			r, g, b, a;

		if(val instanceof Color) {
			fmt = (val.format == 'rgba' ? 'rgba' : this.format);

			r = this.red + val.red;
			g = this.green + val.green;
			b = this.blue + val.blue;
			a = this.alpha + val.alpha;
		}
		else if(val.type == 'percentage') {
			r = this.red + perc2float(val.val, this.red);
			g = this.green + perc2float(val.val, this.green);
			b = this.blue + perc2float(val.val, this.blue);
			a = this.alpha + perc2float(val.val, this.alpha);
		}
		else {
			r = this.red + val.val;
			g = this.green + val.val;
			b = this.blue + val.val;
			a = this.alpha + val.val;
		}

		return this.createColor(fmt, r, g, b, a);
	},

	diff: function(val) {
		var fmt = this.format,
			r, g, b, a;

		if(val instanceof Color) {
			fmt = (val.format == 'rgba' ? 'rgba' : this.format);

			r = this.red - val.red;
			g = this.green - val.green;
			b = this.blue - val.blue;
			a = this.alpha - val.alpha;
		}
		else if(val.type == 'percentage') {
			r = this.red - perc2floar(val.val, this.red);
			g = this.green - perc2floar(val.val, this.green);
			b = this.blue - perc2floar(val.val, this.blue);
			a = this.alpha - perc2floar(val.val, this.alpha);
		}
		else {
			r = this.red - val.val;
			g = this.green - val.val;
			b = this.blue - val.val;
			a = this.alpha - val.val;
		}

		return this.createColor(fmt, r, g, b, a);
	},

	mul: function(val) {
		var fmt = this.format,
			r, g, b, a;

		if(val instanceof Color) {
			fmt = (val.format == 'rgba' ? 'rgba' : this.format);

			r = this.red * val.red;
			g = this.green * val.green;
			b = this.blue * val.blue;
			a = this.alpha * val.alpha;
		}
		else if(val.type == 'percentage') {
			r = this.red * perc2floar(val.val, this.red);
			g = this.green * perc2floar(val.val, this.green);
			b = this.blue * perc2floar(val.val, this.blue);
			a = this.alpha * perc2floar(val.val, this.alpha);
		}
		else {
			r = this.red * val.val;
			g = this.green * val.val;
			b = this.blue * val.val;
			a = this.alpha * val.val;
		}

		return this.createColor(fmt, r, g, b, a);
	},

	div: function(val) {
		var fmt = this.format,
			r, g, b, a;

		if(val instanceof Color) {
			fmt = (val.format == 'rgba' ? 'rgba' : this.format);

			r = this.red / val.red;
			g = this.green / val.green;
			b = this.blue / val.blue;
			a = this.alpha / val.alpha;
		}
		else if(val.type == 'percentage') {
			r = this.red / perc2floar(val.val, this.red);
			g = this.green / perc2floar(val.val, this.green);
			b = this.blue / perc2floar(val.val, this.blue);
			a = this.alpha / perc2floar(val.val, this.alpha);
		}
		else {
			r = this.red / val.val;
			g = this.green / val.val;
			b = this.blue / val.val;
			a = this.alpha / val.val;
		}

		return this.createColor(fmt, r, g, b, a);
	},

	createColor: function(format, r, g, b, a) {

		var c, s;

		r = Math.round(Math.min(r, 255));
		g = Math.round(Math.min(g, 255));
		b = Math.round(Math.min(b, 255));
		a = Math.min(a, 1);

		switch(format) {
			case 'hex':
				s = '#' + r.toString(16) + g.toString(16) + b.toString(16);
				c = new Color(format, s);
				break;

			case 'rgb':
				c = new Color(format, [r, g, b]);
				break;

			case 'rgba':
				c = new Color(format, [r, g, b, a]);
				break;
		}

		return c;
	},

	toCss: function() {

		var css = '',
			r = Math.min(this.red, 255),
			g = Math.min(this.green, 255),
			b = Math.min(this.blue, 255),
			a = Math.min(this.alpha, 1);

		switch(this.format) {
			case 'hex':
				css = '#' + r.toString(16) + g.toString(16) + b.toString(16);
				break;
			case 'rgb':
				css = 'rgb(' + r + ', ' + g + ', ' + b + ')';
				break;
			case 'rgba':
				css = 'rgba(' + r + ', ' + g + ', ' + b + ', ' + a + ')';
				break;
		}

		return css;
	}
};

Selector.prototype = {

	init: function(selectorSpec) {
		this.uid = null;
		this.selectorSpec = selectorSpec;
	},

	getCssCombinator: function(combinator) {

		var op = '';

		switch(combinator) {
			case 'child':
				op = '>';
				break;

			case 'descendant':
				op = ' ';
				break;

			case 'next_sibling':
				op = '+';
		}

		return op;

	},

	toCss: function() {

		var out = [], rs, expr,
			mainSelector = this.selectorSpec.name;

		switch(this.selectorSpec.type) {

			case 'class':
				mainSelector = '.' + this.selectorSpec.name;
				break;

			case 'id':
				mainSelector = '#' + this.selectorSpec.name;
				break;

			case 'var_reference':
				expr = new CssExpression(this.selectorSpec);
				mainSelector = expr.toCss();
				break;
		}

		out.push(mainSelector);

		if(this.selectorSpec.relatedSelector) {

			out.push(this.getCssCombinator(this.selectorSpec.combinator));

			rs = new Selector(this.selectorSpec.relatedSelector);

			out.push(rs.toCss());
		}

		return out.join('');
	}

};

CssProperty.prototype = {

	init: function(prop) {
		this.name = prop.name;
		this.val = prop.val;
	},

	toCss: function() {
		var expr = new CssExpression(this.val);
		return this.name + ': ' + expr.toCss() + ';';
	}

};

CssExpression.prototype = {

	init: function(expr) {
		this.expr = expr;
	},

	calc: function(expr) {

		var result = {val: ''},
			op1 = this.evalOperand(expr.operand1),
			op2 = this.evalOperand(expr.operand2);

// console.log(expr.operator);
 // console.log(op1);
 // console.log(op2);

		//Verifico che le unità di misura siano paragonabili...
		if(this.checkOperands(op1, op2)) {
			result = this[expr.operator](op1, op2);
// console.log('=================');

// console.log(result);

		}
		else {
console.log('NON COMPATIBILI!!!');
			//TODO
			//Errore!!!
		}

		return result;
	},

	evalOperand: function(op) {

		switch(op.type) {
			case 'var_reference':
				op = ScopeHandler.getVar(op.val);
				if(op.type == 'math_expr')
					op = this.calc(op);
				else if(op.type == 'color')
					op = new Color('hex', op.val);
				break;

			case 'math_expr':
				op = this.calc(op);
				break;

			case 'color':
				op = new Color('hex', op.val);
				break;
		}

		return op;
	},

	sum: function(op1, op2) {

		var val;

		if(op1 instanceof Color) {
// console.log('cOLOR');
// console.log(op1);
// console.log(op2);
			val = op1.sum(op2);
		}
		else if(op2 instanceof Color) {
			val = op2.sum(op1);
		}
		else if(op1.type == 'percentage') {

			switch(op2.type) {

				case 'percentage': //10% + 5%
					val = {
						val: (op1.val + op2.val),
						um: '%',
						type: 'percentage'
					};
					break;

				case 'dimension': //10% + 5px
					val = {
						val: (op2.val + perc2float(op1.val, op2.val)),
						um: op2.um,
						type: op2.type
					};
					break;

				case 'number': //10% + 5
					val = {
						val: op2.val + perc2float(op1.val, op2.val),
						type: 'number'
					};
					break;
			}

		}
		else if(op1.type == 'dimension') {

			switch(op2.type) {

				case 'percentage': //10px + 5%
					val = this.sum(op2, op1);
					break;

				case 'dimension': //10px + 5px
					val = {
						val: (op1.val + op2.val),
						um: op1.um,
						type: 'dimension'
					};
					break;

				case 'number': //10px + 5
					val = {
						val: (op1.val + op2.val),
						um: op1.um,
						type: 'dimension'
					};
					break;
			}

		}
		else if(op1.type == 'number') {
			switch(op2.type) {

				case 'percentage': //10px + 5%
				case 'dimension': //10px + 5px
					val = this.sum(op2, op1);
					break;

				case 'number': //10 + 5
					val = {
						val: (op1.val + op2.val),
						type: 'number'
					};
					break;
			}

		}

		return val;
	},

	diff: function(op1, op2) {

		var val;

		if(op1.type == 'percentage') {

			switch(op2.type) {

				case 'percentage': //10% - 5%
					val = {
						val: (op1.val - op2.val),
						um: '%',
						type: 'percentage'
					};
					break;

				case 'dimension': //10% - 5px
					val = {
						val: (perc2float(op1.val, op2.val) - op2.val),
						um: op2.um,
						type: 'dimension'
					};
					break;

				case 'number': //10% - 5
					val = {
						val: perc2float(op1.val, op2.val) - op2.val,
						type: 'number'
					};
					break;
			}

		}
		else if(op1.type == 'dimension') {

			switch(op2.type) {

				case 'percentage': //10px - 5%
					val = {
						val: (op1.val - perc2float(op2.val, op1.val)),
						um: op1.um,
						type: 'dimension'
					};
					break;

				case 'dimension': //10px - 5px
					val = {
						val: (op1.val - op2.val),
						um: op1.um,
						type: 'dimension'
					};
					break;

				case 'number': //10px - 5
					val = {
						val: (op1.val - op2.val),
						um: op1.um,
						type: 'dimension'
					};
					break;
			}

		}
		else if(op1.type == 'number') {
			switch(op2.type) {

				case 'percentage': //10 - 5%
					val = {
						val: (op1.val - perc2float(op2.val, op1.val)),
						type: 'number'
					};
					break;

				case 'dimension': //10 - 5px
					val = {
						val: (op1.val - perc2float(op2.val, op1.val)),
						um: op2.um,
						type: 'dimension'
					};
					break;

				case 'number': //10 - 5
					val = {
						val: (op1.val - op2.val),
						type: 'number'
					};
					break;
			}

		}

		return val;
	},

	div: function(op1, op2) {
		var val;

		if(op1.type == 'percentage') {

			switch(op2.type) {

				case 'percentage': //10% / 5%
					val = {
						val: (op1.val / op2.val),
						um: '%',
						type: 'percentage'
					};
					break;

				case 'dimension': //10% / 5px
					val = {
						val: (perc2float(op1.val, op2.val) / op2.val),
						um: op2.um,
						type: 'dimension'
					};
					break;

				case 'number': //10% / 5
					val = {
						val: perc2float(op1.val, op2.val) / op2.val,
						type: 'number'
					};
					break;
			}

		}
		else if(op1.type == 'dimension') {

			switch(op2.type) {

				case 'percentage': //10px / 5%
					val = {
						val: (op1.val / perc2float(op2.val, op1.val)),
						um: op1.um,
						type: 'dimension'
					};
					break;

				case 'dimension': //10px * 5px
					val = {
						val: (op1.val / op2.val),
						um: op1.um,
						type: 'dimension'
					};
					break;

				case 'number': //10px * 5
					val = {
						val: (op1.val / op2.val),
						um: op1.um,
						type: 'dimension'
					};
					break;
			}

		}
		else if(op1.type == 'number') {
			switch(op2.type) {

				case 'percentage': //10 / 5%
					val = {
						val: (op1.val / perc2float(op2.val, op1.val)),
						type: 'number'
					};
					break;

				case 'dimension': //10 / 5px
					val = {
						val: (op1.val / perc2float(op2.val, op1.val)),
						um: p2.um,
						type: 'dimension'
					};
					break;

				case 'number': //10 / 5
					val = {
						val: (op1.val / op2.val),
						type: 'number'
					};
					break;
			}

		}

		return val;
	},

	mul: function(op1, op2) {
		var val;

		if(op1 instanceof Color) {
			val = op1.mul(op2);
		}
		else if(op2 instanceof Color) {
			val = op2.mul(op1);
		}
		else if(op1.type == 'percentage') {

			switch(op2.type) {

				case 'percentage': //10% * 5%
					val = {
						val: (op1.val * op2.val),
						um: '%',
						type: 'percentage'
					};
					break;

				case 'dimension': //10% * 5px
					val = {
						val: (perc2float(op1.val, op2.val) * op1.val),
						um: op2.um,
						type: 'dimension'
					};
					break;

				case 'number': //10% * 5
					val = {
						val: (perc2float(op1.val, op2.val) * op1.val),
						type: 'number'
					};
					break;
			}

		}
		else if(op1.type == 'dimension') {

			switch(op2.type) {

				case 'percentage': //10px * 5%
					val = this.mul(op2, op1);
					break;

				case 'dimension': //10px * 5px
					val = {
						val: (op1.val * op2.val),
						um: op1.um,
						type: 'dimension'
					};
					break;

				case 'number': //10px * 5
					val = {
						val: (op1.val * op2.val),
						um: op1.um,
						type: 'dimension'
					};
					break;
			}

		}
		else if(op1.type == 'number') {
			switch(op2.type) {

				case 'percentage': //10px * 5%
				case 'dimension': //10px * 5px
					val = this.mul(op2, op1);
					break;

				case 'number': //10px + 5
					val = {
						val: (op1.val * op2.val),
						type: 'number'
					};
					break;
			}

		}

		return val;
	},

	color2int: function(color) {
		//Per il momento supportati solo colori rgb in formato esadecimale...
		var col = color.substr(1);
		if(col.length == 3)
			col = col[0] + col[0] + col[1] + col[1] + col[2] + col[2];
		return parseInt(col, 16);
	},

	int2color: function(val) {
		return '#' + Math.round(val).toString(16);
	},
/*
	normalizeOperand: function(op) {

		var num;
//console.log(op);
		if(!isObject(op))
			op = {val: op};

		if(isNaN(op.val)) {

			op.val = op.val.trim();

			if( (op.type && op.type == 'color') || (op.val[0] == '#')) {
				op = new Color('hex', op.val);
			}
			else {
				num = parseFloat(op.val);
				op.um = op.val.substr((num + "").length);
				op.val = num;
			}

			if(!op.type || op.type == 'math_term')
				op.type = op.um == '%' ? 'percentage' : 'dimension';
		}
		else {
			op.um = null;
			op.val = parseFloat(op.val);
			op.type = 'number';
		}

		return op;

	},
*/
	checkOperands: function(op1, op2) {

		var ok = false;

		// op1 = this.normalizeOperand(op1);
		// op2 = this.normalizeOperand(op2);
// console.log(op1.type);
// console.log(op2.type);
// console.log('=============================');
		if(op1.type == 'percentage' || op1.type == 'number' || op2.type == 'percentage' || op2.type == 'number') {
			ok = true;
		}
		else {
			if(op1 instanceof Color || op2 instanceof Color) {
				ok = (op1 instanceof Color) && (op2 instanceof Color);
			}
			else if(op1.type == 'dimension') {
				if(op2.type == 'dimension') {
// console.log('um1: ' + op1.um + ' - um2: ' + op2.um);
					ok = (op1.um == op2.um);
				}
				else {
					ok = !(op2 instanceof Color);
				}
			}
			else if(op2.type == 'dimension') {
				ok = !(op1 instanceof Color);
			}
		}

		return ok;
	},

	evalFnCall: function(fnExpr) {

		var evalFn, paramList = [], expr;

		if(fnExpr.params) {
			if(fnExpr.params.type == 'term_list') {
				fnExpr.params.val.forEach(function(v) {
// console.log(v);
					expr = new CssExpression(v);
					paramList.push(expr.toCss());
				}, this);
			}
			else {
				expr = new CssExpression(fnExpr.params);
				paramList.push(expr.toCss());
			}

		}

// console.log(paramList);

		if(fnDefs[fnExpr.name]) {
			evalFn = fnDefs[fnExpr.name].apply(this, paramList);
		}
		else {
			evalFn = fnExpr.name + "(" + paramList  + ")";
		}

		return evalFn;
	},

	evalString: function(strExpr) {
		var out = [], expr,
			addQuotes = strExpr.addQuotes !== undefined ? strExpr.addQuotes : true;

		if(addQuotes)
			out.push('\'');

		if(Array.isArray(strExpr.val)) {
			strExpr.val.forEach(function(e) {
				expr = new CssExpression(e);
				out.push(expr.toCss());
			}, this);
		}
		else {
			expr = new CssExpression(strExpr.val);
			out.push(expr.toCss());
		}

		if(addQuotes)
			out.push('\'');

		return out.join('');
	},

	toCss: function() {

		var out = [], tmp = [], v, expr;

		switch(this.expr.type) {

			case 'term_sequence':
				this.expr.val.forEach(function(e) {
					expr = new CssExpression(e);
					tmp.push(expr.toCss());
					//tmp.push(this.toCssExpr(e));
				}, this);
				out.push(tmp.join(' '));
				break;

			case 'term_list':
				this.expr.val.forEach(function(e) {
					expr = new CssExpression(e);
					tmp.push(expr.toCss());
					// tmp.push(this.toCssExpr(e));
				}, this);
				out.push(tmp.join(', '));
				break;

			case 'function':
				v = this.evalFnCall(this.expr);
				if(v instanceof Color)
					out.push(v.toCss());
				else
					out.push(v);
				break;

			case 'string':
				out.push(this.evalString(this.expr));
				break;

			case 'string_part':
				out.push(this.expr.val);
				break;

			case 'var_reference':
				expr = new CssExpression(ScopeHandler.getVar(this.expr.val));
				out.push(expr.toCss());
				break;

			case 'percentage': case 'dimension': case 'number':
				out.push(this.expr.text);
				break;

			case 'color': case 'keyword':
				out.push(this.expr.val);
				break;

			case 'math_expr':
				v = this.calc(this.expr);

				if(v instanceof Color) {
					out.push(v.toCss());
				}
				else {
					out.push(v.val + (v.um ? v.um : ''));
				}
				break;

			default:
				out.push(this.expr.val);
		}

		return out.join('');

	}

};

parser.yy = {

	setAST: function(_ast) {
		ast = _ast;
	},

	toCss: function() {

		var out = [];

		ScopeHandler.pushScope();

		ast.forEach(function(n) {

			if(n.vars) {

				if(!Array.isArray(n.vars))
					n.vars = [n.vars];

				n.vars.forEach(function(varDef) {
					ScopeHandler.addVar(varDef.name, varDef.val);
				}, this);

			}
			else if(n.rule) {
				out.push(this.toCssRule(n.rule));
			}

		}, this);

		ScopeHandler.popScope();

		return out.join('');
	},

	toCssRule: function(rule, parentSelectors) {

		var	out = [], props = [], rules = [],
			selectors = [],
			newSelectors = [],
			mergeSelectors = function(sel1, sel2) {

				if(sel1.relatedSelector) {
					mergeSelectors(sel1.relatedSelector, sel2);
				}
				else {
					sel1.relatedSelector = JSON.parse(JSON.stringify(sel2));
					sel1.combinator = 'descendant';
				}

			};

		ScopeHandler.pushScope();

		if(!Array.isArray(rule.selectors))
			rule.selectors = [rule.selectors];

		if(parentSelectors !== undefined) {

			parentSelectors.forEach(function(pSel) {

				var ps = JSON.parse(JSON.stringify(pSel));

				rule.selectors.forEach(function(s) {
					mergeSelectors(ps, s);
					newSelectors.push(ps);
				});

			});

			rule.selectors = newSelectors;

		}

		rule.content.forEach(function(rc) {

			switch(rc.type) {
				case 'rule':
					rules.push(this.toCssRule(rc, rule.selectors));
					break;

				case 'vardecl':
					ScopeHandler.addVar(rc.name, rc.val);
					break;

				case 'property':
					var p = new CssProperty(rc);
					props.push("\t" + p.toCss() + "\n");
					break;
			}

		}, this);

		if(props.length > 0 || rules.length > 0) {

			rule.selectors.forEach(function(selector) {
				var s = new Selector(selector);
				selectors.push(s.toCss());
			});

			out.push(selectors.join(", \n"));

			out.push(" {\n");

			if(props.length > 0)
				out.push(props.join("\n"));

			out.push("\n}\n");

			if(rules.length > 0)
				out.push(rules.join("\n"));
		}

		ScopeHandler.popScope();

		return out.join('');
	}

};

if (!process.argv[2]) {
	console.log('Usage: '+process.argv[0]+' FILE');
	process.exit(1);
}

var source = require('fs').readFileSync(require('path').normalize(process.argv[2]), "utf8");

parser.parse(source);

console.log(parser.yy.toCss());
